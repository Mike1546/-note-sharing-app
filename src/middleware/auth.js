const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const mongoose = require('mongoose');

module.exports = async (req, res, next) => {
  try {
    console.log('Auth middleware - Headers:', req.headers);
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    console.log('Auth middleware - Token received:', token);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Auth middleware - Decoded token:', decoded);

    const user = await User.findById(decoded.userId);
    console.log('Auth middleware - Found user:', user ? user._id : 'No user found');

    if (!user) {
      console.log('Auth middleware - User not found for token');
      return res.status(401).json({ message: 'Token is not valid' });
    }

    // Set the complete user object with proper ObjectId using new operator
    req.user = {
      userId: new mongoose.Types.ObjectId(user._id),
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin
    };

    console.log('Auth middleware - User set:', req.user);

    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token format' });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    res.status(401).json({ message: 'Token is not valid' });
  }
}; 