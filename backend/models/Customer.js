const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  points: { type: Number, default: 0 },
  debt: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
