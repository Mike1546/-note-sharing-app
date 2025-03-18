import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Snackbar,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Key as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const AdminPortal = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [passwordEntries, setPasswordEntries] = useState([]);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    isAdmin: false
  });
  const [loginLogs, setLoginLogs] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = useCallback(async () => {
    try {
      switch (activeTab) {
        case 0:
          await fetchUsers();
          break;
        case 1:
          await fetchPasswordEntries();
          break;
        case 2:
          await fetchGroups();
          break;
        case 3:
          await fetchLoginLogs();
          break;
        default:
          console.log('Unknown tab selected');
          break;
      }
    } catch (err) {
      setError('Failed to fetch data');
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data);
    } catch (error) {
      showSnackbar('Error fetching users', 'error');
    }
  };

  const fetchPasswordEntries = async () => {
    try {
      const response = await axios.get('/api/admin/passwords');
      setPasswordEntries(response.data);
    } catch (error) {
      showSnackbar('Error fetching password entries', 'error');
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get('/api/admin/groups');
      setGroups(response.data);
    } catch (error) {
      showSnackbar('Error fetching groups', 'error');
    }
  };

  const fetchLoginLogs = async () => {
    try {
      const response = await axios.get('/api/admin/logs');
      setLoginLogs(response.data);
    } catch (error) {
      showSnackbar('Error fetching login logs', 'error');
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditUserData({
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin
    });
    setDialogType('editUser');
    setDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    try {
      const response = await axios.put(`/api/admin/users/${selectedUser._id}`, editUserData);
      setSuccess('User updated successfully');
      setDialogOpen(false);
      fetchUsers();
    } catch (err) {
      setError('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure? This will delete all user data including passwords and groups.')) {
      return;
    }

    try {
      await axios.delete(`/api/admin/users/${userId}`);
      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  const handleChangePassword = async () => {
    try {
      if (!newPassword || newPassword.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      await axios.put(`/api/admin/users/${selectedUser._id}/password`, {
        newPassword
      });
      
      showSnackbar(`Password changed successfully for ${selectedUser.name}`, 'success');
      setDialogOpen(false);
      setNewPassword('');
      setDialogType('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
  };

  const handlePasswordChange = (user) => {
    setSelectedUser(user);
    setDialogType('changePassword');
    setDialogOpen(true);
  };

  const handleDeletePasswordEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this password entry?')) {
      return;
    }

    try {
      await axios.delete(`/api/admin/passwords/${entryId}`);
      setSuccess('Password entry deleted successfully');
      fetchPasswordEntries();
    } catch (err) {
      setError('Failed to delete password entry');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) {
      return;
    }

    try {
      await axios.delete(`/api/admin/groups/${groupId}`);
      setSuccess('Group deleted successfully');
      fetchGroups();
    } catch (err) {
      setError('Failed to delete group');
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setNewPassword('');
    setSelectedUser(null);
    setSelectedEntry(null);
    setEditUserData({ name: '', email: '', isAdmin: false });
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleBack = () => {
    window.history.back();
  };

  if (!user?.isAdmin) {
    return (
      <Container>
        <Typography variant="h4" sx={{ mt: 4, mb: 2 }}>
          Access Denied
        </Typography>
        <Typography>
          You do not have permission to access the admin portal.
        </Typography>
      </Container>
    );
  }

  return (
    <>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Admin Portal
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl">
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: 2,
          py: 4
        }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 'medium',
              color: 'primary.main',
              mb: 1
            }}
          >
            Admin Portal
          </Typography>

          {error && (
            <Alert 
              severity="error" 
              variant="outlined"
              sx={{ 
                '& .MuiAlert-message': { 
                  display: 'flex', 
                  alignItems: 'center' 
                } 
              }}
            >
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert 
              severity="success"
              variant="outlined"
              sx={{ 
                '& .MuiAlert-message': { 
                  display: 'flex', 
                  alignItems: 'center' 
                } 
              }}
            >
              {success}
            </Alert>
          )}

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ 
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  minHeight: 48,
                  py: 0
                }
              }}
            >
              <Tab label="Users" />
              <Tab label="Password Entries" />
              <Tab label="Groups" />
              <Tab label="Login Logs" />
            </Tabs>
          </Box>

          <TableContainer 
            component={Paper}
            sx={{ 
              boxShadow: 2,
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <Table size="small">
              {activeTab === 0 && (
                <>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell sx={{ minWidth: 120 }}>{user.name}</TableCell>
                        <TableCell sx={{ minWidth: 180 }}>{user.email}</TableCell>
                        <TableCell sx={{ minWidth: 100 }}>
                          <Chip 
                            label={user.isAdmin ? 'Admin' : 'User'}
                            color={user.isAdmin ? 'primary' : 'default'}
                            size="small"
                            sx={{ fontSize: '0.75rem', height: '24px' }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handlePasswordChange(user)}
                            color="primary"
                            title="Change password"
                          >
                            <KeyIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleEditUser(user)}
                            color="primary"
                            title="Edit user"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteUser(user._id)}
                            color="error"
                            title="Delete user"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </>
              )}

              {activeTab === 1 && (
                <>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Password</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Owner</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Group</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {passwordEntries.map((entry) => (
                      <TableRow key={entry._id}>
                        <TableCell sx={{ minWidth: 150 }}>{entry.title}</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>{entry.username}</TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontFamily: 'monospace' }}>
                              {showPassword[entry._id] ? entry.password : '••••••••'}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => setShowPassword(prev => ({
                                ...prev,
                                [entry._id]: !prev[entry._id]
                              }))}
                            >
                              {showPassword[entry._id] ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ minWidth: 120 }}>{entry.owner?.name}</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>{entry.group?.name || '-'}</TableCell>
                        <TableCell>
                          <IconButton 
                            onClick={() => handleDeletePasswordEntry(entry._id)}
                            size="small"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </>
              )}

              {activeTab === 2 && (
                <>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Owner</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Members</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groups.map((group) => (
                      <TableRow key={group._id}>
                        <TableCell sx={{ minWidth: 150 }}>{group.name}</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>{group.owner?.name}</TableCell>
                        <TableCell sx={{ minWidth: 200 }}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {group.members.map(member => (
                              <Chip
                                key={member.user._id}
                                label={`${member.user.name} (${member.role})`}
                                size="small"
                                color={member.role === 'admin' ? 'primary' : 'default'}
                                sx={{ 
                                  fontSize: '0.75rem',
                                  height: '24px'
                                }}
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            onClick={() => handleDeleteGroup(group._id)}
                            size="small"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </>
              )}

              {activeTab === 3 && (
                <>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Timestamp</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>IP Address</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loginLogs.map((log) => (
                      <TableRow key={log._id}>
                        <TableCell sx={{ minWidth: 120 }}>{log.userName}</TableCell>
                        <TableCell sx={{ minWidth: 180 }}>{log.userEmail}</TableCell>
                        <TableCell sx={{ minWidth: 160, fontFamily: 'monospace' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell sx={{ minWidth: 120, fontFamily: 'monospace' }}>{log.ipAddress}</TableCell>
                        <TableCell sx={{ minWidth: 100 }}>
                          <Chip
                            label={log.success ? 'Success' : 'Failed'}
                            color={log.success ? 'success' : 'error'}
                            size="small"
                            sx={{ 
                              fontSize: '0.75rem',
                              height: '24px',
                              minWidth: '80px'
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </>
              )}
            </Table>
          </TableContainer>
        </Box>

        <Dialog 
          open={dialogOpen && dialogType === 'changePassword'} 
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Change Password for {selectedUser?.name}</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                type="password"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="dense"
                autoFocus
                error={!!error && error.includes('Password')}
                helperText={error && error.includes('Password') ? error : ''}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleChangePassword} 
              variant="contained"
              disabled={!newPassword || newPassword.length < 6}
            >
              Change Password
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog 
          open={dialogOpen} 
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 1,
              boxShadow: 3
            }
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            {dialogType === 'editUser' ? 'Edit User' : 'Change Password'}
          </DialogTitle>
          <DialogContent sx={{ pb: 2 }}>
            {dialogType === 'editUser' ? (
              <Box sx={{ pt: 2 }}>
                <TextField
                  fullWidth
                  label="Name"
                  value={editUserData.name}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, name: e.target.value }))}
                  sx={{ mb: 2 }}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, email: e.target.value }))}
                  sx={{ mb: 2 }}
                  size="small"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={editUserData.isAdmin}
                      onChange={(e) => setEditUserData(prev => ({ ...prev, isAdmin: e.target.checked }))}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Admin Access
                    </Typography>
                  }
                />
              </Box>
            ) : (
              <TextField
                autoFocus
                margin="dense"
                label="New Password"
                type="password"
                fullWidth
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button 
              onClick={handleCloseDialog}
              size="small"
            >
              Cancel
            </Button>
            <Button
              onClick={dialogType === 'editUser' ? handleUpdateUser : handleChangePassword}
              variant="contained"
              size="small"
            >
              {dialogType === 'editUser' ? 'Update User' : 'Change Password'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            variant="filled"
            sx={{ 
              width: '100%',
              boxShadow: 2
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
};

export default AdminPortal; 