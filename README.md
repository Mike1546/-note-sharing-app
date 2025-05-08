# Secure Note-Sharing Application

A secure note-sharing application similar to Apple Notes that allows users to create, lock, and share notes with other users. Built with Node.js, Express, MongoDB, and React.

## Features

- User Authentication & Account Management
  - Secure JWT-based authentication
  - Password hashing and encryption
  - Account recovery options
- Note Management
  - Create, edit, and delete notes
  - Lock notes with passcode
  - Tag and categorize notes
- Note Sharing
  - Share notes with other users
  - Set view/edit permissions
  - Real-time updates via WebSocket
- Security
  - End-to-end encryption for sensitive notes
  - Secure note locking mechanism
  - Protected routes and API endpoints

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd note-sharing-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/note-sharing-app
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-super-secret-encryption-key
CLIENT_URL=http://localhost:3000
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user
- PUT `/api/auth/profile` - Update user profile

### Notes
- POST `/api/notes` - Create a new note
- GET `/api/notes` - Get all notes for current user
- GET `/api/notes/:id` - Get a specific note
- PUT `/api/notes/:id` - Update a note
- DELETE `/api/notes/:id` - Delete a note
- POST `/api/notes/:id/share` - Share a note with another user

## Security Measures

1. **Authentication**
   - JWT-based authentication
   - Password hashing using bcrypt
   - Protected routes using middleware

2. **Data Protection**
   - End-to-end encryption for sensitive notes
   - Secure note locking with passcode
   - Input validation and sanitization

3. **API Security**
   - CORS protection
   - Rate limiting
   - Request validation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Cloudflare Deployment Instructions

### Prerequisites
- Install Wrangler CLI: `npm install -g wrangler`
- Ensure you have a Cloudflare account and are logged in via Wrangler.

### Frontend Deployment (Cloudflare Pages)
1. Build your frontend:
   ```bash
   cd client
   npm run build
   ```
2. Deploy using Wrangler:
   ```bash
   wrangler pages deploy dist
   ```

### Backend Deployment (Cloudflare Workers)
1. Build your backend:
   ```bash
   npm run build
   ```
2. Deploy using Wrangler:
   ```bash
   wrangler publish
   ```

### Configuration
- Adjust `wrangler.toml` as needed for your project.
- Set environment variables in the Cloudflare dashboard or via `wrangler.toml`. 