const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxDiscount: {
    type: Number,
    default: null,
    min: 0
  },
  expiryDate: {
    type: Date,
    default: null
  },
  usageLimit: {
    type: Number,
    default: null,
    min: 1
  },
  timesUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Coupon', CouponSchema);
