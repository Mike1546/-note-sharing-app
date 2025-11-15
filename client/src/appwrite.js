import { Client, Account, Databases } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.REACT_APP_APPWRITE_ENDPOINT || 'https://[HOSTNAME_OR_IP]/v1')
  .setProject(process.env.REACT_APP_APPWRITE_PROJECT || 'YOUR_PROJECT_ID');

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };
