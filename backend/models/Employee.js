const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  active: { type: Boolean, default: true },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
