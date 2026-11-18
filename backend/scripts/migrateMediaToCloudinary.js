/**
 * Standalone Idempotent Migration Script: MongoDB Media -> Cloudinary
 * 
 * Safely migrates legacy base64 images stored in MongoDB (`Media` collection)
 * to Cloudinary CDN, and updates referenced URLs in `Product` and `Look` collections.
 * 
 * SAFETY GUARANTEES:
 * 1. Zero Data Loss: MongoDB Media documents are NOT deleted.
 * 2. Idempotent: Already migrated items (with Cloudinary URLs) are skipped.
 * 3. Graceful: Failures on individual items do not crash the batch.
 * 
 * Usage:
 *   node backend/scripts/migrateMediaToCloudinary.js
 */

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load env files
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { cloudinary, isCloudinaryConfigured, uploadToCloudinary } = require('../config/cloudinary');
const Media = require('../models/Media');
const Product = require('../models/Product');
const Look = require('../models/Look');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/modapella';

async function migrate() {
  console.log('========================================================');
  console.log(' ModaPella Media to Cloudinary Migration Tool');
  console.log('========================================================\n');

  if (!isCloudinaryConfigured()) {
    console.error('❌ ERROR: Cloudinary environment variables are missing!');
    console.error('Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment.\n');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB at: ${MONGO_URI.replace(/\/\/.*@/, '//***:***@')}...`);
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('✓ MongoDB connected successfully.\n');

  try {
    const mediaDocs = await Media.find({});
    console.log(`Found ${mediaDocs.length} media document(s) in MongoDB Media collection.\n`);

    const filenameToCloudinaryUrl = new Map();
    let uploadedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < mediaDocs.length; i++) {
      const doc = mediaDocs[i];
      const progress = `[${i + 1}/${mediaDocs.length}]`;

      // Check if already has a cloudinary URL or already migrated
      if (doc.cloudinaryUrl && doc.cloudinaryUrl.startsWith('https://res.cloudinary.com/')) {
        filenameToCloudinaryUrl.set(doc.filename, doc.cloudinaryUrl);
        skippedCount++;
        continue;
      }

      if (!doc.data) {
        console.warn(`${progress} Media ${doc.filename} has no data, skipping.`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`${progress} Uploading ${doc.filename} (${(doc.size / 1024).toFixed(1)} KB) to Cloudinary...`);
        const cleanName = path.parse(doc.filename).name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);

        const uploadRes = await uploadToCloudinary(doc.data, {
          folder: 'modapella/products',
          public_id: cleanName,
          resource_type: 'auto',
          fetch_format: 'auto',
          quality: 'auto'
        });

        if (uploadRes && uploadRes.secure_url) {
          doc.cloudinaryUrl = uploadRes.secure_url;
          // Mark schema with flexible update if schema doesn't strictly have cloudinaryUrl
          doc.set('cloudinaryUrl', uploadRes.secure_url, { strict: false });
          await doc.save();

          filenameToCloudinaryUrl.set(doc.filename, uploadRes.secure_url);
          uploadedCount++;
          console.log(`  ✓ Uploaded -> ${uploadRes.secure_url}`);
        }
      } catch (uploadErr) {
        console.error(`  ✕ Failed to upload ${doc.filename}:`, uploadErr.message);
        failedCount++;
      }
    }

    console.log('\n--- Media Upload Summary ---');
    console.log(`Total Inspected: ${mediaDocs.length}`);
    console.log(`Uploaded to Cloudinary: ${uploadedCount}`);
    console.log(`Already Migrated / Skipped: ${skippedCount}`);
    console.log(`Failed: ${failedCount}\n`);

    // Helper to replace matching URLs
    const resolveNewMediaUrl = (oldUrl) => {
      if (!oldUrl || typeof oldUrl !== 'string') return oldUrl;
      if (oldUrl.includes('res.cloudinary.com')) return oldUrl;

      // Extract filename from URL (e.g. /uploads/abc.jpg or /api/upload/abc.jpg or full url)
      for (const [filename, newUrl] of filenameToCloudinaryUrl.entries()) {
        if (oldUrl.endsWith(filename) || oldUrl.includes(filename)) {
          return newUrl;
        }
      }
      return oldUrl;
    };

    // Update Products
    console.log('Checking and updating Product image references...');
    const products = await Product.find({});
    let updatedProductsCount = 0;

    for (const prod of products) {
      let modified = false;

      // Check images array
      if (Array.isArray(prod.images)) {
        const newImages = prod.images.map((img) => {
          const resolved = resolveNewMediaUrl(img);
          if (resolved !== img) modified = true;
          return resolved;
        });
        if (modified) prod.images = newImages;
      }

      // Check mannequinImage
      if (prod.mannequinImage) {
        const resolved = resolveNewMediaUrl(prod.mannequinImage);
        if (resolved !== prod.mannequinImage) {
          prod.mannequinImage = resolved;
          modified = true;
        }
      }

      // Check colorImages
      if (Array.isArray(prod.colorImages)) {
        prod.colorImages.forEach((ci) => {
          if (ci && ci.image) {
            const resolved = resolveNewMediaUrl(ci.image);
            if (resolved !== ci.image) {
              ci.image = resolved;
              modified = true;
            }
          }
        });
      }

      if (modified) {
        await prod.save();
        updatedProductsCount++;
      }
    }
    console.log(`✓ Updated ${updatedProductsCount} product(s) with new Cloudinary CDN URLs.\n`);

    // Update Looks
    console.log('Checking and updating Lookbook references...');
    const looks = await Look.find({});
    let updatedLooksCount = 0;

    for (const look of looks) {
      let modified = false;

      if (look.mediaUrl) {
        const resolved = resolveNewMediaUrl(look.mediaUrl);
        if (resolved !== look.mediaUrl) {
          look.mediaUrl = resolved;
          modified = true;
        }
      }

      if (look.videoThumbnail) {
        const resolved = resolveNewMediaUrl(look.videoThumbnail);
        if (resolved !== look.videoThumbnail) {
          look.videoThumbnail = resolved;
          modified = true;
        }
      }

      if (modified) {
        await look.save();
        updatedLooksCount++;
      }
    }
    console.log(`✓ Updated ${updatedLooksCount} look(s) with new Cloudinary CDN URLs.\n`);

    console.log('========================================================');
    console.log(' Migration finished safely with ZERO data loss!');
    console.log(' Existing MongoDB Media documents remain intact as backup.');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Migration encountered an error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

// Execute migration
migrate();
