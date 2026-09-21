const express = require('express');
const auth = require('../middleware/auth');
const Product = require('../models/Product');
const StockHistory = require('../models/StockHistory');

const router = express.Router();

const ARABIC_KEYBOARD_MAP = {
  'ذ': '`', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '٠': '0',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u', 'ه': 'i', 'خ': 'o', 'ح': 'p',
  'ج': '[', 'د': ']', 'ش': 'a', 'س': 's', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j', 'ن': 'k',
  'م': 'l', 'ك': ';', 'ط': "'", 'ئ': 'z', 'ء': 'x', 'ؤ': 'c', 'ر': 'v', 'لا': 'b', 'ى': 'n', 'ة': 'm',
  'و': ',', 'ز': '.', 'ظ': '/',
  'أ': 'h', 'إ': 'y', 'آ': 'n'
};

const normalizeBarcodeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (ARABIC_KEYBOARD_MAP[char]) {
      result += ARABIC_KEYBOARD_MAP[char];
    } else {
      result += char;
    }
  }
  return result.trim().toUpperCase();
};

const generateNextSku = async () => {
  const allProducts = await Product.find({}, { sku: 1 }).lean();
  let maxNum = 1000;
  for (const item of allProducts) {
    if (item.sku) {
      const digits = item.sku.replace(/[^0-9]/g, '');
      const num = parseInt(digits, 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return (maxNum + 1).toString();
};

const ensureMissingSkus = async (products) => {
  let nextSkuNum = null;
  for (const p of products) {
    const hasSku = p.sku && typeof p.sku === 'string' && p.sku.trim().length > 0;
    if (!hasSku) {
      try {
        if (!nextSkuNum) {
          const skuStr = await generateNextSku();
          nextSkuNum = parseInt(skuStr, 10);
        } else {
          nextSkuNum += 1;
        }
        p.sku = nextSkuNum.toString();
        await p.save();
      } catch (err) {
        console.error('Auto SKU generation error for product:', p._id, err.message);
      }
    }
  }
};

router.get('/', async (req, res) => {
  try {
    const { search, category, excludeId, limit, includeOffSeason, season } = req.query;
    let query = { active: true };

    if (includeOffSeason !== 'true') {
      query.isSeasonArchived = { $ne: true };
    }

    if (season && ['summer', 'winter', 'all'].includes(season)) {
      query.season = season;
    }
    
    if (category && category.trim() !== '') {
      query.category = category.trim();
    }
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    if (search && search.trim() !== '') {
      const s = search.trim();
      const normS = normalizeBarcodeString(s);
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { sku: { $regex: s, $options: 'i' } },
        { sku: { $regex: normS, $options: 'i' } },
        { oldSku: { $regex: s, $options: 'i' } },
        { oldSku: { $regex: normS, $options: 'i' } },
        { category: { $regex: s, $options: 'i' } },
        { 'variants.sku': { $regex: s, $options: 'i' } }
      ];
    }

    let mongoQuery = Product.find(query).sort({ createdAt: -1 });
    if (limit) {
      mongoQuery = mongoQuery.limit(Number(limit));
    }
    
    const products = await mongoQuery;
    await ensureMissingSkus(products);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch products', error: error.message });
  }
});

router.get('/lookup-barcode', async (req, res) => {
  try {
    const rawCode = req.query.code || '';
    if (!rawCode || typeof rawCode !== 'string') {
      return res.status(400).json({ message: 'Code parameter is required' });
    }

    const code = rawCode.trim();
    const normCode = normalizeBarcodeString(code);
    const codeClean = normCode.replace(/[^a-zA-Z0-9]/g, '');
    const codeDigits = normCode.replace(/[^0-9]/g, '');

    // Search across ALL products
    const allProducts = await Product.find({}).sort({ createdAt: -1 });

    let matched = allProducts.find(p => {
      const pSku = (p.sku || '').trim().toUpperCase();
      const pOldSku = (p.oldSku || '').trim().toUpperCase();
      const pIdFull = p._id ? p._id.toString().toUpperCase() : '';
      const pIdDigits = p._id ? (parseInt(p._id.toString().slice(-6), 16) % 89999 + 10000).toString() : '';

      if (pSku && (pSku === code.toUpperCase() || pSku === normCode)) return true;
      if (pOldSku && (pOldSku === code.toUpperCase() || pOldSku === normCode)) return true;
      if (pIdFull && (pIdFull === code.toUpperCase() || pIdFull === normCode)) return true;
      if (pIdDigits && (pIdDigits === code || pIdDigits === normCode)) return true;

      const pSkuClean = pSku.replace(/[^a-zA-Z0-9]/g, '');
      const pOldSkuClean = pOldSku.replace(/[^a-zA-Z0-9]/g, '');
      if (codeClean && pSkuClean && codeClean === pSkuClean) return true;
      if (codeClean && pOldSkuClean && codeClean === pOldSkuClean) return true;

      const codeNoPrefixClean = codeClean.replace(/^[A-Z]+/, '');
      if (codeNoPrefixClean && pSkuClean && codeNoPrefixClean === pSkuClean) return true;
      if (codeNoPrefixClean && pOldSkuClean && codeNoPrefixClean === pOldSkuClean) return true;

      return false;
    });

    // Fallback: match extracted numeric part
    if (!matched && codeDigits && codeDigits.length >= 3) {
      matched = allProducts.find(p => {
        const pSku = (p.sku || '').trim();
        const pOldSku = (p.oldSku || '').trim();
        const pDigits = pSku.replace(/[^0-9]/g, '');
        const pOldDigits = pOldSku.replace(/[^0-9]/g, '');
        return pSku === codeDigits || pOldSku === codeDigits || pDigits === codeDigits || pOldDigits === codeDigits;
      });
    }

    if (matched) {
      let modified = false;
      if (matched.active === false) {
        matched.active = true;
        modified = true;
      }
      if (!matched.oldSku || (matched.oldSku !== code && matched.oldSku !== normCode)) {
        matched.oldSku = normCode || code;
        modified = true;
      }
      if (modified) {
        await matched.save();
      }
      return res.json(matched);
    }

    return res.status(404).json({ message: 'Product not found for code: ' + code });
  } catch (error) {
    res.status(500).json({ message: 'Error performing lookup', error: error.message });
  }
});

router.post('/link-barcode', async (req, res) => {
  try {
    const { code, productId } = req.body;
    if (!code || !productId) {
      return res.status(400).json({ message: 'Code and productId are required' });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    product.oldSku = code.trim();
    product.active = true;
    await product.save();
    res.json({ message: 'Barcode linked successfully', product });
  } catch (err) {
    res.status(500).json({ message: 'Failed to link barcode', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch product', error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, category, description, price, costPrice, stock, images, sizes, colors, type, sku, oldSku, supplier, supplierId, allowDiscount, discountPrice, discountStartDate, discountEndDate, variants } = req.body;
    
    let finalSku = sku && typeof sku === 'string' ? sku.trim() : '';
    if (!finalSku) {
      finalSku = await generateNextSku();
    }

    const product = new Product({
      name,
      category,
      description,
      price: Number(price || 0),
      costPrice: Number(costPrice || 0),
      stock: Number(stock || 0),
      images,
      sizes,
      colors,
      type,
      sku: finalSku,
      oldSku: oldSku ? oldSku.trim() : '',
      supplier: supplier || '',
      supplierId: supplierId || null,
      allowDiscount: allowDiscount !== false,
      discountPrice: discountPrice ? Number(discountPrice) : null,
      discountStartDate: discountStartDate ? new Date(discountStartDate) : null,
      discountEndDate: discountEndDate ? new Date(discountEndDate) : null,
      variants: variants || []
    });

    await product.save();
    
    // Create Initial Stock History
    if (product.variants && product.variants.length > 0) {
      for (const v of product.variants) {
        if (v.stock > 0) {
          await StockHistory.create({
            product: product._id,
            productName: product.name,
            size: v.size,
            color: v.color,
            variantKey: `${v.size}_${v.color}`,
            changeType: 'Initial Stock',
            quantityChanged: v.stock,
            previousStock: 0,
            newStock: v.stock,
            performedBy: req.user.id,
            performedByName: req.user.name
          });
        }
      }
    } else if (product.stock > 0) {
      await StockHistory.create({
        product: product._id,
        productName: product.name,
        changeType: 'Initial Stock',
        quantityChanged: product.stock,
        previousStock: 0,
        newStock: product.stock,
        performedBy: req.user.id,
        performedByName: req.user.name
      });
    }

    // Emit real-time WebSockets to update all POS clients immediately
    req.app.locals.io?.emit('inventory:update', product);
    req.app.locals.io?.emit('product:created', product);

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Unable to create product', error: error.message });
  }
});

router.patch('/:id/stock', auth, async (req, res) => {
  try {
    const { stock } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.stock = stock;
    await product.save();
    req.app.locals.io?.emit('inventory:update', product);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update stock', error: error.message });
  }
});

module.exports = router;
