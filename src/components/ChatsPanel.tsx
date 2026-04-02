import { useEffect, useState } from 'react';
import { Box, Typography, Skeleton, Alert, Stack, Chip } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { api, Space, ChatBinding } from '../api';

interface Props { space: Space; }

function formatDate(d?: string) {
  if (!d) return '–';
  return new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ChatsPanel({ space }: Props) {
  const [chats, setChats] = useState<ChatBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    api.getChats(String(space.id))
      .then(res => setChats(res.chats))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [space.id]);

  if (loading) return <Box sx={{ p: 3 }}><Skeleton height={40} /><Skeleton height={100} /><Skeleton height={100} /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

  if (chats.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <ChatBubbleOutlineIcon sx={{ fontSize: 40, color: '#D1D1D6', mb: 1 }} />
        <Typography color="text.secondary" fontSize={13}>暂无绑定的群聊</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2.5 }}>
      <Stack spacing={1}>
        {chats.map(chat => (
          <Box key={chat.id} sx={{
            p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider',
            display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2, bgcolor: '#007AFF10',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <ChatBubbleOutlineIcon sx={{ fontSize: 18, color: '#007AFF' }} />
            </Box>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Typography variant="body2" fontWeight={500} noWrap>
                {chat.chat_name || chat.chat_id}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {chat.message_count} 条消息 · 最近 {formatDate(chat.last_message_at)}
              </Typography>
            </Box>
            {chat.remark && <Chip label={chat.remark} size="small" sx={{ fontSize: 10, height: 18 }} />}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
