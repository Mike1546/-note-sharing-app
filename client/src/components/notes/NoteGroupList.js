import React, { useState } from 'react';
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
import groupsService from '../../services/groups';

const NoteGroupList = ({ groups, onUpdate }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleDeleteClick = (group) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await groupsService.deleteGroup(selectedGroup._id);
      onUpdate();
      setDeleteDialogOpen(false);
      setSuccess('Group deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete group');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAddMemberClick = (group) => {
    setSelectedGroup(group);
    setAddMemberDialogOpen(true);
  };

  const handleAddMember = async () => {
    setAddMemberDialogOpen(false);
    setNewMemberEmail('');
    setSuccess('Group members not supported yet');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleRemoveMember = async () => {
    setSuccess('Group members not supported yet');
    setTimeout(() => setSuccess(''), 3000);
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
        {Array.isArray(groups) && groups.map((group) => (
          <ListItem key={group._id}>
            <ListItemText
              primary={group.name}
              secondaryTypographyProps={{ component: 'div' }}
              secondary={
                <Box component="div">
                  <Typography component="div" variant="body2" color="text.secondary">
                    {group.description}
                  </Typography>
                  <Box component="div" sx={{ mt: 1 }}>
                    {group.members && group.members.map((member) => (
                      <Chip
                        key={member.user._id}
                        label={`${member.user.name}${member.role === 'admin' ? ' (admin)' : ''}`}
                        size="small"
                        color={member.role === 'admin' ? 'primary' : 'default'}
                        sx={{ mr: 0.5, mb: 0.5 }}
                        onDelete={() => handleRemoveMember()}
                        deleteIcon={<PersonRemoveIcon />}
                      />
                    ))}
                  </Box>
                </Box>
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

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Group</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this group?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addMemberDialogOpen} onClose={() => setAddMemberDialogOpen(false)}>
        <DialogTitle>Add Member</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Member Email"
            type="email"
            fullWidth
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMemberDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddMember} color="primary">Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NoteGroupList; 