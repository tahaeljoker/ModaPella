const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  size: { type: String, default: '' },
  color: { type: String, default: '' },
  costPrice: { type: Number, default: 0 }
});

const OrderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerName: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [OrderItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0 },
  type: { type: String, enum: ['Online', 'Offline'], default: 'Online' },
  status: { type: String, enum: ['Pending', 'Completed', 'Returned'], default: 'Pending' },
  paymentMethod: { type: String, enum: ['Cash', 'Instapay'], default: 'Cash' },
  paymentGateway: { type: String, default: 'Instapay' },
  recovered: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
