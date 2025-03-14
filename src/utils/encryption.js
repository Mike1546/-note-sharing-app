const CryptoJS = require('crypto-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY not set in environment variables');
}

function encrypt(text) {
  if (text === null || text === undefined) {
    throw new Error('Text to encrypt cannot be null or undefined');
  }

  // Convert to string if number or boolean
  const textToEncrypt = typeof text !== 'string' ? String(text) : text;

  if (textToEncrypt.length === 0) {
    throw new Error('Text to encrypt cannot be empty');
  }

  try {
    return CryptoJS.AES.encrypt(textToEncrypt, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Encryption failed: ' + error.message);
  }
}

function decrypt(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Encrypted text must be a non-empty string');
  }

  try {
    const bytes = CryptoJS.AES.decrypt(text, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Decryption resulted in empty string');
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Decryption failed: ' + error.message);
  }
}

module.exports = {
  encrypt,
  decrypt
}; 