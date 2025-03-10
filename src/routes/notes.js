const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Note = require('../models/Note');
const CryptoJS = require('crypto-js');
const NoteGroup = require('../models/NoteGroup');
const User = require('../models/User');
const mongoose = require('mongoose');

// Create a note group
router.post('/groups', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const group = new NoteGroup({
      name,
      description,
      owner: req.user.userId,
      members: [req.user.userId]
    });

    await group.save();
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating note group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all note groups for the user
router.get('/groups', auth, async (req, res) => {
  try {
    // Check MongoDB connection state
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected. Current state:', mongoose.connection.readyState);
      return res.status(500).json({ 
        message: 'Database connection error',
        details: 'MongoDB not connected'
      });
    }

    console.log('GET /groups - Headers:', req.headers);
    console.log('GET /groups - Auth token:', req.header('Authorization'));
    console.log('GET /groups - MongoDB connection state:', mongoose.connection.readyState);

    console.log('GET /groups - User object:', {
      userId: req.user.userId,
      name: req.user.name,
      email: req.user.email,
      type: typeof req.user.userId,
      isObjectId: req.user.userId instanceof mongoose.Types.ObjectId
    });

    let userId;
    try {
      // Ensure userId is a valid ObjectId
      userId = mongoose.Types.ObjectId.isValid(req.user.userId) 
        ? req.user.userId 
        : new mongoose.Types.ObjectId(req.user.userId);
    } catch (err) {
      console.error('Error converting userId to ObjectId:', err);
      return res.status(400).json({ 
        message: 'Invalid user ID format',
        error: err.message
      });
    }

    const query = {
      $or: [
        { owner: userId },
        { members: userId }
      ]
    };

    console.log('GET /groups - Query:', JSON.stringify(query));

    const groups = await NoteGroup.find(query)
      .populate('members', 'name email')
      .populate('owner', 'name email')
      .lean()
      .exec();
    
    if (!groups) {
      console.log('GET /groups - No groups found');
      return res.json([]);
    }

    console.log('GET /groups - Raw query result:', JSON.stringify(groups));

    const processedGroups = groups.map(g => ({
      ...g,
      id: g._id.toString(),
      owner: typeof g.owner === 'object' ? {
        id: g.owner._id.toString(),
        name: g.owner.name,
        email: g.owner.email
      } : g.owner.toString(),
      members: Array.isArray(g.members) ? g.members.map(m => ({
        id: m._id.toString(),
        name: m.name,
        email: m.email
      })) : []
    }));

    console.log('GET /groups - Processed groups:', JSON.stringify(processedGroups));

    res.json(processedGroups);
  } catch (error) {
    console.error('Error fetching note groups:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      query: error.query,
      code: error.code,
      userId: req.user?.userId,
      mongoState: mongoose.connection.readyState
    });
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      details: {
        userId: req.user?.userId,
        code: error.code,
        mongoState: mongoose.connection.readyState
      }
    });
  }
});

// Get notes by group ID
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Verify the group exists and user has access
    const group = await NoteGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is a member or owner of the group
    if (!group.members.includes(req.user.userId) && group.owner.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to view notes in this group' });
    }

    const notes = await Note.find({ group: groupId })
      .sort({ lastModified: -1 })
      .populate('owner', 'name email');

    // Process notes before sending
    const processedNotes = notes.map(note => {
      const processedNote = note.toObject();
      
      // If note is locked, mask the content
      if (note.isLocked) {
        processedNote.content = '🔒 This note is locked. Enter passcode to view.';
        return processedNote;
      }

      // If note is encrypted, decrypt it
      if (note.isEncrypted) {
        const bytes = CryptoJS.AES.decrypt(
          note.content,
          process.env.ENCRYPTION_KEY || 'your-encryption-key'
        );
        processedNote.content = bytes.toString(CryptoJS.enc.Utf8);
      }

      return processedNote;
    });

    res.json(processedNotes);
  } catch (err) {
    console.error('Error fetching group notes:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a member to a note group
router.post('/groups/:groupId/members', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const group = await NoteGroup.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.owner.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to add members' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (group.members.includes(user._id)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    group.members.push(user._id);
    await group.save();

    res.json(group);
  } catch (error) {
    console.error('Error adding member to group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove a member from a note group
router.delete('/groups/:groupId/members/:memberId', auth, async (req, res) => {
  try {
    const group = await NoteGroup.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.owner.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to remove members' });
    }

    group.members = group.members.filter(
      member => member.toString() !== req.params.memberId
    );

    await group.save();
    res.json(group);
  } catch (error) {
    console.error('Error removing member from group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a note group
router.delete('/groups/:groupId', auth, async (req, res) => {
  try {
    const group = await NoteGroup.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.owner.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete group' });
    }

    await NoteGroup.deleteOne({ _id: req.params.groupId });
    res.json({ message: 'Group deleted' });
  } catch (error) {
    console.error('Error deleting note group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a note
router.post('/',
  auth,
  [
    body('title').trim().not().isEmpty(),
    body('content').not().isEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Parse the request body if it's a string
      let noteData = req.body;
      if (typeof req.body === 'string') {
        try {
          noteData = JSON.parse(req.body);
        } catch (parseError) {
          console.error('Error parsing request body:', parseError);
          return res.status(400).json({ message: 'Invalid request body format' });
        }
      }

      const { title, content, isLocked, lockPasscode, tags, isEncrypted, groupId } = noteData;

      let processedContent = content;
      if (isEncrypted) {
        processedContent = CryptoJS.AES.encrypt(
          content,
          process.env.ENCRYPTION_KEY || 'your-encryption-key'
        ).toString();
      }

      // If groupId is provided, verify user has access to the group
      if (groupId) {
        const group = await NoteGroup.findById(groupId);
        if (!group) {
          return res.status(404).json({ message: 'Group not found' });
        }
        if (!group.members.includes(req.user.userId) && group.owner.toString() !== req.user.userId.toString()) {
          return res.status(403).json({ message: 'Not authorized to add notes to this group' });
        }
      }

      const note = new Note({
        title,
        content: processedContent,
        owner: req.user.userId,
        isLocked: isLocked || false,
        lockPasscode: lockPasscode || '',
        tags: tags || [],
        isEncrypted: isEncrypted || false,
        group: groupId || null
      });

      const savedNote = await note.save();
      console.log('Note saved successfully:', {
        id: savedNote._id,
        title: savedNote.title,
        owner: savedNote.owner,
        group: savedNote.group
      });
      
      res.status(201).json(savedNote);
    } catch (err) {
      console.error('Error creating note:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        user: req.user
      });
      res.status(500).json({ 
        message: 'Error saving note',
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  }
);

// Get all notes for current user
router.get('/', auth, async (req, res) => {
  try {
    const notes = await Note.find({
      $or: [
        { owner: req.user.userId },
        { 'sharedWith.user': req.user.userId }
      ]
    }).sort({ lastModified: -1 });

    // Process notes before sending
    const processedNotes = notes.map(note => {
      const processedNote = note.toObject();
      
      // If note is locked, mask the content
      if (note.isLocked) {
        processedNote.content = '🔒 This note is locked. Enter passcode to view.';
        return processedNote;
      }

      // If note is encrypted, decrypt it
      if (note.isEncrypted) {
        const bytes = CryptoJS.AES.decrypt(
          note.content,
          process.env.ENCRYPTION_KEY || 'your-encryption-key'
        );
        processedNote.content = bytes.toString(CryptoJS.enc.Utf8);
      }

      return processedNote;
    });

    res.json(processedNotes);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific note
router.get('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user.userId },
        { 'sharedWith.user': req.user.userId }
      ]
    }).select('+lockPasscode');

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.isLocked) {
      const { passcode } = req.query;
      console.log('Received passcode:', passcode);
      console.log('Stored passcode:', note.lockPasscode);
      
      if (!passcode) {
        return res.status(401).json({ message: 'Passcode required' });
      }
      
      // Convert both to strings and trim for comparison
      if (String(passcode).trim() !== String(note.lockPasscode).trim()) {
        return res.status(401).json({ message: 'Invalid passcode' });
      }
    }

    if (note.isEncrypted) {
      const bytes = CryptoJS.AES.decrypt(
        note.content,
        process.env.ENCRYPTION_KEY || 'your-encryption-key'
      );
      note.content = bytes.toString(CryptoJS.enc.Utf8);
    }

    res.json(note);
  } catch (err) {
    console.error('Error fetching note:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get note metadata (without content)
router.get('/:id/metadata', auth, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user.userId },
        { 'sharedWith.user': req.user.userId }
      ]
    }).select('title isLocked lastModified createdAt tags isEncrypted content');

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // If note is locked, mask the content
    const responseNote = {
      ...note.toObject(),
      content: note.isLocked ? '🔒 This note is locked. Enter passcode to view.' : note.content
    };

    res.json(responseNote);
  } catch (err) {
    console.error('Error fetching note metadata:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a note
router.put('/:id',
  auth,
  [
    body('title').optional().trim().not().isEmpty(),
    body('content').optional().not().isEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let note = await Note.findOne({
        _id: req.params.id,
        $or: [
          { owner: req.user.userId },
          { 'sharedWith.user': req.user.userId, 'sharedWith.permission': 'edit' }
        ]
      });

      if (!note) {
        return res.status(404).json({ message: 'Note not found or permission denied' });
      }

      const updateFields = {};
      if (req.body.title) updateFields.title = req.body.title;
      if (req.body.content) {
        updateFields.content = req.body.isEncrypted
          ? CryptoJS.AES.encrypt(
              req.body.content,
              process.env.ENCRYPTION_KEY || 'your-encryption-key'
            ).toString()
          : req.body.content;
      }
      if (req.body.tags) updateFields.tags = req.body.tags;
      if (req.body.isLocked !== undefined) updateFields.isLocked = req.body.isLocked;
      if (req.body.lockPasscode) updateFields.lockPasscode = req.body.lockPasscode;

      note = await Note.findByIdAndUpdate(
        req.params.id,
        { $set: updateFields },
        { new: true }
      );

      res.json(note);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Share a note
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { userId, permission } = req.body;

    const note = await Note.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check if already shared with user
    const existingShare = note.sharedWith.find(
      share => share.user.toString() === userId
    );

    if (existingShare) {
      existingShare.permission = permission;
    } else {
      note.sharedWith.push({ user: userId, permission });
    }

    await note.save();
    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a note
router.delete('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found or permission denied' });
    }

    await Note.deleteOne({ _id: req.params.id });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 