/**
 * Bootstrap a developer user:
 *  - Creates an Appwrite user (if not exists) with email/password/name
 *  - Ensures a profile document exists and sets role = 'developer'
 *
 * Usage:
 *   APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... \
 *   APPWRITE_DATABASE_ID=... APPWRITE_PROFILES_COLLECTION_ID=... \
 *   node scripts/bootstrapDeveloper.js email@example.com "Full Name" "Password123!"
 */

const { Client, Users, Databases, ID, Query } = require('appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT;
const project = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || process.env.REACT_APP_APPWRITE_DATABASE_ID;
const PROFILES_COLLECTION_ID = process.env.APPWRITE_PROFILES_COLLECTION_ID || process.env.REACT_APP_APPWRITE_COLLECTION_PROFILES;

if (!endpoint || !project || !apiKey) {
  console.error('Missing APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID / APPWRITE_API_KEY');
  process.exit(1);
}
if (!DATABASE_ID || !PROFILES_COLLECTION_ID) {
  console.error('Missing APPWRITE_DATABASE_ID / APPWRITE_PROFILES_COLLECTION_ID');
  process.exit(1);
}

const [,, email, name, password] = process.argv;
if (!email || !name || !password) {
  console.error('Usage: node scripts/bootstrapDeveloper.js <email> "<name>" "<password>"');
  process.exit(1);
}

(async () => {
  const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
  const users = new Users(client);
  const databases = new Databases(client);

  // Find or create user
  let user;
  try {
    // Appwrite Users.list supports a search parameter
    const list = await users.list(undefined, undefined, undefined, email);
    user = (list.users || list.total ? list.users[0] : undefined);
  } catch (_) {}

  if (!user) {
    try {
      user = await users.createBcryptUser(ID.unique(), email, password, name);
      console.log('Created user', user.$id);
    } catch (err) {
      console.warn('Create user failed (maybe exists):', err?.message || err);
      // Try search again
      const list2 = await users.list(undefined, undefined, undefined, email);
      user = list2.users && list2.users[0];
      if (!user) throw new Error('Unable to locate user after create attempt');
    }
  } else {
    console.log('User exists', user.$id);
  }

  // Ensure profile document with role developer
  try {
    const res = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION_ID, [Query.equal('userId', user.$id)]);
    if (!res.documents || res.documents.length === 0) {
      await databases.createDocument(DATABASE_ID, PROFILES_COLLECTION_ID, ID.unique(), {
        userId: user.$id,
        name,
        email,
        role: 'developer'
      });
      console.log('Created profile with developer role');
    } else {
      const doc = res.documents[0];
      if (doc.role !== 'developer') {
        await databases.updateDocument(DATABASE_ID, PROFILES_COLLECTION_ID, doc.$id, { role: 'developer' });
        console.log('Updated profile role to developer');
      } else {
        console.log('Profile already developer');
      }
    }
  } catch (err) {
    console.error('Failed ensuring profile:', err?.message || err);
    process.exit(1);
  }

  console.log('Bootstrap complete. You can now log in with:', email);
})();
