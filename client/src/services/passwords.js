import CryptoJS from 'crypto-js';
import { databases } from '../appwrite';

const DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID || 'YOUR_DATABASE_ID';
const PASSWORDS_COLLECTION_ID = process.env.REACT_APP_APPWRITE_COLLECTION_PASSWORDS || 'YOUR_PASSWORDS_COLLECTION_ID';
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'LOCAL_DEVELOPMENT_KEY';

function encrypt(text) {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

function decrypt(cipher) {
  const bytes = CryptoJS.AES.decrypt(cipher, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export async function createPassword(userId, entry) {
  const payload = { ...entry, ownerId: userId };
  if (entry.password) {
    payload.password_encrypted = encrypt(entry.password);
    delete payload.password;
  }
  return databases.createDocument(
    DATABASE_ID,
    PASSWORDS_COLLECTION_ID,
    'unique()',
    payload,
    [`user:${userId}`],
    [`user:${userId}`]
  );
}

export async function listPasswords(userId) {
  return databases.listDocuments(DATABASE_ID, PASSWORDS_COLLECTION_ID, []);
}

export async function deletePassword(documentId) {
  return databases.deleteDocument(DATABASE_ID, PASSWORDS_COLLECTION_ID, documentId);
}

export async function getDecryptedPassword(encrypted) {
  try {
    return decrypt(encrypted);
  } catch (e) {
    console.error('Decrypt error', e);
    throw e;
  }
}

export default { createPassword, listPasswords, getDecryptedPassword, deletePassword };
