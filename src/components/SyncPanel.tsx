import { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, Button, LinearProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, List, ListItem, ListItemIcon,
  ListItemText, Alert, Chip, IconButton, Tooltip, Stack, TextField,
  Divider
} from '@mui/material';

import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import LaunchIcon from '@mui/icons-material/Launch';
import { api, Space } from '../api';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';

interface SyncPanelProps {
  space: Space;
}

interface DedupAlert {
  localFile: string;
  status: string;
  existingFile?: string;
  existingPath?: string;
}

// IDE definitions
const IDES = [
  {
    id: 'cursor',
    label: 'Cursor',
    emoji: '◎',
    cmd: 'cursor',
    args: (path: string) => [path],
  },
  {
    id: 'claude',
    label: 'Claude Code',
    emoji: '◆',
    cmd: 'claude',
    args: (path: string) => [path],
  },
  {
    id: 'codex',
    label: 'Codex',
    emoji: '◈',
    cmd: 'codex',
    args: (path: string) => ['--cwd', path],
  },
  {
    id: 'antigravity',
    label: 'Antigravity',
    emoji: '✦',
    cmd: 'antigravity',
    args: (path: string) => [path],
  },
];

function getStorageKey(spaceId: number) {
  return `jarvis_sync_dir_${spaceId}`;
}

export default function SyncPanel({ space }: SyncPanelProps) {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, filename: '' });
  const [syncResult, setSyncResult] = useState<{ downloaded: number; skipped: number; errors: number } | null>(null);
  const [dedupAlerts, setDedupAlerts] = useState<DedupAlert[]>([]);
  const [showDedupDialog, setShowDedupDialog] = useState(false);
  const [syncDir, setSyncDir] = useState('');
  const [editingPath, setEditingPath] = useState(false);
  const [pathDraft, setPathDraft] = useState('');

  // Load saved custom path (or default) for this space
  useEffect(() => {
    const saved = localStorage.getItem(getStorageKey(space.id));
    if (saved) {
      setSyncDir(saved);
    } else {
      // Resolve default path
      invoke<string>('ensure_sync_dir', { spaceName: space.display_name })
        .then(dir => { setSyncDir(dir); localStorage.setItem(getStorageKey(space.id), dir); })
        .catch(console.error);
    }
  }, [space.id, space.display_name]);

  const saveDir = (dir: string) => {
    setSyncDir(dir);
    localStorage.setItem(getStorageKey(space.id), dir);
  };

  // Folder picker via Tauri dialog
  const pickFolder = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false, title: '选择同步文件夹' });
      if (selected && typeof selected === 'string') {
        saveDir(selected);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save edited path
  const confirmPathEdit = () => {
    if (pathDraft.trim()) saveDir(pathDraft.trim());
    setEditingPath(false);
  };

  // Open in Finder/Explorer
  const openSyncFolder = async () => {
    try { await openPath(syncDir); } catch (e) { console.error(e); }
  };

  // Launch IDE
  const launchIde = async (ide: typeof IDES[0]) => {
    if (!syncDir) return;
    try {
      // Try to open as URL scheme first, then fall back to shell command
      // Most IDEs support `cursor://` or similar — use opener for cross-platform
      await invoke('open_in_ide', { ide: ide.cmd, path: syncDir });
    } catch {
      // Fallback: open the folder in Finder and show instructions
      try { await openPath(syncDir); } catch { /* ignore */ }
    }
  };

  // Sync from server to local
  const syncToLocal = useCallback(async () => {
    if (!syncDir) return;
    setSyncing(true);
    setSyncResult(null);
    setDedupAlerts([]);

    try {
      const manifest = await api.getManifest(String(space.id));
      const files = manifest.files;
      setProgress({ current: 0, total: files.length, filename: '准备中...' });

      const localFiles: [string, string, number][] = await invoke('scan_local_files', { dirPath: syncDir });
      const localHashMap = new Map(localFiles.map(([path, hash]) => [path, hash]));

      let downloaded = 0; let skipped = 0; let errors = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath = file.folder_path ? `${file.folder_path}/${file.title}` : file.title;
        setProgress({ current: i + 1, total: files.length, filename: file.title });

        const localHash = localHashMap.get(relativePath);
        if (localHash && file.sha256 && localHash === file.sha256) { skipped++; continue; }

        try {
          const content = await api.downloadFile(String(space.id), file.id);
          const contentArray = Array.from(new Uint8Array(content));
          await invoke('save_to_sync_dir', {
            syncDir,
            folderPath: file.folder_path || '',
            filename: file.title,
            content: contentArray,
          });
          downloaded++;
        } catch (e) { console.error(`Download error for ${file.title}:`, e); errors++; }
      }

      setSyncResult({ downloaded, skipped, errors });
    } catch (e) {
      console.error('Sync error:', e);
      setSyncResult({ downloaded: 0, skipped: 0, errors: 1 });
    } finally {
      setSyncing(false);
    }
  }, [space, syncDir]);

  // Check local files for dedup before upload
  const checkAndUpload = useCallback(async () => {
    if (!syncDir) return;
    try {
      const manifest = await api.getManifest(String(space.id));
      const newFiles: string[] = await invoke('find_new_local_files', {
        syncDir,
        manifestJson: JSON.stringify(manifest.files),
      });

      if (newFiles.length === 0) { setSyncResult({ downloaded: 0, skipped: 0, errors: 0 }); return; }

      const alerts: DedupAlert[] = [];
      for (const filePath of newFiles) {
        try {
          const result: { status: string; existing_file?: string; existing_path?: string } =
            await invoke('check_dedup', { filePath, manifestJson: JSON.stringify(manifest.files) });
          if (result.status !== 'new') {
            alerts.push({
              localFile: filePath.split('/').pop() || filePath,
              status: result.status,
              existingFile: result.existing_file,
              existingPath: result.existing_path,
            });
          }
        } catch { /* Skip */ }
      }

      if (alerts.length > 0) { setDedupAlerts(alerts); setShowDedupDialog(true); }
    } catch (e) { console.error('Check error:', e); }
  }, [space, syncDir]);

  const statusLabel = (s: string) => ({ duplicate_same_name: '完全重复', duplicate_diff_name: '内容重复(不同名)', updated: '已更新' }[s] ?? s);
  const statusColor = (s: string): 'warning' | 'error' | 'info' => ({ duplicate_same_name: 'warning' as const, duplicate_diff_name: 'error' as const }[s] ?? 'info');

  return (
    <Box sx={{ p: 2 }}>

      {/* ─── Local Folder Path ─── */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
          本地同步目录
        </Typography>
        {editingPath ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth size="small"
              value={pathDraft}
              onChange={e => setPathDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmPathEdit(); if (e.key === 'Escape') setEditingPath(false); }}
              autoFocus
              sx={{ '& .MuiOutlinedInput-root': { fontSize: 12 } }}
            />
            <Button size="small" onClick={confirmPathEdit} sx={{ whiteSpace: 'nowrap' }}>确认</Button>
          </Stack>
        ) : (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" sx={{ flex: 1, color: 'text.secondary', wordBreak: 'break-all', lineHeight: 1.4 }}>
              {syncDir || '未设置'}
            </Typography>
            <Tooltip title="选择文件夹">
              <IconButton size="small" onClick={pickFolder} sx={{ flexShrink: 0 }}>
                <FolderOpenIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="手动输入路径">
              <IconButton size="small" onClick={() => { setPathDraft(syncDir); setEditingPath(true); }} sx={{ flexShrink: 0 }}>
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="在 Finder 中打开">
              <IconButton size="small" onClick={openSyncFolder} disabled={!syncDir} sx={{ flexShrink: 0 }}>
                <LaunchIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* ─── Sync Actions ─── */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="contained" size="small" startIcon={<CloudDownloadIcon />}
          onClick={syncToLocal} disabled={syncing || !syncDir}
        >
          同步到本地
        </Button>
        <Button
          variant="outlined" size="small" startIcon={<CloudUploadIcon />}
          onClick={checkAndUpload} disabled={syncing || !syncDir}
        >
          检查上传
        </Button>
      </Stack>

      {/* Progress */}
      {syncing && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{progress.filename}</Typography>
            <Typography variant="caption" color="text.secondary">{progress.current}/{progress.total}</Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0} />
        </Box>
      )}

      {/* Result */}
      {syncResult && !syncing && (
        <Alert severity={syncResult.errors > 0 ? 'warning' : 'success'}
          icon={syncResult.errors > 0 ? <WarningIcon /> : <CheckCircleIcon />}
          sx={{ fontSize: 13, mb: 2 }}>
          {syncResult.downloaded > 0 && `已下载 ${syncResult.downloaded} 个文件`}
          {syncResult.skipped > 0 && ` · 跳过 ${syncResult.skipped} 个(已同步)`}
          {syncResult.errors > 0 && ` · ${syncResult.errors} 个错误`}
          {syncResult.downloaded === 0 && syncResult.skipped === 0 && syncResult.errors === 0 && '没有新文件需要上传'}
        </Alert>
      )}

      <Divider sx={{ my: 1.5 }} />

      {/* ─── IDE Launchers ─── */}
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
        在 IDE 中打开项目
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {IDES.map(ide => (
          <Button
            key={ide.id}
            variant="outlined"
            size="small"
            disabled={!syncDir}
            onClick={() => launchIde(ide)}
            sx={{
              fontSize: 12,
              borderColor: 'rgba(60,60,67,0.2)',
              color: 'text.primary',
              gap: 0.5,
              px: 1.5,
              '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'action.hover' },
            }}
          >
            <span style={{ fontSize: 14 }}>{ide.emoji}</span>
            {ide.label}
          </Button>
        ))}
      </Stack>

      {/* Dedup Dialog */}
      <Dialog open={showDedupDialog} onClose={() => setShowDedupDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ContentCopyIcon color="warning" />文件去重检测
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            以下本地文件在服务器上已存在相似文件：
          </Typography>
          <List dense>
            {dedupAlerts.map((alert, i) => (
              <ListItem key={i} sx={{ borderRadius: 1, mb: 0.5, bgcolor: 'action.hover' }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <WarningIcon color={statusColor(alert.status)} fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={alert.localFile}
                  secondary={alert.existingFile ? `服务器: ${alert.existingPath ? alert.existingPath + '/' : ''}${alert.existingFile}` : undefined}
                  primaryTypographyProps={{ fontSize: 13 }}
                  secondaryTypographyProps={{ fontSize: 11 }}
                />
                <Chip label={statusLabel(alert.status)} size="small" color={statusColor(alert.status)} variant="outlined" sx={{ fontSize: 10 }} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDedupDialog(false)}>知道了</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
