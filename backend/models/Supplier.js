const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  notes: { type: String, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', SupplierSchema);
