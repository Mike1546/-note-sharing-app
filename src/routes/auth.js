const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const LoginLog = require('../models/LoginLog');
const rateLimit = require('express-rate-limit');

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests, please try again later' }
});

// More lenient rate limiter for auth check endpoint
const authCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: { message: 'Too many auth checks, please try again later' }
});

// Apply rate limiter to auth endpoints
router.use('/login', authLimiter);
router.use('/register', authLimiter);
router.use('/me', authCheckLimiter);

// Register a new user
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().not().isEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;

      // Check if user already exists (case-insensitive)
      let user = await User.findOne({ email: { $regex: new RegExp('^' + email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create new user
      user = new User({
        email: email.toLowerCase(), // Store email in lowercase
        password,
        name
      });

      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user._id,
          isAdmin: user.isAdmin 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Login user
router.post('/login',
  [
    body('email').isEmail().normalizeEmail().toLowerCase(),
    body('password').exists()
  ],
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Create login log entry
      const createLoginLog = async (success, userId = null, userName = 'Unknown', userEmail = email) => {
        try {
          const logData = {
            userName,
            userEmail,
            ipAddress,
            userAgent,
            success
          };
          
          // Only add userId if it's not null
          if (userId) {
            logData.userId = userId;
          }

          await LoginLog.create(logData);
        } catch (error) {
          console.error('Error creating login log:', error);
          // Don't throw the error as login logs are not critical
        }
      };

      // Find user by email (case-insensitive)
      const user = await User.findOne({ 
        email: { $regex: new RegExp('^' + email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }
      });

      if (!user) {
        await createLoginLog(false, null, 'Unknown', email);
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Check password using the model's method
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        await createLoginLog(false, user._id, user.name, user.email);
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        { 
          userId: user._id,
          isAdmin: user.isAdmin 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      // Log successful login
      await createLoginLog(true, user._id, user.name, user.email);

      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth,
  [
    body('name').optional().trim().not().isEmpty(),
    body('password').optional().isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (req.body.name) user.name = req.body.name;
      if (req.body.password) user.password = req.body.password;

      await user.save();

      res.json({
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router; 