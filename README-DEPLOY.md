**Deployment & Hosting (Recommended: Vercel + Appwrite Cloud)**

Overview
- Frontend: React (Create React App) in `client/` — we'll host on Vercel.
- Auth/DB: Appwrite (use Appwrite Cloud managed project)
- Privileged tasks: Appwrite Functions or server script using Appwrite API key

Quick steps to go live (copyable)

1) Create Appwrite project (Appwrite Cloud or self-hosted)
   - Create a Database and collections: `profiles`, `notes`, `passwords`, `groups`, `logs`.
   - For each collection note the Collection ID.
   - Add your production origin to CORS (e.g., `https://your-site.vercel.app`).

2) Create a Vercel project (recommended)
   - In Vercel dashboard, import this GitHub repo.
   - Set Build Command: leave default (Vercel will detect CRA). Set Output Directory: `client/build` if needed.
   - Add Environment Variables (Project Settings → Environment Variables). Add these keys with values from Appwrite:
     - `REACT_APP_APPWRITE_ENDPOINT`
     - `REACT_APP_APPWRITE_PROJECT`
     - `REACT_APP_APPWRITE_DATABASE_ID`
     - `REACT_APP_APPWRITE_COLLECTION_PROFILES`
     - `REACT_APP_APPWRITE_COLLECTION_PASSWORDS`
     - `REACT_APP_APPWRITE_COLLECTION_NOTES`
     - `REACT_APP_APPWRITE_COLLECTION_GROUPS`
     - `REACT_APP_APPWRITE_COLLECTION_LOGS`
     - `REACT_APP_ENCRYPTION_KEY` (generate a secure random key)

3) (Server-side) Create a server API key for privileged actions
   - In Appwrite Console → Project Settings → API Keys, create an API key with database write scope.
   - Keep this key secret. Use it only in server scripts or Appwrite Functions.

4) Promote one user to `developer` (owner)
   - Method A (recommended): Use `scripts/setDeveloper.js` locally (requires `APPWRITE_API_KEY`):
     ```bash
     npm install appwrite
     export APPWRITE_ENDPOINT="https://<your-appwrite-endpoint>"
     export APPWRITE_PROJECT_ID="<your-project-id>"
     export APPWRITE_API_KEY="<your-server-api-key>"
     export REACT_APP_APPWRITE_DATABASE_ID="<your-db-id>"
     export REACT_APP_APPWRITE_COLLECTION_PROFILES="<profiles-collection-id>"
     node scripts/setDeveloper.js developer@example.com
     ```
   - Method B: Edit `role` field to `developer` directly in Appwrite Console in the `profiles` collection document.

5) Push to `main` on GitHub
   - If you connected the repo to Vercel, Vercel will build and deploy automatically.
   - Or use the provided GitHub Actions workflow which builds and deploys using `VERCEL_TOKEN` (if you prefer CI-deploy). Add `VERCEL_TOKEN` to repository secrets.

How I'll know it's online
- After you push, you'll get a Vercel deployment URL. Paste that URL here and I'll verify the site, confirm Appwrite connectivity (if `/appwrite-test` is reachable), and validate admin flows.

Security checklist before production
- Do NOT commit API keys to the repo.
- Use Vercel/Netlify/GitHub Secrets to store env variables.
- Restrict Appwrite API keys to minimal scopes and use server-side scripts for destructive actions.
- Consider moving encryption/decryption to server-side Appwrite Functions for stronger key management.

If you want, I can:
- Add an Appwrite Function template for privileged tasks (password reset, user deletion).
- Create a small `DEPLOY.md` in the repo root with one-click commands tailored to your Appwrite project.

---
End of Deployment Guide
