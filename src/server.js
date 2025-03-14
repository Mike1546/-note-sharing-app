const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const adminRoutes = require('./routes/admin');
const passwordRoutes = require('./routes/passwordRoutes');
const reminderRoutes = require('./routes/reminders');
const groupRoutes = require('./routes/groups');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Trust proxy - required for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ message: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));

// Add middleware to ensure consistent JSON content-type
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Error handling for JSON parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Parse Error:', err);
    return res.status(400).json({ msg: 'Invalid JSON format' });
  }
  next(err);
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for development
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // increased from 1000 to 2000 requests per windowMs
  message: {
    msg: 'Too many requests, please try again later'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // increased from 50 to 100 requests
  message: {
    msg: 'Too many authentication attempts, please try again later'
  }
});

// Separate limiter for auth checks (e.g. /auth/me endpoint)
const authCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // allow 60 requests per minute for auth checks
  message: {
    msg: 'Too many authentication checks, please try again later'
  }
});

// Apply rate limiting to specific routes
app.use('/api/auth/me', authCheckLimiter); // Separate limit for auth checks
app.use('/api/auth', authLimiter);
app.use('/api/notes', apiLimiter);
app.use('/api/passwords', apiLimiter);
app.use('/api/reminders', apiLimiter);
app.use('/api/groups', apiLimiter);

// Compress responses
app.use(compression());

// Database connection with retry logic
const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`MongoDB connection attempt ${i + 1} of ${retries}...`);
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/note-sharing-app', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      });
      console.log('Connected to MongoDB successfully');
      return true;
    } catch (err) {
      console.error('MongoDB connection error:', err);
      if (i === retries - 1) throw err;
      // Wait for 2 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join-note', (noteId) => {
    socket.join(noteId);
  });

  socket.on('note-update', (data) => {
    socket.to(data.noteId).emit('note-updated', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/passwords', passwordRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/groups', groupRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ msg: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  // Don't leak stack traces in production
  const error = process.env.NODE_ENV === 'production' 
    ? { msg: 'Internal server error' }
    : { msg: err.message, stack: err.stack };
  
  res.status(err.status || 500).json(error);
});

const PORT = process.env.PORT || 5000;

// Start server only after database connection is established
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer(); 