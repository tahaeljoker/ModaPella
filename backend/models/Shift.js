const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
  openingBalance: { type: Number, default: 0 },
  closingBalance: { type: Number, default: 0 },
  expectedCash: { type: Number, default: 0 },
  variance: { type: Number, default: 0 },
  status: { type: String, enum: ['open', 'closed'], default: 'open' }
}, { timestamps: true });

module.exports = mongoose.model('Shift', ShiftSchema);
