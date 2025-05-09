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
const path = require('path');

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

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// Basic CORS setup
app.use(cors({
  origin: 'https://note-sharing-app-1.onrender.com',
  credentials: true
}));

// Basic middleware
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Security middleware with relaxed settings for development
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Trust proxy - required for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 10000,
  pingInterval: 5000,
  transports: ['websocket'],
  maxHttpBufferSize: 1e6, // 1 MB
  connectTimeout: 5000
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Routes with debug logging
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/passwords', passwordRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/groups', groupRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
  console.log('Test endpoint accessed');
  res.json({ message: 'Server is working' });
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Error handling
app.use(errorHandler);

const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/note-sharing-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000
    });
    console.log('Connected to MongoDB successfully');

    // Create HTTP server
    const server = app.listen(process.env.PORT || 5000, '0.0.0.0', () => {
      const host = server.address().address;
      const port = server.address().port;
      console.log(`Server is running at http://${host}:${port}`);
      console.log('Network interfaces:', require('os').networkInterfaces());
    });

    server.on('error', (error) => {
      console.error('Server error:', error);
      process.exit(1);
    });

    // Graceful shutdown
    const shutdown = () => {
      server.close(() => {
        console.log('Server closed');
        mongoose.connection.close(false, () => {
          console.log('MongoDB connection closed');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Start the server
startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
}); 