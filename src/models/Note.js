const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NoteGroup'
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['view', 'edit'],
      default: 'view'
    }
  }],
  isLocked: {
    type: Boolean,
    default: false
  },
  lockPasscode: {
    type: String,
    select: false // Hide this field by default in queries
  },
  tags: [{
    type: String,
    trim: true
  }],
  lastModified: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isEncrypted: {
    type: Boolean,
    default: false
  }
});

// Update lastModified timestamp on save
noteSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

// Index for faster queries
noteSchema.index({ owner: 1, title: 1 });
noteSchema.index({ 'sharedWith.user': 1 });
noteSchema.index({ group: 1 });

const Note = mongoose.model('Note', noteSchema);

module.exports = Note; 