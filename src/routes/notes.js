const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Note = require('../models/Note');
const CryptoJS = require('crypto-js');

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

      const { title, content, isLocked, lockPasscode, tags, isEncrypted } = noteData;

      let processedContent = content;
      if (isEncrypted) {
        // Encrypt content if requested
        processedContent = CryptoJS.AES.encrypt(
          content,
          process.env.ENCRYPTION_KEY || 'your-encryption-key'
        ).toString();
      }

      console.log('Creating note with user ID:', req.user.userId);
      console.log('Request user object:', req.user);

      // Create note with proper owner ObjectId
      const note = new Note({
        title,
        content: processedContent,
        owner: req.user.userId,
        isLocked: isLocked || false,
        lockPasscode: lockPasscode || '',
        tags: tags || [],
        isEncrypted: isEncrypted || false
      });

      console.log('Note object before save:', note);

      const savedNote = await note.save();
      console.log('Note saved successfully:', {
        id: savedNote._id,
        title: savedNote.title,
        owner: savedNote.owner
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