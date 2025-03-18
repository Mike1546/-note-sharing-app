const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function createAdminUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/note-sharing-app');
    
    // Delete existing admin user if any
    await User.deleteMany({ email: { $regex: /^admin@gmail\.com$/i } });
    
    // Create new admin user
    const adminUser = new User({
      email: 'admin@gmail.com',
      password: 'Admin123',
      name: 'Admin',
      isAdmin: true
    });

    await adminUser.save();

    // Verify the user was created
    const verifiedUser = await User.findOne({ email: 'admin@gmail.com' });
    if (!verifiedUser) {
      throw new Error('Failed to create admin user');
    }

    // Verify password works
    const passwordMatch = await verifiedUser.comparePassword('Admin123');
    
    console.log('Admin user created and verified:', {
      email: verifiedUser.email,
      isAdmin: verifiedUser.isAdmin,
      name: verifiedUser.name,
      passwordMatch
    });

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser(); 