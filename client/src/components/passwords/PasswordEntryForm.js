import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  FormHelperText
} from '@mui/material';

const PasswordEntryForm = ({ entry, groups, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    groupId: '',
    permissions: {
      canEdit: false,
      canShare: false
    }
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        title: entry.title,
        username: entry.username,
        password: entry.password,
        url: entry.url || '',
        notes: entry.notes || '',
        groupId: entry.group?._id || '',
        permissions: entry.permissions || {
          canEdit: false,
          canShare: false
        }
      });
    }
  }, [entry]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submissionData = { ...formData };
    // Remove groupId if it's empty to avoid MongoDB ObjectId casting error
    if (!submissionData.groupId) {
      delete submissionData.groupId;
    }
    onSubmit(submissionData);
  };

  return (
    <Box 
      component="form" 
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        pt: 1
      }}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1
              }
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1
              }
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
                fontFamily: 'monospace'
              }
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="URL"
            name="url"
            value={formData.url}
            onChange={handleChange}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1
              }
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Notes"
            name="notes"
            multiline
            rows={3}
            value={formData.notes}
            onChange={handleChange}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1
              }
            }}
          />
        </Grid>
        
        {groups && groups.length > 0 && (
          <>
            <Grid item xs={12}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  mb: 1,
                  fontWeight: 'medium',
                  color: 'text.primary'
                }}
              >
                Share with Group
              </Typography>
              <FormControl 
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1
                  }
                }}
              >
                <InputLabel>Group</InputLabel>
                <Select
                  name="groupId"
                  value={formData.groupId}
                  onChange={handleChange}
                  label="Group"
                >
                  <MenuItem value="">Don't share</MenuItem>
                  {groups.map((group) => (
                    <MenuItem key={group._id} value={group._id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Group members will be able to view this password
                </FormHelperText>
              </FormControl>
            </Grid>
          </>
        )}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
            <Button 
              onClick={onCancel}
              size="small"
              sx={{
                textTransform: 'none',
                fontWeight: 'medium'
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              size="small"
              sx={{
                textTransform: 'none',
                fontWeight: 'medium'
              }}
            >
              {entry ? 'Update' : 'Add'} Password
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PasswordEntryForm; 