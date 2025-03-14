import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Chip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import PasswordEntryForm from './PasswordEntryForm';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const PasswordList = ({ entries, onUpdate }) => {
  const { user } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add logging for initial render and props
  useEffect(() => {
    console.log('PasswordList rendered with entries:', entries);
  }, [entries]);

  // Add logging for showPassword state changes
  useEffect(() => {
    console.log('showPassword state changed:', showPassword);
  }, [showPassword]);

  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setEditDialogOpen(true);
  };

  const handleDelete = async (entryId) => {
    try {
      console.log('Deleting password entry:', entryId);
      const response = await axios.delete(`/api/passwords/entries/${entryId}`);
      
      console.log('Delete response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      onUpdate();
      setSuccess('Password entry deleted successfully');
    } catch (err) {
      console.error('Delete error:', err.response || err);
      setError(err.response?.data?.msg || err.response?.data?.message || 'Failed to delete password entry');
    }
  };

  const handleUpdate = async (updatedData) => {
    try {
      const response = await fetch(`/api/passwords/entries/${selectedEntry._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updatedData)
      });
      
      if (response.ok) {
        onUpdate();
        setEditDialogOpen(false);
        setSuccess('Password entry updated successfully');
      } else {
        const data = await response.json();
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to update password entry');
    }
  };

  const togglePasswordVisibility = (entryId) => {
    console.log('Toggle called for:', entryId);
    console.log('Current showPassword state:', showPassword);
    setShowPassword(prevState => {
      const newState = {
        ...prevState,
        [entryId]: !prevState[entryId]
      };
      console.log('New state will be:', newState);
      return newState;
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
  };

  const canEditPassword = (entry) => {
    // Admin users can edit any password
    if (user?.isAdmin) return true;
    
    // User can edit if they are the owner
    // Check all possible owner ID formats
    if (entry.owner === user?._id || 
        entry.owner === user?.userId || 
        entry.owner?._id === user?._id || 
        entry.owner?._id === user?.userId) return true;
    
    // User can edit if they are an admin of the group the password belongs to
    if (entry.group && entry.group.members) {
      const userMembership = entry.group.members.find(m => 
        m.user === user?._id || 
        m.user === user?.userId || 
        m.user?._id === user?._id || 
        m.user?._id === user?.userId
      );
      return userMembership?.role === 'admin';
    }
    
    return false;
  };

  const canViewPassword = (entry) => {
    // Admin users can view any password
    if (user?.isAdmin) return true;
    
    // User can view if they are the owner
    // Check all possible owner ID formats
    if (entry.owner === user?._id || 
        entry.owner === user?.userId || 
        entry.owner?._id === user?._id || 
        entry.owner?._id === user?.userId) return true;
    
    // User can view if they are a member of the group the password belongs to
    if (entry.group && entry.group.members) {
      const userMembership = entry.group.members.find(m => 
        m.user === user?._id || 
        m.user === user?.userId || 
        m.user?._id === user?._id || 
        m.user?._id === user?.userId
      );
      return !!userMembership; // Return true if user is a member, regardless of role
    }
    
    return false;
  };

  // Group passwords by their groups
  const groupedPasswords = entries.reduce((acc, entry) => {
    if (entry.group) {
      if (!acc.groups[entry.group._id]) {
        acc.groups[entry.group._id] = {
          name: entry.group.name,
          entries: []
        };
      }
      acc.groups[entry.group._id].entries.push(entry);
    } else {
      acc.personal.push(entry);
    }
    return acc;
  }, { personal: [], groups: {} });

  // Define PasswordCard component outside the return statement
  const PasswordCard = ({ entry }) => {
    const isVisible = showPassword[entry._id] || false;
    console.log(`PasswordCard render - Entry: ${entry._id}, Visible: ${isVisible}, ShowPassword:`, showPassword);

    return (
      <Card 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 1,
          boxShadow: 2,
          position: 'relative'
        }}
      >
        {entry.group && (
          <Chip
            label={entry.group.name}
            size="small"
            color="primary"
            sx={{ 
              position: 'absolute',
              top: 8,
              right: 8,
              fontSize: '0.75rem',
              height: '24px'
            }}
          />
        )}
        <CardContent sx={{ flexGrow: 1, pb: 1, pt: entry.group ? 4 : 2 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2,
              fontWeight: 'medium',
              color: 'primary.main',
              pr: entry.group ? 8 : 0
            }}
          >
            {entry.title}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="body2" sx={{ mr: 1, minWidth: '80px', fontWeight: 'medium' }}>
              Owner:
            </Typography>
            <Typography variant="body2" sx={{ flexGrow: 1, color: 'text.secondary' }}>
              {entry.owner?.name || 'You'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="body2" sx={{ mr: 1, minWidth: '80px', fontWeight: 'medium' }}>
              Username:
            </Typography>
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              {entry.username}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="body2" sx={{ mr: 1, minWidth: '80px', fontWeight: 'medium' }}>
              Password:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: 'monospace',
                flexGrow: 1,
                bgcolor: 'action.hover',
                borderRadius: 1,
                p: 1
              }}
            >
              {isVisible ? entry.password : '••••••••'}
            </Typography>
          </Box>

          {entry.url && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="body2" sx={{ mr: 1, minWidth: '80px', fontWeight: 'medium' }}>
                URL:
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  flexGrow: 1, 
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    color: 'primary.main',
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }
                }}
                onClick={() => entry.url && window.open(entry.url, '_blank')}
              >
                {entry.url}
              </Typography>
            </Box>
          )}

          {entry.notes && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 1 }}>
              <Typography variant="body2" sx={{ mr: 1, minWidth: '80px', fontWeight: 'medium' }}>
                Notes:
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  whiteSpace: 'pre-line',
                  wordBreak: 'break-word',
                  maxWidth: 'calc(100% - 90px)',
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  p: 1
                }}
              >
                {entry.notes}
              </Typography>
            </Box>
          )}
        </CardContent>

        <CardActions 
          sx={{ 
            px: 2, 
            py: 1, 
            borderTop: 1, 
            borderColor: 'divider',
            bgcolor: 'background.default'
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
            <IconButton
              size="small"
              onClick={() => {
                console.log('Toggle clicked for:', entry._id);
                togglePasswordVisibility(entry._id);
              }}
              color="primary"
              sx={{ 
                p: 0.5,
                '&:hover': {
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText'
                }
              }}
              disabled={!canViewPassword(entry)}
            >
              {isVisible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
            <IconButton
              size="small"
              onClick={() => copyToClipboard(entry.password)}
              color="primary"
              sx={{ 
                p: 0.5,
                '&:hover': {
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText'
                },
                '&.Mui-disabled': {
                  opacity: 0.5
                }
              }}
              disabled={!canViewPassword(entry)}
              title={!canViewPassword(entry) ? "You don't have permission to copy this password" : "Copy password"}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleEdit(entry)}
              color="primary"
              sx={{ 
                p: 0.5,
                '&:hover': {
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText'
                },
                '&.Mui-disabled': {
                  opacity: 0.5
                }
              }}
              title={canEditPassword(entry) ? "Edit password" : "Only owner and group admins can edit"}
              disabled={!canEditPassword(entry)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this password?')) {
                  handleDelete(entry._id);
                }
              }}
              color="error"
              sx={{ 
                p: 0.5,
                '&:hover': {
                  bgcolor: 'error.light',
                  color: 'error.contrastText'
                },
                '&.Mui-disabled': {
                  opacity: 0.5
                }
              }}
              title={canEditPassword(entry) ? "Delete password" : "Only owner and group admins can delete"}
              disabled={!canEditPassword(entry)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </CardActions>
      </Card>
    );
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h5" sx={{ mb: 3, color: 'primary.main' }}>
          Personal Passwords
        </Typography>
        <Grid container spacing={3}>
          {groupedPasswords.personal.map((entry) => (
            <Grid item xs={12} sm={6} md={4} key={entry._id}>
              <PasswordCard entry={entry} />
            </Grid>
          ))}
        </Grid>
      </Grid>

      {Object.entries(groupedPasswords.groups).map(([groupId, group]) => (
        <Grid item xs={12} key={groupId}>
          <Typography variant="h5" sx={{ mb: 3, mt: 4, color: 'primary.main' }}>
            {group.name} Passwords
          </Typography>
          <Grid container spacing={3}>
            {group.entries.map((entry) => (
              <Grid item xs={12} sm={6} md={4} key={entry._id}>
                <PasswordCard entry={entry} />
              </Grid>
            ))}
          </Grid>
        </Grid>
      ))}

      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            boxShadow: 3,
            bgcolor: 'background.paper'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            pb: 1,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.default'
          }}
        >
          Edit Password Entry
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {selectedEntry && (
            <PasswordEntryForm
              entry={selectedEntry}
              onSubmit={handleUpdate}
              onCancel={() => setEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {(error || success) && (
        <Box 
          sx={{ 
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          {error && (
            <Alert 
              severity="error" 
              variant="filled"
              onClose={() => setError('')}
              sx={{ 
                minWidth: '250px',
                boxShadow: 3
              }}
            >
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert 
              severity="success"
              variant="filled"
              onClose={() => setSuccess('')}
              sx={{ 
                minWidth: '250px',
                boxShadow: 3
              }}
            >
              {success}
            </Alert>
          )}
        </Box>
      )}
    </Grid>
  );
};

export default PasswordList; 