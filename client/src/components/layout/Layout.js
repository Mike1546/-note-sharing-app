import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  useTheme as useMuiTheme,
  useMediaQuery,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert
} from '@mui/material';
import {
  Menu as MenuIcon,
  NoteAdd as NoteAddIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Notes as NotesIcon,
  AdminPanelSettings as AdminIcon,
  ArrowBack as ArrowBackIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Event as CalendarIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const drawerWidth = 240;

const Layout = ({ children }) => {
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Set loading to false when component mounts
  React.useEffect(() => {
    setIsLoading(false);
  }, []);

  const confirmIfUnsaved = () => {
    if (window.__unsavedChanges) {
      return window.confirm('You have unsaved changes. Are you sure? Any unsaved work will be lost.');
    }
    return true;
  };

  const handleBack = React.useCallback(() => {
    if (!confirmIfUnsaved()) return;
    if (location.pathname === '/') {
      return;
    }
    navigate(-1);
  }, [location.pathname, navigate]);

  // Add keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (event) => {
      // Ctrl/Cmd + B for back
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        handleBack();
      }
      // Ctrl/Cmd + L for logout
      if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
        event.preventDefault();
        setLogoutDialogOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleBack]);

  const handleDrawerToggle = React.useCallback(() => {
    setMobileOpen(prev => !prev);
  }, []);

  const safeNavigate = React.useCallback((path) => {
    if (!confirmIfUnsaved()) return;
    navigate(path);
  }, [navigate]);

  const handleLogout = React.useCallback(async () => {
    try {
      setIsLoading(true);
      await logout();
      navigate('/login');
    } catch (err) {
      setError('Failed to logout. Please try again.');
    } finally {
      setIsLoading(false);
      setLogoutDialogOpen(false);
    }
  }, [logout, navigate]);

  const isHomePage = location.pathname === '/';

  const role = user?.profile?.role || 'user';

  const drawer = React.useMemo(() => (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Notes App
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem button onClick={() => safeNavigate('/') }>
          <ListItemIcon>
            <NotesIcon />
          </ListItemIcon>
          <ListItemText primary="My Notes" />
        </ListItem>
        <ListItem button onClick={() => safeNavigate('/notes/new')}>
          <ListItemIcon>
            <NoteAddIcon />
          </ListItemIcon>
          <ListItemText primary="New Note" />
        </ListItem>
        <ListItem button onClick={() => safeNavigate('/calendar')}>
          <ListItemIcon>
            <CalendarIcon />
          </ListItemIcon>
          <ListItemText primary="Calendar" />
        </ListItem>
        <ListItem button onClick={() => safeNavigate('/passwords')}>
          <ListItemIcon>
            <LockIcon />
          </ListItemIcon>
          <ListItemText primary="Password Manager" />
        </ListItem>
        {(role === 'admin' || role === 'developer') && (
          <ListItem button onClick={() => safeNavigate('/admin')}>
            <ListItemIcon>
              <AdminIcon />
            </ListItemIcon>
            <ListItemText primary="Admin Dashboard" />
          </ListItem>
        )}
      </List>
    </div>
  ), [role, safeNavigate]);

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleBack}
            sx={{ mr: 2, display: isHomePage ? 'none' : 'flex' }}
            aria-label="back"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              <>
                {`${user?.name}'s Notes`}
                <span style={{
                  border: '1px solid rgba(255,255,255,0.6)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 12,
                  opacity: 0.8
                }}>{role}</span>
              </>
            )}
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mr: 2 }}>
              {error}
            </Alert>
          )}
          <Tooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            <IconButton color="inherit" onClick={toggleDarkMode}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          <IconButton color="inherit" onClick={() => navigate('/profile')}>
            <PersonIcon />
          </IconButton>
          <IconButton 
            color="inherit" 
            onClick={() => setLogoutDialogOpen(true)}
            disabled={isLoading}
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth
            }
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px'
        }}
      >
        {children}
      </Box>

      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        aria-labelledby="logout-dialog-title"
      >
        <DialogTitle id="logout-dialog-title">Confirm Logout</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to logout?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleLogout} 
            color="primary" 
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Logout'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Layout; 