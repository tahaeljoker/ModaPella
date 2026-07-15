const mongoose = require('mongoose');

const TaskItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  sku: { type: String, default: '' },
  size: { type: String, default: '' },
  color: { type: String, default: '' },
  systemStock: { type: Number, required: true, default: 0 },
  countedStock: { type: Number, default: null } // null = not counted yet
});

const InventoryTaskSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g. "جرد الفستان والبنطلون"
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [TaskItemSchema],
  status: { type: String, enum: ['pending', 'submitted', 'accepted', 'rejected'], default: 'pending' },
  adminNotes: { type: String, default: '' }, // Rejection feedback or general notes
  submittedAt: { type: Date },
  reviewedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('InventoryTask', InventoryTaskSchema);
