import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Stack,
  Typography,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Save as SaveIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Add as AddIcon
} from '@mui/icons-material';
import axios from 'axios';

const NoteEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const groupIdFromUrl = queryParams.get('groupId');

  const [note, setNote] = useState({
    title: '',
    content: '',
    isLocked: false,
    lockPasscode: '',
    isEncrypted: false,
    tags: [],
    groupId: groupIdFromUrl || ''
  });
  const [groups, setGroups] = useState([]);
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passcodeDialogOpen, setPasscodeDialogOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isNoteLocked, setIsNoteLocked] = useState(false);
  const [passcodeAttempts, setPasscodeAttempts] = useState(0);
  const [isSettingLockPasscode, setIsSettingLockPasscode] = useState(false);

  useEffect(() => {
    fetchGroups();
    if (id && id !== 'new') {
      fetchNote();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchGroups = async () => {
    try {
      const response = await axios.get('/api/notes/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to fetch groups');
    }
  };

  const fetchNote = async (providedPasscode = null) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // First try to fetch the note metadata
      const metadataResponse = await axios.get(`/api/notes/${id}/metadata`, config);
      const metadata = metadataResponse.data;
      
      setIsNoteLocked(metadata.isLocked);
      
      if (metadata.isLocked && !providedPasscode) {
        setNote({
          ...metadata,
          content: '🔒 This note is locked. Enter passcode to view.'
        });
        setPasscodeDialogOpen(true);
        setLoading(false);
        return;
      }

      // If passcode is provided or note is not locked, fetch full content
      let url = `/api/notes/${id}`;
      if (providedPasscode) {
        url += `?passcode=${encodeURIComponent(providedPasscode.trim())}`;
      }

      console.log('Fetching note with URL:', url);
      const response = await axios.get(url, config);
      
      if (response.data) {
        const noteData = response.data;
        setNote(noteData);
        if (noteData.isLocked) {
          setOriginalContent(noteData.content);
        }
        setPasscodeDialogOpen(false);
        setPasscodeAttempts(0);
        setError('');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Note fetch error:', error.response?.status, error.response?.data);
      if (error.response?.status === 401) {
        setPasscodeAttempts(prev => {
          const newAttempts = prev + 1;
          if (newAttempts >= 3) {
            setError('Too many incorrect attempts. Returning to dashboard.');
            setTimeout(() => navigate('/'), 2000);
          } else {
            setError(`Invalid passcode. ${3 - newAttempts} attempts remaining.`);
          }
          return newAttempts;
        });
        setPasscode('');
      } else {
        setError(error.response?.data?.message || 'Error loading note');
      }
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // For groupId, convert empty string to null to avoid undefined
    if (name === 'groupId') {
      setNote(prev => ({
        ...prev,
        [name]: value || null
      }));
    } else {
      setNote(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleToggleLock = () => {
    if (!note.isLocked) {
      // Store the current content before showing the passcode dialog
      setOriginalContent(note.content);
      setIsSettingLockPasscode(true);
      setPasscodeDialogOpen(true);
    } else {
      // Unlocking the note - restore the original content
      setNote({
        ...note,
        isLocked: false,
        lockPasscode: '',
        content: originalContent || note.content
      });
      setOriginalContent('');
      setIsNoteLocked(false);
    }
  };

  const handlePasscodeSubmit = async () => {
    try {
      if (isSettingLockPasscode) {
        // Locking the note - just set the lock state but don't change content yet
        setNote({
          ...note,
          isLocked: true,
          lockPasscode: passcode
        });
        setIsNoteLocked(true);
        setIsSettingLockPasscode(false);
        setPasscodeDialogOpen(false);
      } else if (id && id !== 'new') {
        // Unlocking the note
        await fetchNote(passcode);
      }
      setPasscode('');
      setError('');
    } catch (error) {
      console.error('Passcode submission error:', error);
      setError(error.response?.data?.message || 'Error submitting passcode');
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !note.tags.includes(newTag.trim())) {
      setNote({
        ...note,
        tags: [...note.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleDeleteTag = (tagToDelete) => {
    setNote({
      ...note,
      tags: note.tags.filter(tag => tag !== tagToDelete)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const noteData = {
        title: note.title,
        content: note.content,
        isLocked: note.isLocked,
        lockPasscode: note.lockPasscode,
        tags: note.tags,
        isEncrypted: note.isEncrypted,
        groupId: note.groupId || null
      };

      if (id && id !== 'new') {
        await axios.put(`/api/notes/${id}`, noteData);
      } else {
        await axios.post('/api/notes', noteData);
      }
      navigate('/');
    } catch (error) {
      console.error('Error saving note:', error);
      setError(error.response?.data?.message || 'Error saving note');
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 800, mx: 'auto' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Title"
          name="title"
          value={note.title}
          onChange={handleChange}
          required
          variant="outlined"
          sx={{ mb: 2 }}
          disabled={isNoteLocked && !note.lockPasscode}
        />
        
        <TextField
          fullWidth
          label="Content"
          name="content"
          value={note.content}
          onChange={handleChange}
          required
          multiline
          rows={12}
          variant="outlined"
          sx={{ mb: 2 }}
          disabled={isNoteLocked && !note.lockPasscode}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Group</InputLabel>
          <Select
            name="groupId"
            value={note.groupId || ''}
            onChange={handleChange}
            label="Group"
          >
            <MenuItem value="">No Group</MenuItem>
            {Array.isArray(groups) && groups.map((group) => (
              <MenuItem key={group._id} value={group._id}>
                {group.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            label="Add Tag"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            size="small"
          />
          <IconButton onClick={handleAddTag} size="small">
            <AddIcon />
          </IconButton>
        </Stack>
        <Box sx={{ mt: 1 }}>
          {note.tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              onDelete={() => handleDeleteTag(tag)}
              sx={{ mr: 1, mb: 1 }}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={note.isEncrypted}
              onChange={(e) => setNote({ ...note, isEncrypted: e.target.checked })}
            />
          }
          label="Encrypt Note"
        />
        <IconButton onClick={handleToggleLock} color={note.isLocked ? 'primary' : 'default'}>
          {note.isLocked ? <LockIcon /> : <LockOpenIcon />}
        </IconButton>
      </Box>

      <Button
        type="submit"
        variant="contained"
        startIcon={<SaveIcon />}
        sx={{ mr: 1 }}
      >
        Save
      </Button>
      <Button variant="outlined" onClick={() => navigate('/')}>
        Cancel
      </Button>

      <Dialog 
        open={passcodeDialogOpen} 
        onClose={() => {
          if (id === 'new') {
            setPasscodeDialogOpen(false);
          } else {
            navigate('/');
          }
        }}
      >
        <DialogTitle>
          {id === 'new' ? 'Set Note Passcode' : 'Enter Note Passcode'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Passcode"
            type="password"
            fullWidth
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            error={passcodeAttempts > 0}
            helperText={passcodeAttempts > 0 ? `${3 - passcodeAttempts} attempts remaining` : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/')}>Cancel</Button>
          <Button 
            onClick={handlePasscodeSubmit} 
            variant="contained"
            disabled={passcodeAttempts >= 3}
          >
            {id === 'new' ? 'Set Passcode' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NoteEditor; 