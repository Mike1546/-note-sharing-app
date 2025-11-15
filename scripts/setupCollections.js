/**
 * Setup Appwrite collections with proper schema and permissions
 * 
 * Usage:
 *   APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... \
 *   APPWRITE_DATABASE_ID=... \
 *   node scripts/setupCollections.js
 */

const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
const project = process.env.APPWRITE_PROJECT_ID || '691815b8003ae6a0e161';
const apiKey = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '69181c670024df0dd32b';

if (!apiKey) {
  console.error('Missing APPWRITE_API_KEY');
  console.error('\nCreate an API key in Appwrite Console with scopes:');
  console.error('  - users.read, users.write');
  console.error('  - databases.read, databases.write');
  console.error('  - collections.read, collections.write');
  console.error('  - attributes.read, attributes.write');
  console.error('  - indexes.read, indexes.write');
  console.error('  - documents.read, documents.write');
  process.exit(1);
}

(async () => {
  const client = new sdk.Client();
  client
    .setEndpoint(endpoint)
    .setProject(project)
    .setKey(apiKey);
  
  const databases = new sdk.Databases(client);

  console.log('Setting up Appwrite collections...\n');

  // Helper to create or get collection
  async function ensureCollection(name, documentSecurity = true) {
    try {
      // List all collections to find by name
      const collections = await databases.listCollections(DATABASE_ID);
      const existing = collections.collections.find(c => c.name === name);
      
      if (existing) {
        console.log(`✓ Collection "${name}" exists: ${existing.$id}`);
        // Update to enable document security if needed
        if (existing.documentSecurity !== documentSecurity) {
          await databases.updateCollection(
            DATABASE_ID,
            existing.$id,
            name,
            undefined,
            documentSecurity,
            true // enabled
          );
          console.log(`  → Updated document security: ${documentSecurity}`);
        }
        return existing.$id;
      }
      
      // Create new collection
      const col = await databases.createCollection(
        DATABASE_ID,
        sdk.ID.unique(),
        name,
        [sdk.Permission.read(sdk.Role.any())], // Allow anyone to read collection (document permissions control access)
        documentSecurity,
        true // enabled
      );
      console.log(`✓ Created collection "${name}": ${col.$id}`);
      return col.$id;
    } catch (err) {
      console.error(`✗ Error with collection "${name}":`, err.message);
      throw err;
    }
  }

  // Helper to create attribute if it doesn't exist
  async function createStringAttr(collectionId, key, size, required = false, def = undefined, array = false) {
    try {
      const attr = await databases.getAttribute(DATABASE_ID, collectionId, key);
      if (attr.status === 'available') return;
    } catch (_) {
      // Attribute doesn't exist, create it
      try {
        await databases.createStringAttribute(DATABASE_ID, collectionId, key, size, required, def, array);
        console.log(`  → Created attribute: ${key}`);
      } catch (e) {
        if (!e.message?.includes('already exists')) {
          console.error(`  ✗ Failed to create attribute ${key}:`, e.message);
        }
      }
    }
  }

  async function createBoolAttr(collectionId, key, required = false, def = undefined) {
    try {
      const attr = await databases.getAttribute(DATABASE_ID, collectionId, key);
      if (attr.status === 'available') return;
    } catch (_) {
      try {
        await databases.createBooleanAttribute(DATABASE_ID, collectionId, key, required, def);
        console.log(`  → Created attribute: ${key}`);
      } catch (e) {
        if (!e.message?.includes('already exists')) {
          console.error(`  ✗ Failed to create attribute ${key}:`, e.message);
        }
      }
    }
  }

  async function createIndex(collectionId, key, type, attributes) {
    try {
      await databases.createIndex(DATABASE_ID, collectionId, key, type, attributes);
      console.log(`  → Created index: ${key}`);
    } catch (e) {
      if (!e.message?.includes('already exists')) {
        console.error(`  ✗ Failed to create index ${key}:`, e.message);
      }
    }
  }

  async function waitForAttribute(collectionId, key, maxWait = 30) {
    for (let i = 0; i < maxWait; i++) {
      try {
        const attr = await databases.getAttribute(DATABASE_ID, collectionId, key);
        if (attr && attr.status === 'available') return true;
      } catch (_) {}
      await new Promise(r => setTimeout(r, 1000));
    }
    return false;
  }

  try {
    // 1. Profiles Collection
    console.log('\n1. Setting up Profiles collection...');
    const profilesId = await ensureCollection('profiles', true);
    await createStringAttr(profilesId, 'userId', 64, true);
    await createStringAttr(profilesId, 'name', 255, false);
    await createStringAttr(profilesId, 'email', 320, false);
    await createStringAttr(profilesId, 'role', 32, false);
    await waitForAttribute(profilesId, 'userId');
    await createIndex(profilesId, 'userId_idx', sdk.IndexType.Key, ['userId']);

    // 2. Notes Collection
    console.log('\n2. Setting up Notes collection...');
    const notesId = await ensureCollection('notes', true);
    await createStringAttr(notesId, 'ownerId', 64, true);
    await createStringAttr(notesId, 'title', 255, true);
    await createStringAttr(notesId, 'content', 65535, false);
    await createBoolAttr(notesId, 'isEncrypted', false, false);
    await createBoolAttr(notesId, 'isLocked', false, false);
    await createStringAttr(notesId, 'lockPasscode', 128, false);
    await createStringAttr(notesId, 'groupId', 64, false);
    await createStringAttr(notesId, 'tags', 64, false, undefined, true);
    await waitForAttribute(notesId, 'ownerId');
    await createIndex(notesId, 'ownerId_idx', sdk.IndexType.Key, ['ownerId']);

    // 3. Groups Collection
    console.log('\n3. Setting up Groups collection...');
    const groupsId = await ensureCollection('groups', true);
    await createStringAttr(groupsId, 'ownerId', 64, true);
    await createStringAttr(groupsId, 'name', 255, true);
    await createStringAttr(groupsId, 'description', 1024, false);
    await createStringAttr(groupsId, 'members', 64, false, undefined, true);
    await waitForAttribute(groupsId, 'ownerId');
    await createIndex(groupsId, 'ownerId_idx', sdk.IndexType.Key, ['ownerId']);

    // 4. Passwords Collection
    console.log('\n4. Setting up Passwords collection...');
    const passwordsId = await ensureCollection('passwords', true);
    await createStringAttr(passwordsId, 'ownerId', 64, true);
    await createStringAttr(passwordsId, 'title', 255, true);
    await createStringAttr(passwordsId, 'username', 255, false);
    await createStringAttr(passwordsId, 'encryptedPassword', 1024, true);
    await createStringAttr(passwordsId, 'url', 512, false);
    await createStringAttr(passwordsId, 'notes', 2048, false);
    await createStringAttr(passwordsId, 'groupId', 64, false);
    await waitForAttribute(passwordsId, 'ownerId');
    await createIndex(passwordsId, 'ownerId_idx', sdk.IndexType.Key, ['ownerId']);

    console.log('\n✓ All collections set up successfully!\n');
    console.log('Add these to your client/.env file:');
    console.log(`REACT_APP_APPWRITE_COLLECTION_PROFILES=${profilesId}`);
    console.log(`REACT_APP_APPWRITE_COLLECTION_NOTES=${notesId}`);
    console.log(`REACT_APP_APPWRITE_COLLECTION_GROUPS=${groupsId}`);
    console.log(`REACT_APP_APPWRITE_COLLECTION_PASSWORDS=${passwordsId}`);

  } catch (error) {
    console.error('\n✗ Setup failed:', error.message);
    process.exit(1);
  }
})();
