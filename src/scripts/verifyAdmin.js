const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const verifyAndForceAdmin = async (email) => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/note-sharing-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Find user by email (case-insensitive)
    const user = await User.findOne({ 
      email: { $regex: new RegExp('^' + email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }
    });
    
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    console.log('Current user status:', {
      id: user._id,
      email: user.email,
      isAdmin: user.isAdmin
    });

    // Force update admin status using updateOne
    const result = await User.updateOne(
      { _id: user._id },
      { $set: { isAdmin: true } }
    );

    if (result.modifiedCount > 0) {
      console.log('Admin status updated successfully');
    } else {
      console.log('No changes needed - user is already admin');
    }

    // Verify the update
    const updatedUser = await User.findById(user._id);
    console.log('Updated user status:', {
      id: updatedUser._id,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Use the email from command line argument
const email = process.argv[2];
if (!email) {
  console.error('Please provide an email address');
  process.exit(1);
}

verifyAndForceAdmin(email); 