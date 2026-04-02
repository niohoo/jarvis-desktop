/**
 * TopBar — Quick-access links to internal systems
 * URLs are stored in localStorage and editable by the user.
 */
import { useState } from 'react';
import {
  Box, Stack, Button, Tooltip, IconButton, Popover,
  TextField, Typography, Divider
} from '@mui/material';
import NotificationPanel from './NotificationPanel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SettingsIcon from '@mui/icons-material/Settings';
import { openUrl } from '@tauri-apps/plugin-opener';
import { api } from '../api';

interface SystemLink {
  id: string;
  label: string;
  defaultUrl: string;
  color?: string;
}

const SYSTEMS: SystemLink[] = [
  { id: 'space_web',   label: 'Jarvis Space', defaultUrl: '', color: '#E8451C' },
  { id: 'crm',         label: 'CRM',          defaultUrl: '' },
  { id: 'gitlab',      label: 'GitLab',       defaultUrl: '' },
  { id: 'autodev',     label: 'AutoDev',      defaultUrl: '' },
  { id: 'ameaba',      label: 'Ameaba',       defaultUrl: '' },
];

function getUrl(id: string, defaultUrl: string): string {
  return localStorage.getItem(`jarvis_sys_url_${id}`) || defaultUrl;
}

function saveUrl(id: string, url: string) {
  localStorage.setItem(`jarvis_sys_url_${id}`, url);
}

export default function TopBar() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [editUrls, setEditUrls] = useState<Record<string, string>>({});

  const openSettings = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Pre-fill with current saved URLs
    const current: Record<string, string> = {};
    SYSTEMS.forEach(s => { current[s.id] = getUrl(s.id, s.defaultUrl); });
    setEditUrls(current);
    setAnchorEl(e.currentTarget);
  };

  const closeSettings = () => setAnchorEl(null);

  const saveSettings = () => {
    SYSTEMS.forEach(s => {
      if (editUrls[s.id] !== undefined) saveUrl(s.id, editUrls[s.id]);
    });
    closeSettings();
  };

  const handleOpen = async (system: SystemLink) => {
    let url = getUrl(system.id, system.defaultUrl);
    if (!url) return;

    // Jarvis Space — SSO auto-login
    if (system.id === 'space_web') {
      url = api.getSsoUrl('/spaces');
    }

    try { await openUrl(url); } catch (e) { console.error(e); }
  };

  return (
    <Box sx={{
      height: 38,
      px: 2,
      display: 'flex',
      alignItems: 'center',
      borderBottom: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.paper',
      flexShrink: 0,
      gap: 0.5,
    }}>
      {/* Logo mark */}
      <Box sx={{
        width: 22, height: 22, borderRadius: 1, overflow: 'hidden',
        mr: 1, flexShrink: 0,
      }}>
        <img src="/logo-icon.png" alt="J" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </Box>

      {/* System quick links */}
      <Stack direction="row" spacing={0.5} sx={{ flex: 1 }}>
        {SYSTEMS.map(system => {
          const url = getUrl(system.id, system.defaultUrl);
          const configured = !!url || system.id === 'space_web';
          return (
            <Tooltip
              key={system.id}
              title={configured
                ? (system.id === 'space_web' ? 'SSO 免登录打开' : url)
                : '点击右侧 ⚙ 设置 URL'}
            >
              <span>
                <Button
                  size="small"
                  variant={system.id === 'space_web' ? 'contained' : 'text'}
                  onClick={() => handleOpen(system)}
                  disabled={!configured}
                  endIcon={<OpenInNewIcon sx={{ fontSize: '11px !important' }} />}
                  sx={{
                    height: 24,
                    fontSize: 11,
                    fontWeight: 500,
                    px: 1,
                    minWidth: 'auto',
                    textTransform: 'none',
                    color: system.id === 'space_web' ? '#fff' : (configured ? 'text.primary' : 'text.disabled'),
                    bgcolor: system.id === 'space_web' ? '#E8451C' : 'transparent',
                    '&:hover': system.id === 'space_web'
                      ? { bgcolor: '#D63A15' }
                      : { bgcolor: 'action.hover', color: 'primary.main' },
                    '& .MuiButton-endIcon': { ml: 0.3 },
                  }}
                >
                  {system.label}
                </Button>
              </span>
            </Tooltip>
          );
        })}
      </Stack>

      {/* Notification bell */}
      <NotificationPanel />

      {/* Settings gear */}
      <Tooltip title="配置系统 URL">
        <IconButton size="small" onClick={openSettings} sx={{ color: 'text.secondary' }}>
          <SettingsIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      {/* URL Settings Popover */}
      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={closeSettings}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { p: 2, width: 340, border: '1px solid', borderColor: 'divider' } }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>配置系统入口 URL</Typography>
        <Stack spacing={1.5}>
          {SYSTEMS.filter(s => s.id !== 'space_web').map(system => (
            <Box key={system.id}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                {system.label}
              </Typography>
              <TextField
                fullWidth size="small"
                placeholder={`https://${system.id}.example.com`}
                value={editUrls[system.id] || ''}
                onChange={e => setEditUrls(prev => ({ ...prev, [system.id]: e.target.value }))}
                sx={{ '& .MuiOutlinedInput-root': { fontSize: 12 } }}
              />
            </Box>
          ))}
        </Stack>
        <Divider sx={{ my: 1.5 }} />
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <Button size="small" onClick={closeSettings} sx={{ color: 'text.secondary' }}>取消</Button>
          <Button size="small" variant="contained" onClick={saveSettings}>保存</Button>
        </Stack>
      </Popover>
    </Box>
  );
}
