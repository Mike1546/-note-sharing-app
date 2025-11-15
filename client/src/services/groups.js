import { databases } from '../appwrite';
import { Query } from 'appwrite';

const DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID || 'YOUR_DATABASE_ID';
const GROUPS_COLLECTION_ID = process.env.REACT_APP_APPWRITE_COLLECTION_GROUPS || 'YOUR_GROUPS_COLLECTION_ID';

export async function listGroups() {
  try {
    const res = await databases.listDocuments(DATABASE_ID, GROUPS_COLLECTION_ID);
    return res.documents || [];
  } catch (err) {
    // If unauthorized or collection not readable, return empty instead of throwing
    return [];
  }
}

export async function deleteGroup(documentId) {
  return databases.deleteDocument(DATABASE_ID, GROUPS_COLLECTION_ID, documentId);
}

export default { listGroups, deleteGroup };
