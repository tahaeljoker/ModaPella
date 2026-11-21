const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  active: { type: Boolean, default: true },
  startDate: { type: Date },
  notes: { type: String, default: '' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  adjustments: [{
    type: { type: String, enum: ['discount', 'reward', 'advance'], required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    date: { type: Date, default: Date.now },
    paymentMethod: { type: String, enum: ['Cash', 'Instapay'], default: 'Cash' },
    deductedFromSafe: { type: Boolean, default: false },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
