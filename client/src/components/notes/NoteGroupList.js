import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Chip,
  Alert
} from '@mui/material';
import {
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon
} from '@mui/icons-material';
import axios from 'axios';

const NoteGroupList = ({ groups, onUpdate }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Log the auth token when component mounts
    const token = localStorage.getItem('token');
    console.log('Current auth token:', token);
    
    // Test the auth endpoint
    const testAuth = async () => {
      try {
        const response = await axios.get('/api/auth/me');
        console.log('Auth test successful:', response.data);
      } catch (err) {
        console.error('Auth test failed:', err.response || err);
      }
    };
    testAuth();
  }, []);

  const handleDeleteClick = (group) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Deleting group with token:', token);
      
      await axios.delete(`/api/notes/groups/${selectedGroup._id}`);
      onUpdate();
      setDeleteDialogOpen(false);
      setSuccess('Group deleted successfully');
    } catch (err) {
      console.error('Delete error:', err.response || err);
      setError(err.response?.data?.message || 'Failed to delete group');
    }
  };

  const handleAddMemberClick = (group) => {
    setSelectedGroup(group);
    setAddMemberDialogOpen(true);
  };

  const handleAddMember = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Adding member with token:', token);
      
      await axios.post(`/api/notes/groups/${selectedGroup._id}/members`, {
        email: newMemberEmail
      });
      onUpdate();
      setAddMemberDialogOpen(false);
      setNewMemberEmail('');
      setSuccess('Member added successfully');
    } catch (err) {
      console.error('Add member error:', err.response || err);
      setError(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (groupId, memberId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Removing member with token:', token);
      
      await axios.delete(`/api/notes/groups/${groupId}/members/${memberId}`);
      onUpdate();
      setSuccess('Member removed successfully');
    } catch (err) {
      console.error('Remove member error:', err.response || err);
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  return (
    <Box>
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
      <List>
        {groups.map((group) => (
          <ListItem key={group._id}>
            <ListItemText
              primary={group.name}
              secondary={
                <>
                  <Typography variant="body2" color="text.secondary" component="span">
                    {group.description}
                  </Typography>
                  <Box sx={{ mt: 1 }} component="span">
                    {group.members.map((member) => (
                      <Chip
                        key={member._id}
                        label={member.name}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                        onDelete={() => handleRemoveMember(group._id, member._id)}
                        deleteIcon={<PersonRemoveIcon />}
                      />
                    ))}
                  </Box>
                </>
              }
            />
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                aria-label="add member"
                onClick={() => handleAddMemberClick(group)}
                sx={{ mr: 1 }}
              >
                <PersonAddIcon />
              </IconButton>
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={() => handleDeleteClick(group)}
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">Delete Group</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this group? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addMemberDialogOpen}
        onClose={() => setAddMemberDialogOpen(false)}
        aria-labelledby="add-member-dialog-title"
      >
        <DialogTitle id="add-member-dialog-title">Add Member</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMemberDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddMember} color="primary" variant="contained">
            Add Member
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NoteGroupList; 