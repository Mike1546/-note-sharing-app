const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const passwordEntrySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  url: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PasswordGroup'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
});

// Encrypt sensitive data before saving
passwordEntrySchema.pre('save', async function(next) {
  if (this.isModified('password') || this.isModified('username')) {
    try {
      if (this.isModified('password')) {
        this.password = encrypt(this.password);
      }
      
      if (this.isModified('username')) {
        this.username = encrypt(this.username);
      }
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }
  
  this.lastModified = new Date();
  next();
});

// Method to decrypt sensitive data
passwordEntrySchema.methods.decryptData = function() {
  const decryptedEntry = this.toObject();
  
  try {
    if (this.password) {
      decryptedEntry.password = decrypt(this.password);
    }
    
    if (this.username) {
      decryptedEntry.username = decrypt(this.username);
    }
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
  
  return decryptedEntry;
};

const PasswordEntry = mongoose.model('PasswordEntry', passwordEntrySchema);

module.exports = PasswordEntry; 