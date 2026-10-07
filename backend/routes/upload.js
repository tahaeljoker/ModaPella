const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create uploads dir:', err.message);
  }
}

// POST /api/upload - Accepts base64 image data and writes to static uploads folder
router.post('/', auth, requireRole(['admin', 'developer']), async (req, res) => {
  try {
    const { image, name } = req.body;
    if (!image) {
      return res.status(400).json({ message: 'No image data provided' });
    }

    // Match base64 regex e.g. "data:image/png;base64,..."
    const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    let ext = 'jpg';
    let buffer;

    if (matches && matches.length === 3) {
      ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      // Direct raw base64 string
      buffer = Buffer.from(image, 'base64');
    }

    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const cleanBaseName = (name || 'product')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const fileName = `${Date.now()}-${cleanBaseName}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${fileName}`;
    return res.json({
      success: true,
      url: publicUrl,
      fileName
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ message: 'فشل رفع الصورة', error: err.message });
  }
});

module.exports = router;
