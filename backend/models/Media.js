const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  filename: { type: String, required: true, unique: true, index: true },
  contentType: { type: String, default: 'image/jpeg' },
  data: { type: String, required: true }, // Base64 data string
  size: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Media', MediaSchema);

