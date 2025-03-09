const mongoose = require('mongoose');
const User = require('../models/User');

async function createAdminUser() {
  try {
    console.log('Attempting to connect to MongoDB...');
    const uri = 'mongodb+srv://Musatest1:Rabell0610@testforapp1.slga3.mongodb.net/note-sharing-app?retryWrites=true&w=majority';
    console.log('Using connection string:', uri);
    
    // Connect to MongoDB
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Successfully connected to MongoDB');

    // Check if admin already exists
    console.log('Checking for existing admin user...');
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin);
      process.exit(0);
    }

    // Create admin user
    console.log('Creating new admin user...');
    const adminUser = new User({
      email: 'admin@example.com',
      password: 'Admin123',
      name: 'Admin User',
      isAdmin: true,
      isVerified: true
    });

    await adminUser.save();
    console.log('Admin user created successfully:', adminUser);
    process.exit(0);
  } catch (error) {
    console.error('Error details:', error);
    process.exit(1);
  }
}

createAdminUser(); 