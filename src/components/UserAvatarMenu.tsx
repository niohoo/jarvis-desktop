/**
 * UserAvatarMenu — 点击头像展开个人资料 + 退出登录
 * 参照企业微信风格：左下角头像 → 弹出面板
 */
import { useState, useEffect } from 'react';
import {
  Box, Typography, Avatar, Popover, Button, Divider, Stack
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { api, User } from '../api';

interface Props {
  onLogout: () => void;
  onOpenBrowser: () => void;
}

function getInitials(user: User): string {
  if (user.display_name) return user.display_name.slice(0, 1);
  return user.username.slice(0, 1).toUpperCase();
}

export default function UserAvatarMenu({ onLogout, onOpenBrowser }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [user, setUser] = useState<User | null>(api.getCachedUser());

  useEffect(() => {
    // Refresh user info in background (also updates cache)
    api.me().then(res => setUser(res.user)).catch(() => {});
  }, []);

  const open = !!anchorEl;

  return (
    <>
      {/* Avatar button */}
      <Box
        onClick={e => setAnchorEl(e.currentTarget)}
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: 'pointer',
          borderTop: '1px solid',
          borderColor: 'divider',
          '&:hover': { bgcolor: 'action.hover' },
          transition: 'background 0.15s',
        }}
      >
        <Avatar sx={{
          width: 34, height: 34,
          bgcolor: '#E8451C',
          fontSize: 14, fontWeight: 600,
        }}>
          {user ? getInitials(user) : '?'}
        </Avatar>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Typography variant="body2" fontWeight={500} noWrap fontSize={13}>
            {user?.display_name || user?.username || '加载中...'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap fontSize={11}>
            {user?.phone || user?.role || ''}
          </Typography>
        </Box>
      </Box>

      {/* Popover panel */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{
          sx: {
            width: 260, borderRadius: 3, overflow: 'hidden',
            border: '1px solid', borderColor: 'divider',
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          },
        }}
      >
        {/* User profile card */}
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{
            width: 48, height: 48,
            bgcolor: '#E8451C',
            fontSize: 20, fontWeight: 600,
          }}>
            {user ? getInitials(user) : '?'}
          </Avatar>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {user?.display_name || user?.username || '–'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.phone || ''}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
              {user?.role === 'super_admin' ? '超级管理员'
                : user?.role === 'admin' ? '管理员'
                : user?.role === 'owner' ? '负责人'
                : user?.role === 'member' ? '成员'
                : user?.role || ''}
            </Typography>
          </Box>
        </Box>

        <Divider />

        {/* Actions */}
        <Stack sx={{ p: 1 }}>
          <Button
            fullWidth
            size="small"
            startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
            onClick={() => { setAnchorEl(null); onOpenBrowser(); }}
            sx={{
              justifyContent: 'flex-start', px: 1.5, py: 1, fontSize: 13,
              textTransform: 'none', color: 'text.primary',
              borderRadius: 2,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            在浏览器中打开
          </Button>
          <Button
            fullWidth
            size="small"
            startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
            onClick={() => { setAnchorEl(null); onLogout(); }}
            sx={{
              justifyContent: 'flex-start', px: 1.5, py: 1, fontSize: 13,
              textTransform: 'none', color: '#FF3B30',
              borderRadius: 2,
              '&:hover': { bgcolor: 'rgba(255,59,48,0.06)' },
            }}
          >
            退出登录
          </Button>
        </Stack>
      </Popover>
    </>
  );
}
