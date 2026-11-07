const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Media = require('../models/Media');

const router = express.Router();

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  // Read-only filesystem on serverless platforms (e.g. Vercel)
  console.log('Uploads directory creation skipped (read-only filesystem):', err.message);
}

// GET /api/upload/:filename — Serve media directly from MongoDB or disk
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // 1. Try local disk first if file exists
    const localFilePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(localFilePath)) {
      return res.sendFile(localFilePath);
    }

    // 2. Fetch from MongoDB Media collection (works seamlessly on Vercel & serverless)
    const media = await Media.findOne({ filename });
    if (!media || !media.data) {
      return res.status(404).json({ message: 'File not found' });
    }

    const matches = media.data.match(/^data:([a-zA-Z0-9+\/.-]+);base64,(.+)$/);
    let buffer;
    let contentType = media.contentType || 'image/jpeg';

    if (matches && matches.length === 3) {
      contentType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(media.data, 'base64');
    }

    res.set({
      'Content-Type': contentType,
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*'
    });

    return res.send(buffer);
  } catch (error) {
    console.error('Error serving media file:', error);
    res.status(500).json({ message: 'Error serving file', error: error.message });
  }
});

// POST /api/upload - Accepts base64 image or video data, saves to MongoDB and disk
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
    let mimeType = 'image/jpeg';
    let rawBase64 = mediaData;

    if (matches && matches.length === 4) {
      let subType = matches[2].toLowerCase();
      if (subType === 'jpeg') ext = 'jpg';
      else if (subType === 'quicktime') ext = 'mov';
      else ext = subType;

      mimeType = `${matches[1]}/${subType}`;
      rawBase64 = matches[3];
    }

    const cleanBaseName = (name || 'media')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const fileName = `${Date.now()}-${cleanBaseName}.${ext}`;

    const buffer = Buffer.from(rawBase64, 'base64');

    // 1. Save to MongoDB (Permanent storage that works on Vercel Serverless)
    await Media.findOneAndUpdate(
      { filename: fileName },
      {
        filename: fileName,
        contentType: mimeType,
        data: mediaData,
        size: buffer.length
      },
      { upsert: true, new: true }
    );

    // 2. Try saving to local disk if writable (dev / VPS environments)
    try {
      const filePath = path.join(UPLOADS_DIR, fileName);
      fs.writeFileSync(filePath, buffer);
    } catch (diskErr) {
      // Ignored silently on serverless platforms where disk is read-only
      console.log('Disk write skipped (serverless environment)');
    }

    const host = req.get('host') || '';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const publicUrl = (host && !host.includes('localhost'))
      ? `${protocol}://${host}/uploads/${fileName}`
      : `/uploads/${fileName}`;
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
