/**
 * Usage:
 * 1) Install dependencies: npm install appwrite
 * 2) Set env vars: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY
 * 3) Run: node scripts/setDeveloper.js user@example.com
 *
 * This script finds the profile document by email in the profiles collection
 * and updates its role to 'developer'. It requires a server API key with
 * permissions to update database documents.
 */

const { Client, Databases, Query } = require('appwrite');

const client = new Client();

const endpoint = process.env.APPWRITE_ENDPOINT;
const project = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!endpoint || !project || !apiKey) {
  console.error('Please set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY');
  process.exit(1);
}

client
  .setEndpoint(endpoint)
  .setProject(project)
  .setKey(apiKey);

const databases = new Databases(client);

const DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;
const PROFILES_COLLECTION_ID = process.env.REACT_APP_APPWRITE_COLLECTION_PROFILES || process.env.APPWRITE_PROFILES_COLLECTION_ID;

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/setDeveloper.js user@example.com');
    process.exit(1);
  }

  if (!DATABASE_ID || !PROFILES_COLLECTION_ID) {
    console.error('Please set DATABASE_ID and PROFILES_COLLECTION_ID env vars (or the REACT_APP_* ones)');
    process.exit(1);
  }

  try {
    const res = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION_ID, [Query.equal('email', email)]);
    if (!res.documents || res.documents.length === 0) {
      console.error('No profile found for', email);
      process.exit(1);
    }
    const doc = res.documents[0];
    await databases.updateDocument(DATABASE_ID, PROFILES_COLLECTION_ID, doc.$id, { role: 'developer' });
    console.log('Updated role to developer for', email);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
