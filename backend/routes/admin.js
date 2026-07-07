const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const bcrypt = require('bcryptjs');
const Product = require('../models/Product');
const Order = require('../models/Order');
const SiteConfig = require('../models/SiteConfig');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

const getSiteConfig = async () => {
  let config = await SiteConfig.findOne({ key: 'default' });
  if (!config) {
    config = await SiteConfig.create({ key: 'default' });
  }
  return config;
};

router.get('/overview', auth, requireRole(['admin']), async (req, res) => {
  try {
    const [products, orders, siteConfig, outTransactions] = await Promise.all([
      Product.find({ active: true }),
      Order.find().sort({ createdAt: -1 }).limit(10),
      getSiteConfig(),
      Transaction.find({ type: 'OUT' })
    ]);

    const allOrders = await Order.find({ status: 'Completed' });

    const totalStock = products.reduce((sum, item) => sum + item.stock, 0);
    const totalValue = products.reduce((sum, item) => sum + item.stock * item.price, 0);
    const totalSales = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const lowStock = products.filter((item) => item.stock <= 5);

    // Net profit: sum(sellPrice - costPrice) * qty for each sold item
    const netProfit = allOrders.reduce((sum, order) => {
      const orderProfit = order.items.reduce((s, item) => {
        const profit = (item.price - (item.costPrice || 0)) * item.quantity;
        return s + profit;
      }, 0);
      return sum + orderProfit - (order.discount || 0);
    }, 0);

    const totalDiscounts = allOrders.reduce((sum, o) => sum + (o.discount || 0), 0);

    // Aggregate expenses by category
    const expenseMap = {};
    outTransactions.forEach(t => {
      const cat = t.category || 'أخرى';
      expenseMap[cat] = (expenseMap[cat] || 0) + t.amount;
    });
    const expenseBreakdown = Object.entries(expenseMap).map(([category, amount]) => ({
      category,
      amount
    }));

    res.json({
      products: products.length,
      totalStock,
      totalValue,
      totalSales,
      netProfit,
      totalDiscounts,
      expenseBreakdown,
      published: siteConfig.published,
      lowStock,
      recentOrders: orders
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load admin overview', error: error.message });
  }
});

// GET /site-config is public so visitors can load landing page configuration
router.get('/site-config', async (req, res) => {
  try {
    const siteConfig = await getSiteConfig();
    res.json(siteConfig);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load site settings', error: error.message });
  }
});

router.put('/site-config', auth, requireRole(['admin']), async (req, res) => {
  try {
    const siteConfig = await getSiteConfig();
    Object.assign(siteConfig, req.body);
    await siteConfig.save();
    res.json(siteConfig);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update site settings', error: error.message });
  }
});

const generateSku = async (category) => {
  const prefix = category.substring(0, 3).toUpperCase();
  const lastProduct = await Product.findOne({ sku: new RegExp(`^${prefix}-`) }).sort({ sku: -1 });
  if (lastProduct && lastProduct.sku) {
    const num = parseInt(lastProduct.sku.split('-')[1]);
    return `${prefix}-${num + 1}`;
  }
  return `${prefix}-1001`;
};

router.post('/products', auth, requireRole(['admin']), async (req, res) => {
  try {
    const productData = req.body;
    if (!productData.sku) {
      productData.sku = await generateSku(productData.category);
    }
    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Failed to create product:', error);
    res.status(500).json({ message: 'Unable to create product', error: error.message });
  }
});

router.put('/products/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    req.app.locals.io?.emit('inventory:update', product);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update product', error: error.message });
  }
});

router.delete('/products/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.active = false;
    await product.save();
    req.app.locals.io?.emit('inventory:update', product);
    res.json({ message: 'Product archived' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to archive product', error: error.message });
  }
});

// ─── Customer Management (CRM) ──────────────────────────────────────────────

router.get('/customers', auth, requireRole(['admin']), async (req, res) => {
  try {
    const orders = await Order.find({ 
      status: 'Completed',
      $or: [
        { customerPhone: { $ne: '' } },
        { customerName: { $ne: '' } }
      ]
    }).sort({ createdAt: -1 });

    const customersMap = {};

    orders.forEach(order => {
      const key = order.customerPhone || order.customerName; // Phone preferred
      if (!customersMap[key]) {
        customersMap[key] = {
          name: order.customerName || 'بدون اسم',
          phone: order.customerPhone || 'بدون رقم',
          totalSpent: 0,
          ordersCount: 0,
          lastOrderDate: order.createdAt,
          orders: []
        };
      }
      
      customersMap[key].totalSpent += order.totalAmount;
      customersMap[key].ordersCount += 1;
      customersMap[key].orders.push({
        id: order._id,
        date: order.createdAt,
        total: order.totalAmount,
        items: order.items.map(i => ({ name: i.name, qty: i.quantity, price: i.price, size: i.size, color: i.color }))
      });

      // Keep the most recent order date
      if (new Date(order.createdAt) > new Date(customersMap[key].lastOrderDate)) {
        customersMap[key].lastOrderDate = order.createdAt;
      }
    });

    const customersList = Object.values(customersMap).sort((a, b) => b.totalSpent - a.totalSpent);
    res.json(customersList);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load customers', error: error.message });
  }
});

// ─── User Management (admin only) ─────────────────────────────────────────

// GET /api/admin/users — list all staff users
router.get('/users', auth, requireRole(['admin']), async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['admin', 'cashier', 'manager'] } })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load users', error: error.message });
  }
});

// POST /api/admin/users — create a new cashier/manager account
router.post('/users', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, password, role = 'cashier' } = req.body;
    if (!['cashier', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already in use' });
    const user = new User({ name, email, password, role });
    await user.save();
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Unable to create user', error: error.message });
  }
});

// PATCH /api/admin/users/:id/toggle — enable/disable a user account
router.patch('/users/:id/toggle', auth, requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.active = user.active === false ? true : false;
    await user.save();
    res.json({ id: user.id, active: user.active });
  } catch (error) {
    res.status(500).json({ message: 'Unable to toggle user', error: error.message });
  }
});

// DELETE /api/admin/users/:id — remove a cashier account
router.delete('/users/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot delete admin user' });
    await user.deleteOne();
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete user', error: error.message });
  }
});

module.exports = router;
