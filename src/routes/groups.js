const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Group = require('../models/Group');
const User = require('../models/User');

// Get all groups for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({ 
      $or: [
        { owner: req.user.userId },
        { members: req.user.userId }
      ]
    }).sort({ createdAt: -1 });
    res.json(groups);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ message: 'Error fetching groups' });
  }
});

// Create a new group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const group = new Group({
      name,
      description: description || '',
      owner: req.user.userId,
      members: [req.user.userId]
    });

    await group.save();
    res.status(201).json(group);
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({ message: 'Error creating group' });
  }
});

// Update a group
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const group = await Group.findOne({ _id: req.params.id, owner: req.user.userId });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or unauthorized' });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;

    await group.save();
    res.json(group);
  } catch (err) {
    console.error('Error updating group:', err);
    res.status(500).json({ message: 'Error updating group' });
  }
});

// Delete a group
router.delete('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, owner: req.user.userId });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or unauthorized' });
    }

    await group.deleteOne();
    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ message: 'Error deleting group' });
  }
});

// Add member to group
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findOne({ _id: req.params.id, owner: req.user.userId });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (group.members.includes(userId)) {
      return res.status(400).json({ message: 'User is already a member of this group' });
    }

    group.members.push(userId);
    await group.save();
    res.json(group);
  } catch (err) {
    console.error('Error adding member to group:', err);
    res.status(500).json({ message: 'Error adding member to group' });
  }
});

// Remove member from group
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, owner: req.user.userId });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or unauthorized' });
    }

    const memberIndex = group.members.indexOf(req.params.userId);
    if (memberIndex === -1) {
      return res.status(400).json({ message: 'User is not a member of this group' });
    }

    group.members.splice(memberIndex, 1);
    await group.save();
    res.json(group);
  } catch (err) {
    console.error('Error removing member from group:', err);
    res.status(500).json({ message: 'Error removing member from group' });
  }
});

module.exports = router; 
