const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/note-sharing-app')
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  }); 