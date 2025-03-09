const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const PasswordEntry = require('../models/PasswordEntry');
const PasswordGroup = require('../models/PasswordGroup');
const User = require('../models/User');

// Create a password entry
router.post('/entries',
  auth,
  [
    body('title').trim().not().isEmpty(),
    body('username').trim().not().isEmpty(),
    body('password').not().isEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, username, password, url, notes, groupId } = req.body;

      const entryData = {
        title,
        username,
        password,
        url,
        notes,
        owner: req.user.userId
      };

      // Only add group if groupId is provided
      if (groupId) {
        entryData.group = groupId;
      }

      const entry = new PasswordEntry(entryData);

      await entry.save();
      res.status(201).json(entry.decryptData());
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get all password entries for current user
router.get('/entries', auth, async (req, res) => {
  try {
    const entries = await PasswordEntry.find({
      $or: [
        { owner: req.user.userId },
        { 'sharedWith.user': req.user.userId }
      ]
    }).sort({ lastModified: -1 });

    // Decrypt sensitive data
    const decryptedEntries = entries.map(entry => entry.decryptData());
    res.json(decryptedEntries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific password entry
router.get('/entries/:id', auth, async (req, res) => {
  try {
    const entry = await PasswordEntry.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user.userId },
        { 'sharedWith.user': req.user.userId }
      ]
    });

    if (!entry) {
      return res.status(404).json({ message: 'Password entry not found' });
    }

    res.json(entry.decryptData());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a password entry
router.put('/entries/:id',
  auth,
  [
    body('title').optional().trim().not().isEmpty(),
    body('username').optional().trim().not().isEmpty(),
    body('password').optional().not().isEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const entry = await PasswordEntry.findOne({
        _id: req.params.id,
        $or: [
          { owner: req.user.userId },
          { 'sharedWith.user': req.user.userId, 'sharedWith.permission': 'edit' }
        ]
      });

      if (!entry) {
        return res.status(404).json({ message: 'Password entry not found or permission denied' });
      }

      // Update fields directly on the document
      if (req.body.title) entry.title = req.body.title;
      if (req.body.username) entry.username = req.body.username;
      if (req.body.password) entry.password = req.body.password;
      if (req.body.url) entry.url = req.body.url;
      if (req.body.notes) entry.notes = req.body.notes;

      // Save the document to trigger the encryption middleware
      await entry.save();

      // Return decrypted data
      res.json(entry.decryptData());
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Delete a password entry
router.delete('/entries/:id', auth, async (req, res) => {
  try {
    const entry = await PasswordEntry.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!entry) {
      return res.status(404).json({ message: 'Password entry not found or permission denied' });
    }

    await PasswordEntry.deleteOne({ _id: req.params.id });
    res.json({ message: 'Password entry deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a password group
router.post('/groups',
  auth,
  [
    body('name').trim().not().isEmpty(),
    body('description').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description } = req.body;

      const group = new PasswordGroup({
        name,
        description,
        owner: req.user.userId,
        members: [{ user: req.user.userId, role: 'admin' }]
      });

      await group.save();
      res.status(201).json(group);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get all password groups for current user
router.get('/groups', auth, async (req, res) => {
  try {
    const groups = await PasswordGroup.find({
      'members.user': req.user.userId
    }).populate('members.user', 'name email');
    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add member to a password group
router.post('/groups/:id/members', auth, async (req, res) => {
  try {
    const { email, role } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const group = await PasswordGroup.findOne({
      _id: req.params.id,
      'members.user': req.user.userId,
      'members.role': 'admin'
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or permission denied' });
    }

    // Check if user is already a member
    const isMember = group.members.some(member => member.user.toString() === user._id.toString());
    if (isMember) {
      return res.status(400).json({ message: 'User is already a member of this group' });
    }

    group.members.push({ user: user._id, role: role || 'member' });
    await group.save();

    res.json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove member from a password group
router.delete('/groups/:id/members/:userId', auth, async (req, res) => {
  try {
    const group = await PasswordGroup.findOne({
      _id: req.params.id,
      'members.user': req.user.userId,
      'members.role': 'admin'
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or permission denied' });
    }

    group.members = group.members.filter(
      member => member.user.toString() !== req.params.userId
    );

    await group.save();
    res.json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a password group (owner only)
router.delete('/groups/:id', auth, async (req, res) => {
  try {
    const group = await PasswordGroup.findOne({
      _id: req.params.id,
      'members.user': req.user.userId,
      'members.role': 'admin'
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or permission denied' });
    }

    await PasswordGroup.deleteOne({ _id: req.params.id });
    res.json({ message: 'Password group deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 