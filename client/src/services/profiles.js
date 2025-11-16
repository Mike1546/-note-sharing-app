import { databases } from '../appwrite';
import { Query, ID } from 'appwrite';

const DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID || 'YOUR_DATABASE_ID';
const PROFILES_COLLECTION_ID = process.env.REACT_APP_APPWRITE_COLLECTION_PROFILES || 'YOUR_PROFILES_COLLECTION_ID';

export async function createProfile(userId, name, email, role = 'user') {
  // Collection-level permissions handle access control
  return databases.createDocument(
    DATABASE_ID,
    PROFILES_COLLECTION_ID,
    ID.unique(),
    { userId, name, email, role }
  );
}

export async function getProfileByUserId(userId) {
  const res = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION_ID, [
    Query.equal('userId', userId)
  ]);
  if (!res || !res.documents || res.documents.length === 0) return null;
  return res.documents[0];
}

export async function listProfiles() {
  const res = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION_ID);
  return res.documents || [];
}

export async function updateProfileRole(documentId, role) {
  return databases.updateDocument(DATABASE_ID, PROFILES_COLLECTION_ID, documentId, { role });
}

export default {
  createProfile,
  getProfileByUserId,
  updateProfileRole,
};
