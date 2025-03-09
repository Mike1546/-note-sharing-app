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

      // Create the password entry
      const entryData = {
        title,
        username,
        password,
        url,
        notes,
        owner: req.user.userId
      };

      // If groupId is provided, verify the group exists and user is a member
      if (groupId) {
        const group = await PasswordGroup.findOne({
          _id: groupId,
          'members.user': req.user.userId
        });

        if (!group) {
          return res.status(404).json({ message: 'Group not found or you are not a member' });
        }

        entryData.group = groupId;
      }

      const entry = new PasswordEntry(entryData);
      await entry.save();

      // Populate the response with group details if needed
      const populatedEntry = await PasswordEntry.findById(entry._id)
        .populate('group', 'name members')
        .populate('owner', 'name');

      res.status(201).json(populatedEntry.decryptData());
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
        { group: { $in: await getGroupIds(req.user.userId) } }
      ]
    })
    .populate('group', 'name members')
    .populate('owner', 'name')
    .sort({ lastModified: -1 });

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
router.put('/entries/:id', auth, async (req, res) => {
  try {
    const entry = await PasswordEntry.findOne({
      _id: req.params.id
    }).populate('group', 'members');

    if (!entry) {
      return res.status(404).json({ message: 'Password entry not found' });
    }

    // Check if user has edit permissions
    const canEdit = entry.owner.toString() === req.user.userId || 
      (entry.group && entry.group.members.some(m => 
        m.user.toString() === req.user.userId && m.role === 'admin'
      ));

    if (!canEdit) {
      return res.status(403).json({ message: 'You do not have permission to edit this password' });
    }

    const { title, username, password, url, notes, groupId } = req.body;

    // Update the entry
    entry.title = title;
    entry.username = username;
    entry.password = password;
    entry.url = url;
    entry.notes = notes;

    // Handle group changes
    if (groupId !== undefined) {
      if (groupId) {
        const group = await PasswordGroup.findOne({
          _id: groupId,
          'members.user': req.user.userId
        });

        if (!group) {
          return res.status(404).json({ message: 'Group not found or you are not a member' });
        }

        entry.group = groupId;
      } else {
        entry.group = null;
      }
    }

    await entry.save();

    // Populate the response
    const updatedEntry = await PasswordEntry.findById(entry._id)
      .populate('group', 'name members')
      .populate('owner', 'name');

    res.json(updatedEntry.decryptData());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a password entry
router.delete('/entries/:id', auth, async (req, res) => {
  try {
    const entry = await PasswordEntry.findById(req.params.id)
      .populate('group', 'members');

    if (!entry) {
      return res.status(404).json({ message: 'Password entry not found' });
    }

    // Check if user has delete permissions
    const canDelete = 
      // User is admin
      req.user.isAdmin || 
      // User is owner
      entry.owner.toString() === req.user.userId || 
      // User is group admin
      (entry.group && entry.group.members.some(m => 
        m.user.toString() === req.user.userId && 
        m.role === 'admin'
      ));

    if (!canDelete) {
      return res.status(403).json({ message: 'You do not have permission to delete this password' });
    }

    await entry.remove();
    res.json({ message: 'Password entry deleted successfully' });
  } catch (err) {
    console.error('Delete password error:', err);
    res.status(500).json({ message: 'Server error while deleting password entry' });
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

// Helper function to get groups where user is a member
async function getGroupIds(userId) {
  const groups = await PasswordGroup.find({
    'members.user': userId
  });
  return groups.map(g => g._id);
}

module.exports = router; 