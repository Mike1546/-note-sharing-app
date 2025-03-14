const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Reminder = require('../models/Reminder');

// Get all reminders for current user
router.get('/', auth, async (req, res) => {
  try {
    const reminders = await Reminder.find({ owner: req.user.userId })
      .sort({ date: 1 });
    res.json(reminders);
  } catch (err) {
    console.error('Error fetching reminders:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new reminder
router.post('/', auth, [
  body('title').trim().not().isEmpty(),
  body('date').isISO8601(),
  body('priority').isIn(['low', 'medium', 'high'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, date, notification, priority } = req.body;
    const reminder = new Reminder({
      title,
      description,
      date,
      notification,
      priority,
      owner: req.user.userId
    });

    await reminder.save();
    res.status(201).json(reminder);
  } catch (err) {
    console.error('Error creating reminder:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a reminder
router.put('/:id', auth, async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    const { title, description, date, notification, priority } = req.body;
    
    reminder.title = title || reminder.title;
    reminder.description = description || reminder.description;
    reminder.date = date || reminder.date;
    reminder.notification = notification !== undefined ? notification : reminder.notification;
    reminder.priority = priority || reminder.priority;

    await reminder.save();
    res.json(reminder);
  } catch (err) {
    console.error('Error updating reminder:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a reminder
router.delete('/:id', auth, async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    await reminder.remove();
    res.json({ message: 'Reminder deleted successfully' });
  } catch (err) {
    console.error('Error deleting reminder:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 