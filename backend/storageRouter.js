const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('./db');
const { authenticateToken } = require('./securityGateway');
const checkRole = require('./rbacMiddleware');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|txt/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);

    if (extName && mimeType) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPG, PNG, GIF), PDFs, and TXT files are allowed.'));
  }
});

// 1. UPLOAD FILE Endpoint (POST /api/storage/upload)
router.post('/upload', authenticateToken, checkRole(['admin', 'developer']), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    // Index file metadata in DB
    const queryText = `
      INSERT INTO records (entity_type, entity_name, data, user_id)
      VALUES ('_storage', 'file', $1, $2)
      RETURNING *;
    `;

    const fileMetaData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: fileUrl
    };

    const result = await pool.query(queryText, [JSON.stringify(fileMetaData), userId]);

    return res.status(201).json({
      status: 'success',
      message: 'File uploaded successfully',
      file: fileMetaData,
      record: result.rows[0]
    });
  } catch (err) {
    console.error('[STORAGE UPLOAD ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to save file metadata.', details: err.message });
  }
});

// 2. LIST ALL UPLOADED FILES (GET /api/storage/files)
router.get('/files', authenticateToken, checkRole(['admin', 'developer', 'viewer']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM records WHERE entity_type = '_storage' ORDER BY id DESC;
    `);
    return res.json({
      status: 'success',
      count: result.rows.length,
      files: result.rows
    });
  } catch (err) {
    console.error('[STORAGE GET FILES ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve storage files.' });
  }
});

module.exports = router;