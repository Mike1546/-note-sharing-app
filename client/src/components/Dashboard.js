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
import notesDb from '../services/db';
import groupsService from '../services/groups';
import { useAuth } from '../contexts/AuthContext';
import NoteGroupList from './notes/NoteGroupList';
import NoteGroupForm from './notes/NoteGroupForm';

// Add delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    const fetchData = async () => {
      try {
        if (!user?.$id) return;
        // Notes (Appwrite)
        const resNotes = await notesDb.listNotes(user.$id);
        const mappedNotes = (resNotes?.documents || resNotes || []).map((d) => ({
          _id: d.$id,
          title: d.title || '',
          content: d.content || '',
          tags: d.tags || [],
          group: d.groupId || null,
        }));
        setNotes(mappedNotes);

        // Groups (Appwrite)
        const groups = await groupsService.listGroups();
        const mappedGroups = groups.map((g) => ({
          _id: g.$id,
          name: g.name || '',
          description: g.description || '',
          members: g.members || [],
        }));
        setGroups(mappedGroups);

        // Build group -> notes mapping locally
        const map = {};
        mappedGroups.forEach((g) => {
          map[g._id] = mappedNotes.filter((n) => (n.group || n.groupId) === g._id);
        });
        setGroupNotes(map);
        setError('');
      } catch (err) {
        console.error('Error fetching Appwrite data:', err);
        setError('Failed to fetch data');
      }
    };
    fetchData();
  }, [user]);

  const handleEditNote = (noteId) => {
    navigate(`/notes/${noteId}`);
  };

  const handleDeleteNote = async (noteId) => {
    try {
      // For now, just remove locally until Note editor migration completes.
      setNotes(notes.filter((n) => n._id !== noteId));
      setSuccess('Note removed from view');
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
    // Sharing not yet implemented with Appwrite in this UI.
    setShareDialogOpen(false);
    setSuccess('Sharing not available yet');
  };

  const updateGroups = async () => {
    try {
      const gs = await groupsService.listGroups();
      const mapped = gs.map((g) => ({ _id: g.$id, name: g.name || '', description: g.description || '', members: g.members || [] }));
      setGroups(mapped);
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
      await groupsService.deleteGroup(selectedGroup._id);
      await updateGroups();
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