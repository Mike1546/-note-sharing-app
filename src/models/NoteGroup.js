const mongoose = require('mongoose');

const noteGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for better query performance
noteGroupSchema.index({ owner: 1 });
noteGroupSchema.index({ members: 1 });

// Add a method to check if a user is a member
noteGroupSchema.methods.isMember = function(userId) {
  return this.members.some(memberId => 
    memberId.toString() === userId.toString()
  );
};

// Add a method to check if a user is the owner
noteGroupSchema.methods.isOwner = function(userId) {
  return this.owner.toString() === userId.toString();
};

module.exports = mongoose.model('NoteGroup', noteGroupSchema); 