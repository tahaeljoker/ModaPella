const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['Blouse', 'Chemise', 'Skirt', 'Dress', 'Pantalon', 'T-shirt', 'Bag', 'Cardigan', 'Suit'],
    required: true
  },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, default: 0, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  variants: [{
    size: { type: String, required: true },
    color: { type: String, required: true },
    stock: { type: Number, default: 0, min: 0 }
  }],
  sold: { type: Number, min: 0, default: 0 },
  images: [{ type: String }],
  sizes: [{ type: String }],
  colors: [{ type: String }],
  type: { type: String, default: '' },
  sku: { type: String, unique: true, sparse: true },
  supplier: { type: String, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

ProductSchema.pre('save', function (next) {
  if (this.variants && this.variants.length > 0) {
    this.stock = this.variants.reduce((sum, v) => sum + v.stock, 0);
  }
  next();
});

ProductSchema.methods.adjustInventory = async function (quantity) {
  this.stock = Math.max(0, this.stock + quantity);
  if (quantity < 0) {
    this.sold += Math.abs(quantity);
  }
  return this.save();
};

module.exports = mongoose.model('Product', ProductSchema);
