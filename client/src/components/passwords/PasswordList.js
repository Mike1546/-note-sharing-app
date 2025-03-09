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
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import PasswordEntryForm from './PasswordEntryForm';

const PasswordList = ({ entries, onUpdate }) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setEditDialogOpen(true);
  };

  const handleDelete = async (entryId) => {
    try {
      const response = await fetch(`/api/passwords/entries/${entryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        onUpdate();
        setSuccess('Password entry deleted successfully');
      } else {
        const data = await response.json();
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to delete password entry');
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
    setShowPassword(prev => ({
      ...prev,
      [entryId]: !prev[entryId]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
  };

  return (
    <Grid container spacing={3}>
      {entries.map((entry) => (
        <Grid item xs={12} sm={6} md={4} key={entry._id}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {entry.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  Username:
                </Typography>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {entry.username}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => copyToClipboard(entry.username)}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  Password:
                </Typography>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {showPassword[entry._id] ? entry.password : '••••••••'}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => togglePasswordVisibility(entry._id)}
                >
                  {showPassword[entry._id] ? (
                    <VisibilityOffIcon fontSize="small" />
                  ) : (
                    <VisibilityIcon fontSize="small" />
                  )}
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => copyToClipboard(entry.password)}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Box>
              {entry.url && (
                <Typography variant="body2" color="text.secondary">
                  URL: {entry.url}
                </Typography>
              )}
              {entry.notes && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Notes: {entry.notes}
                </Typography>
              )}
            </CardContent>
            <CardActions>
              <IconButton
                size="small"
                onClick={() => handleEdit(entry)}
              >
                <EditIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleDelete(entry._id)}
              >
                <DeleteIcon />
              </IconButton>
            </CardActions>
          </Card>
        </Grid>
      ))}

      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Password Entry</DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <PasswordEntryForm
              entry={selectedEntry}
              onSubmit={handleUpdate}
              onCancel={() => setEditDialogOpen(false)}
            />
          )}
        </DialogContent>
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

export default PasswordList; 