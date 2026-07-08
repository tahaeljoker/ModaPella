const mongoose = require('mongoose');

const SupplierTransactionSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  type: { type: String, enum: ['purchase', 'payment'], required: true },
  // purchase = اشترينا من المورد (مديونية عليه)
  // payment  = دفعنا للمورد
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
  reference: { type: String, default: '' }, // رقم فاتورة/وصل
  paymentSource: { type: String, enum: ['StoreSafe', 'PersonalPocket'], default: 'PersonalPocket' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('SupplierTransaction', SupplierTransactionSchema);
