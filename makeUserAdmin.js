const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function makeUserAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/note-sharing-app');
    
    // Find user by email
    const user = await User.findOne({ email: 'mansurmusa@gmail.com' });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    // Make user admin
    user.isAdmin = true;
    await user.save();
    
    // Verify the update
    const updatedUser = await User.findOne({ email: 'mansurmusa@gmail.com' });
    console.log('User status updated:', {
      email: updatedUser.email,
      name: updatedUser.name,
      isAdmin: updatedUser.isAdmin
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

makeUserAdmin(); 