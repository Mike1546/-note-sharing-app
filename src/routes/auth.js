const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const LoginLog = require('../models/LoginLog');

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

      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create new user
      user = new User({
        email,
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
        { expiresIn: '24h' }
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
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
  ],
  async (req, res) => {
    try {
      console.log('Login attempt - Email:', req.body.email);
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      console.log('Login - Found user:', user ? user._id : 'No user found');

      if (!user) {
        console.log('Login - User not found:', email);
        await LoginLog.create({
          userId: null,
          userName: 'Unknown',
          userEmail: email,
          ipAddress,
          userAgent,
          success: false
        });
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      console.log('Login - Password match:', isMatch);

      if (!isMatch) {
        console.log('Login - Invalid password for user:', email);
        await LoginLog.create({
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          ipAddress,
          userAgent,
          success: false
        });
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        { 
          userId: user._id,
          isAdmin: user.isAdmin 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      console.log('Login - Generated token for user:', user._id);

      // Create login log
      const loginLog = new LoginLog({
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        ipAddress,
        userAgent,
        success: true
      });
      await loginLog.save();

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