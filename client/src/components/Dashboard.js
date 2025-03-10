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
  TextField,
  Tabs,
  Tab,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Lock as LockIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Add as AddIcon
} from '@mui/icons-material';
import axios from 'axios';
import NoteGroupList from './notes/NoteGroupList';
import NoteGroupForm from './notes/NoteGroupForm';

const Dashboard = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupNotes, setGroupNotes] = useState({});
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState('view');
  const [activeTab, setActiveTab] = useState(0);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    fetchNotes();
    fetchGroups();
  }, []);

  useEffect(() => {
    if (groups.length > 0) {
      fetchGroupNotes();
    }
  }, [groups]);

  const fetchGroupNotes = async () => {
    const notesMap = {};
    for (const group of groups) {
      try {
        const response = await axios.get(`/api/notes/group/${group._id}`);
        notesMap[group._id] = response.data;
      } catch (error) {
        console.error(`Error fetching notes for group ${group._id}:`, error);
      }
    }
    setGroupNotes(notesMap);
  };

  const fetchNotes = async () => {
    try {
      const response = await axios.get('/api/notes');
      setNotes(response.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setError('Failed to fetch notes');
    }
  };

  const fetchGroups = async () => {
    try {
      console.log('Fetching groups - Auth token:', localStorage.getItem('token'));
      console.log('Fetching groups - Axios defaults:', {
        baseURL: axios.defaults.baseURL,
        headers: axios.defaults.headers.common
      });

      const response = await axios.get('/api/notes/groups');
      console.log('Groups response:', response.data);
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error.response || error);
      console.error('Full error object:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: error.config,
        message: error.message
      });
      setError('Failed to fetch groups');
    }
  };

  const handleEditNote = (noteId) => {
    navigate(`/notes/${noteId}`);
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await axios.delete(`/api/notes/${noteId}`);
      setNotes(notes.filter(note => note._id !== noteId));
      setSuccess('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      setError('Failed to delete note');
    }
  };

  const handleShareNote = (note) => {
    setSelectedNote(note);
    setShareDialogOpen(true);
  };

  const handleShareSubmit = async () => {
    try {
      await axios.post(`/api/notes/${selectedNote._id}/share`, {
        email: shareEmail,
        permission: sharePermission
      });
      setShareDialogOpen(false);
      setShareEmail('');
      setSuccess('Note shared successfully');
    } catch (error) {
      console.error('Error sharing note:', error);
      setError('Failed to share note');
    }
  };

  const handleGroupSubmit = (groupData) => {
    setGroups([groupData, ...groups]);
    setGroupDialogOpen(false);
    setSuccess('Group created successfully');
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleGroupSelect = (groupId) => {
    setSelectedGroup(groupId);
  };

  const renderNoteCard = (note) => (
    <Grid item xs={12} sm={6} md={4} key={note._id}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {note.title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical'
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
  );

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

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="My Notes" />
        <Tab label="Note Groups" />
        <Tab label="Group Notes" />
      </Tabs>

      {activeTab === 0 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/notes/new')}
            >
              New Note
            </Button>
          </Box>
          <Grid container spacing={2}>
            {notes.filter(note => !note.group).map(renderNoteCard)}
          </Grid>
        </>
      )}

      {activeTab === 1 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setGroupDialogOpen(true)}
            >
              Create Group
            </Button>
          </Box>
          <NoteGroupList groups={groups} onUpdate={fetchGroups} />
        </>
      )}

      {activeTab === 2 && (
        <Box>
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Select Group</InputLabel>
              <Select
                value={selectedGroup || ''}
                onChange={(e) => handleGroupSelect(e.target.value)}
                label="Select Group"
              >
                <MenuItem value="">
                  <em>Select a group</em>
                </MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group._id} value={group._id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {selectedGroup && (
            <>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate(`/notes/new?groupId=${selectedGroup}`)}
                >
                  Add Note to Group
                </Button>
              </Box>
              <Grid container spacing={2}>
                {groupNotes[selectedGroup]?.map(renderNoteCard)}
              </Grid>
            </>
          )}
        </Box>
      )}

      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
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
          <TextField
            select
            margin="dense"
            label="Permission"
            fullWidth
            value={sharePermission}
            onChange={(e) => setSharePermission(e.target.value)}
            SelectProps={{
              native: true
            }}
          >
            <option value="view">View</option>
            <option value="edit">Edit</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleShareSubmit} color="primary" variant="contained">
            Share
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Note Group</DialogTitle>
        <DialogContent>
          <NoteGroupForm
            onSubmit={handleGroupSubmit}
            onCancel={() => setGroupDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Dashboard; 