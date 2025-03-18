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
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');

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

  const updateGroups = async () => {
    try {
      const response = await axios.get('/api/notes/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error updating groups:', error);
      setError('Failed to update groups');
    }
  };

  const handleGroupSubmit = async (groupData) => {
    try {
      await updateGroups();
      setGroupDialogOpen(false);
      setSuccess('Group created successfully');
    } catch (error) {
      setError('Failed to update groups');
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleGroupSelect = (groupId) => {
    setSelectedGroup(groupId);
  };

  const handleDeleteClick = (group) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/notes/groups/${selectedGroup._id}`);
      await updateGroups();
      setDeleteDialogOpen(false);
      setSuccess('Group deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete error:', err.response || err);
      setError(err.response?.data?.message || 'Failed to delete group');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAddMemberClick = (group) => {
    setSelectedGroup(group);
    setAddMemberDialogOpen(true);
  };

  const handleAddMember = async () => {
    try {
      await axios.post(`/api/notes/groups/${selectedGroup._id}/members`, {
        email: newMemberEmail
      });
      await updateGroups();
      setAddMemberDialogOpen(false);
      setNewMemberEmail('');
      setSuccess('Member added successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Add member error:', err.response || err);
      setError(err.response?.data?.message || 'Failed to add member');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRemoveMember = async (groupId, memberId) => {
    try {
      await axios.delete(`/api/notes/groups/${groupId}/members/${memberId}`);
      await updateGroups();
      setSuccess('Member removed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Remove member error:', err.response || err);
      setError(err.response?.data?.message || 'Failed to remove member');
      setTimeout(() => setError(''), 3000);
    }
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

      <Box sx={{ mt: 2 }}>
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
          <Box>
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setGroupDialogOpen(true)}
              >
                Create Group
              </Button>
            </Box>
            <NoteGroupList 
              groups={groups} 
              onUpdate={updateGroups}
            />
          </Box>
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
      </Box>

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

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Group</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this group?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={addMemberDialogOpen} 
        onClose={() => setAddMemberDialogOpen(false)}
      >
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

export default Dashboard; 