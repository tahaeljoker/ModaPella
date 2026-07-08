const mongoose = require('mongoose');

const CountItemSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName:  { type: String, required: true },
  variantKey:   { type: String, default: '' }, // e.g. "M_أحمر" or "" for no variants
  size:         { type: String, default: '' },
  color:        { type: String, default: '' },
  systemStock:  { type: Number, required: true, default: 0 },
  countedStock: { type: Number, default: null }, // null = لم يُعدّ بعد
  variance:     { type: Number, default: 0 }     // counted - system
});

const InventoryCountSchema = new mongoose.Schema({
  label:     { type: String, default: '' }, // e.g. "جرد يوليو 2026"
  items:     [CountItemSchema],
  status:    { type: String, enum: ['draft', 'applied'], default: 'draft' },
  appliedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('InventoryCount', InventoryCountSchema);
