const express = require('express');
const auth = require('../middleware/auth');
const Product = require('../models/Product');
const StockHistory = require('../models/StockHistory');

const router = express.Router();

const ensureMissingSkus = async (products) => {
  const allProducts = await Product.find({}, { sku: 1 }).lean();
  let maxNum = 1000;
  for (const item of allProducts) {
    if (item.sku) {
      const digits = item.sku.replace(/[^0-9]/g, '');
      const num = parseInt(digits, 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }

  for (const p of products) {
    const hasSku = p.sku && typeof p.sku === 'string' && p.sku.trim().length > 0;
    if (!hasSku) {
      try {
        maxNum += 1;
        p.sku = maxNum.toString();
        await p.save();
      } catch (err) {
        console.error('Auto SKU generation error for product:', p._id, err.message);
      }
    }
  }
};

router.get('/', async (req, res) => {
  try {
    const { search, category, excludeId, limit } = req.query;
    let query = { active: true };
    
    if (category && category.trim() !== '') {
      query.category = category.trim();
    }
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    if (search && search.trim() !== '') {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { sku: { $regex: s, $options: 'i' } },
        { oldSku: { $regex: s, $options: 'i' } },
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
    const codeClean = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const codeDigits = code.replace(/[^0-9]/g, '');

    // Search across ALL products (including active: false)
    const allProducts = await Product.find({}).sort({ createdAt: -1 });

    let matched = allProducts.find(p => {
      const pSku = (p.sku || '').trim().toUpperCase();
      const pOldSku = (p.oldSku || '').trim().toUpperCase();
      const pIdFull = p._id ? p._id.toString().toUpperCase() : '';
      const pIdDigits = p._id ? (parseInt(p._id.toString().slice(-6), 16) % 89999 + 10000).toString() : '';

      if (pSku && pSku === code.toUpperCase()) return true;
      if (pOldSku && pOldSku === code.toUpperCase()) return true;
      if (pIdFull && pIdFull === code.toUpperCase()) return true;
      if (pIdDigits && pIdDigits === code) return true;

      const pSkuClean = pSku.replace(/[^a-zA-Z0-9]/g, '');
      const pOldSkuClean = pOldSku.replace(/[^a-zA-Z0-9]/g, '');
      if (codeClean && pSkuClean && codeClean === pSkuClean) return true;
      if (codeClean && pOldSkuClean && codeClean === pOldSkuClean) return true;

      const codeNoPrefixClean = codeClean.replace(/^[A-Z]/, '');
      if (codeNoPrefixClean && pSkuClean && codeNoPrefixClean === pSkuClean) return true;
      if (codeNoPrefixClean && pOldSkuClean && codeNoPrefixClean === pOldSkuClean) return true;

      return false;
    });

    // Fallback: match extracted numeric part against p.sku
    if (!matched && codeDigits && codeDigits.length >= 3) {
      matched = allProducts.find(p => {
        const pSku = (p.sku || '').trim();
        const pOldSku = (p.oldSku || '').trim();
        return pSku === codeDigits || pOldSku === codeDigits;
      });
    }

    if (matched) {
      let modified = false;
      if (matched.active === false) {
        matched.active = true;
        modified = true;
      }
      if (matched.oldSku !== code) {
        matched.oldSku = code;
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
    const { name, category, description, price, stock, images, sizes, colors, type } = req.body;
    const product = new Product({ name, category, description, price, stock, images, sizes, colors, type });
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
