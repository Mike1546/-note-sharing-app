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
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {group.name}
              </Typography>
              {group.description && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {group.description}
                </Typography>
              )}
              <Typography variant="subtitle2" gutterBottom>
                Members:
              </Typography>
              <List dense>
                {group.members.map((member) => (
                  <ListItem key={`${group._id}-${member.user._id}`}>
                    <ListItemText
                      primary={member.user.name}
                      secondary={member.user.email}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={member.role}
                        size="small"
                        color={member.role === 'admin' ? 'primary' : 'default'}
                      />
                      {group.members.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveMember(group._id, member.user._id)}
                        >
                          <PersonRemoveIcon />
                        </IconButton>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
            <CardActions>
              <IconButton
                size="small"
                onClick={() => {
                  setSelectedGroup(group);
                  setAddMemberDialogOpen(true);
                }}
              >
                <PersonAddIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleEdit(group)}
              >
                <EditIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleDelete(group._id)}
              >
                <DeleteIcon />
              </IconButton>
            </CardActions>
          </Card>
        </Grid>
      ))}

      <Dialog
        open={addMemberDialogOpen}
        onClose={() => setAddMemberDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Member to Group</DialogTitle>
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
          <Button onClick={() => setAddMemberDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddMember} variant="contained">
            Add Member
          </Button>
        </DialogActions>
      </Dialog>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}
    </Grid>
  );
};

export default PasswordGroupList; 