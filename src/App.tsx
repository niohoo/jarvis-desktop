import { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, Button, Divider } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { darkTheme, lightTheme } from './theme';
import { api, Space } from './api';
import Login from './pages/Login';
import SpaceList from './pages/SpaceList';
import SpaceTabView from './components/SpaceTabView';
import Dashboard from './pages/Dashboard';
import TopBar from './components/TopBar';
import UserAvatarMenu from './components/UserAvatarMenu';

type ThemeMode = 'dark' | 'light';
type View = 'spaces' | 'dashboard';

function App() {
  const [loggedIn, setLoggedIn] = useState(api.isLoggedIn());
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [themeMode] = useState<ThemeMode>('light');
  const [view, setView] = useState<View>('spaces');

  useEffect(() => {
    if (loggedIn) {
      api.me().catch(() => {
        api.clearToken();
        setLoggedIn(false);
      });
    }
  }, [loggedIn]);

  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  const handleOpenInBrowser = async () => {
    const url = api.getSsoUrl('/spaces');
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleLogout = () => {
    api.clearToken();
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Login onLogin={() => setLoggedIn(true)} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>

        <TopBar />

        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Sidebar */}
          <Box sx={{
            width: 280,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Dashboard toggle */}
            <Box sx={{ px: 1.5, pt: 1 }}>
              <Button
                fullWidth
                variant={view === 'dashboard' ? 'contained' : 'text'}
                size="small"
                startIcon={<DashboardIcon sx={{ fontSize: 16 }} />}
                onClick={() => { setView(view === 'dashboard' ? 'spaces' : 'dashboard'); setSelectedSpace(null); }}
                sx={{
                  justifyContent: 'flex-start', fontSize: 12, textTransform: 'none',
                  color: view === 'dashboard' ? '#fff' : 'text.secondary',
                  bgcolor: view === 'dashboard' ? '#E8451C' : 'transparent',
                  '&:hover': view === 'dashboard'
                    ? { bgcolor: '#D63A15' }
                    : { bgcolor: 'action.hover' },
                }}
              >
                Dashboard
              </Button>
            </Box>

            <Divider sx={{ my: 0.5, mx: 1.5 }} />

            {/* Space list — takes remaining space */}
            <SpaceList
              selectedSpaceId={selectedSpace?.id}
              onSelectSpace={(s) => { setSelectedSpace(s); setView('spaces'); }} />

            {/* User avatar + account menu (bottom, enterprise WeChat style) */}
            <UserAvatarMenu onLogout={handleLogout} onOpenBrowser={handleOpenInBrowser} />
          </Box>

          {/* Main content */}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {view === 'dashboard' ? (
              <Dashboard onBack={() => setView('spaces')} />
            ) : selectedSpace ? (
              <SpaceTabView
                space={selectedSpace}
                onBack={() => setSelectedSpace(null)}
              />
            ) : (
              <Box sx={{
                height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 2,
              }}>
                <Box sx={{ width: 80, height: 80, borderRadius: 4, overflow: 'hidden' }}>
                  <img src="/logo-icon.png" alt="Jarvis" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
                <Box sx={{ color: 'text.secondary', fontSize: 14 }}>
                  选择左侧项目空间开始浏览文件
                </Box>
              </Box>
            )}
          </Box>

        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
