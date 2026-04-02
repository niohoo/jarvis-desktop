import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#E8451C' },
    secondary: { main: '#FF9F0A' },
    background: {
      default: '#1C1C1E',
      paper: '#2C2C2E',
    },
    divider: 'rgba(255,255,255,0.1)',
    text: {
      primary: '#FFFFFF',
      secondary: '#EBEBF5',
    },
  },
  typography: {
    fontFamily: '"SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle2: { fontWeight: 500 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});

// iOS-style light theme — this is the default
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#E8451C' },        // Jarvis orange-red
    secondary: { main: '#FF9F0A' },       // iOS orange
    background: {
      default: '#F2F2F7',                 // iOS systemGroupedBackground
      paper: '#FFFFFF',                   // iOS secondarySystemGroupedBackground
    },
    divider: 'rgba(60,60,67,0.1)',        // iOS separator
    text: {
      primary: '#000000',                 // iOS label
      secondary: '#3C3C43',              // iOS secondaryLabel
    },
    action: {
      hover: 'rgba(232,69,28,0.05)',
      selected: 'rgba(232,69,28,0.08)',
    },
  },
  typography: {
    fontFamily: '"SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    h5: { fontWeight: 600, letterSpacing: -0.5 },
    h6: { fontWeight: 600, letterSpacing: -0.3 },
    subtitle2: { fontWeight: 500 },
    body2: { color: '#3C3C43' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500 },
        containedPrimary: {
          background: '#E8451C',
          '&:hover': { background: '#D63A15' },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '&.Mui-selected': {
            backgroundColor: 'rgba(232,69,28,0.08)',
            '&:hover': { backgroundColor: 'rgba(232,69,28,0.12)' },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
          border: '1px solid rgba(60,60,67,0.1)',
        },
      },
    },
  },
});
