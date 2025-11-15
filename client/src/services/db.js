import { databases } from '../appwrite';
import { Query } from 'appwrite';

const DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID || 'YOUR_DATABASE_ID';
const NOTES_COLLECTION_ID = process.env.REACT_APP_APPWRITE_COLLECTION_NOTES || 'YOUR_NOTES_COLLECTION_ID';

/**
 * Create a note belonging to a user.
 * @param {string} userId - Appwrite user id (account.$id)
 * @param {object} note - { title, content, groupId?, pinned?, ... }
 */
export async function createNote(userId, note) {
  return databases.createDocument(
    DATABASE_ID,
    NOTES_COLLECTION_ID,
    'unique()',
    { ...note, ownerId: userId },
    [`user:${userId}`],
    [`user:${userId}`]
  );
}

/**
 * List notes for a user.
 * @param {string} userId
 */
export async function listNotes(userId) {
  return databases.listDocuments(
    DATABASE_ID,
    NOTES_COLLECTION_ID,
    [Query.equal('ownerId', userId)]
  );
}

/**
 * Update a note. Note owner should be used to set permissions.
 * @param {string} documentId
 * @param {string} userId
 * @param {object} data
 */
export async function updateNote(documentId, userId, data) {
  return databases.updateDocument(
    DATABASE_ID,
    NOTES_COLLECTION_ID,
    documentId,
    data
  );
}

/**
 * Delete a note document.
 * @param {string} documentId
 */
export async function deleteNote(documentId) {
  return databases.deleteDocument(
    DATABASE_ID,
    NOTES_COLLECTION_ID,
    documentId
  );
}

export default {
  createNote,
  listNotes,
  updateNote,
  deleteNote,
};
