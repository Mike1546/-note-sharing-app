import { databases } from '../appwrite';
import { Query, ID } from 'appwrite';

const DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID;
const REMINDERS_COLLECTION_ID = 'reminders'; // We'll create this collection

export async function createReminder(userId, reminder) {
  try {
    return await databases.createDocument(
      DATABASE_ID,
      REMINDERS_COLLECTION_ID,
      ID.unique(),
      {
        ...reminder,
        userId,
      }
    );
  } catch (err) {
    // Fallback if collection doesn't exist yet - return empty for now
    console.warn('Reminders collection not set up yet');
    return { $id: 'temp', ...reminder };
  }
}

export async function listReminders(userId, date) {
  try {
    const queries = [Query.equal('userId', userId)];
    if (date) {
      // Filter by date if provided
      queries.push(Query.equal('date', date));
    }
    const response = await databases.listDocuments(
      DATABASE_ID,
      REMINDERS_COLLECTION_ID,
      queries
    );
    return response.documents || [];
  } catch (err) {
    console.warn('Reminders collection not set up yet');
    return [];
  }
}

export async function updateReminder(documentId, data) {
  try {
    return await databases.updateDocument(
      DATABASE_ID,
      REMINDERS_COLLECTION_ID,
      documentId,
      data
    );
  } catch (err) {
    console.warn('Failed to update reminder');
    throw err;
  }
}

export async function deleteReminder(documentId) {
  try {
    return await databases.deleteDocument(
      DATABASE_ID,
      REMINDERS_COLLECTION_ID,
      documentId
    );
  } catch (err) {
    console.warn('Failed to delete reminder');
    throw err;
  }
}

const remindersService = {
  createReminder,
  listReminders,
  updateReminder,
  deleteReminder,
};

export default remindersService;
