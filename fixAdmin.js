const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
require('dotenv').config();

async function fixAdminUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/note-sharing-app');
    
    // Find admin user
    const adminUser = await User.findOne({ email: { $regex: /^admin@gmail\.com$/i } });
    
    if (!adminUser) {
      console.log('Admin user not found. Creating new admin user...');
      
      // Create new admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123', salt);
      
      const newAdmin = new User({
        name: 'Admin',
        email: 'admin@gmail.com',
        password: hashedPassword,
        isAdmin: true
      });
      
      await newAdmin.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Found existing admin user. Updating password...');
      
      // Update password directly without using save() to avoid double hashing
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123', salt);
      
      await User.updateOne(
        { _id: adminUser._id },
        { $set: { password: hashedPassword } }
      );
      
      console.log('Admin password updated successfully');
    }
    
    // Verify the admin user
    const verifiedAdmin = await User.findOne({ email: 'admin@gmail.com' });
    const passwordMatch = await bcrypt.compare('Admin123', verifiedAdmin.password);
    
    console.log('\nAdmin user verification:', {
      email: verifiedAdmin.email,
      isAdmin: verifiedAdmin.isAdmin,
      name: verifiedAdmin.name,
      passwordMatch
    });
    
    console.log('\nYou can now log in with:');
    console.log('Email:', 'admin@gmail.com');
    console.log('Password:', 'Admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAdminUser(); 