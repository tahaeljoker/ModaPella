const mongoose = require('mongoose');

const SystemNotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['feature', 'info', 'update'],
    default: 'feature'
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('SystemNotification', SystemNotificationSchema);
