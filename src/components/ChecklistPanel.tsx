import { useEffect, useState } from 'react';
import { Box, Typography, LinearProgress, Chip, Skeleton, Alert, Stack } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { api, Space, ChecklistResponse } from '../api';

interface Props { space: Space; }

const STAGE_LABELS: Record<string, string> = {
  opportunity: '商机阶段', presale: '售前阶段', delivery: '交付阶段',
  maintenance: '维护阶段', completed: '已完结', archived: '已归档',
};

export default function ChecklistPanel({ space }: Props) {
  const [data, setData] = useState<ChecklistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    api.getChecklist(String(space.id))
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [space.id]);

  if (loading) return <Box sx={{ p: 3 }}><Skeleton height={40} /><Skeleton height={200} /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  if (!data) return null;

  const { current_stage } = data;
  const rate = current_stage.completion_rate;

  return (
    <Box sx={{ p: 2.5 }}>
      {/* Stage + Rate */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={600}>
            {STAGE_LABELS[current_stage.stage] || current_stage.stage}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {data.file_count} 个文件已归档
          </Typography>
        </Box>
        <Chip
          label={`完成率 ${rate}%`}
          size="small"
          sx={{
            fontWeight: 600,
            bgcolor: rate >= 80 ? '#34C75920' : rate >= 50 ? '#FF9F0A20' : '#FF3B3020',
            color: rate >= 80 ? '#34C759' : rate >= 50 ? '#FF9F0A' : '#FF3B30',
          }}
        />
      </Stack>

      {/* Progress bar */}
      <LinearProgress
        variant="determinate"
        value={rate}
        sx={{
          height: 6, borderRadius: 3, mb: 2.5,
          bgcolor: 'rgba(60,60,67,0.08)',
          '& .MuiLinearProgress-bar': {
            bgcolor: rate >= 80 ? '#34C759' : rate >= 50 ? '#FF9F0A' : '#E8451C',
            borderRadius: 3,
          },
        }}
      />

      {/* Checklist items */}
      <Stack spacing={0.5}>
        {current_stage.checklist.map(item => {
          const present = current_stage.present.includes(item.key);
          return (
            <Box
              key={item.key}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1, py: 0.8, px: 1.5,
                borderRadius: 2,
                bgcolor: present ? 'rgba(52,199,89,0.05)' : 'rgba(255,59,48,0.03)',
                border: '1px solid',
                borderColor: present ? 'rgba(52,199,89,0.15)' : (item.required ? 'rgba(255,59,48,0.12)' : 'rgba(60,60,67,0.08)'),
              }}
            >
              {present
                ? <CheckCircleOutlineIcon sx={{ fontSize: 16, color: '#34C759' }} />
                : <ErrorOutlineIcon sx={{ fontSize: 16, color: item.required ? '#FF3B30' : '#FF9F0A' }} />
              }
              <Typography variant="body2" sx={{ flex: 1, fontSize: 13 }}>
                {item.label}
              </Typography>
              {item.required && !present && (
                <Chip label="必填" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#FF3B3015', color: '#FF3B30' }} />
              )}
              {!item.required && !present && (
                <Chip label="建议" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#FF9F0A15', color: '#FF9F0A' }} />
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
