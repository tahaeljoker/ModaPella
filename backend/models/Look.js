const mongoose = require('mongoose');

const LookItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  tagRole: {
    type: String,
    enum: ['top', 'bottom', 'dress', 'shoes', 'bag', 'accessory', 'jacket', 'other'],
    default: 'top'
  },
  tagLabel: {
    type: String,
    default: ''
  },
  // Position percentage (0 to 100) on the media canvas
  positionX: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  positionY: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  }
}, { _id: false });

const LookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  category: {
    type: String,
    default: 'كاجوال'
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },
  mediaUrl: {
    type: String,
    required: true,
    trim: true
  },
  videoThumbnail: {
    type: String,
    default: '',
    trim: true
  },
  bundleDiscountPercent: {
    type: Number,
    min: 0,
    max: 90,
    default: 10
  },
  items: [LookItemSchema],
  active: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Look', LookSchema);
