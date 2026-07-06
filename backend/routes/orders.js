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
    const orders = await Order.find();
    const totalRevenue = orders.filter(o => o.status === 'Completed').reduce((sum, order) => sum + order.totalAmount, 0);
    const completed = orders.filter((order) => order.status === 'Completed').length;
    const returned = orders.filter((order) => order.status === 'Returned').length;
    res.json({ totalRevenue, completed, returned });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch order summary', error: error.message });
  }
});

// GET /api/orders/weekly — last 7 days revenue (for dashboard chart)
router.get('/weekly', auth, async (req, res) => {
  try {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      const orders = await Order.find({ createdAt: { $gte: d, $lte: end }, status: 'Completed' });
      const revenue = orders.reduce((s, o) => s + o.totalAmount, 0);
      const cashRevenue = orders.filter(o => o.paymentMethod === 'Cash').reduce((s, o) => s + o.totalAmount, 0);
      const instapayRevenue = orders.filter(o => o.paymentMethod === 'Instapay').reduce((s, o) => s + o.totalAmount, 0);
      days.push({
        date: d.toLocaleDateString('ar-EG', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        revenue,
        cashRevenue,
        instapayRevenue,
        count: orders.length
      });
    }
    res.json(days);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch weekly data', error: error.message });
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
