import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid
} from '@mui/material';

const PasswordGroupForm = ({ group, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        description: group.description || ''
      });
    }
  }, [group]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
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
            label="Group Name"
            name="name"
            value={formData.name}
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
            label="Description"
            name="description"
            multiline
            rows={3}
            value={formData.description}
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
              {group ? 'Update' : 'Create'} Group
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PasswordGroupForm; 