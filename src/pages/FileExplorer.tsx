import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Breadcrumbs, Link, IconButton, Tooltip,
  List, ListItemButton, ListItemIcon, ListItemText,
  Skeleton, Chip, LinearProgress, Collapse
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import SyncIcon from '@mui/icons-material/Sync';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { api, Space, Material, Folder } from '../api';
import SyncPanel from '../components/SyncPanel';

interface FileExplorerProps {
  space: Space;
  onBack: () => void;
}

function fileIcon(title: string) {
  const ext = title.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <ImageIcon sx={{ color: '#4CAF50' }} />;
  if (ext === 'pdf') return <PictureAsPdfIcon sx={{ color: '#F44336' }} />;
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return <DescriptionIcon sx={{ color: '#2196F3' }} />;
  return <InsertDriveFileIcon sx={{ color: '#9E9E9E' }} />;
}

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function FileExplorer({ space, onBack }: FileExplorerProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: number | null; name: string }[]>([
    { id: null, name: space.display_name },
  ]);
  const [uploading, setUploading] = useState(false);
  const [showSync, setShowSync] = useState(false);

  // Reset navigation state whenever the selected space changes
  useEffect(() => {
    setCurrentFolderId(null);
    setFolderPath([{ id: null, name: space.display_name }]);
    setFolders([]);
    setMaterials([]);
    setShowSync(false);
  }, [space.id, space.display_name]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMaterials(String(space.id));
      const allFolders: Folder[] = (res as unknown as { folders: Folder[] }).folders || [];
      const allMaterials: Material[] = (res as unknown as { materials: Material[] }).materials || [];
      setFolders(allFolders.filter(f => (f.parent_id || null) === currentFolderId));
      setMaterials(allMaterials.filter(m => (m.folder_id || null) === currentFolderId));
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [space.id, currentFolderId]);

  useEffect(() => { loadData(); }, [loadData]);

  const navigateToFolder = (folder: Folder) => {
    setCurrentFolderId(folder.id);
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    const target = folderPath[index];
    setCurrentFolderId(target.id);
    setFolderPath(prev => prev.slice(0, index + 1));
  };

  const handleUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async () => {
      const files = input.files;
      if (!files || files.length === 0) return;
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          await api.uploadFile(String(space.id), file, currentFolderId || undefined);
        }
        await loadData();
      } catch (e) {
        console.error('Upload error:', e);
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{
        p: 2, borderBottom: '1px solid', borderColor: 'divider',
        display: 'flex', alignItems: 'center', gap: 1,
      }}>
        <Tooltip title="返回空间列表">
          <IconButton size="small" onClick={onBack}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Breadcrumbs sx={{ flex: 1, '& .MuiLink-root': { fontSize: 14 } }}>
          {folderPath.map((item, i) => (
            i < folderPath.length - 1 ? (
              <Link
                key={i}
                component="button"
                underline="hover"
                color="text.secondary"
                onClick={() => navigateToBreadcrumb(i)}
              >
                {item.name}
              </Link>
            ) : (
              <Typography key={i} fontSize={14} fontWeight={600} color="text.primary">
                {item.name}
              </Typography>
            )
          ))}
        </Breadcrumbs>

        <Tooltip title="上传文件">
          <IconButton onClick={handleUpload} disabled={uploading} color="primary">
            <CloudUploadIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={showSync ? '收起同步面板' : '打开同步面板'}>
          <IconButton color={showSync ? 'secondary' : 'primary'} onClick={() => setShowSync(s => !s)}>
            <SyncIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {uploading && <LinearProgress />}

      {/* Sync Panel */}
      <Collapse in={showSync}>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
          <SyncPanel space={space} />
        </Box>
      </Collapse>

      {/* File List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} height={48} sx={{ mb: 0.5, borderRadius: 1 }} />
            ))}
          </Box>
        ) : folders.length === 0 && materials.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography color="text.secondary" mb={1}>此文件夹为空</Typography>
            <Typography variant="body2" color="text.secondary">
              点击上方上传按钮或拖拽文件到此处
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {/* Folders first */}
            {folders.map(folder => (
              <ListItemButton
                key={`f-${folder.id}`}
                onClick={() => navigateToFolder(folder)}
                sx={{ py: 1, mx: 1, my: 0.25, borderRadius: 1.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <FolderIcon sx={{ color: '#FFB74D' }} />
                </ListItemIcon>
                <ListItemText
                  primary={folder.name}
                  primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                />
              </ListItemButton>
            ))}

            {/* Then files */}
            {materials.map(mat => (
              <ListItemButton
                key={`m-${mat.id}`}
                sx={{ py: 1, mx: 1, my: 0.25, borderRadius: 1.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {fileIcon(mat.title)}
                </ListItemIcon>
                <ListItemText
                  primary={mat.title}
                  secondary={[formatSize(mat.file_size), formatDate(mat.created_at)].filter(Boolean).join(' · ')}
                  primaryTypographyProps={{ fontSize: 13, fontWeight: 400 }}
                  secondaryTypographyProps={{ fontSize: 11 }}
                />
                <Chip
                  label={mat.source_system === 'local_upload' ? '本地' : mat.source_system}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 10, height: 20 }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>

      {/* Status bar */}
      <Box sx={{
        px: 2, py: 0.75, borderTop: '1px solid', borderColor: 'divider',
        display: 'flex', justifyContent: 'space-between',
        bgcolor: 'background.default', fontSize: 11, color: 'text.secondary',
      }}>
        <span>{folders.length} 个文件夹 · {materials.length} 个文件</span>
        <span>{space.phase || 'active'}</span>
      </Box>
    </Box>
  );
}
