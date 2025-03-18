const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const makeUserAdmin = async (email) => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/note-sharing-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    // Make user admin
    user.isAdmin = true;
    await user.save();
    console.log('User successfully made admin');
    process.exit(0);
  } catch (error) {
    console.error('Error making user admin:', error);
    process.exit(1);
  }
};

// Use the email from command line argument
const email = process.argv[2];
if (!email) {
  console.error('Please provide an email address');
  process.exit(1);
}

makeUserAdmin(email); 