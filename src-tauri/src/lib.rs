use sha2::{Sha256, Digest};
use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

use std::sync::Mutex;
use std::collections::HashMap;

// ─── Types ───

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileManifestEntry {
    pub id: i64,
    pub title: String,
    pub folder_id: Option<i64>,
    pub folder_path: String,
    pub file_size: Option<i64>,
    pub sha256: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncResult {
    pub downloaded: Vec<String>,
    pub skipped: Vec<String>,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct DedupResult {
    pub status: String, // "new" | "duplicate_same_name" | "duplicate_diff_name" | "updated"
    pub existing_file: Option<String>,
    pub existing_path: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct SyncProgress {
    pub current: usize,
    pub total: usize,
    pub filename: String,
    pub status: String,
}

// ─── State ───

pub struct AppState {
    pub watching: Mutex<HashMap<String, bool>>, // spaceId -> watching
}

// ─── Commands ───

/// Calculate SHA-256 hash of a local file
#[tauri::command]
fn hash_file(path: String) -> Result<String, String> {
    let content = fs::read(&path).map_err(|e| format!("读取文件失败: {}", e))?;
    let mut hasher = Sha256::new();
    hasher.update(&content);
    Ok(format!("{:x}", hasher.finalize()))
}

/// Get the default sync directory for a space
#[tauri::command]
fn get_sync_dir(space_name: String) -> Result<String, String> {
    let home = dirs::home_dir().ok_or("无法获取主目录")?;
    let sync_dir = home.join("JarvisSpace").join(&space_name);
    Ok(sync_dir.to_string_lossy().to_string())
}

/// Ensure sync directory exists and return its path
#[tauri::command]
fn ensure_sync_dir(space_name: String) -> Result<String, String> {
    let home = dirs::home_dir().ok_or("无法获取主目录")?;
    let sync_dir = home.join("JarvisSpace").join(&space_name);
    fs::create_dir_all(&sync_dir).map_err(|e| format!("创建目录失败: {}", e))?;
    Ok(sync_dir.to_string_lossy().to_string())
}

/// Scan local directory and return file hashes for dedup comparison
#[tauri::command]
fn scan_local_files(dir_path: String) -> Result<Vec<(String, String, u64)>, String> {
    let dir = Path::new(&dir_path);
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut results: Vec<(String, String, u64)> = Vec::new();
    scan_dir_recursive(dir, dir, &mut results)?;
    Ok(results)
}

fn scan_dir_recursive(
    root: &Path,
    current: &Path,
    results: &mut Vec<(String, String, u64)>,
) -> Result<(), String> {
    let entries = fs::read_dir(current).map_err(|e| format!("读取目录失败: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取文件条目失败: {}", e))?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files and system files
        if name.starts_with('.') || name == "Thumbs.db" || name == "desktop.ini" {
            continue;
        }

        if path.is_dir() {
            scan_dir_recursive(root, &path, results)?;
        } else {
            let relative = path
                .strip_prefix(root)
                .map_err(|_| "路径错误".to_string())?
                .to_string_lossy()
                .to_string();

            let metadata = fs::metadata(&path).map_err(|e| format!("获取元数据失败: {}", e))?;
            let size = metadata.len();

            let content = fs::read(&path).map_err(|e| format!("读取文件失败: {}", e))?;
            let mut hasher = Sha256::new();
            hasher.update(&content);
            let hash = format!("{:x}", hasher.finalize());

            results.push((relative, hash, size));
        }
    }
    Ok(())
}

/// Check if a file is a duplicate against the server manifest
#[tauri::command]
fn check_dedup(
    file_path: String,
    manifest_json: String, // JSON array of FileManifestEntry
) -> Result<DedupResult, String> {
    // Read and hash the local file
    let content = fs::read(&file_path).map_err(|e| format!("读取文件失败: {}", e))?;
    let mut hasher = Sha256::new();
    hasher.update(&content);
    let local_hash = format!("{:x}", hasher.finalize());

    let local_name = Path::new(&file_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    // Parse manifest
    let manifest: Vec<FileManifestEntry> =
        serde_json::from_str(&manifest_json).map_err(|e| format!("解析 manifest 失败: {}", e))?;

    // Check against each file
    for entry in &manifest {
        if let Some(ref server_hash) = entry.sha256 {
            if server_hash == &local_hash {
                if entry.title == local_name {
                    return Ok(DedupResult {
                        status: "duplicate_same_name".to_string(),
                        existing_file: Some(entry.title.clone()),
                        existing_path: Some(entry.folder_path.clone()),
                    });
                } else {
                    return Ok(DedupResult {
                        status: "duplicate_diff_name".to_string(),
                        existing_file: Some(entry.title.clone()),
                        existing_path: Some(entry.folder_path.clone()),
                    });
                }
            }
        }

        // Same name but different hash = updated file
        if entry.title == local_name {
            return Ok(DedupResult {
                status: "updated".to_string(),
                existing_file: Some(entry.title.clone()),
                existing_path: Some(entry.folder_path.clone()),
            });
        }
    }

    Ok(DedupResult {
        status: "new".to_string(),
        existing_file: None,
        existing_path: None,
    })
}

/// Save downloaded content to local sync directory
#[tauri::command]
fn save_to_sync_dir(
    sync_dir: String,
    folder_path: String,
    filename: String,
    content: Vec<u8>,
) -> Result<String, String> {
    let target_dir = if folder_path.is_empty() {
        PathBuf::from(&sync_dir)
    } else {
        PathBuf::from(&sync_dir).join(&folder_path)
    };

    fs::create_dir_all(&target_dir).map_err(|e| format!("创建目录失败: {}", e))?;

    let file_path = target_dir.join(&filename);
    fs::write(&file_path, &content).map_err(|e| format!("写入文件失败: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

/// List files pending upload from sync dir (files not in manifest)
#[tauri::command]
fn find_new_local_files(
    sync_dir: String,
    manifest_json: String,
) -> Result<Vec<String>, String> {
    let manifest: Vec<FileManifestEntry> =
        serde_json::from_str(&manifest_json).map_err(|e| format!("解析失败: {}", e))?;

    // Build set of known server file paths
    let server_files: std::collections::HashSet<String> = manifest
        .iter()
        .map(|e| {
            if e.folder_path.is_empty() {
                e.title.clone()
            } else {
                format!("{}/{}", e.folder_path, e.title)
            }
        })
        .collect();

    let dir = Path::new(&sync_dir);
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut new_files: Vec<String> = Vec::new();
    find_new_recursive(dir, dir, &server_files, &mut new_files)?;
    Ok(new_files)
}

fn find_new_recursive(
    root: &Path,
    current: &Path,
    known: &std::collections::HashSet<String>,
    results: &mut Vec<String>,
) -> Result<(), String> {
    let entries = fs::read_dir(current).map_err(|e| format!("{}", e))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("{}", e))?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') || name == "Thumbs.db" || name == "desktop.ini" || name == "node_modules" {
            continue;
        }

        if path.is_dir() {
            find_new_recursive(root, &path, known, results)?;
        } else {
            let relative = path.strip_prefix(root).map_err(|_| "path")?.to_string_lossy().to_string();
            if !known.contains(&relative) {
                results.push(path.to_string_lossy().to_string());
            }
        }
    }
    Ok(())
}

/// Open a folder in the native file manager
#[tauri::command]
fn open_in_finder(path: String) -> Result<(), String> {
    let cmd = if cfg!(target_os = "macos") {
        "open"
    } else if cfg!(target_os = "windows") {
        "explorer"
    } else {
        "xdg-open"
    };
    std::process::Command::new(cmd)
        .arg(&path)
        .spawn()
        .map_err(|e| format!("{}", e))?;
    Ok(())
}

// ─── Open in IDE ───

#[tauri::command]
fn open_in_ide(ide: String, path: String) -> Result<(), String> {
    // Map IDE identifier to actual CLI command
    let cmd = match ide.as_str() {
        "cursor" => "cursor",
        "claude" => "claude",
        "codex" => "codex",
        "antigravity" => "antigravity",
        other => other,
    };

    // Try to spawn the IDE with the folder path
    let result = std::process::Command::new(cmd)
        .arg(&path)
        .spawn();

    match result {
        Ok(_) => Ok(()),
        Err(e) => {
            // Many IDEs also support `open -a "App Name" path` on macOS as fallback
            #[cfg(target_os = "macos")]
            {
                let app_name = match ide.as_str() {
                    "cursor" => "Cursor",
                    "claude" => "Claude",
                    "codex" => "Codex",
                    "antigravity" => "Antigravity",
                    other => other,
                };
                std::process::Command::new("open")
                    .args(["-a", app_name, &path])
                    .spawn()
                    .map_err(|_| format!("无法启动 {}: {}", ide, e))?;
                Ok(())
            }
            #[cfg(not(target_os = "macos"))]
            Err(format!("无法启动 {}: {}", ide, e))
        }
    }
}

// ─── App Entry ───

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            watching: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            hash_file,
            get_sync_dir,
            ensure_sync_dir,
            scan_local_files,
            check_dedup,
            save_to_sync_dir,
            find_new_local_files,
            open_in_finder,
            open_in_ide,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
