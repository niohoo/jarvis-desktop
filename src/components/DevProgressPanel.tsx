import { useEffect, useState } from 'react';
import { Box, Typography, Skeleton, Alert, Stack, Divider, Chip } from '@mui/material';
import { api, Space, DevProgressResponse } from '../api';

interface Props { space: Space; }

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Box sx={{
      flex: 1, minWidth: 100, p: 1.5, borderRadius: 2,
      bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
    }}>
      <Typography variant="h5" fontWeight={700} sx={{ color: color || 'text.primary' }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function DevProgressPanel({ space }: Props) {
  const [data, setData] = useState<DevProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    api.getDevProgress(String(space.id))
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [space.id]);

  if (loading) return <Box sx={{ p: 3 }}><Skeleton height={40} /><Skeleton height={200} /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  if (!data) return null;

  const { summary } = data;

  return (
    <Box sx={{ p: 2.5 }}>
      {/* KPI cards */}
      <Stack direction="row" spacing={1} sx={{ mb: 2.5 }} flexWrap="wrap" useFlexGap>
        <StatCard label="总需求" value={summary.total_requirements} />
        <StatCard label="已批准" value={summary.approved} color="#34C759" />
        <StatCard label="已提交 GitLab" value={summary.submitted_to_gitlab} color="#007AFF" />
        <StatCard label="已关闭" value={summary.closed} color="#8E8E93" />
      </Stack>

      {/* GitLab Issues */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <StatCard label="Issue 打开" value={summary.issues_opened} color="#FF9F0A" />
        <StatCard label="Issue 关闭" value={summary.issues_closed} color="#34C759" />
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* Recent GitLab activities */}
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
        最近 GitLab 动态
      </Typography>

      {data.recent_activities.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          暂无 GitLab 活动
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {data.recent_activities.map(act => (
            <Box key={act.id} sx={{
              display: 'flex', alignItems: 'center', gap: 1, py: 0.8, px: 1.5,
              borderRadius: 2, bgcolor: 'rgba(60,60,67,0.03)',
            }}>
              <Chip
                label={act.activity_type.replace('_', ' ')}
                size="small"
                sx={{ fontSize: 10, height: 18, flexShrink: 0 }}
              />
              <Typography variant="body2" sx={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {act.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontSize: 10 }}>
                {formatDate(act.created_at)}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
