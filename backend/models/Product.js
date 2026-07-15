const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['Blazer', 'Blouse', 'Chemise', 'Skirt', 'Dress', 'Pantalon', 'T-shirt', 'Bag', 'Cardigan', 'Suit', 'Tonic', 'Takem'],
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
  totalReceived: { type: Number, min: 0, default: 0 },
  images: [{ type: String }],
  sizes: [{ type: String }],
  colors: [{ type: String }],
  type: { type: String, default: '' },
  sku: { type: String, unique: true, sparse: true },
  supplier: { type: String, default: '' },
  supplierId: { type: require('mongoose').Schema.Types.ObjectId, ref: 'Supplier', default: null },
  active: { type: Boolean, default: true },
  allowDiscount: { type: Boolean, default: true },
  discountPrice: { type: Number, default: null },
  discountStartDate: { type: Date, default: null },
  discountEndDate: { type: Date, default: null }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

ProductSchema.virtual('isDiscountActive').get(function () {
  if (this.allowDiscount === false) return false;
  if (!this.discountPrice || this.discountPrice <= 0 || this.discountPrice >= this.price) return false;
  const now = new Date();
  if (this.discountStartDate && new Date(this.discountStartDate) > now) return false;
  if (this.discountEndDate && new Date(this.discountEndDate) < now) return false;
  return true;
});

ProductSchema.virtual('effectivePrice').get(function () {
  return this.isDiscountActive ? this.discountPrice : this.price;
});


ProductSchema.pre('save', function (next) {
  if (this.variants && this.variants.length > 0) {
    this.stock = this.variants.reduce((sum, v) => sum + v.stock, 0);
  }
  if (this.isNew) {
    this.totalReceived = this.stock;
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
