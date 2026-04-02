import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import ChecklistIcon from '@mui/icons-material/Checklist';
import TimelineIcon from '@mui/icons-material/Timeline';
import ChatIcon from '@mui/icons-material/Chat';
import CodeIcon from '@mui/icons-material/Code';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { Space } from '../api';
import FileExplorer from '../pages/FileExplorer';
import ChecklistPanel from './ChecklistPanel';
import DevProgressPanel from './DevProgressPanel';
import ChatsPanel from './ChatsPanel';
import ReposPanel from './ReposPanel';
import RequirementsPanel from './RequirementsPanel';

interface Props {
  space: Space;
  onBack: () => void;
}

const TABS = [
  { label: '文件', icon: <FolderIcon sx={{ fontSize: 16 }} /> },
  { label: '清单', icon: <ChecklistIcon sx={{ fontSize: 16 }} /> },
  { label: '进度', icon: <TimelineIcon sx={{ fontSize: 16 }} /> },
  { label: '需求', icon: <AssignmentIcon sx={{ fontSize: 16 }} /> },
  { label: '聊天', icon: <ChatIcon sx={{ fontSize: 16 }} /> },
  { label: '仓库', icon: <CodeIcon sx={{ fontSize: 16 }} /> },
];

export default function SpaceTabView({ space, onBack }: Props) {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tab bar */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 1 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons={false}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              py: 0,
              px: 1.5,
              fontSize: 12,
              fontWeight: 500,
              textTransform: 'none',
              minWidth: 'auto',
              gap: 0.5,
            },
            '& .Mui-selected': { color: '#E8451C' },
            '& .MuiTabs-indicator': { backgroundColor: '#E8451C', height: 2 },
          }}
        >
          {TABS.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Box>

      {/* Tab panels */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {tab === 0 && <FileExplorer space={space} onBack={onBack} />}
        {tab === 1 && <ChecklistPanel space={space} />}
        {tab === 2 && <DevProgressPanel space={space} />}
        {tab === 3 && <RequirementsPanel space={space} />}
        {tab === 4 && <ChatsPanel space={space} />}
        {tab === 5 && <ReposPanel space={space} />}
      </Box>
    </Box>
  );
}
