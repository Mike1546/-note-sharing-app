import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import api from '../../api/axios';

const Calendar = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [reminders, setReminders] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: dayjs().format('YYYY-MM-DD'),
    time: '12:00',
    notification: true,
    priority: 'medium'
  });

  useEffect(() => {
    getDayReminders(selectedDate);
  }, [selectedDate]);

  const getDayReminders = async (date) => {
    try {
      const formattedDate = date.format('YYYY-MM-DD');
      const response = await api.get(`/api/reminders?date=${formattedDate}`);
      const filteredReminders = response.data.filter(reminder => 
        dayjs(reminder.date).format('YYYY-MM-DD') === formattedDate
      );
      setReminders(filteredReminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      setError('Failed to fetch reminders');
    }
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    getDayReminders(newDate);
  };

  const handleAddReminder = () => {
    setEditingReminder(null);
    setFormData({
      title: '',
      description: '',
      date: selectedDate.format('YYYY-MM-DD'),
      time: '12:00',
      notification: true,
      priority: 'medium'
    });
    setDialogOpen(true);
  };

  const handleEditReminder = (reminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      description: reminder.description,
      date: dayjs(reminder.date).format('YYYY-MM-DD'),
      time: dayjs(reminder.date).format('HH:mm'),
      notification: reminder.notification,
      priority: reminder.priority
    });
    setDialogOpen(true);
  };

  const handleDeleteReminder = async (reminderId) => {
    try {
      await api.delete(`/api/reminders/${reminderId}`);
      await getDayReminders(selectedDate);
      setSuccess('Reminder deleted successfully');
    } catch (err) {
      setError('Failed to delete reminder');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const [hours, minutes] = formData.time.split(':');
    const reminderDate = dayjs(formData.date)
      .hour(parseInt(hours))
      .minute(parseInt(minutes));

    try {
      const reminderData = {
        ...formData,
        date: reminderDate.toISOString()
      };

      if (editingReminder) {
        await api.put(`/api/reminders/${editingReminder._id}`, reminderData);
      } else {
        await api.post('/api/reminders', reminderData);
      }

      await getDayReminders(selectedDate);
      setDialogOpen(false);
      setSuccess(editingReminder ? 'Reminder updated successfully' : 'Reminder created successfully');
    } catch (error) {
      console.error('Error creating reminder:', error);
      setError('Failed to save reminder');
    }
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'notification' ? checked : value
    }));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box 
        sx={{ 
          mb: 4, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2
        }}
      >
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 'bold',
            color: 'primary.main' 
          }}
        >
          Calendar & Reminders
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddReminder}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            boxShadow: 2,
            '&:hover': {
              boxShadow: 4
            }
          }}
        >
          Add Reminder
        </Button>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2,
            borderRadius: 2,
            boxShadow: 1
          }} 
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 2,
            borderRadius: 2,
            boxShadow: 1
          }} 
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3,
              borderRadius: 2,
              backgroundColor: 'background.paper',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: 6
              }
            }}
          >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <StaticDatePicker
                value={selectedDate}
                onChange={handleDateChange}
                renderInput={(params) => <TextField {...params} />}
                sx={{
                  width: '100%',
                  '& .MuiPickersDay-root': {
                    borderRadius: 1,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                  },
                }}
              />
            </LocalizationProvider>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ 
              fontWeight: 'medium',
              color: 'text.primary',
              mb: 3
            }}
          >
            Reminders for {selectedDate.format('MMMM D, YYYY')}
          </Typography>
          {reminders.map(reminder => (
            <Card 
              key={reminder._id} 
              sx={{ 
                mb: 2,
                borderRadius: 2,
                boxShadow: 2,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <CardContent sx={{ pb: 1 }}>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 'medium',
                    color: 'text.primary'
                  }}
                >
                  {reminder.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    mb: 2
                  }}
                >
                  {reminder.description}
                </Typography>
                <Box sx={{ 
                  mt: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  color: 'text.secondary'
                }}>
                  <NotificationsIcon
                    color={reminder.notification ? 'primary' : 'disabled'}
                    fontSize="small"
                  />
                  <Typography variant="body2">
                    {dayjs(reminder.date).format('h:mm A')}
                  </Typography>
                  <Chip
                    label={reminder.priority}
                    size="small"
                    sx={{
                      fontWeight: 'medium',
                      ml: 'auto'
                    }}
                    color={
                      reminder.priority === 'high' ? 'error' :
                      reminder.priority === 'medium' ? 'warning' : 'success'
                    }
                  />
                </Box>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <IconButton 
                  size="small" 
                  onClick={() => handleEditReminder(reminder)}
                  sx={{ 
                    '&:hover': { 
                      color: 'primary.main',
                      backgroundColor: 'primary.lighter'
                    }
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => handleDeleteReminder(reminder._id)}
                  sx={{ 
                    '&:hover': { 
                      color: 'error.main',
                      backgroundColor: 'error.lighter'
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          ))}
          {reminders.length === 0 && (
            <Typography 
              color="text.secondary"
              sx={{ 
                textAlign: 'center',
                py: 4,
                backgroundColor: 'background.paper',
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider'
              }}
            >
              No reminders for this day
            </Typography>
          )}
        </Grid>
      </Grid>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 24
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          {editingReminder ? 'Edit Reminder' : 'New Reminder'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            pt: 3,
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2.5
          }}>
            <TextField
              fullWidth
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />
            <TextField
              fullWidth
              label="Description"
              name="description"
              multiline
              rows={3}
              value={formData.description}
              onChange={handleChange}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />
            <TextField
              fullWidth
              label="Date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />
            <TextField
              fullWidth
              label="Time"
              type="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                label="Priority"
                sx={{ borderRadius: 1 }}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.notification}
                  onChange={handleChange}
                  name="notification"
                  color="primary"
                />
              }
              label="Enable Notifications"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button 
            onClick={() => setDialogOpen(false)}
            sx={{ 
              borderRadius: 1,
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            sx={{ 
              borderRadius: 1,
              textTransform: 'none',
              boxShadow: 1,
              '&:hover': {
                boxShadow: 2
              }
            }}
          >
            {editingReminder ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Calendar; 