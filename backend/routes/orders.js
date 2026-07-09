const express = require('express');
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { customerId, sellerId, items, type = 'Online' } = req.body;
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = new Order({ customer: customerId, seller: sellerId, items, totalAmount, type, status: 'Completed', paymentGateway: 'Instapay' });
    await order.save();

    await Promise.all(items.map(async (item) => {
      const product = await Product.findById(item.product);
      if (!product) throw new Error(`Product ${item.name} not found`);
      product.stock = Math.max(0, product.stock - item.quantity);
      product.sold += item.quantity;
      await product.save();
      req.app.locals.io?.emit('inventory:update', product);
    }));

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Unable to create order', error: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find().populate('customer seller', 'name email role').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch orders', error: error.message });
  }
});

router.get('/summary', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const query = {};
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from + 'T00:00:00');
      if (to)   query.createdAt.$lte = new Date(to   + 'T23:59:59');
    }
    const orders = await Order.find(query);
    const totalRevenue = orders.filter(o => o.status === 'Completed').reduce((sum, order) => sum + order.totalAmount, 0);
    const completed = orders.filter((order) => order.status === 'Completed').length;
    const returned = orders.filter((order) => order.status === 'Returned').length;
    res.json({ totalRevenue, completed, returned });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch order summary', error: error.message });
  }
});

// GET /api/orders/weekly — revenue for custom date range (default to last 7 days)
router.get('/weekly', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    let endDate = new Date();

    if (from) {
      startDate = new Date(from);
    }
    if (to) {
      endDate = new Date(to + 'T23:59:59');
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const limitDays = Math.min(diffDays, 31); // Cap at 31 days to prevent performance issues

    const days = [];
    for (let i = limitDays - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);

      const orders = await Order.find({ createdAt: { $gte: d, $lte: end }, status: 'Completed' });
      const revenue = orders.reduce((s, o) => s + o.totalAmount, 0);
      const cashRevenue = orders.filter(o => o.paymentMethod === 'Cash').reduce((s, o) => s + o.totalAmount, 0);
      const instapayRevenue = orders.filter(o => o.paymentMethod === 'Instapay' || o.paymentMethod === 'Wallet').reduce((s, o) => s + o.totalAmount, 0);
      
      const profit = orders.reduce((sum, order) => {
        const orderCost = order.items.reduce((cSum, item) => cSum + (item.costPrice || 0) * item.quantity, 0);
        return sum + (order.totalAmount - orderCost);
      }, 0);

      days.push({
        date: d.toLocaleDateString('ar-EG', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        revenue,
        cashRevenue,
        instapayRevenue,
        profit,
        count: orders.length
      });
    }
    res.json(days);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch weekly data', error: error.message });
  }
});

// GET /api/orders/:id — fetch single order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('customer seller employee', 'name email role');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch order', error: error.message });
  }
});

// PATCH /api/orders/:id — update order status (admin only)
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Completed', 'Returned'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update order status', error: error.message });
  }
});

module.exports = router;
