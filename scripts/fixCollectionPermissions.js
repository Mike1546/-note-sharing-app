/**
 * Fix collection permissions to allow authenticated users to create documents
 */

const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
const project = process.env.APPWRITE_PROJECT_ID || '691815b8003ae6a0e161';
const apiKey = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '69181c670024df0dd32b';

if (!apiKey) {
  console.error('Missing APPWRITE_API_KEY');
  process.exit(1);
}

(async () => {
  const client = new sdk.Client();
  client.setEndpoint(endpoint).setProject(project).setKey(apiKey);
  
  const databases = new sdk.Databases(client);

  const collections = {
    notes: '6918f63400264192256d',
    groups: '6918f637002e49bd5482',
    passwords: '6918f63900228f33e93c',
    profiles: '6918f632002d42536ab2'
  };

  console.log('Updating collection permissions...\n');

  for (const [name, id] of Object.entries(collections)) {
    try {
      const col = await databases.getCollection(DATABASE_ID, id);
      
      // Update with permissions that allow users to create their own documents
      await databases.updateCollection(
        DATABASE_ID,
        id,
        col.name,
        [
          sdk.Permission.create(sdk.Role.users()), // Any authenticated user can create
          sdk.Permission.read(sdk.Role.users()),   // Any authenticated user can read
        ],
        col.documentSecurity, // Keep document security setting
        col.enabled
      );
      
      console.log(`✓ Updated ${name} collection permissions`);
    } catch (err) {
      console.error(`✗ Failed to update ${name}:`, err.message);
    }
  }

  console.log('\n✓ Collection permissions updated!');
  console.log('\nNow users can:');
  console.log('- Create documents (collection-level)');
  console.log('- Control access via document-level permissions');
})();
