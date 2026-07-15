const express = require('express');
const auth = require('../middleware/auth');
const Product = require('../models/Product');
const StockHistory = require('../models/StockHistory');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { search, limit } = req.query;
    let query = { active: true };
    
    if (search && search.trim() !== '') {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { sku: { $regex: s, $options: 'i' } },
        { category: { $regex: s, $options: 'i' } },
        { 'variants.sku': { $regex: s, $options: 'i' } } // support variant-level SKU search if any
      ];
    }

    let mongoQuery = Product.find(query).sort({ createdAt: -1 });
    if (limit) {
      mongoQuery = mongoQuery.limit(Number(limit));
    }
    
    const products = await mongoQuery;
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch products', error: error.message });
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
