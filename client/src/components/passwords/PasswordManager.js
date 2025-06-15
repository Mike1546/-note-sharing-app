import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  FormControlLabel,
  Stack
} from '@mui/material';
import { Add as AddIcon, FileUpload as FileUploadIcon, FileDownload as FileDownloadIcon } from '@mui/icons-material';
import api from '../../api/axios';
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
  const fileInputRef = useRef(null);

  // Load user's second password preference
  useEffect(() => {
    const loadSecondPasswordSetting = async () => {
      try {
        const response = await api.get('/api/passwords/second-password/settings');
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
  }, []); // Only run once on mount

  const fetchData = useCallback(async () => {
    if (!hasAccess) return;
    
    try {
      const [entriesRes, groupsRes] = await Promise.all([
        api.get('/api/passwords/entries'),
        api.get('/api/passwords/groups')
      ]);
      setEntries(entriesRes.data);
      setGroups(groupsRes.data);
    } catch (err) {
      setError('Failed to fetch data');
    }
  }, [hasAccess]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSecondPasswordToggle = async (event) => {
    const newValue = event.target.checked;
    
    try {
      if (newValue) {
        setShowSetupDialog(true);
        setRequireSecondPassword(true);
      } else {
        await api.post('/api/passwords/second-password/settings', {
          requireSecondPassword: false
        });
        setRequireSecondPassword(false);
        setHasAccess(true);
        setSuccess('Second password requirement disabled');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings');
      setRequireSecondPassword(!newValue);
    }
  };

  const handleSetupComplete = () => {
    setShowSetupDialog(false);
    setRequireSecondPassword(true);
    setHasAccess(false);
    setSuccess('Second password requirement enabled');
  };

  const handleSetupCancel = () => {
    setShowSetupDialog(false);
    setRequireSecondPassword(false); // Reset the toggle state when canceling setup
  };

  const handleAccess = () => {
    setHasAccess(true);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEntrySubmit = async (entryData) => {
    try {
      const response = await api.post('/api/passwords/entries', entryData);
      setEntries([response.data, ...entries]);
      setEntryDialogOpen(false);
      setSuccess('Password entry created successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create password entry');
    }
  };

  const handleGroupSubmit = async (groupData) => {
    try {
      const response = await api.post('/api/passwords/groups', groupData);
      setGroups([response.data, ...groups]);
      setGroupDialogOpen(false);
      setSuccess('Password group created successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create password group');
    }
  };

  // Add export function
  const handleExport = async () => {
    try {
      setError('');
      setSuccess('');
      
      const format = 'csv'; // Default to CSV format
      const response = await api.get(`/api/passwords/export?format=${format}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });
      
      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `passwords-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccess('Passwords exported successfully');
        return;
      }

      const { data, count, message } = response.data;
      
      if (!data || !Array.isArray(data)) {
        setError('Invalid response format from server');
        return;
      }

      if (count === 0) {
        setError('No passwords available to export');
        return;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });

      try {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `passwords-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (downloadError) {
        console.error('Download error:', downloadError);
        setError('Failed to download the exported file');
        return;
      }
      
      setSuccess(message || `Successfully exported ${count} passwords`);
    } catch (err) {
      console.error('Export error:', err);
      if (err.response?.status === 429) {
        setError('Too many export attempts. Please try again later.');
      } else {
        setError(err.response?.data?.message || 'Failed to export passwords');
      }
    }
  };

  // Add import function
  const handleImport = async (event) => {
    try {
      setError('');
      setSuccess('');
      
      const file = event.target.files[0];
      if (!file) return;

      // Validate file type
      const isCsv = file.type === 'text/csv' || file.name.endsWith('.csv');
      const isJson = file.type === 'application/json' || file.name.endsWith('.json');
      
      if (!isCsv && !isJson) {
        setError('Please select a valid CSV or JSON file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit');
        return;
      }

      const reader = new FileReader();
      
      reader.onload = async (e) => {
        let content;
        const format = isCsv ? 'csv' : 'json';
        
        if (format === 'json') {
          try {
            content = JSON.parse(e.target.result);
          } catch (parseError) {
            setError('Invalid JSON format in the imported file');
            return;
          }
            
          // Basic validation of imported data
          if (!Array.isArray(content)) {
            setError('Invalid file format: content must be an array of passwords');
            return;
          }
        } else {
          content = e.target.result;
        }

        try {
          const response = await api.post('/api/passwords/import', { 
            format,
            data: content
          }, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          setSuccess(response.data.msg);
          await fetchData(); // Refresh the password list
        } catch (importError) {
          if (importError.response?.status === 429) {
            setError('Too many import attempts. Please try again later.');
          } else {
            setError(importError.response?.data?.msg || 'Failed to import passwords');
          }
          console.error('Import error:', importError);
        }
      };

      reader.onerror = () => {
        setError('Failed to read the file');
      };

      reader.readAsText(file);
    } catch (err) {
      setError('Failed to process the import file');
      console.error('Import error:', err);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
        <Stack direction="row" spacing={2} alignItems="center">
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
          <input
            type="file"
            accept=".csv,.json"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleImport}
          />
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            Import
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
          >
            Export
          </Button>
        </Stack>
      </Box>

      {showSetupDialog && (
        <PasswordManagerAccess 
          onAccess={handleAccess}
          requireSecondPassword={requireSecondPassword}
          onSetupComplete={handleSetupComplete}
          showSetup={showSetupDialog}
          onSetupCancel={handleSetupCancel}
        />
      )}

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
        <PasswordList entries={entries} onUpdate={fetchData} />
      ) : (
        <PasswordGroupList groups={groups} onUpdate={fetchData} />
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