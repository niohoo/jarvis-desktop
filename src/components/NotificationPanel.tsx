/**
 * NotificationPanel — 系统通知面板（铃铛下拉）
 * 轮询 /api/notifications，显示未读消息，支持标记已读
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Badge, IconButton, Popover, Typography, Stack,
  Chip, Divider, Button, Tooltip, CircularProgress,
  alpha,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { openUrl } from '@tauri-apps/plugin-opener';
import { api, Notification } from '../api';

const POLL_INTERVAL = 30_000; // 30s

function timeAgo(s: string) {
  const diff = (Date.now() - new Date(s).getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

export default function NotificationPanel() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const open = Boolean(anchorEl);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getNotifications();
      const list = res.notifications || [];
      setNotifications(list);
      setUnreadCount(res.unread_count ?? list.filter(n => !n.is_read).length);
    } catch { /* silent */ }
    if (!silent) setLoading(false);
  }, []);

  // Poll in background
  useEffect(() => {
    if (!api.isLoggedIn()) return;
    fetchNotifications(true);
    intervalRef.current = setInterval(() => fetchNotifications(true), POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchNotifications]);

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
    fetchNotifications();
  };

  const handleMarkAll = async () => {
    setMarking(true);
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
    setMarking(false);
  };

  const handleMarkOne = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const handleOpenUrl = async (url?: string) => {
    if (!url) return;
    const full = url.startsWith('http') ? url : `${api.getBaseUrl()}${url}`;
    try { await openUrl(full); } catch { window.open(full, '_blank'); }
  };

  return (
    <>
      <Tooltip title={unreadCount > 0 ? `${unreadCount} 条未读通知` : '通知'}>
        <IconButton size="small" onClick={handleOpen} sx={{ color: 'text.secondary' }}>
          <Badge badgeContent={unreadCount} color="error" max={99}
            sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16 } }}>
            {unreadCount > 0
              ? <NotificationsIcon sx={{ fontSize: 18, color: '#E8451C' }} />
              : <NotificationsNoneIcon sx={{ fontSize: 18 }} />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: 360, maxHeight: 480,
            border: '1px solid', borderColor: 'divider',
            borderRadius: 2, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="subtitle2" fontWeight={600}>通知</Typography>
            {unreadCount > 0 && (
              <Chip label={unreadCount} size="small" color="error"
                sx={{ height: 18, fontSize: 10, '& .MuiChip-label': { px: 0.75 } }} />
            )}
          </Stack>
          {unreadCount > 0 && (
            <Tooltip title="全部标为已读">
              <IconButton size="small" onClick={handleMarkAll} disabled={marking} sx={{ color: 'text.secondary' }}>
                {marking ? <CircularProgress size={14} /> : <DoneAllIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <NotificationsNoneIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary" fontSize={13}>暂无通知</Typography>
            </Box>
          ) : (
            notifications.map((n, i) => (
              <Box key={n.id}>
                <Box
                  sx={{
                    px: 2, py: 1.25, cursor: 'pointer',
                    bgcolor: n.is_read ? 'transparent' : alpha('#E8451C', 0.04),
                    '&:hover': { bgcolor: 'action.hover' },
                    display: 'flex', gap: 1.5, alignItems: 'flex-start',
                  }}
                  onClick={() => !n.is_read && handleMarkOne(n.id)}
                >
                  {/* Unread dot */}
                  <Box sx={{
                    width: 7, height: 7, borderRadius: '50%', mt: 0.7, flexShrink: 0,
                    bgcolor: n.is_read ? 'transparent' : '#E8451C',
                  }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={n.is_read ? 400 : 600} fontSize={12} noWrap>
                      {n.title}
                    </Typography>
                    {n.content && (
                      <Typography variant="caption" color="text.secondary"
                        sx={{ display: 'block', mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.content}
                      </Typography>
                    )}
                    <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.disabled" fontSize={10}>
                        {timeAgo(n.created_at)}
                      </Typography>
                      {n.source_type && (
                        <Chip label={n.source_type} size="small"
                          sx={{ height: 14, fontSize: 9, '& .MuiChip-label': { px: 0.5 } }} />
                      )}
                    </Stack>
                  </Box>
                  {n.source_url && (
                    <Tooltip title="在浏览器中打开">
                      <IconButton size="small" onClick={e => { e.stopPropagation(); handleOpenUrl(n.source_url); }}
                        sx={{ color: 'text.disabled', p: 0.25, '&:hover': { color: 'primary.main' } }}>
                        <OpenInNewIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                {i < notifications.length - 1 && <Divider />}
              </Box>
            ))
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
            <Button fullWidth size="small" variant="text"
              sx={{ fontSize: 12, color: 'text.secondary', textTransform: 'none' }}
              onClick={() => handleOpenUrl('/spaces')}>
              在浏览器中查看全部
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
}
