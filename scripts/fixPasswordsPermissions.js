const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
const project = process.env.APPWRITE_PROJECT_ID || '691815b8003ae6a0e161';
const apiKey = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '69181c670024df0dd32b';
const PASSWORDS_COLLECTION_ID = '6918f63900228f33e93c';

if (!apiKey) {
  console.error('Missing APPWRITE_API_KEY');
  process.exit(1);
}

(async () => {
  const client = new sdk.Client();
  client.setEndpoint(endpoint).setProject(project).setKey(apiKey);
  
  const databases = new sdk.Databases(client);

  try {
    const col = await databases.getCollection(DATABASE_ID, PASSWORDS_COLLECTION_ID);
    
    await databases.updateCollection(
      DATABASE_ID,
      PASSWORDS_COLLECTION_ID,
      col.name,
      [
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.read(sdk.Role.users()),
      ],
      col.documentSecurity,
      col.enabled
    );
    
    console.log('✓ Updated passwords collection permissions');
  } catch (err) {
    console.error('✗ Failed:', err.message);
  }
})();
