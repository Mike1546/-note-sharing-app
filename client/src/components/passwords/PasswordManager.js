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
  Tab,
  Switch,
  FormControlLabel
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
  const [requireSecondPassword, setRequireSecondPassword] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [entries, setEntries] = useState([]);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);

  // Load user's second password preference
  useEffect(() => {
    const loadSecondPasswordSetting = async () => {
      try {
        const response = await axios.get('/api/passwords/second-password/settings');
        const { requireSecondPassword } = response.data;
        setRequireSecondPassword(requireSecondPassword);
        if (!requireSecondPassword) {
          setHasAccess(true);
        }
      } catch (err) {
        setError('Failed to load settings');
      }
    };

    loadSecondPasswordSetting();
  }, []);

  const handleSecondPasswordToggle = async (event) => {
    const newValue = event.target.checked;
    
    if (newValue) {
      setShowSetupDialog(true);
    } else {
      try {
        await axios.post('/api/passwords/second-password/settings', {
          requireSecondPassword: false
        });
        setRequireSecondPassword(false);
        setHasAccess(true);
      } catch (err) {
        setError('Failed to update settings');
      }
    }
  };

  const handleSetupComplete = () => {
    setShowSetupDialog(false);
    setRequireSecondPassword(true);
    setHasAccess(false);
  };

  const handleSetupCancel = () => {
    setShowSetupDialog(false);
    setRequireSecondPassword(false);
  };

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

  if (!hasAccess && requireSecondPassword) {
    return (
      <Container maxWidth="sm">
        <PasswordManagerAccess 
          onAccess={handleAccess}
          requireSecondPassword={requireSecondPassword}
          onSetupComplete={handleSetupComplete}
          showSetup={showSetupDialog}
          onSetupCancel={handleSetupCancel}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Password Manager</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={requireSecondPassword}
              onChange={handleSecondPasswordToggle}
              color="primary"
            />
          }
          label="Require Second Password"
        />
      </Box>

      {error && (
        <Alert 
          severity="error" 
          variant="outlined"
          sx={{ mb: 2 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert 
          severity="success"
          variant="outlined"
          sx={{ mb: 2 }}
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{ 
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '0.95rem',
              minHeight: 48,
              py: 0
            }
          }}
        >
          <Tab label="My Passwords" />
          <Tab label="Password Groups" />
        </Tabs>
      </Box>

      <Box sx={{ mb: 2 }}>
        {activeTab === 0 ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setEntryDialogOpen(true)}
          >
            Add Password
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setGroupDialogOpen(true)}
          >
            Create Group
          </Button>
        )}
      </Box>

      {activeTab === 0 ? (
        <PasswordList entries={entries} onUpdate={fetchEntries} />
      ) : (
        <PasswordGroupList groups={groups} onUpdate={fetchGroups} />
      )}

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