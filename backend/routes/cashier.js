const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Shift = require('../models/Shift');
const Customer = require('../models/Customer');

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
    const cleanId = req.params.id.trim();
    let order = null;
    
    if (cleanId.length === 24 && /^[0-9a-fA-F]{24}$/.test(cleanId)) {
      order = await Order.findById(cleanId);
    } else if (cleanId.length === 6) {
      order = await Order.findOne({
        $expr: {
          $eq: [
            { $strcasecmp: [ { $substrCP: [ { $toString: "$_id" }, 18, 6 ] }, cleanId ] },
            0
          ]
        }
      }).sort({ createdAt: -1 });
    }

    if (!order) return res.status(404).json({ message: 'لم يُعثر على طلب بهذا الرقم أو الكود' });
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

// GET /api/cashier/activities — get combined activities for timeline
router.get('/activities', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
  try {
    const { from, to } = req.query;
    let startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    let endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    if (from) {
      startOfDay = new Date(from + 'T00:00:00');
    }
    if (to) {
      endOfDay = new Date(to + 'T23:59:59');
    }

    const dateQuery = { createdAt: { $gte: startOfDay, $lte: endOfDay } };

    const StockHistory = require('../models/StockHistory');

    const [orders, transactions, stockHistory, shifts] = await Promise.all([
      Order.find(dateQuery).populate('seller', 'name').populate('employee', 'name').lean(),
      Transaction.find(dateQuery).populate('user', 'name').lean(),
      StockHistory.find(dateQuery).populate('performedBy', 'name').lean(),
      Shift.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } }).populate('user', 'name').lean()
    ]);

    const activities = [];

    // 1. Process Orders
    orders.forEach(order => {
      activities.push({
        id: `order-${order._id}`,
        timestamp: order.createdAt,
        type: 'sale',
        user: order.seller?.name || order.employeeName || 'غير معروف',
        title: `عملية بيع ${order.type === 'Offline' ? 'كاشير' : 'أونلاين'}${order.customerName ? ` (لـ ${order.customerName})` : ''}`,
        description: order.items.map(i => `${i.name} (${i.size || '-'}/${i.color || '-'}) ×${i.quantity}`).join('، '),
        amount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        referenceId: order._id,
        status: order.status,
        notes: order.notes || ''
      });
    });

    // 2. Process Transactions (Expenses, Deposits, Safe Transfers, Shift opens/closes, Refunds)
    transactions.forEach(t => {
      if (t.category === 'Sale') return; // order sale already shows this

      let typeLabel = t.category;
      if (t.category === 'Refund') typeLabel = 'مرتجع مال';
      else if (t.category === 'Deposit') typeLabel = 'إيداع نقدي';
      else if (t.category === 'Safe Transfer') typeLabel = 'تحويل للخزينة الرئيسية';
      else if (t.category === 'Expense') typeLabel = 'مصروف';
      else if (t.category === 'ShiftOpen') typeLabel = 'رصيد افتتاحي للوردية';
      else if (t.category === 'ShiftClose') typeLabel = 'تصفية الوردية عند الإغلاق';
      else if (t.category === 'DebtPayment') typeLabel = 'سداد دين عميل';
      else if (t.category === 'Other') typeLabel = 'حركة خزينة أخرى';

      activities.push({
        id: `tx-${t._id}`,
        timestamp: t.createdAt,
        type: t.category.toLowerCase() === 'expense' ? 'expense' : t.category.toLowerCase() === 'refund' ? 'refund' : t.category.toLowerCase() === 'debtpayment' ? 'deposit' : 'safe_movement',
        user: t.user?.name || 'غير معروف',
        title: `حركة خزينة: ${typeLabel}`,
        description: t.description || '',
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        referenceId: t.referenceId || t._id,
        direction: t.type // 'IN' or 'OUT'
      });
    });

    // 3. Process Stock History (Filter out 'POS Sale' & 'Refund' to avoid redundancy, show only manual adjustments & counts)
    stockHistory.forEach(sh => {
      if (sh.changeType === 'POS Sale' || sh.changeType === 'Refund') return;

      activities.push({
        id: `stock-${sh._id}`,
        timestamp: sh.createdAt,
        type: 'stock_adjustment',
        user: sh.performedBy?.name || sh.performedByName || 'غير معروف',
        title: sh.changeType === 'Manual Adjustment' ? 'تعديل يدوي للمخزون' : 'جرد المخزون',
        description: `تغيير كمية ${sh.productName} (${sh.size || '-'}/${sh.color || '-'}) بمقدار ${sh.quantityChanged > 0 ? '+' : ''}${sh.quantityChanged} (المخزون السابق: ${sh.previousStock} -> الجديد: ${sh.newStock})`,
        amount: sh.quantityChanged,
        referenceId: sh.referenceId || sh.product,
        notes: sh.notes || ''
      });
    });

    // 4. Process Shifts
    shifts.forEach(shift => {
      activities.push({
        id: `shift-open-${shift._id}`,
        timestamp: shift.createdAt,
        type: 'shift_open',
        user: shift.user?.name || 'غير معروف',
        title: `فتح وردية جديدة`,
        description: `تم فتح وردية بمبلغ افتتاحي ${shift.openingBalance} ج.م`,
        amount: shift.openingBalance,
        referenceId: shift._id
      });
      
      if (shift.status === 'closed' && shift.closedAt) {
        activities.push({
          id: `shift-close-${shift._id}`,
          timestamp: shift.closedAt,
          type: 'shift_close',
          user: shift.user?.name || 'غير معروف',
          title: `إغلاق وردية`,
          description: `تم إغلاق الوردية. الرصيد الفعلي: ${shift.closingBalance} ج.م (المتوقع: ${shift.expectedCash} ج.م) · الفرق: ${shift.variance >= 0 ? '+' : ''}${shift.variance} ج.م`,
          amount: shift.closingBalance,
          referenceId: shift._id
        });
      }
    });

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load system activities', error: error.message });
  }
});

// GET /api/cashier/debts — get all customers with outstanding debts
router.get('/debts', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
  try {
    const orders = await Order.find({ isDebt: true, debtAmount: { $gt: 0 } }).sort({ createdAt: -1 });
    const debtsMap = {};

    orders.forEach(order => {
      const key = order.customerPhone || order.customerName || 'unknown';
      if (!debtsMap[key]) {
        debtsMap[key] = {
          name: order.customerName || 'عميل غير معروف',
          phone: order.customerPhone || 'بدون هاتف',
          totalDebt: 0,
          ordersCount: 0,
          lastActivity: order.createdAt,
          orders: []
        };
      }

      debtsMap[key].totalDebt += order.debtAmount;
      debtsMap[key].ordersCount += 1;
      debtsMap[key].orders.push({
        _id: order._id,
        totalAmount: order.totalAmount,
        amountPaid: order.amountPaid,
        debtAmount: order.debtAmount,
        createdAt: order.createdAt,
        isManual: order.items && order.items.length === 0,
        notes: order.notes
      });

      if (new Date(order.createdAt) > new Date(debtsMap[key].lastActivity)) {
        debtsMap[key].lastActivity = order.createdAt;
      }
    });

    res.json(Object.values(debtsMap).sort((a, b) => b.totalDebt - a.totalDebt));
  } catch (error) {
    res.status(500).json({ message: 'Unable to load debts', error: error.message });
  }
});

// POST /api/cashier/debts/manual — Add a manual debt to a customer
router.post('/debts/manual', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
  try {
    const { customerName, customerPhone, amount, notes = '' } = req.body;
    if (!customerPhone || !customerPhone.trim()) {
      return res.status(400).json({ message: 'Customer phone is required' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid debt amount' });
    }

    const cleanPhone = customerPhone.trim();
    const cleanName = customerName ? customerName.trim() : 'عميل غير معروف';

    let dbCustomer = await Customer.findOne({ phone: cleanPhone });
    if (!dbCustomer) {
      dbCustomer = new Customer({
        name: cleanName,
        phone: cleanPhone,
        points: 0,
        debt: 0
      });
    } else {
      if (customerName && customerName.trim() !== '') {
        dbCustomer.name = cleanName;
      }
    }
    
    const debtAmount = Number(amount);
    dbCustomer.debt += debtAmount;
    await dbCustomer.save();

    // Create a pseudo-order to represent the manual debt
    const order = new Order({
      customer: dbCustomer._id,
      customerName: dbCustomer.name,
      customerPhone: dbCustomer.phone,
      seller: req.user.id,
      items: [], // Empty items indicates manual debt
      totalAmount: debtAmount,
      discount: 0,
      type: 'Offline',
      status: 'Completed',
      paymentMethod: 'Cash',
      notes: `تسجيل دين يدوي: ${notes}`,
      isDebt: true,
      amountPaid: 0,
      debtAmount: debtAmount
    });
    await order.save();

    res.status(201).json({ message: 'Manual debt added successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add manual debt', error: error.message });
  }
});

// POST /api/cashier/debts/pay — record a debt payment
router.post('/debts/pay', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
  try {
    const { customerPhone, customerName, amount, paymentMethod = 'Cash', notes = '' } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    // Find all outstanding debt orders for this customer (prefer phone, fallback to name)
    const query = { isDebt: true, debtAmount: { $gt: 0 } };
    if (customerPhone && customerPhone !== 'بدون هاتف') {
      query.customerPhone = customerPhone;
    } else if (customerName) {
      query.customerName = customerName;
    } else {
      return res.status(400).json({ message: 'Customer phone or name is required' });
    }

    const orders = await Order.find(query).sort({ createdAt: 1 }); // oldest first
    if (orders.length === 0) {
      return res.status(404).json({ message: 'No active debts found for this customer' });
    }

    let remainingPayment = Number(amount);
    const openShift = await Shift.findOne({ user: req.user.id, status: 'open' });
    const updatedOrders = [];

    for (let order of orders) {
      if (remainingPayment <= 0) break;

      const debtToPay = Math.min(order.debtAmount, remainingPayment);
      order.debtAmount -= debtToPay;
      order.amountPaid += debtToPay;
      remainingPayment -= debtToPay;

      await order.save();
      updatedOrders.push(order);

      // Log transaction for the safe/drawer
      const transaction = new Transaction({
        amount: debtToPay,
        type: 'IN',
        category: 'DebtPayment',
        paymentMethod,
        description: `سداد جزء من دين الفاتورة #${order._id.toString().slice(-6).toUpperCase()} للعميل ${customerName || customerPhone}`,
        referenceId: order._id,
        user: req.user.id,
        shift: openShift?._id
      });
      await transaction.save();
    }

    // Update Customer record debt too
    if (customerPhone && customerPhone !== 'بدون هاتف') {
      const dbCust = await Customer.findOne({ phone: customerPhone });
      if (dbCust) {
        dbCust.debt = Math.max(0, dbCust.debt - Number(amount));
        await dbCust.save();
      }
    } else if (customerName) {
      const dbCust = await Customer.findOne({ name: customerName });
      if (dbCust) {
        dbCust.debt = Math.max(0, dbCust.debt - Number(amount));
        await dbCust.save();
      }
    }

    res.json({ message: 'Payment recorded successfully', updatedOrders, change: remainingPayment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to record payment', error: error.message });
  }
});

module.exports = router;
