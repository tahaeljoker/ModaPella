const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Product = require('../models/Product');
const InventoryCount = require('../models/InventoryCount');

const router = express.Router();
const ROLES = ['admin', 'manager'];

// POST /api/inventory/count/new — create a fresh count session from current stock
router.post('/count/new', auth, requireRole(ROLES), async (req, res) => {
  try {
    const { label } = req.body;
    const products = await Product.find({ active: true }).sort({ name: 1 });
    const items = [];
    products.forEach(p => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach(v => {
          items.push({
            product: p._id,
            productName: p.name,
            variantKey: `${v.size}_${v.color}`,
            size: v.size,
            color: v.color,
            systemStock: v.stock,
            countedStock: null,
            variance: 0
          });
        });
      } else {
        items.push({
          product: p._id,
          productName: p.name,
          variantKey: '',
          size: '',
          color: '',
          systemStock: p.stock,
          countedStock: null,
          variance: 0
        });
      }
    });
    const count = new InventoryCount({ label: label || `جرد ${new Date().toLocaleDateString('ar-EG')}`, items, createdBy: req.user.id });
    await count.save();
    res.status(201).json(count);
  } catch (e) {
    res.status(500).json({ message: 'Unable to create inventory count', error: e.message });
  }
});

// GET /api/inventory/counts — list all count sessions
router.get('/counts', auth, requireRole(ROLES), async (req, res) => {
  try {
    const counts = await InventoryCount.find().sort({ createdAt: -1 }).limit(20).populate('createdBy', 'name');
    res.json(counts);
  } catch (e) {
    res.status(500).json({ message: 'Unable to load counts', error: e.message });
  }
});

// GET /api/inventory/counts/:id
router.get('/counts/:id', auth, requireRole(ROLES), async (req, res) => {
  try {
    const count = await InventoryCount.findById(req.params.id).populate('createdBy', 'name');
    if (!count) return res.status(404).json({ message: 'Count not found' });
    res.json(count);
  } catch (e) {
    res.status(500).json({ message: 'Unable to load count', error: e.message });
  }
});

// PUT /api/inventory/counts/:id — save entered quantities (draft)
router.put('/counts/:id', auth, requireRole(ROLES), async (req, res) => {
  try {
    const { items } = req.body;
    const count = await InventoryCount.findById(req.params.id);
    if (!count) return res.status(404).json({ message: 'Count not found' });
    if (count.status === 'applied') return res.status(400).json({ message: 'Count already applied' });
    // update each item's countedStock and variance
    items.forEach(incoming => {
      const found = count.items.id(incoming._id);
      if (found) {
        found.countedStock = incoming.countedStock;
        found.variance = (incoming.countedStock ?? found.systemStock) - found.systemStock;
      }
    });
    await count.save();
    res.json(count);
  } catch (e) {
    res.status(500).json({ message: 'Unable to save count', error: e.message });
  }
});

// POST /api/inventory/counts/:id/apply — apply count: update actual stock
router.post('/counts/:id/apply', auth, requireRole(['admin']), async (req, res) => {
  try {
    const count = await InventoryCount.findById(req.params.id);
    if (!count) return res.status(404).json({ message: 'Count not found' });
    if (count.status === 'applied') return res.status(400).json({ message: 'Already applied' });

    for (const item of count.items) {
      if (item.countedStock === null) continue; // skip uncounted
      const product = await Product.findById(item.product);
      if (!product) continue;
      if (item.variantKey && product.variants?.length > 0) {
        const variant = product.variants.find(v => `${v.size}_${v.color}` === item.variantKey);
        if (variant) variant.stock = item.countedStock;
      } else {
        product.stock = item.countedStock;
      }
      await product.save();
    }

    count.status = 'applied';
    count.appliedAt = new Date();
    await count.save();
    res.json({ message: 'Inventory count applied successfully', count });
  } catch (e) {
    res.status(500).json({ message: 'Unable to apply count', error: e.message });
  }
});

// DELETE /api/inventory/counts/:id — delete a draft count
router.delete('/counts/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const count = await InventoryCount.findById(req.params.id);
    if (!count) return res.status(404).json({ message: 'Count not found' });
    if (count.status === 'applied') return res.status(400).json({ message: 'Cannot delete applied count' });
    await count.deleteOne();
    res.json({ message: 'Count deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Unable to delete count', error: e.message });
  }
});

module.exports = router;
