const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/note-sharing-app');
    const user = await User.findOne({ email: 'mansurmusa@gmail.com' });
    console.log('User status:', {
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAdmin(); 