import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';

const PasswordEntryForm = ({ entry, groups, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    groupId: ''
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        title: entry.title,
        username: entry.username,
        password: entry.password,
        url: entry.url || '',
        notes: entry.notes || '',
        groupId: entry.group?._id || ''
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
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
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
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="URL"
            name="url"
            value={formData.url}
            onChange={handleChange}
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
          />
        </Grid>
        {groups && (
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Group</InputLabel>
              <Select
                name="groupId"
                value={formData.groupId}
                onChange={handleChange}
                label="Group"
              >
                <MenuItem value="">None</MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group._id} value={group._id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              {entry ? 'Update' : 'Add'} Password
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PasswordEntryForm; 