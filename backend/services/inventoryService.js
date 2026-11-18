const Product = require('../models/Product');
const StockHistory = require('../models/StockHistory');

/**
 * Formats a consistent variant SKU: `${productSku}-${size}-${color}` or uses explicitSku if provided.
 */
const formatVariantSku = (productSku, size, color, explicitSku = null) => {
  if (explicitSku && String(explicitSku).trim()) {
    return String(explicitSku).trim().toUpperCase();
  }
  if (!productSku) return '';
  const cleanSku = productSku.trim().toUpperCase();
  const cleanSize = (size || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const cleanColor = (color || '').trim().replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '');
  return `${cleanSku}-${cleanSize || 'STD'}-${cleanColor || 'VAR'}`;
};

/**
 * Deducts stock atomically for a product (and variant if applicable) and logs StockHistory.
 * Guaranteed atomic using MongoDB positional $inc, preventing negative stock and race conditions.
 */
const deductStock = async ({
  productId,
  variantId,
  size,
  color,
  quantity,
  referenceId = null,
  changeType = 'POS Sale',
  notes = '',
  performedBy = null,
  session = null
}) => {
  const qty = Math.max(1, parseInt(quantity, 10) || 1);

  const deductionResult = await Product.atomicDeductStock({
    productId,
    variantId,
    size,
    color,
    quantity: qty,
    session
  });

  const { product, variant, prevStock, newStock } = deductionResult;

  const history = new StockHistory({
    product: product._id,
    productName: product.name,
    size: variant ? variant.size : (size || ''),
    color: variant ? variant.color : (color || ''),
    variantKey: variant ? `${variant.size}_${variant.color}` : '',
    changeType,
    quantityChanged: -qty,
    previousStock: prevStock,
    newStock: newStock,
    performedBy,
    referenceId,
    notes
  });
  await history.save({ session });

  return { product, variant, prevStock, newStock, history };
};

/**
 * Restores stock atomically for a product (and variant if applicable) and logs StockHistory.
 * Works seamlessly with active and inactive/archived products.
 */
const restoreStock = async ({
  productId,
  variantId,
  size,
  color,
  quantity,
  referenceId = null,
  changeType = 'Refund',
  notes = '',
  performedBy = null,
  session = null
}) => {
  const qty = Math.max(1, parseInt(quantity, 10) || 1);

  const restoreResult = await Product.atomicRestoreStock({
    productId,
    variantId,
    size,
    color,
    quantity: qty,
    session
  });

  const { product, variant, prevStock, newStock } = restoreResult;

  let history = null;
  if (product) {
    history = new StockHistory({
      product: product._id,
      productName: product.name,
      size: variant ? variant.size : (size || ''),
      color: variant ? variant.color : (color || ''),
      variantKey: variant ? `${variant.size}_${variant.color}` : '',
      changeType,
      quantityChanged: qty,
      previousStock: prevStock,
      newStock: newStock,
      performedBy,
      referenceId,
      notes
    });
    await history.save({ session });
  }

  return { product, variant, prevStock, newStock, history };
};

/**
 * Manual storage adjustment for warehouse / storage inventory updates.
 */
const adjustStorage = async ({
  productId,
  adjustment,
  size,
  color,
  performedBy = null,
  reason = 'تعديل يدوي للمخزن',
  session = null
}) => {
  const adj = Number(adjustment);
  if (isNaN(adj) || adj === 0) {
    throw new Error('قيمة التعديل غير صالحة');
  }

  if (adj < 0) {
    return await deductStock({
      productId,
      size,
      color,
      quantity: Math.abs(adj),
      changeType: 'Manual Adjustment',
      notes: reason,
      performedBy,
      session
    });
  } else {
    return await restoreStock({
      productId,
      size,
      color,
      quantity: adj,
      changeType: 'Manual Adjustment',
      notes: reason,
      performedBy,
      session
    });
  }
};

module.exports = {
  formatVariantSku,
  deductStock,
  restoreStock,
  adjustStorage
};
