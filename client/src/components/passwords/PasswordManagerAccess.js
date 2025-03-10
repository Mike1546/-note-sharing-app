import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import axios from 'axios';

const PasswordManagerAccess = ({ onAccess, requireSecondPassword, onSetupComplete, showSetup, onSetupCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [setupPassword, setSetupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // Check if there's an existing lockout
    const lockedUntil = localStorage.getItem('pmLockedUntil');
    if (lockedUntil && parseInt(lockedUntil) > Date.now()) {
      setIsLocked(true);
      startLockoutTimer(parseInt(lockedUntil));
    }
  }, []);

  const startLockoutTimer = (lockedUntil) => {
    const updateTimer = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setIsLocked(false);
        setLockoutTimer(0);
        localStorage.removeItem('pmLockedUntil');
      } else {
        setLockoutTimer(remaining);
        setTimeout(updateTimer, 1000);
      }
    };
    updateTimer();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('/api/passwords/second-password/verify', { password });
      if (response.data.valid) {
        setAttempts(0);
        localStorage.removeItem('pmLockedUntil');
        onAccess();
      } else {
        handleFailedAttempt();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
      handleFailedAttempt();
    }
    setPassword('');
  };

  const handleFailedAttempt = () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setError('Incorrect password');
    
    // Lock after 3 failed attempts
    if (newAttempts >= 3) {
      const lockoutDuration = 5 * 60 * 1000; // 5 minutes
      const lockedUntil = Date.now() + lockoutDuration;
      setIsLocked(true);
      localStorage.setItem('pmLockedUntil', lockedUntil.toString());
      startLockoutTimer(lockedUntil);
    }
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    if (setupPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await axios.post('/api/passwords/second-password/settings', {
        requireSecondPassword: true,
        secondPassword: setupPassword
      });
      setSetupPassword('');
      setConfirmPassword('');
      onSetupComplete();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set up second password');
    }
  };

  if (showSetup) {
    return (
      <Dialog open={true} maxWidth="sm" fullWidth>
        <DialogTitle>Set Up Second Password</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSetupSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              type="password"
              label="New Password"
              value={setupPassword}
              onChange={(e) => setSetupPassword(e.target.value)}
              required
              margin="normal"
              autoFocus
            />
            <TextField
              fullWidth
              type="password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              margin="normal"
            />
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <DialogActions sx={{ mt: 2, px: 0 }}>
              <Button onClick={onSetupCancel}>Cancel</Button>
              <Button onClick={handleSetupSubmit} variant="contained" color="primary">
                Save
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!requireSecondPassword) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        bgcolor: 'background.default'
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 400,
          width: '100%',
          borderRadius: 2,
          boxShadow: (theme) => theme.shadows[8]
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <LockIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h5" sx={{ mt: 2 }}>
            Password Manager Access
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This is an additional security layer that you've enabled. You can disable it using the toggle switch after logging in.
          </Typography>
        </Box>
        
        {error && (
          <Alert 
            severity="error" 
            variant="outlined"
            sx={{ 
              mb: 2, 
              width: '100%',
              '& .MuiAlert-message': { 
                width: '100%' 
              }
            }}
          >
            {error}
          </Alert>
        )}
        
        {isLocked ? (
          <Alert 
            severity="warning" 
            variant="outlined"
            sx={{ 
              mb: 2, 
              width: '100%',
              '& .MuiAlert-message': { 
                width: '100%' 
              }
            }}
          >
            Too many failed attempts. Please try again in {lockoutTimer} seconds.
          </Alert>
        ) : (
          <Box 
            component="form" 
            onSubmit={handleSubmit} 
            sx={{ 
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLocked}
              required
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1
                }
              }}
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={isLocked}
              sx={{
                py: 1,
                textTransform: 'none',
                borderRadius: 1,
                fontWeight: 'medium'
              }}
            >
              Access Password Manager
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default PasswordManagerAccess; 