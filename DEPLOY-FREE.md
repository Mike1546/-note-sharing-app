Deployment — Free options (Surge / Netlify)

This explains the fastest free ways to publish the static frontend (`client/build`) when you don't own the GitHub repo.

Prerequisites
- Node.js installed
- Have Appwrite project + collection IDs ready (see README-DEPLOY.md)

1) Build the client with Appwrite env vars set

Windows (Git Bash / WSL) example:
```bash
cd client
export REACT_APP_APPWRITE_ENDPOINT="https://<your-appwrite-endpoint>"
export REACT_APP_APPWRITE_PROJECT="<your-project-id>"
export REACT_APP_APPWRITE_DATABASE_ID="<your-db-id>"
export REACT_APP_APPWRITE_COLLECTION_PROFILES="<profiles-collection-id>"
export REACT_APP_APPWRITE_COLLECTION_PASSWORDS="<passwords-collection-id>"
export REACT_APP_APPWRITE_COLLECTION_NOTES="<notes-collection-id>"
export REACT_APP_APPWRITE_COLLECTION_GROUPS="<groups-collection-id>"
export REACT_APP_APPWRITE_COLLECTION_LOGS="<logs-collection-id>"
export REACT_APP_ENCRYPTION_KEY="<random-encryption-key>"

npm ci
npm run build
```

2) Deploy to Surge (fast)

Install and deploy:
```bash
npm i -g surge
surge ./build your-subdomain.surge.sh
```

3) Or deploy to Netlify (drag-and-drop)

- Go to https://app.netlify.com/drop and drag the `client/build` folder into the page.
- Or use Netlify CLI:
```bash
npm i -g netlify-cli
netlify login
netlify deploy --dir=client/build --prod
```

Notes
- After deploy, share the public URL here and I'll verify Appwrite connectivity and admin flows.
- To promote a developer, run `node scripts/setDeveloper.js` locally as described in `README-DEPLOY.md`.
