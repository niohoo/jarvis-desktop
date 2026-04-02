import { useEffect, useState } from 'react';
import {
  Box, Typography, Skeleton, Alert, Stack, Chip, Divider, IconButton, Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { api, DashboardResponse } from '../api';

interface Props { onBack: () => void; }

function KpiCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <Box sx={{
      flex: '1 1 120px', p: 2, borderRadius: 2.5,
      bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
    }}>
      <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: -1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      {sub && <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.3 }}>{sub}</Typography>}
    </Box>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABELS: Record<string, string> = {
  active: '进行中', opportunity: '商机', presale: '售前', delivery: '交付',
  maintenance: '维护', completed: '已完结', archived: '已归档',
};

const RISK_COLORS: Record<string, string> = {
  none: '#34C759', low: '#34C759', medium: '#FF9F0A', high: '#FF3B30',
};

export default function Dashboard({ onBack }: Props) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    api.getDashboard()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ p: 3 }}>{[1,2,3].map(i => <Skeleton key={i} height={60} sx={{ mb: 1 }} />)}</Box>;
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  if (!data) return null;

  const { totals, statusDist, riskDist, topSpaces, recentActivities, shareStats, reqStatus } = data;

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{ p: 2.5 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2.5 }}>
          <Tooltip title="返回">
            <IconButton size="small" onClick={onBack}><ArrowBackIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Typography variant="h6" fontWeight={600}>Dashboard</Typography>
        </Stack>

        {/* KPIs */}
        <Stack direction="row" spacing={1} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
          <KpiCard label="项目空间" value={totals.spaces} />
          <KpiCard label="资料文件" value={totals.materials} />
          <KpiCard label="需求条目" value={totals.requirements} />
          <KpiCard label="群聊绑定" value={totals.chats} />
          <KpiCard label="代码仓库" value={totals.repos} />
          <KpiCard label="活跃用户" value={totals.users} />
          <KpiCard label="分享链接" value={totals.shares} sub={`${shareStats.total_views} 次浏览`} />
        </Stack>

        <Divider sx={{ mb: 2.5 }} />

        {/* Distribution row */}
        <Stack direction="row" spacing={3} sx={{ mb: 3 }}>
          {/* Status Distribution */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>项目状态分布</Typography>
            <Stack spacing={0.5}>
              {statusDist.map(s => (
                <Stack key={s.status} direction="row" alignItems="center" gap={1}>
                  <Typography variant="caption" sx={{ width: 60 }}>{STATUS_LABELS[s.status] || s.status}</Typography>
                  <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(60,60,67,0.08)', overflow: 'hidden' }}>
                    <Box sx={{
                      width: `${Math.min(100, (s.count / Math.max(1, totals.spaces)) * 100)}%`,
                      height: '100%', bgcolor: '#E8451C', borderRadius: 3,
                    }} />
                  </Box>
                  <Typography variant="caption" fontWeight={600} sx={{ width: 24, textAlign: 'right' }}>{s.count}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* Risk Distribution */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>风险分布</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {riskDist.map(r => (
                <Chip key={r.risk_level} label={`${r.risk_level === 'none' ? '无风险' : r.risk_level} ${r.count}`}
                  size="small" sx={{
                    fontWeight: 600, fontSize: 11,
                    color: RISK_COLORS[r.risk_level] || '#8E8E93',
                    bgcolor: `${RISK_COLORS[r.risk_level] || '#8E8E93'}15`,
                  }} />
              ))}
            </Stack>

            <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 2, mb: 1 }}>需求状态</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {reqStatus.map(r => (
                <Chip key={r.status} label={`${r.status} ${r.count}`}
                  size="small" sx={{ fontSize: 10, height: 20 }} />
              ))}
            </Stack>
          </Box>
        </Stack>

        <Divider sx={{ mb: 2.5 }} />

        {/* Top Spaces */}
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>数据量 Top 10</Typography>
        <Box sx={{ overflowX: 'auto', mb: 3 }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <Box component="thead">
              <Box component="tr" sx={{ '& th': { py: 0.8, px: 1, textAlign: 'left', fontWeight: 600, borderBottom: '1px solid', borderColor: 'divider', color: 'text.secondary', fontSize: 11 } }}>
                <Box component="th">项目</Box><Box component="th">客户</Box><Box component="th">负责人</Box>
                <Box component="th" sx={{ textAlign: 'right' }}>群聊</Box>
                <Box component="th" sx={{ textAlign: 'right' }}>资料</Box>
                <Box component="th" sx={{ textAlign: 'right' }}>需求</Box>
                <Box component="th" sx={{ textAlign: 'right' }}>仓库</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {topSpaces.map(s => (
                <Box component="tr" key={s.id} sx={{ '& td': { py: 0.6, px: 1, borderBottom: '1px solid', borderColor: 'divider' }, '&:hover': { bgcolor: 'action.hover' } }}>
                  <Box component="td" sx={{ fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.display_name}</Box>
                  <Box component="td" sx={{ color: 'text.secondary' }}>{s.customer_short_name || '–'}</Box>
                  <Box component="td" sx={{ color: 'text.secondary' }}>{s.owner_short_name || '–'}</Box>
                  <Box component="td" sx={{ textAlign: 'right' }}>{s.chat_count}</Box>
                  <Box component="td" sx={{ textAlign: 'right' }}>{s.material_count}</Box>
                  <Box component="td" sx={{ textAlign: 'right' }}>{s.requirement_count}</Box>
                  <Box component="td" sx={{ textAlign: 'right' }}>{s.repo_count}</Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {/* Recent Activities */}
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>最近动态</Typography>
        <Stack spacing={0.5}>
          {recentActivities.map(act => (
            <Box key={act.id} sx={{
              display: 'flex', alignItems: 'center', gap: 1, py: 0.6, px: 1.5,
              borderRadius: 2, bgcolor: 'rgba(60,60,67,0.02)',
            }}>
              <Chip label={act.source_system} size="small" sx={{ fontSize: 9, height: 16, flexShrink: 0 }} />
              <Typography variant="body2" noWrap sx={{ flex: 1, fontSize: 12 }}>{act.title}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontSize: 10 }}>
                {act.space_name} · {formatDate(act.created_at)}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
