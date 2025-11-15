import { databases } from '../appwrite';
import { Query, Permission, Role } from 'appwrite';

const DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID || 'YOUR_DATABASE_ID';
const NOTES_COLLECTION_ID = process.env.REACT_APP_APPWRITE_COLLECTION_NOTES || 'YOUR_NOTES_COLLECTION_ID';

/**
 * Create a note belonging to a user.
 * @param {string} userId - Appwrite user id (account.$id)
 * @param {object} note - { title, content, groupId?, pinned?, ... }
 */
export async function createNote(userId, note) {
  const permissions = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
    Permission.write(Role.user(userId)),
  ];
  try {
    return await databases.createDocument(
      DATABASE_ID,
      NOTES_COLLECTION_ID,
      'unique()',
      { ...note, ownerId: userId },
      permissions
    );
  } catch (err) {
    const msg = err?.message || err?.response?.message || '';
    const code = err?.code || err?.response?.code;
    // If collection is using collection-level permissions, Appwrite rejects the permissions param
    if (String(msg).toLowerCase().includes('permissions') || code === 400) {
      // Retry without explicit document permissions
      return databases.createDocument(
        DATABASE_ID,
        NOTES_COLLECTION_ID,
        'unique()',
        { ...note, ownerId: userId }
      );
    }
    throw err;
  }
}

/**
 * List notes for a user.
 * @param {string} userId
 */
export async function listNotes(userId) {
  try {
    return await databases.listDocuments(
      DATABASE_ID,
      NOTES_COLLECTION_ID,
      [Query.equal('ownerId', userId)]
    );
  } catch (err) {
    // Fallback when the attribute isn't in schema yet
    try {
      const res = await databases.listDocuments(DATABASE_ID, NOTES_COLLECTION_ID);
      res.documents = (res.documents || []).filter((d) => d.ownerId === userId);
      return res;
    } catch (e) {
      throw err;
    }
  }
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
