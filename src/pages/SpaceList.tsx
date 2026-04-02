import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, List, ListItemButton,
  Chip, Skeleton, InputBase, Paper, Stack,
  Tooltip, IconButton, alpha,
} from '@mui/material';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { api, Space } from '../api';

interface SpaceListProps {
  onSelectSpace: (space: Space) => void;
  selectedSpaceId?: number;
}

const STATUS_LABELS: Record<string, string> = {
  active: '进行中', opportunity: '商机', presale: '售前',
  delivery: '交付', maintenance: '维护', completed: '已完结', archived: '已归档',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#34C759', opportunity: '#007AFF', presale: '#FF9F0A',
  delivery: '#5856D6', maintenance: '#FF6B00', completed: '#8E8E93', archived: '#C7C7CC',
};

const RISK_COLORS: Record<string, string> = {
  none: '#34C759', low: '#34C759', medium: '#FF9F0A', high: '#FF3B30',
};

const AUTO_REFRESH_INTERVAL = 60_000; // 60s

export default function SpaceList({ onSelectSpace, selectedSpaceId }: SpaceListProps) {
  const [allSpaces, setAllSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [mineOnly, setMineOnly] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadSpaces = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      // Always fetch both so we can switch tabs without re-fetching
      const [mine, all] = await Promise.all([
        api.getSpaces(true),
        api.getSpaces(false),
      ]);
      // Merge: tag each with ownership info
      const mineIds = new Set((mine.spaces || []).map(s => s.id));
      const mergedMap = new Map<number, Space & { _mine?: boolean }>();
      (all.spaces || []).forEach(s => mergedMap.set(s.id, { ...s, _mine: mineIds.has(s.id) }));
      (mine.spaces || []).forEach(s => mergedMap.set(s.id, { ...s, _mine: true }));
      setAllSpaces(Array.from(mergedMap.values()).sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ));
    } catch (e) { console.error(e); }
    if (!silent) setLoading(false); else setRefreshing(false);
  }, []);

  useEffect(() => {
    loadSpaces();
    const timer = setInterval(() => loadSpaces(true), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [loadSpaces]);

  // Filter chain
  const visible = allSpaces
    .filter(s => !mineOnly || (s as any)._mine)
    .filter(s => statusFilter === 'all' || s.status === statusFilter)
    .filter(s =>
      s.display_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.customer_short_name || '').toLowerCase().includes(search.toLowerCase())
    );

  // Unique statuses present in current mine/all slice
  const presentStatuses = Array.from(new Set(
    allSpaces.filter(s => !mineOnly || (s as any)._mine).map(s => s.status)
  )).filter(Boolean);

  // Count for tab badges
  const mineCount = allSpaces.filter(s => (s as any)._mine).length;
  const allCount = allSpaces.length;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <Box sx={{ px: 1.5, pt: 1.25, pb: 0.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>
            项目空间
          </Typography>
          <Tooltip title="刷新列表">
            <IconButton size="small" onClick={() => loadSpaces(false)}
              sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
              <RefreshIcon sx={{ fontSize: 14, animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* 我的/全部 toggle */}
        <Box sx={{ display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', mb: 1 }}>
          {[
            { key: true, label: `我的空间`, count: mineCount },
            { key: false, label: `全部空间`, count: allCount },
          ].map(({ key, label, count }) => (
            <Box key={String(key)}
              onClick={() => { setMineOnly(key); setStatusFilter('all'); }}
              sx={{
                flex: 1, py: 0.35, px: 0.5, textAlign: 'center', cursor: 'pointer',
                fontSize: '0.7rem', fontWeight: 500, userSelect: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4,
                bgcolor: mineOnly === key ? 'primary.main' : 'transparent',
                color: mineOnly === key ? 'white' : 'text.secondary',
                transition: 'all 0.15s',
                '&:hover': { bgcolor: mineOnly === key ? 'primary.dark' : 'action.hover' },
              }}
            >
              {label}
              <Box component="span" sx={{
                fontSize: '0.6rem',
                bgcolor: mineOnly === key ? 'rgba(255,255,255,0.25)' : alpha('#E8451C', 0.12),
                color: mineOnly === key ? 'white' : 'primary.main',
                borderRadius: 1, px: 0.5, lineHeight: 1.6,
              }}>
                {count}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Search */}
        <Paper elevation={0} sx={{
          display: 'flex', alignItems: 'center', px: 1, py: 0.35,
          bgcolor: 'background.default', borderRadius: 1.5,
          border: '1px solid', borderColor: 'divider',
        }}>
          <SearchIcon sx={{ color: 'text.disabled', mr: 0.5, fontSize: 14 }} />
          <InputBase
            placeholder="搜索空间..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ flex: 1, fontSize: 12, '& input': { py: 0 } }}
          />
        </Paper>
      </Box>

      {/* Status filter chips */}
      {presentStatuses.length > 1 && (
        <Box sx={{ px: 1.5, pt: 0.5, pb: 0.25 }}>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            <Chip
              label="全部"
              size="small"
              onClick={() => setStatusFilter('all')}
              variant={statusFilter === 'all' ? 'filled' : 'outlined'}
              sx={{ height: 18, fontSize: 9, '& .MuiChip-label': { px: 0.75 },
                bgcolor: statusFilter === 'all' ? '#E8451C' : 'transparent',
                color: statusFilter === 'all' ? 'white' : 'text.secondary',
                borderColor: statusFilter === 'all' ? '#E8451C' : 'divider',
              }}
            />
            {presentStatuses.map(st => (
              <Chip
                key={st}
                label={STATUS_LABELS[st] || st}
                size="small"
                onClick={() => setStatusFilter(statusFilter === st ? 'all' : st)}
                variant={statusFilter === st ? 'filled' : 'outlined'}
                sx={{
                  height: 18, fontSize: 9, '& .MuiChip-label': { px: 0.75 },
                  bgcolor: statusFilter === st ? STATUS_COLORS[st] : 'transparent',
                  color: statusFilter === st ? 'white' : 'text.secondary',
                  borderColor: statusFilter === st ? STATUS_COLORS[st] : 'divider',
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Space list */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ px: 1.5, pt: 1 }}>
            {[1, 2, 3, 4].map(i => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                <Skeleton variant="rounded" width={24} height={24} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton height={14} width="70%" />
                  <Skeleton height={10} width="40%" />
                </Box>
              </Box>
            ))}
          </Box>
        ) : visible.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="text.disabled" fontSize={12}>
              {search ? '没有匹配的空间' : '暂无空间'}
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ px: 0.75, py: 0.5 }}>
            {visible.map(space => {
              const isSelected = space.id === selectedSpaceId;
              const statusColor = STATUS_COLORS[space.status] || '#8E8E93';
              const riskColor = RISK_COLORS[space.risk_level || 'none'] || '#34C759';
              return (
                <ListItemButton
                  key={space.id}
                  selected={isSelected}
                  onClick={() => onSelectSpace(space)}
                  sx={{
                    borderRadius: 1.5, mb: 0.25, py: 0.6, px: 1,
                    '&.Mui-selected': {
                      bgcolor: alpha('#E8451C', 0.09),
                      '&:hover': { bgcolor: alpha('#E8451C', 0.13) },
                    },
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  {/* Folder icon with status color */}
                  <Box sx={{
                    width: 28, height: 28, borderRadius: 1.5, flexShrink: 0, mr: 1,
                    bgcolor: alpha(statusColor, 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FolderSpecialIcon sx={{ fontSize: 15, color: statusColor }} />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={isSelected ? 600 : 400}
                      fontSize={12} noWrap
                      color={isSelected ? 'primary.main' : 'text.primary'}>
                      {space.display_name}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.2 }}>
                      {space.customer_short_name && (
                        <Typography variant="caption" color="text.disabled" fontSize={10} noWrap sx={{ maxWidth: 80 }}>
                          {space.customer_short_name}
                        </Typography>
                      )}
                      {space.customer_short_name && <Box sx={{ width: 2, height: 2, borderRadius: '50%', bgcolor: 'text.disabled' }} />}
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: riskColor, flexShrink: 0 }} />
                      <Typography variant="caption" fontSize={10}
                        sx={{ color: statusColor, fontWeight: 500 }}>
                        {STATUS_LABELS[space.status] || space.status}
                      </Typography>
                    </Stack>
                  </Box>
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>

      {/* Footer count */}
      <Box sx={{ px: 1.5, py: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.disabled" fontSize={10}>
          显示 {visible.length} / {allSpaces.length} 个空间
        </Typography>
      </Box>
    </Box>
  );
}
