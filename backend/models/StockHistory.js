const mongoose = require('mongoose');

const StockHistorySchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  size: { type: String, default: '' },
  color: { type: String, default: '' },
  variantKey: { type: String, default: '' }, // size_color or empty
  changeType: { 
    type: String, 
    enum: ['POS Sale', 'Manual Adjustment', 'Refund', 'Inventory Count'], 
    required: true 
  },
  quantityChanged: { type: Number, required: true }, // positive or negative
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByName: { type: String, default: '' },
  referenceId: { type: mongoose.Schema.Types.ObjectId }, // e.g. Order ID, InventoryCount ID
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('StockHistory', StockHistorySchema);
