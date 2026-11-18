const cloudinary = require('cloudinary').v2;

const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

/**
 * Uploads media (base64 string, file path, or buffer) directly to Cloudinary.
 * Applies automatic format and quality optimization.
 * 
 * @param {string} fileInput - Base64 data URI or file path
 * @param {object} options - Custom Cloudinary upload options (e.g. folder, public_id)
 * @returns {Promise<object>} Cloudinary upload result
 */
const uploadToCloudinary = async (fileInput, options = {}) => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary environment variables are not configured.');
  }

  const defaultOptions = {
    folder: 'modapella/products',
    resource_type: 'auto',
    fetch_format: 'auto',
    quality: 'auto',
    ...options
  };

  return await cloudinary.uploader.upload(fileInput, defaultOptions);
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadToCloudinary
};
