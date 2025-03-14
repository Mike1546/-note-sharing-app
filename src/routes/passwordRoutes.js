const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PasswordEntry = require('../models/PasswordEntry');
const { encrypt, decrypt } = require('../utils/encryption');
const csv = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const dotenv = require('dotenv');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const PasswordGroup = require('../models/PasswordGroup');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Rate limiting for export/import
const rateLimit = require('express-rate-limit');
const importExportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // limit each IP to 30 requests per hour
  message: {
    msg: 'Too many import/export attempts. Please try again in an hour.',
    error: 'Rate limit exceeded'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    console.warn('Rate limit exceeded:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.user?.userId
    });
    res.status(429).json({
      msg: 'Too many import/export attempts. Please try again in an hour.',
      error: 'Rate limit exceeded'
    });
  }
});

// Export passwords
router.get('/export', [auth, importExportLimiter], async (req, res) => {
  try {
    // Validate user
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const format = req.query.format || 'json';
    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({ message: 'Invalid format. Supported formats: json, csv' });
    }

    const passwords = await PasswordEntry.find({ owner: req.user.userId });
    
    if (!passwords.length) {
      return res.json({ 
        data: [],
        count: 0,
        message: 'No passwords found to export'
      });
    }

    // Transform passwords for export (decrypt sensitive data)
    const exportData = await Promise.all(passwords.map(async password => {
      try {
        if (!password || !password.password) {
          console.error('Invalid password entry found:', password?._id);
          return null;
        }

        return {
          title: password.title?.trim() || '',
          username: password.username?.trim() || '',
          password: decrypt(password.password),
          website: password.website?.trim() || '',
          notes: password.notes?.trim() || '',
          category: password.category?.trim() || '',
          lastModified: password.lastModified || password.updatedAt || new Date(),
          createdAt: password.createdAt || new Date()
        };
      } catch (error) {
        console.error(`Failed to decrypt password for entry: ${password?.title || 'Unknown'}`, error);
        return null;
      }
    }));

    // Filter out any failed decryptions
    const validExportData = exportData.filter(entry => entry !== null);

    if (format === 'csv') {
      const csvData = stringify(validExportData, {
        header: true,
        columns: [
          'title',
          'username',
          'password',
          'website',
          'notes',
          'category',
          'lastModified',
          'createdAt'
        ]
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=passwords-${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csvData);
    }

    res.json({
      data: validExportData,
      count: validExportData.length,
      message: `Successfully exported ${validExportData.length} passwords`
    });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ 
      message: 'Error exporting passwords',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Import passwords
router.post('/import', auth, importExportLimiter, async (req, res) => {
  try {
    console.log('Import request received:', {
      format: req.body.format,
      hasData: !!req.body.data,
      dataType: typeof req.body.data,
      userId: req.user.userId,
      contentType: req.headers['content-type'],
      bodyKeys: Object.keys(req.body)
    });

    let passwords;
    if (req.body.format === 'csv') {
      try {
        // Log raw data for debugging
        console.log('Raw request data:', {
          data: req.body.data ? req.body.data.substring(0, 200) + '...' : 'null',
          type: typeof req.body.data
        });

        // Handle potentially double-encoded JSON
        let csvData;
        try {
          // First, try to parse if it's JSON encoded
          const parsed = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
          csvData = parsed.data || parsed;
          console.log('Parsed JSON data:', {
            type: typeof csvData,
            preview: typeof csvData === 'string' ? csvData.substring(0, 100) : 'not a string'
          });
        } catch (e) {
          // If parsing fails, use the data as is
          csvData = req.body.data;
          console.log('Using raw data:', {
            type: typeof csvData,
            preview: typeof csvData === 'string' ? csvData.substring(0, 100) : 'not a string'
          });
        }

        if (!csvData) {
          console.error('No CSV data provided');
          return res.status(400).json({ msg: 'No CSV data provided' });
        }

        // Clean up the CSV data
        csvData = csvData.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
        console.log('Cleaned CSV data preview:', csvData.substring(0, 200));

        // Parse CSV with more relaxed options
        const records = csv.parse(csvData, {
          columns: true,
          skip_empty_lines: true,
          relaxColumnCount: true,
          trim: true,
          skipRecordsWithError: true
        });

        console.log('CSV parsing result:', {
          recordCount: records.length,
          firstRecord: records[0],
          columns: records[0] ? Object.keys(records[0]) : []
        });

        // Map CSV fields to schema fields with better error handling
        passwords = records.map((record, index) => {
          try {
            // Log each record for debugging
            console.log(`Processing record ${index}:`, {
              hasUsername: !!record.username,
              hasPassword: !!record.password,
              fields: Object.keys(record)
            });

            // Check for required fields
            if (!record.username || !record.password) {
              console.error(`Record ${index} missing required fields:`, {
                hasUsername: !!record.username,
                hasPassword: !!record.password,
                record: { ...record, password: record.password ? '***' : undefined }
              });
              return null;
            }

            const entry = {
              title: record.name || record.title || record.url || 'Untitled',
              username: record.username,
              password: record.password,
              url: record.url || record.website || '',
              notes: record.note || record.notes || '',
              owner: req.user.userId,
              createdAt: new Date()
            };
            console.log(`Mapped record ${index}:`, { 
              ...entry, 
              password: '***',
              username: '***'
            });
            return entry;
          } catch (err) {
            console.error(`Error mapping record ${index}:`, err);
            return null;
          }
        }).filter(entry => entry !== null);

        console.log('Valid mapped passwords:', passwords.length);
      } catch (csvError) {
        console.error('CSV parsing error:', {
          error: csvError.message,
          stack: csvError.stack,
          data: csvData ? csvData.substring(0, 100) + '...' : 'null'
        });
        return res.status(400).json({ 
          msg: 'Invalid CSV format',
          error: process.env.NODE_ENV === 'development' ? csvError.message : undefined
        });
      }
    } else {
      passwords = Array.isArray(req.body.data) 
        ? req.body.data 
        : req.body.data?.passwords || [];
      console.log('JSON import - passwords array:', {
        length: passwords.length,
        isArray: Array.isArray(passwords),
        sample: passwords.length > 0 ? { ...passwords[0], password: '***' } : null
      });
    }

    if (!Array.isArray(passwords)) {
      console.error('Invalid passwords format:', {
        type: typeof passwords,
        value: passwords ? 'exists' : 'null'
      });
      return res.status(400).json({ msg: 'Invalid data format' });
    }

    if (passwords.length === 0) {
      return res.status(400).json({ msg: 'No passwords provided to import' });
    }

    // Validate and prepare passwords
    const validPasswords = passwords.filter(entry => {
      const isValid = entry && entry.username && entry.password;
      if (!isValid) {
        console.error('Invalid entry:', { 
          title: entry?.title || entry?.name || 'Unknown', 
          username: entry?.username,
          hasPassword: !!entry?.password
        });
      }
      return isValid;
    }).map(entry => {
      try {
        const passwordEntry = {
          title: entry.title || entry.name || 'Untitled',
          username: entry.username,
          password: entry.password,
          url: entry.url || entry.website || '',
          notes: entry.notes || entry.note || '',
          owner: req.user.userId,
          createdAt: new Date()
        };
        console.log('Password entry prepared:', { 
          ...passwordEntry, 
          password: '***',
          username: '***'
        });
        return passwordEntry;
      } catch (err) {
        console.error('Error preparing password entry:', {
          error: err.message,
          stack: err.stack,
          entry: { ...entry, password: '***' }
        });
        return null;
      }
    }).filter(entry => entry !== null);

    console.log('Valid passwords to import:', validPasswords.length);

    if (validPasswords.length === 0) {
      return res.status(400).json({ msg: 'No valid passwords to import' });
    }

    try {
      // Create passwords one by one to better handle errors
      const results = [];
      for (const entry of validPasswords) {
        try {
          const result = await PasswordEntry.create(entry);
          results.push(result);
        } catch (err) {
          console.error('Error creating password entry:', {
            error: err.message,
            stack: err.stack,
            entry: { ...entry, password: '***' }
          });
        }
      }

      console.log('Import results:', {
        attempted: validPasswords.length,
        succeeded: results.length,
        failed: validPasswords.length - results.length
      });

      if (results.length === 0) {
        throw new Error('Failed to import any passwords');
      }

      res.json({ 
        msg: `Successfully imported ${results.length} passwords`,
        failed: validPasswords.length - results.length
      });
    } catch (dbError) {
      console.error('Database error during import:', {
        error: dbError.message,
        stack: dbError.stack
      });
      throw dbError;
    }
  } catch (err) {
    console.error('Import error:', {
      error: err.message,
      stack: err.stack,
      type: err.constructor.name
    });
    res.status(500).json({ 
      msg: process.env.NODE_ENV === 'production' 
        ? 'Error importing passwords' 
        : `Error importing passwords: ${err.message}`
    });
  }
});

// Get second password settings
router.get('/second-password/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json({ requireSecondPassword: user.requireSecondPassword || false });
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching settings' });
  }
});

// Update second password settings
router.post('/second-password/settings', auth, async (req, res) => {
  try {
    const { requireSecondPassword } = req.body;
    await User.findByIdAndUpdate(req.user.userId, { requireSecondPassword });
    res.json({ msg: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Error updating settings' });
  }
});

// Verify second password
router.post('/second-password/verify', auth, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.userId);
    const isMatch = await bcrypt.compare(password, user.secondPassword);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid password' });
    }
    res.json({ msg: 'Password verified' });
  } catch (err) {
    res.status(500).json({ msg: 'Error verifying password' });
  }
});

// Get all password entries for a user
router.get('/entries', auth, async (req, res) => {
  try {
    console.log('Fetching password entries for user:', {
      userId: req.user.userId,
      isAdmin: req.user.isAdmin,
      mongooseConnection: mongoose.connection.readyState,
      mongooseModels: Object.keys(mongoose.models)
    });

    const userEntries = await PasswordEntry.find({ owner: req.user.userId });
    console.log('Found password entries:', {
      count: userEntries.length,
      entries: userEntries.map(entry => ({
        id: entry._id,
        title: entry.title,
        owner: entry.owner,
        hasGroup: !!entry.group
      }))
    });
    
    // Decrypt sensitive data before sending to frontend
    const decryptedEntries = userEntries.map(entry => {
      try {
        console.log('Decrypting entry:', {
          id: entry._id,
          title: entry.title
        });
        const decrypted = entry.decryptData();
        return {
          ...decrypted,
          _id: entry._id,
          owner: entry.owner,
          group: entry.group,
          createdAt: entry.createdAt,
          lastModified: entry.lastModified
        };
      } catch (err) {
        console.error('Failed to decrypt entry:', {
          error: err.message,
          stack: err.stack,
          id: entry._id,
          title: entry.title
        });
        return null;
      }
    }).filter(entry => entry !== null);

    console.log('Sending decrypted entries:', {
      count: decryptedEntries.length,
      entries: decryptedEntries.map(entry => ({
        id: entry._id,
        title: entry.title
      }))
    });

    res.json(decryptedEntries);
  } catch (err) {
    console.error('Error fetching entries:', {
      error: err.message,
      stack: err.stack,
      userId: req.user.userId
    });
    res.status(500).json({ msg: 'Error fetching entries' });
  }
});

// Create a new password entry
router.post('/entries', auth, async (req, res) => {
  try {
    console.log('Creating new password entry:', {
      userId: req.user.userId,
      title: req.body.title,
      hasUsername: !!req.body.username,
      hasPassword: !!req.body.password,
      hasGroup: !!req.body.group
    });

    const { title, username, password, url, notes, group } = req.body;

    // Validate required fields
    if (!title || !username || !password) {
      return res.status(400).json({ msg: 'Title, username, and password are required' });
    }

    const entry = new PasswordEntry({
      title,
      username,
      password,
      url: url || '',
      notes: notes || '',
      owner: req.user.userId,
      group: group || null
    });

    await entry.save();
    console.log('Password entry created:', {
      id: entry._id,
      title: entry.title,
      owner: entry.owner,
      hasGroup: !!entry.group
    });

    // Return decrypted data
    const decryptedEntry = entry.decryptData();
    res.status(201).json(decryptedEntry);
  } catch (err) {
    console.error('Create password error:', {
      error: err.message,
      stack: err.stack,
      userId: req.user.userId
    });
    res.status(500).json({ msg: 'Error creating password entry' });
  }
});

// Get all password groups for a user
router.get('/groups', auth, async (req, res) => {
  try {
    const groups = await PasswordGroup.find({
      $or: [
        { owner: req.user.userId },
        { 'sharedWith.user': req.user.userId }
      ]
    });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching groups' });
  }
});

// Delete a password entry
router.delete('/entries/:id', auth, async (req, res) => {
  try {
    console.log('Delete request received for password:', {
      id: req.params.id,
      userId: req.user.userId,
      isAdmin: req.user.isAdmin,
      mongooseConnection: mongoose.connection.readyState,
      mongooseModels: Object.keys(mongoose.models),
      headers: req.headers
    });

    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected. Current state:', mongoose.connection.readyState);
      return res.status(500).json({ msg: 'Database connection error' });
    }

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error('Invalid password ID format:', req.params.id);
      return res.status(400).json({ msg: 'Invalid password ID format' });
    }

    // Try to find the entry without population first
    const entryExists = await PasswordEntry.exists({ _id: req.params.id });
    console.log('Entry exists check:', {
      id: req.params.id,
      exists: !!entryExists
    });

    const entry = await PasswordEntry.findById(req.params.id)
      .populate('group', 'members');

    if (!entry) {
      console.log('Password entry not found. Additional debug info:', {
        id: req.params.id,
        entryExists,
        modelName: PasswordEntry.modelName,
        collectionName: PasswordEntry.collection.name,
        databaseName: mongoose.connection.name
      });
      return res.status(404).json({ msg: 'Password entry not found' });
    }

    console.log('Found password entry:', {
      id: entry._id,
      owner: entry.owner,
      hasGroup: !!entry.group,
      groupMembers: entry.group?.members,
      modelName: entry.constructor.modelName,
      collectionName: entry.collection.name
    });

    // Check if user has delete permissions
    const canDelete = 
      // User is admin
      req.user.isAdmin || 
      // User is owner
      entry.owner.toString() === req.user.userId || 
      // User is group admin
      (entry.group && entry.group.members.some(m => 
        m.user.toString() === req.user.userId && 
        m.role === 'admin'
      ));

    console.log('Delete permission check:', {
      canDelete,
      isAdmin: req.user.isAdmin,
      isOwner: entry.owner.toString() === req.user.userId,
      isGroupAdmin: entry.group && entry.group.members.some(m => 
        m.user.toString() === req.user.userId && 
        m.role === 'admin'
      )
    });

    if (!canDelete) {
      return res.status(403).json({ msg: 'You do not have permission to delete this password' });
    }

    await entry.deleteOne();
    console.log('Password entry deleted successfully:', entry._id);
    res.json({ msg: 'Password entry deleted successfully' });
  } catch (err) {
    console.error('Delete password error:', {
      error: err.message,
      stack: err.stack,
      id: req.params.id,
      userId: req.user.userId,
      mongooseState: {
        readyState: mongoose.connection.readyState,
        models: Object.keys(mongoose.models),
        collections: mongoose.connection.collections ? Object.keys(mongoose.connection.collections) : []
      }
    });
    res.status(500).json({ msg: 'Server error while deleting password entry' });
  }
});

module.exports = router; 