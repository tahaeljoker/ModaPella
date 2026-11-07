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

// POST /api/upload - Accepts base64 image or video data and writes to static uploads folder
router.post('/', auth, requireRole(['admin', 'developer', 'manager']), async (req, res) => {
  try {
    const { image, file, name } = req.body;
    const mediaData = file || image;
    if (!mediaData) {
      return res.status(400).json({ message: 'No media data provided' });
    }

    // Match base64 regex e.g. "data:image/png;base64,..." or "data:video/mp4;base64,..."
    const matches = mediaData.match(/^data:(image|video)\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    let ext = 'jpg';
    let buffer;

    if (matches && matches.length === 4) {
      let subType = matches[2].toLowerCase();
      if (subType === 'jpeg') ext = 'jpg';
      else if (subType === 'quicktime') ext = 'mov';
      else ext = subType;

      buffer = Buffer.from(matches[3], 'base64');
    } else {
      // Direct raw base64 string
      buffer = Buffer.from(mediaData, 'base64');
    }

    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const cleanBaseName = (name || 'media')
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
    return res.status(500).json({ message: 'فشل رفع الملف', error: err.message });
  }
});

module.exports = router;
