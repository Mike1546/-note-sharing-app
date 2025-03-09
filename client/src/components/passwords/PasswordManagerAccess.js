import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

const PasswordManagerAccess = ({ onAccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // This is a simple example - in production, you'd want to hash this password and store it securely
    const correctPassword = 'admin123'; // You should change this to a secure password
    
    if (password === correctPassword) {
      setAttempts(0);
      localStorage.removeItem('pmLockedUntil');
      onAccess();
    } else {
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
    }
    setPassword('');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh'
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
          width: '100%'
        }}
      >
        <LockIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" component="h1" gutterBottom>
          Password Manager Access
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your password to access the password manager
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
            {error}
          </Alert>
        )}
        
        {isLocked ? (
          <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
            Too many failed attempts. Please try again in {lockoutTimer} seconds.
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLocked}
              required
              sx={{ mb: 2 }}
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={isLocked}
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