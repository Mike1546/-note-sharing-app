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
    <Container maxWidth="lg">
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: 2,
        py: 4
      }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 'medium',
            color: 'primary.main',
            mb: 1
          }}
        >
          Password Manager
        </Typography>
        
        {error && (
          <Alert 
            severity="error" 
            variant="outlined"
            sx={{ 
              '& .MuiAlert-message': { 
                display: 'flex', 
                alignItems: 'center' 
              } 
            }}
          >
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert 
            severity="success"
            variant="outlined"
            sx={{ 
              '& .MuiAlert-message': { 
                display: 'flex', 
                alignItems: 'center' 
              } 
            }}
          >
            {success}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
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
              size="small"
              sx={{
                textTransform: 'none',
                fontWeight: 'medium'
              }}
              onClick={() => setEntryDialogOpen(true)}
            >
              Add Password
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="small"
              sx={{
                textTransform: 'none',
                fontWeight: 'medium'
              }}
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
      </Box>

      <Dialog
        open={entryDialogOpen}
        onClose={() => setEntryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            boxShadow: 3
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>Add Password Entry</DialogTitle>
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
        PaperProps={{
          sx: {
            borderRadius: 1,
            boxShadow: 3
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>Create Password Group</DialogTitle>
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