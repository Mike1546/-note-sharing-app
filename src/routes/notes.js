const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Note = require('../models/Note');
const CryptoJS = require('crypto-js');
const NoteGroup = require('../models/NoteGroup');
const User = require('../models/User');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

// Rate limiter for general note access
const noteAccessLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 100, // limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limiter for passcode attempts
const passcodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 10, // limit each IP to 10 attempts per windowMs
  message: { message: 'Too many passcode attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false, // count failed attempts
  keyGenerator: (req) => {
    // Use both IP and note ID to prevent lockout of other notes
    return `${req.ip}-${req.params.id}`;
  }
});

// Helper function to check if a request needs passcode limiting
function isPasscodeAttempt(req) {
  return req.query.passcode !== undefined;
}

// Apply general rate limiting to all note routes
router.use(noteAccessLimiter);

// Apply stricter rate limiting to passcode attempts
router.use('/:id', (req, res, next) => {
  if (isPasscodeAttempt(req)) {
    return passcodeLimiter(req, res, next);
  }
  next();
});

// Create a note group
router.post('/groups', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    // Get the user data for the owner
    const owner = await User.findById(req.user.userId).select('name email');
    if (!owner) {
      return res.status(404).json({ message: 'User not found' });
    }

    const group = new NoteGroup({
      name,
      description,
      owner: owner._id,
      members: [{
        user: owner._id,
        role: 'admin'
      }]
    });

    await group.save();
    
    // Populate the response with full user data
    const populatedGroup = await NoteGroup.findById(group._id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .lean();

    // Transform the members array to match frontend expectations
    if (populatedGroup.members) {
      populatedGroup.members = populatedGroup.members
        .filter(member => member && member.user)
        .map(member => ({
          user: {
            _id: member.user._id,
            name: member.user.name,
            email: member.user.email
          },
          role: member.role || 'member'
        }));
    }
      
    console.log('Created group with populated data:', JSON.stringify(populatedGroup, null, 2));
    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error('Error creating note group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all note groups for the user
router.get('/groups', auth, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected. Current state:', mongoose.connection.readyState);
      return res.status(500).json({ 
        message: 'Database connection error',
        details: 'MongoDB not connected'
      });
    }

    let userId = req.user.userId;
    if (typeof userId === 'string') {
      userId = new mongoose.Types.ObjectId(userId);
    }

    // First find all groups where the user is either owner or member
    const groups = await NoteGroup.find({
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    })
    .populate('owner', 'name email')
    .populate('members.user', 'name email')
    .lean();

    // Transform the members array in each group to match frontend expectations
    const transformedGroups = groups.map(group => {
      // Ensure members is an array and has valid user data
      const validMembers = Array.isArray(group.members) ? group.members
        .filter(member => member && member.user)
        .map(member => ({
          user: {
            _id: member.user._id,
            name: member.user.name,
            email: member.user.email
          },
          role: member.role || 'member'
        })) : [];

      return {
        ...group,
        members: validMembers
      };
    });

    console.log('Fetched groups with populated data:', JSON.stringify(transformedGroups, null, 2));
    res.json(transformedGroups);
  } catch (error) {
    console.error('Error fetching note groups:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notes by group ID
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Verify the group exists and user has access
    const group = await NoteGroup.findById(groupId)
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .lean();

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Transform the members array to match frontend expectations
    group.members = Array.isArray(group.members) ? group.members
      .filter(member => member && member.user)
      .map(member => ({
        user: {
          _id: member.user._id,
          name: member.user.name,
          email: member.user.email
        },
        role: member.role || 'member'
      })) : [];

    console.log('Group data:', JSON.stringify(group, null, 2));
    
    // Check if user is a member or owner of the group
    const isMember = group.members.some(member => {
      if (!member.user || !member.user._id) {
        console.log('Invalid member data:', member);
        return false;
      }
      return member.user._id.toString() === req.user.userId.toString();
    });
    
    if (!isMember && group.owner._id.toString() !== req.user.userId.toString()) {
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
    const group = await NoteGroup.findById(req.params.groupId)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.owner._id.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to add members' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (group.members.some(member => member.user._id.toString() === user._id.toString())) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    group.members.push({
      user: user._id,
      role: 'member'
    });

    await group.save();
    
    // Populate the response
    const updatedGroup = await NoteGroup.findById(group._id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');
      
    res.json(updatedGroup);
  } catch (error) {
    console.error('Error adding member to group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove a member from a note group
router.delete('/groups/:groupId/members/:memberId', auth, async (req, res) => {
  try {
    const group = await NoteGroup.findById(req.params.groupId)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.owner._id.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to remove members' });
    }

    group.members = group.members.filter(
      member => member.user._id.toString() !== req.params.memberId
    );

    await group.save();
    
    // Populate the response
    const updatedGroup = await NoteGroup.findById(group._id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');
      
    res.json(updatedGroup);
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

      console.log('Creating note with data:', req.body);

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

      console.log('Processed note data:', {
        title,
        hasContent: !!content,
        isLocked,
        hasLockPasscode: !!lockPasscode,
        tags,
        isEncrypted,
        groupId
      });

      let processedContent = content;
      if (isEncrypted) {
        processedContent = CryptoJS.AES.encrypt(
          content,
          process.env.ENCRYPTION_KEY || 'your-encryption-key'
        ).toString();
      }

      // If groupId is provided, verify user has access to the group
      let verifiedGroupId = null;
      if (groupId && groupId !== 'undefined' && groupId !== 'null') {
        console.log('Verifying group access for groupId:', groupId);
        const group = await NoteGroup.findById(groupId)
          .populate('owner', 'name email')
          .populate('members.user', 'name email');
          
        if (!group) {
          console.log('Group not found:', groupId);
          return res.status(404).json({ message: 'Group not found' });
        }

        const isMember = group.members.some(member => 
          member.user._id.toString() === req.user.userId.toString()
        );
        
        const isOwner = group.owner._id.toString() === req.user.userId.toString();
        
        console.log('Group access check:', {
          isMember,
          isOwner,
          userId: req.user.userId,
          groupOwner: group.owner._id
        });

        if (!isMember && !isOwner) {
          return res.status(403).json({ message: 'Not authorized to add notes to this group' });
        }

        verifiedGroupId = group._id;
      }

      const note = new Note({
        title,
        content: processedContent,
        owner: req.user.userId,
        isLocked: isLocked || false,
        lockPasscode: lockPasscode || '',
        tags: tags || [],
        isEncrypted: isEncrypted || false,
        group: verifiedGroupId
      });

      const savedNote = await note.save();
      console.log('Note saved successfully:', {
        id: savedNote._id,
        title: savedNote.title,
        owner: savedNote.owner,
        group: savedNote.group
      });
      
      // Populate the saved note before sending response
      const populatedNote = await Note.findById(savedNote._id)
        .populate('owner', 'name email')
        .populate('group')
        .lean();
      
      res.status(201).json(populatedNote);
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
    console.log('Fetching all notes for user:', req.user.userId);

    // First get all groups where user is a member
    const groups = await NoteGroup.find({
      $or: [
        { owner: req.user.userId },
        { 'members.user': req.user.userId }
      ]
    });

    const groupIds = groups.map(group => group._id);
    console.log('User groups:', groupIds);

    // Then get all notes that user has access to
    const notes = await Note.find({
      $or: [
        { owner: req.user.userId },
        { 'sharedWith.user': req.user.userId },
        { group: { $in: groupIds } }
      ]
    })
    .populate('group')
    .populate('owner', 'name email')
    .sort({ lastModified: -1 });

    console.log(`Found ${notes.length} notes`);

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
    res.status(500).json({ 
      message: 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Helper function to check note access
async function checkNoteAccess(note, userId) {
  try {
    // Direct ownership or sharing
    if (note.owner && note.owner.toString() === userId) {
      return true;
    }

    if (note.sharedWith && Array.isArray(note.sharedWith) && 
        note.sharedWith.some(share => share && share.user && share.user.toString() === userId)) {
      return true;
    }

    // Check group access if note belongs to a group
    if (note.group && note.group._id) {
      const group = await NoteGroup.findById(note.group._id)
        .populate('owner')
        .populate('members.user');

      if (group) {
        const isOwner = group.owner && group.owner._id.toString() === userId;
        const isMember = group.members && Array.isArray(group.members) &&
          group.members.some(member => 
            member && member.user && member.user._id.toString() === userId
          );
        return isOwner || isMember;
      }
    }

    return false;
  } catch (error) {
    console.error('Error in checkNoteAccess:', error);
    return false;
  }
}

// Get note metadata (without content)
router.get('/:id/metadata', auth, async (req, res) => {
  try {
    console.log('Fetching note metadata for ID:', req.params.id);
    console.log('User ID:', req.user.userId);

    // First get all groups where user is a member
    const userGroups = await NoteGroup.find({
      $or: [
        { owner: req.user.userId },
        { 'members.user': req.user.userId }
      ]
    });
    const groupIds = userGroups.map(group => group._id);
    console.log('User is member of groups:', groupIds);

    const note = await Note.findById(req.params.id)
      .populate({
        path: 'group',
        populate: {
          path: 'members.user owner',
          select: 'name email'
        }
      })
      .populate('owner', 'name email')
      .populate('sharedWith.user', 'name email')
      .lean();

    if (!note) {
      console.log('Note not found with ID:', req.params.id);
      return res.status(404).json({ message: 'Note not found' });
    }

    console.log('Found note:', {
      id: note._id,
      owner: note.owner?._id || note.owner,
      group: note.group?._id || note.group,
      isLocked: note.isLocked
    });

    // Check if user has access to the note
    const hasDirectAccess = note.owner?._id?.toString() === req.user.userId || 
                          note.owner?.toString() === req.user.userId;
    
    const hasSharedAccess = note.sharedWith?.some(share => 
      share.user?._id?.toString() === req.user.userId || 
      share.user?.toString() === req.user.userId
    );
    
    const hasGroupAccess = note.group && groupIds.some(groupId => 
      groupId.toString() === note.group._id?.toString()
    );

    console.log('Access check results:', {
      hasDirectAccess,
      hasSharedAccess,
      hasGroupAccess,
      userGroups: groupIds.map(id => id.toString()),
      noteGroupId: note.group?._id?.toString()
    });

    if (!hasDirectAccess && !hasSharedAccess && !hasGroupAccess) {
      console.log('Access denied for user:', req.user.userId);
      return res.status(403).json({ message: 'Access denied' });
    }

    // If note is locked, mask the content
    const responseNote = {
      ...note,
      content: note.isLocked ? '🔒 This note is locked. Enter passcode to view.' : note.content
    };

    res.json(responseNote);
  } catch (err) {
    console.error('Error fetching note metadata:', err);
    console.error('Full error:', err);
    res.status(500).json({ 
      message: 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get a specific note
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('Fetching note for ID:', req.params.id);
    console.log('User ID:', req.user.userId);
    console.log('Query params:', req.query);

    // First get all groups where user is a member
    const userGroups = await NoteGroup.find({
      $or: [
        { owner: req.user.userId },
        { 'members.user': req.user.userId }
      ]
    });
    const groupIds = userGroups.map(group => group._id);
    console.log('User is member of groups:', groupIds);

    const note = await Note.findById(req.params.id)
      .populate({
        path: 'group',
        populate: {
          path: 'members.user owner',
          select: 'name email'
        }
      })
      .populate('owner', 'name email')
      .populate('sharedWith.user', 'name email')
      .select('+lockPasscode');

    if (!note) {
      console.log('Note not found with ID:', req.params.id);
      return res.status(404).json({ message: 'Note not found' });
    }

    console.log('Found note:', {
      id: note._id,
      owner: note.owner?._id || note.owner,
      group: note.group?._id || note.group,
      isLocked: note.isLocked
    });

    // Check if user has access to the note
    const hasDirectAccess = note.owner?._id?.toString() === req.user.userId || 
                          note.owner?.toString() === req.user.userId;
    
    const hasSharedAccess = note.sharedWith?.some(share => 
      share.user?._id?.toString() === req.user.userId || 
      share.user?.toString() === req.user.userId
    );
    
    const hasGroupAccess = note.group && groupIds.some(groupId => 
      groupId.toString() === note.group._id?.toString()
    );

    console.log('Access check results:', {
      hasDirectAccess,
      hasSharedAccess,
      hasGroupAccess,
      userGroups: groupIds.map(id => id.toString()),
      noteGroupId: note.group?._id?.toString()
    });

    if (!hasDirectAccess && !hasSharedAccess && !hasGroupAccess) {
      console.log('Access denied for user:', req.user.userId);
      return res.status(403).json({ message: 'Access denied' });
    }

    if (note.isLocked) {
      const { passcode } = req.query;
      console.log('Checking passcode:', passcode ? '(provided)' : '(not provided)');
      console.log('Note lockPasscode:', note.lockPasscode ? '(exists)' : '(not set)');
      
      if (!passcode) {
        return res.status(401).json({ message: 'Passcode required' });
      }
      
      // Convert both to strings and trim for comparison
      const providedPasscode = String(passcode).trim();
      const correctPasscode = String(note.lockPasscode).trim();
      
      console.log('Passcode comparison:', {
        providedLength: providedPasscode.length,
        correctLength: correctPasscode.length,
        match: providedPasscode === correctPasscode
      });
      
      if (providedPasscode !== correctPasscode) {
        return res.status(401).json({ message: 'Invalid passcode' });
      }
    }

    // Convert note to plain object for modification
    const noteObj = note.toObject();

    if (note.isEncrypted) {
      try {
      const bytes = CryptoJS.AES.decrypt(
        note.content,
        process.env.ENCRYPTION_KEY || 'your-encryption-key'
      );
        noteObj.content = bytes.toString(CryptoJS.enc.Utf8);
      } catch (error) {
        console.error('Error decrypting note:', error);
        return res.status(500).json({ message: 'Error decrypting note content' });
      }
    }

    res.json(noteObj);
  } catch (err) {
    console.error('Error fetching note:', err);
    console.error('Full error:', err);
    res.status(500).json({ 
      message: 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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

// Migration route to fix member structure
router.post('/migrate-groups', auth, async (req, res) => {
  try {
    // Only allow admin to run migration
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const groups = await NoteGroup.find({});
    let updatedCount = 0;

    for (const group of groups) {
      // Check if members need to be fixed
      const needsFix = group.members.some(member => 
        typeof member === 'string' || !member.user || !member.role
      );

      if (needsFix) {
        // Get unique member IDs
        const memberIds = [...new Set(
          group.members
            .map(member => typeof member === 'string' ? member : member.user?.toString())
            .filter(Boolean)
        )];

        // Create proper member objects
        const fixedMembers = memberIds.map(userId => ({
          user: userId,
          role: userId.toString() === group.owner.toString() ? 'admin' : 'member'
        }));

        // Update the group
        group.members = fixedMembers;
        await group.save();
        updatedCount++;
      }
    }

    res.json({ 
      message: `Migration complete. Updated ${updatedCount} groups.`,
      totalGroups: groups.length
    });
  } catch (error) {
    console.error('Error during migration:', error);
    res.status(500).json({ message: 'Server error during migration' });
  }
});

module.exports = router; 