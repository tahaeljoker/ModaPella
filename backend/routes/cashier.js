const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Shift = require('../models/Shift');

const router = express.Router();

// GET /api/cashier/today — sales made today (cashier + admin)
router.get('/today', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: -1 });

    const totalRevenue = orders
      .filter((o) => o.status === 'Completed')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    res.json({ orders, totalRevenue, count: orders.length });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load today\'s sales', error: error.message });
  }
});

// GET /api/cashier/inventory — all products with stock info (cashier + admin)
router.get('/inventory', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
  try {
    const products = await Product.find({ active: true }).sort({ name: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load inventory', error: error.message });
  }
});

// GET /api/cashier/orders/:id — single order detail for returns
router.get('/orders/:id', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load order', error: error.message });
  }
});

// ─── Safe & Cash Tracking ──────────────────────────────────────────────────

// GET /api/cashier/safe — get today's safe transactions and totals
router.get('/safe', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await Transaction.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).populate('user', 'name').sort({ createdAt: -1 });

    console.log('--- DEBUG: Transactions Found in /safe route ---');
    console.log(JSON.stringify(transactions, null, 2));
    console.log('------------------------------------------------');

    const todayOrders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'Completed'
    });

    const recentShifts = await Shift.find({ status: 'closed' })
      .populate('user', 'name')
      .sort({ closedAt: -1 })
      .limit(8);

    let cashDrawer = 0;
    let instapayTotal = 0;
    let expenses = 0;

    transactions.forEach(t => {
      if (t.paymentMethod === 'Cash') {
        if (t.type === 'IN') cashDrawer += t.amount;
        if (t.type === 'OUT') cashDrawer -= t.amount;
        if (t.type === 'OUT' && t.category === 'Expense') expenses += t.amount;
      } else if (t.paymentMethod === 'Instapay' || t.paymentMethod === 'Wallet') {
        if (t.type === 'IN') instapayTotal += t.amount;
        if (t.type === 'OUT') instapayTotal -= t.amount;
      }
    });

    const cashSales = todayOrders
      .filter(order => order.paymentMethod === 'Cash')
      .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    const instapaySales = todayOrders
      .filter(order => order.paymentMethod === 'Instapay' || order.paymentMethod === 'Wallet')
      .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    const netCashInSafe = cashSales - expenses;

    res.json({
      transactions,
      summary: { cashDrawer, instapayTotal, expenses, expectedCash: cashDrawer },
      todaySummary: {
        cashSales,
        instapaySales,
        expenses,
        netCashInSafe
      },
      recentShifts
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load safe data', error: error.message });
  }
});

// POST /api/cashier/safe/transaction — add manual expense or deposit
router.post('/safe/transaction', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
  try {
    const { amount, type, category, description } = req.body;
    // attach to current open shift if exists
    const openShift = await Shift.findOne({ user: req.user.id, status: 'open' });
    const transaction = new Transaction({
      amount: Number(amount),
      type,
      category,
      paymentMethod: 'Cash', // Manual safe movements are always Cash (drawer)
      description,
      user: req.user.id,
      shift: openShift?._id
    });
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Unable to add transaction', error: error.message });
  }
});

// POST /api/cashier/safe/close-shift — clear the safe (End of Shift)
router.post('/safe/close-shift', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
  try {
    const { amount } = req.body; // Expected amount to withdraw
    if (amount > 0) {
      const transaction = new Transaction({
        amount: Number(amount),
        type: 'OUT',
        category: 'Other',
        paymentMethod: 'Cash',
        description: 'تقفيل وردية - تصفية الدرج',
        user: req.user.id
      });
      await transaction.save();
    }
    res.json({ message: 'Shift closed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to close shift', error: error.message });
  }
});

// ─── Shift endpoints ─────────────────────────────────────────────────────
// POST /api/cashier/shift/open { openingBalance }
router.post('/shift/open', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
  try {
    const { openingBalance = 0 } = req.body;
    // prevent opening if one already open for this user
    const existing = await Shift.findOne({ user: req.user.id, status: 'open' });
    if (existing) return res.status(400).json({ message: 'Shift already open' });
    const shift = new Shift({ user: req.user.id, openingBalance: Number(openingBalance) });
    await shift.save();
    // if opening balance provided, log it as an IN transaction (cash deposit)
    if (Number(openingBalance) > 0) {
      const openTx = new Transaction({
        amount: Number(openingBalance),
        type: 'IN',
        category: 'ShiftOpen',
        paymentMethod: 'Cash',
        description: `فتح وردية - رصيد افتتاحي ${shift._id}`,
        user: req.user.id,
        shift: shift._id
      });
      await openTx.save();
    }
    res.status(201).json(shift);
  } catch (error) {
    res.status(500).json({ message: 'Unable to open shift', error: error.message });
  }
});

// GET /api/cashier/shift/current
router.get('/shift/current', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
  try {
    const shift = await Shift.findOne({ user: req.user.id, status: 'open' });
    if (!shift) return res.json({ shift: null });

    // compute expected cash for current shift
    const txs = await Transaction.find({ shift: shift._id });
    let cashIn = 0, cashOut = 0;
    txs.forEach(t => {
      if (t.paymentMethod === 'Cash') {
        if (t.category === 'ShiftOpen' || t.category === 'ShiftClose') return;
        if (t.type === 'IN') cashIn += t.amount;
        if (t.type === 'OUT') cashOut += t.amount;
      }
    });
    const expected = (shift.openingBalance || 0) + cashIn - cashOut;
    shift.expectedCash = expected;
    await shift.save();

    res.json({ shift, transactions: txs, expectedCash: expected });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load current shift', error: error.message });
  }
});

// POST /api/cashier/shift/close { countedCash }
router.post('/shift/close', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
  try {
    const { countedCash = 0 } = req.body;
    const shift = await Shift.findOne({ user: req.user.id, status: 'open' });
    if (!shift) return res.status(400).json({ message: 'No open shift' });

    const txs = await Transaction.find({ shift: shift._id });
    let cashIn = 0, cashOut = 0;
    txs.forEach(t => {
      if (t.paymentMethod === 'Cash') {
        if (t.category === 'ShiftOpen' || t.category === 'ShiftClose') return;
        if (t.type === 'IN') cashIn += t.amount;
        if (t.type === 'OUT') cashOut += t.amount;
      }
    });
    const expected = (shift.openingBalance || 0) + cashIn - cashOut;
    shift.expectedCash = expected;
    shift.closingBalance = Number(countedCash);
    shift.variance = Number(countedCash) - expected;
    shift.closedAt = new Date();
    shift.status = 'closed';
    await shift.save();

    // optionally log a transaction for the cash removal (OUT)
    if (Number(countedCash) > 0) {
      const closingTx = new Transaction({
        amount: Number(countedCash),
        type: 'OUT',
        category: 'ShiftClose',
        paymentMethod: 'Cash',
        description: `تقفيل وردية - سحب نقدي ${shift._id}`,
        user: req.user.id,
        shift: shift._id
      });
      await closingTx.save();
    }

    res.json({ shift, expectedCash: expected, variance: shift.variance, message: 'Shift closed' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to close shift', error: error.message });
  }
});

module.exports = router;
