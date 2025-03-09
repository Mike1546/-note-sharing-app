import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import axios from 'axios';
import PasswordList from './PasswordList';
import PasswordGroupList from './PasswordGroupList';
import PasswordEntryForm from './PasswordEntryForm';
import PasswordGroupForm from './PasswordGroupForm';
import PasswordManagerAccess from './PasswordManagerAccess';

const PasswordManager = () => {
  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [entries, setEntries] = useState([]);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      const response = await axios.get('/api/passwords/entries');
      setEntries(response.data);
    } catch (err) {
      setError('Failed to fetch password entries');
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await axios.get('/api/passwords/groups');
      setGroups(response.data);
    } catch (err) {
      setError('Failed to fetch password groups');
    }
  }, []);

  useEffect(() => {
    if (hasAccess) {
      fetchEntries();
      fetchGroups();
    }
  }, [hasAccess, fetchEntries, fetchGroups]);

  const handleAccess = () => {
    setHasAccess(true);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEntrySubmit = async (entryData) => {
    try {
      const response = await axios.post('/api/passwords/entries', entryData);
      setEntries([response.data, ...entries]);
      setEntryDialogOpen(false);
      setSuccess('Password entry created successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create password entry');
    }
  };

  const handleGroupSubmit = async (groupData) => {
    try {
      const response = await axios.post('/api/passwords/groups', groupData);
      setGroups([response.data, ...groups]);
      setGroupDialogOpen(false);
      setSuccess('Password group created successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create password group');
    }
  };

  if (!hasAccess) {
    return <PasswordManagerAccess onAccess={handleAccess} />;
  }

  return (
    <Container>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Password Manager
        </Typography>
        
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
          <Tab label="MY PASSWORDS" />
          <Tab label="PASSWORD GROUPS" />
        </Tabs>

        <Box sx={{ mb: 2 }}>
          {activeTab === 0 ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setEntryDialogOpen(true)}
            >
              ADD PASSWORD
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setGroupDialogOpen(true)}
            >
              CREATE GROUP
            </Button>
          )}
        </Box>

        {activeTab === 0 ? (
          <PasswordList entries={entries} onUpdate={fetchEntries} />
        ) : (
          <PasswordGroupList groups={groups} onUpdate={fetchGroups} />
        )}
      </Box>

      <Dialog
        open={entryDialogOpen}
        onClose={() => setEntryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Password Entry</DialogTitle>
        <DialogContent>
          <PasswordEntryForm
            groups={groups}
            onSubmit={handleEntrySubmit}
            onCancel={() => setEntryDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Password Group</DialogTitle>
        <DialogContent>
          <PasswordGroupForm
            onSubmit={handleGroupSubmit}
            onCancel={() => setGroupDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default PasswordManager; 