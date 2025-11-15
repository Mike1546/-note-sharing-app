import { databases } from '../appwrite';

const DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID || 'YOUR_DATABASE_ID';
const LOGS_COLLECTION_ID = process.env.REACT_APP_APPWRITE_COLLECTION_LOGS || 'YOUR_LOGS_COLLECTION_ID';

export async function listLogs() {
  const res = await databases.listDocuments(DATABASE_ID, LOGS_COLLECTION_ID);
  return res.documents || [];
}

export default { listLogs };
