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
  Snackbar
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Key as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon
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
      const response = await axios.put(`/api/admin/users/${selectedUser._id}/reset-password`, {
        newPassword
      });
      setSuccess(`Password changed successfully for ${selectedUser.name}`);
      setDialogOpen(false);
      setNewPassword('');
    } catch (err) {
      setError('Failed to change password');
    }
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
    <Container>
      <Typography variant="h4" sx={{ mt: 4, mb: 2 }}>
        Admin Portal
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Users" />
        <Tab label="Password Entries" />
        <Tab label="Groups" />
        <Tab label="Login Logs" />
      </Tabs>

      <TableContainer component={Paper}>
        <Table>
          {activeTab === 0 && (
            <>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.isAdmin ? 'Admin' : 'User'}
                        color={user.isAdmin ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleEditUser(user)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => {
                        setSelectedUser(user);
                        setDialogType('changePassword');
                        setDialogOpen(true);
                      }}>
                        <KeyIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteUser(user._id)}>
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
                  <TableCell>Title</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Password</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Group</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {passwordEntries.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell>{entry.title}</TableCell>
                    <TableCell>{entry.username}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {showPassword[entry._id] ? entry.password : '••••••••'}
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword(prev => ({
                            ...prev,
                            [entry._id]: !prev[entry._id]
                          }))}
                        >
                          {showPassword[entry._id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>{entry.owner?.name}</TableCell>
                    <TableCell>{entry.group?.name || '-'}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleDeletePasswordEntry(entry._id)}>
                        <DeleteIcon />
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
                  <TableCell>Name</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Members</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group._id}>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>{group.owner?.name}</TableCell>
                    <TableCell>
                      {group.members.map(member => (
                        <Chip
                          key={member.user._id}
                          label={`${member.user.name} (${member.role})`}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleDeleteGroup(group._id)}>
                        <DeleteIcon />
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
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loginLogs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>{log.userName}</TableCell>
                    <TableCell>{log.userEmail}</TableCell>
                    <TableCell>
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.ipAddress}</TableCell>
                    <TableCell>
                      <Typography
                        color={log.success ? 'success.main' : 'error.main'}
                      >
                        {log.success ? 'Success' : 'Failed'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>
          {dialogType === 'editUser' ? 'Edit User' : 'Change Password'}
        </DialogTitle>
        <DialogContent>
          {dialogType === 'editUser' ? (
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Name"
                value={editUserData.name}
                onChange={(e) => setEditUserData(prev => ({ ...prev, name: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Email"
                value={editUserData.email}
                onChange={(e) => setEditUserData(prev => ({ ...prev, email: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editUserData.isAdmin}
                    onChange={(e) => setEditUserData(prev => ({ ...prev, isAdmin: e.target.checked }))}
                  />
                }
                label="Admin Access"
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
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={dialogType === 'editUser' ? handleUpdateUser : handleChangePassword}
            variant="contained"
          >
            {dialogType === 'editUser' ? 'Update User' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminPortal; 