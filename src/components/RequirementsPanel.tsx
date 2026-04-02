import { useEffect, useState } from 'react';
import { Box, Typography, Skeleton, Alert, Stack, Chip, Divider } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { api, Space, Requirement } from '../api';
import { openUrl } from '@tauri-apps/plugin-opener';

interface Props { space: Space; }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  drafted: { label: '草稿', color: '#8E8E93' },
  submitted: { label: '待审', color: '#FF9F0A' },
  approved: { label: '已批准', color: '#34C759' },
  rejected: { label: '已驳回', color: '#FF3B30' },
  submitted_to_gitlab: { label: '已提交', color: '#007AFF' },
  feedback_received: { label: '有反馈', color: '#AF52DE' },
  closed: { label: '已关闭', color: '#8E8E93' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  high: { label: 'P1', color: '#FF3B30' },
  medium: { label: 'P2', color: '#FF9F0A' },
  low: { label: 'P3', color: '#34C759' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

export default function RequirementsPanel({ space }: Props) {
  const [items, setItems] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    api.getRequirements(String(space.id))
      .then(res => setItems(res.items))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [space.id]);

  if (loading) return <Box sx={{ p: 3 }}><Skeleton height={40} /><Skeleton height={100} /><Skeleton height={100} /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

  if (items.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <AssignmentIcon sx={{ fontSize: 40, color: '#D1D1D6', mb: 1 }} />
        <Typography color="text.secondary" fontSize={13}>暂无需求</Typography>
      </Box>
    );
  }

  // Group by status
  const grouped: Record<string, Requirement[]> = {};
  items.forEach(item => {
    const key = item.status || 'drafted';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  return (
    <Box sx={{ p: 2.5 }}>
      {/* Summary chips */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        {Object.entries(grouped).map(([status, list]) => {
          const info = STATUS_MAP[status] || { label: status, color: '#8E8E93' };
          return (
            <Chip key={status} label={`${info.label} ${list.length}`} size="small"
              sx={{ fontSize: 11, fontWeight: 500, color: info.color, bgcolor: `${info.color}12` }} />
          );
        })}
      </Stack>

      <Divider sx={{ mb: 1.5 }} />

      {/* List */}
      <Stack spacing={0.5}>
        {items.map(item => {
          const statusInfo = STATUS_MAP[item.status] || { label: item.status, color: '#8E8E93' };
          const priorityInfo = PRIORITY_MAP[item.priority] || { label: item.priority, color: '#8E8E93' };
          return (
            <Box key={item.id} sx={{
              p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider',
              display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <Chip label={priorityInfo.label} size="small"
                sx={{ fontSize: 10, height: 18, fontWeight: 700, color: priorityInfo.color, bgcolor: `${priorityInfo.color}15`, flexShrink: 0 }} />
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <Typography variant="body2" fontWeight={500} noWrap fontSize={13}>
                  {item.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontSize={11}>
                  {formatDate(item.created_at)} · {item.reviewer_name || '待审'}
                </Typography>
              </Box>
              <Chip label={statusInfo.label} size="small"
                sx={{ fontSize: 10, height: 18, color: statusInfo.color, bgcolor: `${statusInfo.color}12`, flexShrink: 0 }} />
              {item.gitlab_issue_url && (
                <Box
                  component="button"
                  onClick={() => openUrl(item.gitlab_issue_url!).catch(() => {})}
                  sx={{ border: 'none', bgcolor: 'transparent', cursor: 'pointer', p: 0.5, display: 'flex' }}
                >
                  <OpenInNewIcon sx={{ fontSize: 14, color: '#007AFF' }} />
                </Box>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
