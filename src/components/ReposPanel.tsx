import { useEffect, useState } from 'react';
import { Box, Typography, Skeleton, Alert, Stack, Chip, Button } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { api, Space, Repo } from '../api';
import { openUrl } from '@tauri-apps/plugin-opener';

interface Props { space: Space; }

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  main: { label: '主仓库', color: '#34C759' },
  frontend: { label: '前端', color: '#007AFF' },
  backend: { label: '后端', color: '#FF9F0A' },
  doc: { label: '文档', color: '#8E8E93' },
};

export default function ReposPanel({ space }: Props) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    api.getRepos(String(space.id))
      .then(res => setRepos(res.repos))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [space.id]);

  if (loading) return <Box sx={{ p: 3 }}><Skeleton height={40} /><Skeleton height={100} /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

  if (repos.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CodeIcon sx={{ fontSize: 40, color: '#D1D1D6', mb: 1 }} />
        <Typography color="text.secondary" fontSize={13}>暂无关联的仓库</Typography>
      </Box>
    );
  }

  const handleOpen = async (repo: Repo) => {
    const url = repo.repo_url || (repo.gitlab_project_path ? `https://gitlab.com/${repo.gitlab_project_path}` : '');
    if (url) { try { await openUrl(url); } catch { /* */ } }
  };

  return (
    <Box sx={{ p: 2.5 }}>
      <Stack spacing={1}>
        {repos.map(repo => {
          const typeInfo = TYPE_LABELS[repo.repo_type] || { label: repo.repo_type, color: '#8E8E93' };
          return (
            <Box key={repo.id} sx={{
              p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider',
              display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: 2, bgcolor: `${typeInfo.color}10`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <CodeIcon sx={{ fontSize: 18, color: typeInfo.color }} />
              </Box>
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <Typography variant="body2" fontWeight={500} noWrap>{repo.repo_name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {repo.gitlab_project_path || repo.description || ''}
                </Typography>
              </Box>
              <Chip label={typeInfo.label} size="small" sx={{ fontSize: 10, height: 18, color: typeInfo.color, bgcolor: `${typeInfo.color}15`, flexShrink: 0 }} />
              <Button size="small" onClick={() => handleOpen(repo)} sx={{ minWidth: 'auto', p: 0.5 }}>
                <OpenInNewIcon sx={{ fontSize: 14 }} />
              </Button>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
