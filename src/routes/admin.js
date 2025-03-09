const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordEntry = require('../models/PasswordEntry');
const PasswordGroup = require('../models/PasswordGroup');
const auth = require('../middleware/auth');
const LoginLog = require('../models/LoginLog');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      console.error('Admin access denied for user:', req.user);
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users (admin only)
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user details including their password entries and groups
router.get('/users/:userId/details', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passwordEntries = await PasswordEntry.find({ owner: user._id });
    const groups = await PasswordGroup.find({ 'members.user': user._id });

    res.json({
      user,
      passwordEntries: passwordEntries.map(entry => entry.decryptData()),
      groups
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin only)
router.put('/users/:userId', auth, isAdmin, async (req, res) => {
  try {
    const { name, email, isAdmin: makeAdmin } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (typeof makeAdmin === 'boolean') user.isAdmin = makeAdmin;

    await user.save();
    res.json({ message: 'User updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user and all their data (admin only)
router.delete('/users/:userId', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user's password entries
    await PasswordEntry.deleteMany({ owner: user._id });

    // Remove user from all groups
    await PasswordGroup.updateMany(
      { 'members.user': user._id },
      { $pull: { members: { user: user._id } } }
    );

    // Delete groups where user is the only member
    await PasswordGroup.deleteMany({
      $and: [
        { 'members.user': user._id },
        { members: { $size: 1 } }
      ]
    });

    // Delete the user
    await User.deleteOne({ _id: user._id });

    res.json({ message: 'User and associated data deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Change user password (admin only)
router.put('/users/:userId/password', auth, isAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all password entries (admin only)
router.get('/passwords', auth, isAdmin, async (req, res) => {
  try {
    const entries = await PasswordEntry.find()
      .populate('owner', 'name email')
      .populate('group', 'name');
    
    const decryptedEntries = entries.map(entry => ({
      ...entry.decryptData(),
      owner: entry.owner,
      group: entry.group
    }));

    res.json(decryptedEntries);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete password entry (admin only)
router.delete('/passwords/:entryId', auth, isAdmin, async (req, res) => {
  try {
    await PasswordEntry.deleteOne({ _id: req.params.entryId });
    res.json({ message: 'Password entry deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all password groups (admin only)
router.get('/groups', auth, isAdmin, async (req, res) => {
  try {
    const groups = await PasswordGroup.find()
      .populate('owner', 'name email')
      .populate('members.user', 'name email');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete password group (admin only)
router.delete('/groups/:groupId', auth, isAdmin, async (req, res) => {
  try {
    await PasswordGroup.deleteOne({ _id: req.params.groupId });
    res.json({ message: 'Password group deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add login logs route
router.get('/logs', auth, isAdmin, async (req, res) => {
  try {
    const logs = await LoginLog.find()
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching login logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 