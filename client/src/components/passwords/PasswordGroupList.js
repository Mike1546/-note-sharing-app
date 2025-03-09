import React, { useState } from 'react';
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const PasswordGroupList = ({ groups, onUpdate }) => {
  const { user } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const handleEdit = (group) => {
    setSelectedGroup(group);
    setEditDialogOpen(true);
  };

  const handleDelete = async (groupId) => {
    try {
      const endpoint = user?.isAdmin 
        ? `/api/admin/groups/${groupId}`
        : `/api/passwords/groups/${groupId}`;

      await axios.delete(endpoint);
      onUpdate();
      setSuccess('Password group deleted successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete password group');
    }
  };

  const handleAddMember = async () => {
    try {
      const response = await axios.post(
        `/api/passwords/groups/${selectedGroup._id}/members`,
        { email: newMemberEmail }
      );
      onUpdate();
      setAddMemberDialogOpen(false);
      setNewMemberEmail('');
      setSuccess('Member added successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (groupId, userId) => {
    try {
      await axios.delete(`/api/passwords/groups/${groupId}/members/${userId}`);
      onUpdate();
      setSuccess('Member removed successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  return (
    <Grid container spacing={3}>
      {groups.map((group) => (
        <Grid item xs={12} sm={6} md={4} key={group._id}>
          <Card 
            sx={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 1,
              boxShadow: 2
            }}
          >
            <CardContent sx={{ flexGrow: 1, pb: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 1,
                  fontWeight: 'medium',
                  color: 'primary.main'
                }}
              >
                {group.name}
              </Typography>
              
              {group.description && (
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 2,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  {group.description}
                </Typography>
              )}

              <Typography 
                variant="subtitle2" 
                sx={{ 
                  mb: 1,
                  fontWeight: 'medium',
                  color: 'text.primary'
                }}
              >
                Members:
              </Typography>
              
              <List sx={{ p: 0 }}>
                {group.members.map((member) => (
                  <ListItem 
                    key={`${group._id}-${member.user._id}`}
                    sx={{
                      px: 0,
                      py: 0.75,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': {
                        borderBottom: 'none'
                      }
                    }}
                  >
                    <ListItemText
                      primary={member.user.name}
                      secondary={member.user.email}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: 'medium',
                        sx: { mb: 0.25 }
                      }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        sx: { 
                          color: 'text.secondary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }
                      }}
                      sx={{ mr: 1 }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={member.role}
                        size="small"
                        color={member.role === 'admin' ? 'primary' : 'default'}
                        sx={{ 
                          minWidth: 70,
                          height: '24px',
                          fontSize: '0.75rem'
                        }}
                      />
                      {group.members.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveMember(group._id, member.user._id)}
                          color="error"
                          sx={{ p: 0.5 }}
                        >
                          <PersonRemoveIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
            </CardContent>

            <CardActions sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedGroup(group);
                    setAddMemberDialogOpen(true);
                  }}
                  color="primary"
                  sx={{ p: 0.5 }}
                >
                  <PersonAddIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleEdit(group)}
                  color="primary"
                  sx={{ p: 0.5 }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(group._id)}
                  color="error"
                  sx={{ p: 0.5 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </CardActions>
          </Card>
        </Grid>
      ))}

      <Dialog
        open={addMemberDialogOpen}
        onClose={() => setAddMemberDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            boxShadow: 3
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>Add Member to Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            size="small"
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 1
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setAddMemberDialogOpen(false)}
            size="small"
            sx={{
              textTransform: 'none',
              fontWeight: 'medium'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddMember} 
            variant="contained"
            size="small"
            sx={{
              textTransform: 'none',
              fontWeight: 'medium'
            }}
          >
            Add Member
          </Button>
        </DialogActions>
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

export default PasswordGroupList; 