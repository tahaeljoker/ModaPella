const express = require('express');
const auth = require('../middleware/auth');
const Product = require('../models/Product');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ active: true }).sort({ createdAt: -1 });
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
