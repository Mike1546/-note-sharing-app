const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const mongoose = require('mongoose');

// Simple in-memory cache for user data
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check cache first
    const cachedUser = userCache.get(decoded.userId);
    if (cachedUser && cachedUser.timestamp > Date.now() - CACHE_TTL) {
      req.user = {
        userId: cachedUser.user._id,
        name: cachedUser.user.name,
        email: cachedUser.user.email,
        isAdmin: cachedUser.user.isAdmin
      };
      return next();
    }

    // If not in cache or expired, fetch from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Update cache
    userCache.set(decoded.userId, {
      user,
      timestamp: Date.now()
    });

    // Set user info on request
    req.user = {
      userId: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin
    };

    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    console.error('Auth middleware error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Export a function to clear the cache (useful for testing)
auth.clearCache = () => userCache.clear();

module.exports = auth; 