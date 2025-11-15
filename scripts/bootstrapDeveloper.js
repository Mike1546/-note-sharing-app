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

const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT;
const project = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || process.env.REACT_APP_APPWRITE_DATABASE_ID;
const PROFILES_COLLECTION_ID = process.env.APPWRITE_PROFILES_COLLECTION_ID || process.env.REACT_APP_APPWRITE_COLLECTION_PROFILES;
const NOTES_COLLECTION_ID = process.env.APPWRITE_NOTES_COLLECTION_ID || process.env.REACT_APP_APPWRITE_COLLECTION_NOTES;
const GROUPS_COLLECTION_ID = process.env.APPWRITE_GROUPS_COLLECTION_ID || process.env.REACT_APP_APPWRITE_COLLECTION_GROUPS;

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
  const sdk = require('node-appwrite');
  const client = new sdk.Client();
  client
    .setEndpoint(endpoint)
    .setProject(project)
    .setKey(apiKey);
  
  const users = new sdk.Users(client);
  const databases = new sdk.Databases(client);

  async function ensureDocumentSecurity(collectionId) {
    if (!collectionId) return;
    try {
      const col = await databases.getCollection(DATABASE_ID, collectionId);
      const name = col?.name || 'collection';
      // If already enabled, nothing to do
      if (col?.documentSecurity === true) return;
      try {
        await databases.updateCollection(DATABASE_ID, collectionId, name, undefined, true);
        console.log(`Enabled document-level permissions on collection ${collectionId}`);
      } catch (e) {
        // Some environments may require explicit permissions param; ignore if it fails
      }
    } catch (_) {
      // ignore
    }
  }

  async function ensureProfileSchema() {
    // Try to create needed attributes and index; ignore if they already exist
    const createAttr = async (key, size, required = false) => {
      try { await databases.createStringAttribute(DATABASE_ID, PROFILES_COLLECTION_ID, key, size, required); } catch (e) { /* ignore */ }
    };
    await createAttr('userId', 64, true);
    await createAttr('name', 255, false);
    await createAttr('email', 320, false);
    await createAttr('role', 32, false);

    // Wait for userId attribute to be available (poll up to ~30s)
    for (let i = 0; i < 30; i++) {
      try {
        const attr = await databases.getAttribute(DATABASE_ID, PROFILES_COLLECTION_ID, 'userId');
        if (attr && attr.status === 'available') break;
      } catch (_) { /* attribute may not be ready yet */ }
      await new Promise(r => setTimeout(r, 1000));
    }

    // Ensure index on userId for faster lookups
    try { await databases.createIndex(DATABASE_ID, PROFILES_COLLECTION_ID, 'userId_idx', sdk.IndexType.Key, ['userId']); } catch (e) { /* ignore */ }
  }

  async function ensureNotesSchema() {
    if (!NOTES_COLLECTION_ID) return;
    const createStr = async (key, size, required = false, def = undefined, array = false) => {
      try { await databases.createStringAttribute(DATABASE_ID, NOTES_COLLECTION_ID, key, size, required, def, array); } catch (_) {}
    };
    const createBool = async (key, required = false, def = undefined, array = false) => {
      try { await databases.createBooleanAttribute(DATABASE_ID, NOTES_COLLECTION_ID, key, required, def, array); } catch (_) {}
    };

    await createStr('ownerId', 64, true);
    await createStr('title', 255, true);
    await createStr('content', 32767, false); // long text stored as string
    await createBool('isEncrypted', false, false);
    await createBool('isLocked', false, false);
    await createStr('lockPasscode', 128, false);
    await createStr('groupId', 64, false);
    await createStr('tags', 64, false, undefined, true); // array of strings

    // Wait for ownerId availability
    for (let i = 0; i < 30; i++) {
      try { const a = await databases.getAttribute(DATABASE_ID, NOTES_COLLECTION_ID, 'ownerId'); if (a?.status === 'available') break; } catch (_) {}
      await new Promise(r => setTimeout(r, 1000));
    }
    try { await databases.createIndex(DATABASE_ID, NOTES_COLLECTION_ID, 'ownerId_idx', sdk.IndexType.Key, ['ownerId']); } catch (_) {}
    // Try to ensure document security enabled so per-document permissions work
    await ensureDocumentSecurity(NOTES_COLLECTION_ID);
  }

  async function ensureGroupsSchema() {
    if (!GROUPS_COLLECTION_ID) return;
    const createStr = async (key, size, required = false, def = undefined, array = false) => {
      try { await databases.createStringAttribute(DATABASE_ID, GROUPS_COLLECTION_ID, key, size, required, def, array); } catch (_) {}
    };
    // Basic attributes: owner, name, description, members (array of user ids/emails)
    await createStr('ownerId', 64, true);
    await createStr('name', 255, true);
    await createStr('description', 1024, false);
    await createStr('members', 64, false, undefined, true);

    // Wait until ownerId becomes available
    for (let i = 0; i < 30; i++) {
      try { const a = await databases.getAttribute(DATABASE_ID, GROUPS_COLLECTION_ID, 'ownerId'); if (a?.status === 'available') break; } catch (_) {}
      await new Promise(r => setTimeout(r, 1000));
    }
    try { await databases.createIndex(DATABASE_ID, GROUPS_COLLECTION_ID, 'ownerId_idx', sdk.IndexType.Key, ['ownerId']); } catch (_) {}
    await ensureDocumentSecurity(GROUPS_COLLECTION_ID);
  }

  // Find or create user
  let user;
  try {
    // Appwrite Users.list supports a search parameter
    const list = await users.list([sdk.Query.equal('email', email)]);
    user = (list.users && list.users.length > 0 ? list.users[0] : undefined);
  } catch (_) {}

  if (!user) {
    try {
      user = await users.create(sdk.ID.unique(), email, undefined, password, name);
      console.log('Created user', user.$id);
    } catch (err) {
      console.warn('Create user failed (maybe exists):', err?.message || err);
      // Try search again
      const list2 = await users.list([sdk.Query.equal('email', email)]);
      user = list2.users && list2.users[0];
      if (!user) throw new Error('Unable to locate user after create attempt');
    }
  } else {
    console.log('User exists', user.$id);
  }

  // Ensure schemas
  try { await ensureProfileSchema(); } catch(_) {}
  try { await ensureNotesSchema(); } catch(_) {}
  try { await ensureGroupsSchema(); } catch(_) {}

  // Ensure profile document with role developer
  try {
    const res = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION_ID, [sdk.Query.equal('userId', user.$id)]);
    if (!res.documents || res.documents.length === 0) {
      const { Permission, Role } = sdk;
      await databases.createDocument(
        DATABASE_ID,
        PROFILES_COLLECTION_ID,
        sdk.ID.unique(),
        { userId: user.$id, name, email, role: 'developer' },
        [Permission.read(Role.user(user.$id)), Permission.write(Role.user(user.$id))]
      );
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
