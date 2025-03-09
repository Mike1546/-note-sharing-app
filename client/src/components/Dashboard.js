import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';
import {
  Lock as LockIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import axios from 'axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState('view');

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/notes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(response.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleEditNote = (noteId) => {
    navigate(`/notes/${noteId}`);
  };

  const handleDeleteNote = async (noteId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(notes.filter(note => note._id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleShareNote = (note) => {
    setSelectedNote(note);
    setShareDialogOpen(true);
  };

  const handleShareSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/notes/${selectedNote._id}/share`,
        { email: shareEmail, permission: sharePermission },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShareDialogOpen(false);
      setShareEmail('');
      setSharePermission('view');
      setSelectedNote(null);
    } catch (error) {
      console.error('Error sharing note:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Notes
      </Typography>
      <Grid container spacing={3}>
        {notes.map((note) => (
          <Grid item xs={12} sm={6} md={4} key={note._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {note.title}
                  </Typography>
                  {note.isLocked && (
                    <LockIcon fontSize="small" color="primary" />
                  )}
                </Box>
                <Typography
                  variant="body2"
                  color={note.isLocked ? "primary" : "text.secondary"}
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    fontStyle: note.isLocked ? 'italic' : 'normal'
                  }}
                >
                  {note.content}
                </Typography>
                {note.tags && note.tags.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {note.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                )}
              </CardContent>
              <CardActions>
                <IconButton
                  size="small"
                  onClick={() => handleEditNote(note._id)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleShareNote(note)}
                >
                  <ShareIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteNote(note._id)}
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
        <DialogTitle>Share Note</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
          />
          <Box sx={{ mt: 2 }}>
            <Button
              variant={sharePermission === 'view' ? 'contained' : 'outlined'}
              onClick={() => setSharePermission('view')}
              sx={{ mr: 1 }}
            >
              View Only
            </Button>
            <Button
              variant={sharePermission === 'edit' ? 'contained' : 'outlined'}
              onClick={() => setSharePermission('edit')}
            >
              Can Edit
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleShareSubmit} variant="contained">
            Share
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard; 