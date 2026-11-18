const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    required: true
  },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, default: 0, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  variants: [{
    size: { type: String, required: true },
    color: { type: String, required: true },
    stock: { type: Number, default: 0, min: 0 },
    sku: { type: String, default: '' }
  }],
  sold: { type: Number, min: 0, default: 0 },
  totalReceived: { type: Number, min: 0, default: 0 },
  images: [{ type: String }],
  mannequinImage: { type: String, default: '' },
  colorImages: [{
    color: { type: String, trim: true },
    image: { type: String, trim: true }
  }],
  onlineName: { type: String, default: '', trim: true },
  sizes: [{ type: String }],
  colors: [{ type: String }],
  type: { type: String, default: '' },
  sku: { type: String, unique: true, sparse: true },
  oldSku: { type: String, default: '' },
  oldSkus: { type: [String], default: [] },
  supplier: { type: String, default: '' },
  supplierId: { type: require('mongoose').Schema.Types.ObjectId, ref: 'Supplier', default: null },
  active: { type: Boolean, default: true },
  season: { type: String, enum: ['summer', 'winter', 'all'], default: 'all' },
  isSeasonArchived: { type: Boolean, default: false },
  showOnWebsite: { type: Boolean, default: true },
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
  if (this.discountEndDate) {
    const end = new Date(this.discountEndDate);
    end.setHours(23, 59, 59, 999);
    if (end < now) return false;
  }
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

/**
 * Atomically deducts stock from a product and its specific variant using MongoDB positional $inc.
 * Guarantees zero negative stock and prevents concurrent race conditions without read-modify-write.
 */
ProductSchema.statics.atomicDeductStock = async function ({
  productId,
  variantId,
  size,
  color,
  quantity,
  session = null
}) {
  const qty = Number(quantity || 0);
  if (qty <= 0) {
    throw new Error('كمية الخصم يجب أن تكون أكبر من صفر');
  }

  const productDoc = await this.findById(productId).session(session);
  if (!productDoc) {
    throw new Error(`المنتج غير موجود في قاعدة البيانات`);
  }

  const hasVariants = Array.isArray(productDoc.variants) && productDoc.variants.length > 0;
  let targetVariant = null;

  if (hasVariants) {
    if (variantId) {
      targetVariant = productDoc.variants.id(variantId);
    }
    if (!targetVariant && size && color) {
      targetVariant = productDoc.variants.find(v => v.size === size && v.color === color);
    }
    if (!targetVariant && size) {
      targetVariant = productDoc.variants.find(v => v.size === size);
    }
  }

  let updatedProduct = null;
  let prevStock = 0;
  let newStock = 0;

  if (hasVariants && targetVariant) {
    prevStock = targetVariant.stock || 0;
    const filter = {
      _id: productId,
      variants: {
        $elemMatch: {
          _id: targetVariant._id,
          stock: { $gte: qty }
        }
      }
    };
    const update = {
      $inc: {
        'variants.$.stock': -qty,
        stock: -qty,
        sold: qty
      }
    };

    updatedProduct = await this.findOneAndUpdate(filter, update, {
      new: true,
      session
    });

    if (!updatedProduct) {
      throw new Error(`الكمية المطلوبة (${qty}) غير متوفرة حالياً في المخزون للمنتج "${productDoc.name}" مقاس (${targetVariant.size || '-'}) لون (${targetVariant.color || '-'}) - تم بيع آخر قطعة أو الكمية غير كافية`);
    }

    const updatedVariant = updatedProduct.variants.id(targetVariant._id);
    newStock = updatedVariant ? updatedVariant.stock : 0;
    targetVariant = updatedVariant;
  } else {
    prevStock = productDoc.stock || 0;
    const filter = {
      _id: productId,
      stock: { $gte: qty }
    };
    const update = {
      $inc: {
        stock: -qty,
        sold: qty
      }
    };

    updatedProduct = await this.findOneAndUpdate(filter, update, {
      new: true,
      session
    });

    if (!updatedProduct) {
      throw new Error(`الكمية المطلوبة (${qty}) غير متوفرة حالياً في المخزون للمنتج "${productDoc.name}" - تم بيع آخر قطعة أو الكمية غير كافية`);
    }

    newStock = updatedProduct.stock;
  }

  return {
    product: updatedProduct,
    variant: targetVariant,
    prevStock,
    newStock
  };
};

/**
 * Atomically restores stock to a product and its specific variant using MongoDB positional $inc.
 * Properly restores archived/inactive products without failing.
 */
ProductSchema.statics.atomicRestoreStock = async function ({
  productId,
  variantId,
  size,
  color,
  quantity,
  session = null
}) {
  const qty = Number(quantity || 0);
  if (qty <= 0) {
    return { product: null, variant: null, prevStock: 0, newStock: 0 };
  }

  const productDoc = await this.findById(productId).session(session);
  if (!productDoc) {
    return { product: null, variant: null, prevStock: 0, newStock: 0 };
  }

  const hasVariants = Array.isArray(productDoc.variants) && productDoc.variants.length > 0;
  let targetVariant = null;

  if (hasVariants) {
    if (variantId) {
      targetVariant = productDoc.variants.id(variantId);
    }
    if (!targetVariant && size && color) {
      targetVariant = productDoc.variants.find(v => v.size === size && v.color === color);
    }
    if (!targetVariant && size) {
      targetVariant = productDoc.variants.find(v => v.size === size);
    }
  }

  let updatedProduct = null;
  let prevStock = 0;
  let newStock = 0;

  if (hasVariants && targetVariant) {
    prevStock = targetVariant.stock || 0;
    const filter = {
      _id: productId,
      'variants._id': targetVariant._id
    };
    const update = {
      $inc: {
        'variants.$.stock': qty,
        stock: qty,
        sold: -qty
      }
    };

    updatedProduct = await this.findOneAndUpdate(filter, update, {
      new: true,
      session
    });

    const updatedVariant = updatedProduct?.variants?.id(targetVariant._id);
    newStock = updatedVariant ? updatedVariant.stock : (prevStock + qty);
    targetVariant = updatedVariant;
  } else {
    prevStock = productDoc.stock || 0;
    const filter = { _id: productId };
    const update = {
      $inc: {
        stock: qty,
        sold: -qty
      }
    };

    updatedProduct = await this.findOneAndUpdate(filter, update, {
      new: true,
      session
    });

    newStock = updatedProduct ? updatedProduct.stock : (prevStock + qty);
  }

  return {
    product: updatedProduct,
    variant: targetVariant,
    prevStock,
    newStock
  };
};

module.exports = mongoose.model('Product', ProductSchema);
