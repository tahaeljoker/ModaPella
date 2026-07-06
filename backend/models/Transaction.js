const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  type: { type: String, enum: ['IN', 'OUT'], required: true },
  category: { type: String, required: true },
  paymentMethod: { type: String, enum: ['Cash', 'Instapay'], default: 'Cash' },
  description: { type: String, default: '' },
  referenceId: { type: mongoose.Schema.Types.ObjectId }, // optional link to Order or other entity
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Link transaction to a Shift when applicable
TransactionSchema.add({
  shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
