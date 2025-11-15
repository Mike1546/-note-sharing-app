import React, { useState } from 'react';
import { Container, Box, Typography, Button, Alert, Paper } from '@mui/material';
import { client, account } from '../appwrite';

const AppwriteDiagnostics = () => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testConnection = async () => {
    setError(null);
    setResult(null);
    try {
      const health = await fetch(`${process.env.REACT_APP_APPWRITE_ENDPOINT}/health`, {
        method: 'GET',
      });
      const healthData = await health.json();
      
      setResult({
        endpoint: process.env.REACT_APP_APPWRITE_ENDPOINT,
        project: process.env.REACT_APP_APPWRITE_PROJECT,
        database: process.env.REACT_APP_APPWRITE_DATABASE_ID,
        profiles: process.env.REACT_APP_APPWRITE_COLLECTION_PROFILES,
        health: healthData,
        origin: window.location.origin,
        clientEndpoint: client.config.endpoint,
        clientProject: client.config.project,
      });
    } catch (err) {
      setError(err.message || 'Health check failed');
    }
  };

  const testSession = async () => {
    setError(null);
    setResult(null);
    try {
      const session = await account.get();
      setResult({ session });
    } catch (err) {
      setError(`Session check: ${err.message || 'Not logged in'}`);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Appwrite Diagnostics
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="contained" onClick={testConnection}>
          Test Connection
        </Button>
        <Button variant="contained" onClick={testSession}>
          Check Session
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Result:</Typography>
          <pre style={{ overflow: 'auto', fontSize: '12px' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </Paper>
      )}

      <Paper sx={{ p: 2, mt: 2, bgcolor: '#f5f5f5' }}>
        <Typography variant="h6">Environment Check:</Typography>
        <Typography variant="body2" component="div">
          <strong>Endpoint:</strong> {process.env.REACT_APP_APPWRITE_ENDPOINT || '❌ NOT SET'}
        </Typography>
        <Typography variant="body2" component="div">
          <strong>Project:</strong> {process.env.REACT_APP_APPWRITE_PROJECT || '❌ NOT SET'}
        </Typography>
        <Typography variant="body2" component="div">
          <strong>Database:</strong> {process.env.REACT_APP_APPWRITE_DATABASE_ID || '❌ NOT SET'}
        </Typography>
        <Typography variant="body2" component="div">
          <strong>Profiles Collection:</strong> {process.env.REACT_APP_APPWRITE_COLLECTION_PROFILES || '❌ NOT SET'}
        </Typography>
        <Typography variant="body2" component="div" sx={{ mt: 1 }}>
          <strong>Current Origin:</strong> {window.location.origin}
        </Typography>
        <Typography variant="body2" component="div">
          <strong>Current URL:</strong> {window.location.href}
        </Typography>
      </Paper>
    </Container>
  );
};

export default AppwriteDiagnostics;
