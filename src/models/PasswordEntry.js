const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');

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
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Encryption key not found in environment variables');
    }
    
    try {
      if (this.isModified('password')) {
        this.password = CryptoJS.AES.encrypt(this.password, encryptionKey).toString();
      }
      
      if (this.isModified('username')) {
        this.username = CryptoJS.AES.encrypt(this.username, encryptionKey).toString();
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
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('Encryption key not found in environment variables');
  }

  const decryptedEntry = this.toObject();
  
  try {
    if (this.password) {
      const passwordBytes = CryptoJS.AES.decrypt(this.password, encryptionKey);
      const decryptedPassword = passwordBytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedPassword) {
        throw new Error('Failed to decrypt password');
      }
      decryptedEntry.password = decryptedPassword;
    }
    
    if (this.username) {
      const usernameBytes = CryptoJS.AES.decrypt(this.username, encryptionKey);
      const decryptedUsername = usernameBytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedUsername) {
        throw new Error('Failed to decrypt username');
      }
      decryptedEntry.username = decryptedUsername;
    }
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
  
  return decryptedEntry;
};

const PasswordEntry = mongoose.model('PasswordEntry', passwordEntrySchema);

module.exports = PasswordEntry; 