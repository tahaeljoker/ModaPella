const mongoose = require('mongoose');

const SupplierTransactionSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  type: { type: String, enum: ['purchase', 'payment', 'return'], required: true },
  // purchase = اشترينا من المورد (مديونية عليه)
  // payment  = دفعنا للمورد
  // return   = بضاعة مرتجعة للمورد (تالفة/مسترجعة) تخفض المديونية
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
  reference: { type: String, default: '' }, // رقم فاتورة/وصل
  paymentSource: { type: String, enum: ['StoreSafe', 'PersonalPocket'], default: 'PersonalPocket' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, default: '' },
    size: { type: String, default: '' },
    color: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    reason: { type: String, default: '' }
  }],
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('SupplierTransaction', SupplierTransactionSchema);
