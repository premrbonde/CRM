import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store';
import { logout } from '../store/slices/authSlice';
import { sendChatMessage } from '../store/slices/chatSlice';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  AddCircleOutlined as LogIcon,
  History as HistoryIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Search as SearchIcon,
  NotificationsNone as NotificationsIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  AutoAwesome as SparklesIcon,
  CalendarToday as CalendarIcon,
  Inventory as ProductsIcon,
} from '@mui/icons-material';

const drawerWidth = 260;

export default function Layout() {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [notiAnchor, setNotiAnchor] = useState<null | HTMLElement>(null);

  const notiOpen = Boolean(notiAnchor);
  const handleNotiClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setNotiAnchor(event.currentTarget);
  };
  const handleNotiClose = () => {
    setNotiAnchor(null);
  };

  // Register command palette shortcut listeners (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    dispatch(logout());
    navigate('/login');
  };

  // Direct AI Conversational directive helper
  const executeDirectAICommand = (command: string) => {
    dispatch({
      type: 'chat/addManualMessage',
      payload: {
        id: Math.random().toString(36).substring(7),
        sender: 'user',
        text: command,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    });
    dispatch(sendChatMessage(command));
    navigate('/log');
  };



  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Log Interaction', icon: <LogIcon />, path: '/log' },
    { text: 'Interaction History', icon: <HistoryIcon />, path: '/history' },
    { text: 'HCP Directory', icon: <PeopleIcon />, path: '/doctors' },
    { text: 'Calendar', icon: <CalendarIcon />, path: '/calendar' },
    { text: 'Products', icon: <ProductsIcon />, path: '/products' },
    { text: 'System Configuration', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#061A2C',
        color: 'white',
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
    >
      {/* Premium AIVOA Logo branding */}
      <Box sx={{ pt: 2.5, pb: 0, px: 2.5, display: 'flex', justifyContent: 'center', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', minHeight: '85px' }}>
        <Box
          component="img"
          src="/sidebar_banner.png"
          alt="AIVOA Sales Copilot"
          sx={{
            maxWidth: '80%',
            height: 'auto',
            // maxHeight: '100px', 
            objectFit: 'contain',
            transition: 'opacity 0.3s ease',
            '&:hover': { opacity: 0.95 }
          }}
        />
      </Box>

      {/* Navigation List */}
      <List sx={{ flexGrow: 1, px: 1.5, py: 3, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 3,
                  py: 1.1,
                  px: 2,
                  bgcolor: isActive ? 'rgba(44, 182, 157, 0.12)' : 'transparent',
                  color: isActive ? '#2CB69D' : 'rgba(255, 255, 255, 0.7)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: isActive ? 'rgba(44, 182, 157, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    color: isActive ? '#2CB69D' : 'white',
                    '& .MuiListItemIcon-root': { color: isActive ? '#2CB69D' : 'white' }
                  },
                }}
              >
                <ListItemIcon sx={{ color: isActive ? '#2CB69D' : 'rgba(255, 255, 255, 0.6)', minWidth: 38 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  slotProps={{ primary: { sx: { fontSize: '0.86rem', fontWeight: isActive ? 800 : 600, letterSpacing: '0.1px' } } }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Bottom Representative user Profile card */}
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
      <Box
        onClick={handleMenuOpen}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <Avatar
            sx={{ width: 38, height: 38, border: '1px solid rgba(255,255,255,0.1)', bgcolor: '#2CB69D', fontSize: '0.85rem', fontWeight: 700 }}
          >
            {user ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'AR'}
          </Avatar>
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: '#2CB69D',
              border: '2px solid #061A2C',
            }}
          />
        </Box>
        <Box sx={{ overflow: 'hidden', flexGrow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 800, color: 'white', fontSize: '0.8rem' }} noWrap>
            {user?.name || 'Alex Rep'}
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', fontWeight: 600 }}
            noWrap
          >
            {user?.role || 'Medical Representative'}
          </Typography>
        </Box>
        <KeyboardArrowDownIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }} />
      </Box>
    </Box>
  );

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return {
          title: 'Good morning, Alex! 👋',
          subtitle: "Here's your AI-powered overview for today."
        };
      case '/log':
      case '/chat':
        return {
          title: 'Log HCP Interaction',
          subtitle: 'Capture detailed interactions and let AI assist you'
        };
      case '/history':
        return {
          title: 'Interaction History',
          subtitle: 'Audit past relationship touchpoints and visit details'
        };
      case '/doctors':
        return {
          title: 'HCP Directory',
          subtitle: 'Review relationship intelligence profiles and details'
        };
      case '/calendar':
        return {
          title: 'Call Planner',
          subtitle: 'Schedule and optimize doctor visits'
        };
      case '/products':
        return {
          title: 'Product Portfolio',
          subtitle: 'Briefing indicators and sample levels'
        };
      case '/settings':
        return {
          title: 'AI Configurations',
          subtitle: 'Manage Groq keys and engine run modes'
        };
      default:
        return {
          title: 'AIVOA Sales Copilot',
          subtitle: ''
        };
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F4F7FC' }}>
      <CssBaseline />

      {/* Top Navbar Header */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          boxShadow: 'none',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          bgcolor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 3 }, height: 64 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 1, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            {/* Page Header Title inside Navbar */}
            <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#061A2C', lineHeight: 1.2 }}>
                {getPageTitle().title}
              </Typography>
              {getPageTitle().subtitle && (
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 550, display: 'block', fontSize: '0.68rem', mt: 0.1 }}>
                  {getPageTitle().subtitle}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Centered Capsule command palette input trigger */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1, justifyContent: 'center', mx: 4 }}>
            <TextField
              size="small"
              placeholder="Ask Omni AI anything..."
              onClick={() => setPaletteOpen(true)}
              slotProps={{
                input: {
                  readOnly: true,
                  startAdornment: <SparklesIcon fontSize="small" sx={{ color: 'primary.main', mr: 1 }} />,
                  endAdornment: (
                    <Box sx={{ border: '1px solid rgba(0,0,0,0.06)', px: 0.8, py: 0.2, borderRadius: 1.2, bgcolor: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.62rem', fontWeight: 700 }}>
                        ⌘K
                      </Typography>
                    </Box>
                  )
                }
              }}
              sx={{
                width: '100%',
                maxWidth: 480,
                cursor: 'pointer',
                bgcolor: 'rgba(0, 0, 0, 0.015)',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3.5,
                  borderColor: 'rgba(0,0,0,0.05)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }
              }}
            />
          </Box>

          {/* User profile dropdown triggers */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton size="small" sx={{ color: 'text.secondary', display: { xs: 'flex', md: 'none' } }} onClick={() => setPaletteOpen(true)}>
              <SearchIcon fontSize="medium" />
            </IconButton>

            {/* Notifications Bell */}
            <IconButton
              size="small"
              onClick={handleNotiClick}
              sx={{ color: 'text.secondary', position: 'relative' }}
            >
              <NotificationsIcon fontSize="medium" />
              <Box
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  bgcolor: '#d32f2f',
                  color: 'white',
                  borderRadius: '50%',
                  width: 14,
                  height: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.58rem',
                  fontWeight: 800,
                }}
              >
                3
              </Box>
            </IconButton>

            {/* Notifications Menu Popover */}
            <Menu
              anchorEl={notiAnchor}
              open={notiOpen}
              onClose={handleNotiClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1.5,
                    width: 320,
                    borderRadius: 3.5,
                    boxShadow: '0 8px 32px rgba(6, 26, 44, 0.08)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    p: 1
                  }
                }
              }}
            >
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.05)', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                  Notifications
                </Typography>
              </Box>
              {[
                { text: "Dr. Verma requested a follow-up visit regarding NeuroShield.", sub: "1 hour ago", action: () => { navigate('/doctors?select=Dr. Verma'); handleNotiClose(); } },
                { text: "AI Alert: 3 doctors have not been visited in 21 days.", sub: "3 hours ago", action: () => { navigate('/doctors?filter=risk'); handleNotiClose(); } },
                { text: "CardioPlus formulary approved at Apollo Hospital!", sub: "1 day ago", action: () => { navigate('/products'); handleNotiClose(); } }
              ].map((noti, idx) => (
                <MenuItem
                  key={idx}
                  onClick={noti.action}
                  sx={{
                    whiteSpace: 'normal',
                    borderRadius: 2.5,
                    p: 1.2,
                    mb: 0.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    '&:hover': { bgcolor: 'rgba(44, 182, 157, 0.04)' }
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 650, fontSize: '0.75rem', color: 'text.primary', lineHeight: 1.3 }}>
                    {noti.text}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.62rem', mt: 0.5, fontWeight: 550 }}>
                    {noti.sub}
                  </Typography>
                </MenuItem>
              ))}
            </Menu>

            {/* Sparkles Action */}
            <IconButton
              onClick={() => setAiOpen(true)}
              size="small"
              sx={{
                color: 'primary.main',
                bgcolor: 'rgba(19, 107, 126, 0.05)',
                width: 34,
                height: 34,
                '&:hover': { bgcolor: 'rgba(19, 107, 126, 0.12)' }
              }}
            >
              <SparklesIcon sx={{ fontSize: 16 }} />
            </IconButton>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1.8, borderColor: 'rgba(0,0,0,0.06)' }} />

            <Box
              onClick={handleMenuOpen}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.2,
                cursor: 'pointer',
                p: 0.5,
                borderRadius: 2,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }
              }}
            >
              <Avatar
                sx={{ width: 32, height: 32, border: '1px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', bgcolor: '#2CB69D', fontSize: '0.75rem', fontWeight: 700 }}
              >
                {user ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'AR'}
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark', display: { xs: 'none', sm: 'block' } }}>
                {user?.name || 'Alex Rep'}
              </Typography>
              <KeyboardArrowDownIcon sx={{ color: 'text.secondary', fontSize: 16, display: { xs: 'none', sm: 'block' } }} />
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }}>Settings</MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawers */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="navigation drawers"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: '#061A2C',
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid rgba(0,0,0,0.05)',
              bgcolor: '#061A2C',
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Outlet content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 2 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          bgcolor: '#F4F7FC',
        }}
      >
        <Outlet />
      </Box>

      {/* Omni AI Command Palette Overlay Dialog */}
      <Dialog
        open={paletteOpen}
        onClose={() => { setPaletteOpen(false); setPaletteSearch(''); }}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              p: 1.5,
              bgcolor: 'background.paper',
              boxShadow: '0 24px 64px rgba(6, 26, 44, 0.12)',
            }
          }
        }}
      >
        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SparklesIcon color="primary" sx={{ fontSize: 16 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 850, color: 'primary.dark' }}>
              Omni AI Command Menu
            </Typography>
          </Box>
          <TextField
            fullWidth
            size="small"
            autoFocus
            placeholder="Type to filter or ask AI..."
            value={paletteSearch}
            onChange={(e) => setPaletteSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && paletteSearch.trim()) {
                executeDirectAICommand(paletteSearch);
                setPaletteSearch('');
                setPaletteOpen(false);
              }
            }}
            slotProps={{
              input: {
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', fontSize: 16, mr: 1 }} />
              }
            }}
            sx={{
              mt: 0.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                fontSize: '0.78rem'
              }
            }}
          />
        </Box>
        <DialogContent sx={{ p: 1, pt: 2, maxHeight: 320, overflowY: 'auto' }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, fontWeight: 750, textTransform: 'uppercase', display: 'block', mb: 1.2, letterSpacing: '0.5px' }}>
            {paletteSearch.trim() ? "Matching Actions" : "Direct Actions & Queries"}
          </Typography>
          <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {[
              { text: "Show doctors needing follow-up", action: () => { navigate('/doctors?filter=risk'); setPaletteOpen(false); setPaletteSearch(''); } },
              { text: "Log today's visit", action: () => { navigate('/log'); setPaletteOpen(false); setPaletteSearch(''); } },
              { text: "Open Dr. Sharma Profile", action: () => { navigate('/doctors?select=Dr. Sharma'); setPaletteOpen(false); setPaletteSearch(''); } },
              { text: "Open Dr. Verma Profile", action: () => { navigate('/doctors?select=Dr. Verma'); setPaletteOpen(false); setPaletteSearch(''); } },
              { text: "Open Dr. Patel Profile", action: () => { navigate('/doctors?select=Dr. Patel'); setPaletteOpen(false); setPaletteSearch(''); } },
              { text: "Which product should I promote?", action: () => { executeDirectAICommand("Which product should I promote?"); setPaletteOpen(false); setPaletteSearch(''); } },
              { text: "Summarize last week", action: () => { executeDirectAICommand("Summarize last week"); setPaletteOpen(false); setPaletteSearch(''); } }
            ]
              .filter(cmd => cmd.text.toLowerCase().includes(paletteSearch.toLowerCase()))
              .map((cmd, i) => (
                <ListItem key={i} disablePadding>
                  <ListItemButton
                    onClick={cmd.action}
                    sx={{
                      borderRadius: 2.5,
                      py: 1,
                      px: 1.5,
                      '&:hover': { bgcolor: 'rgba(44, 182, 157, 0.05)', '& .MuiTypography-root': { color: 'primary.main' } }
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 650, color: 'text.primary', fontSize: '0.8rem' }}>
                      {cmd.text}
                    </Typography>
                  </ListItemButton>
                </ListItem>
              ))}
            {paletteSearch.trim() && ![
              "Show doctors needing follow-up",
              "Log today's visit",
              "Open Dr. Sharma Profile",
              "Open Dr. Verma Profile",
              "Open Dr. Patel Profile",
              "Which product should I promote?",
              "Summarize last week"
            ].some(txt => txt.toLowerCase().includes(paletteSearch.toLowerCase())) && (
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => {
                      executeDirectAICommand(paletteSearch);
                      setPaletteSearch('');
                      setPaletteOpen(false);
                    }}
                    sx={{
                      borderRadius: 2.5,
                      py: 1,
                      px: 1.5,
                      bgcolor: 'rgba(19, 107, 126, 0.04)',
                      '&:hover': { bgcolor: 'rgba(44, 182, 157, 0.08)' }
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 650, color: 'primary.main', fontSize: '0.8rem' }}>
                      Ask AI: "{paletteSearch}" (Press Enter)
                    </Typography>
                  </ListItemButton>
                </ListItem>
              )}
          </List>
        </DialogContent>
      </Dialog>

      {/* Floating AI prompt panel */}
      <Dialog open={aiOpen} onClose={() => setAiOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 850, color: 'primary.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SparklesIcon sx={{ color: '#2CB69D' }} />
          Omni AI Copilot
        </DialogTitle>
        <DialogContent sx={{ pb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 550, fontSize: '0.82rem' }}>
            Enter your natural language instruction to schedule meetings, update statuses, or draft summaries:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="e.g. Schedule an in-person follow up with Dr. Sharma next Monday at 10 AM..."
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAiOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (aiText.trim()) {
                executeDirectAICommand(aiText);
                setAiText('');
                setAiOpen(false);
              }
            }}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
          >
            Process Command
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
