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
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Add as AddIcon
} from '@mui/icons-material';
import axios from 'axios';
import NoteGroupList from './notes/NoteGroupList';
import NoteGroupForm from './notes/NoteGroupForm';

// Add delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    const fetchWithRetry = async (url, retries = 3, baseDelay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(url);
          return response;
        } catch (error) {
          if (i === retries - 1) throw error;
          const waitTime = baseDelay * Math.pow(2, i);
          await delay(waitTime);
        }
      }
    };

    const fetchData = async () => {
      try {
        // Fetch notes and groups sequentially to avoid rate limits
        const notesResponse = await fetchWithRetry('/api/notes');
        await delay(1000); // Wait 1 second between requests
        const groupsResponse = await fetchWithRetry('/api/notes/groups');
        
        setNotes(notesResponse.data);
        setGroups(groupsResponse.data);
        
        // Fetch group notes with delays
        if (groupsResponse.data.length > 0) {
          const groupNotesMap = {};
          for (const group of groupsResponse.data) {
            try {
              await delay(1000); // Wait 1 second between requests
              const response = await fetchWithRetry(`/api/notes/group/${group._id}`);
              groupNotesMap[group._id] = response.data;
            } catch (error) {
              console.error(`Error fetching notes for group ${group._id}:`, error);
              groupNotesMap[group._id] = [];
            }
          }
          setGroupNotes(groupNotesMap);
        }
      } catch (error) {
        setError('Failed to fetch data');
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []); // Single useEffect for all data fetching

  const handleEditNote = (noteId) => {
    navigate(`/notes/${noteId}`);
  };

  const handleDeleteNote = async (noteId) => {
    try {
      for (let i = 0; i < 3; i++) {
        try {
          await axios.delete(`/api/notes/${noteId}`);
          setNotes(notes.filter(note => note._id !== noteId));
          setSuccess('Note deleted successfully');
          return;
        } catch (error) {
          if (i === 2) throw error;
          await delay(1000 * Math.pow(2, i));
        }
      }
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
      for (let i = 0; i < 3; i++) {
        try {
          await axios.post(`/api/notes/${selectedNote._id}/share`, {
            email: shareEmail,
            permission: sharePermission
          });
          setShareDialogOpen(false);
          setShareEmail('');
          setSuccess('Note shared successfully');
          return;
        } catch (error) {
          if (i === 2) throw error;
          await delay(1000 * Math.pow(2, i));
        }
      }
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
          <NoteGroupList groups={groups} onUpdate={setGroups} />
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