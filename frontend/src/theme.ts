import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#136B7E', // Company Teal (Middle)
      light: '#2CB69D', // Company Mint (Right)
      dark: '#061A2C', // Company Dark Navy (Left)
    },
    secondary: {
      main: '#1E9895', // Company Bright Teal (Mid-Right)
      light: '#42C8B1', // Accent Aqua
      dark: '#0A4253', // Company Deep Teal-Blue (Mid-Left)
    },
    background: {
      default: '#f4f7f6', // Light grayish background
      paper: '#ffffff',
    },
    text: {
      primary: '#0e1f26',
      secondary: '#4d5d62',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(19, 107, 126, 0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
