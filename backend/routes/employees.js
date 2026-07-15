const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Employee = require('../models/Employee');
const Order = require('../models/Order');

const router = express.Router();
const ADMIN = ['admin'];

// GET /api/employees
router.get('/', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
  try {
    const employees = await Employee.find({ active: true }).sort({ name: 1 });
    res.json(employees);
  } catch (e) {
    res.status(500).json({ message: 'Unable to load employees', error: e.message });
  }
});

// GET /api/employees/all  — includes inactive (admin only)
router.get('/all', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    const User = require('../models/User');
    
    // Attach linked user account information by matching name or phone
    const enrichedEmployees = await Promise.all(employees.map(async (emp) => {
      const user = await User.findOne({
        $or: [
          { name: emp.name },
          { phone: emp.phone && emp.phone.trim() !== '' ? emp.phone : '____non_existent____' }
        ]
      }).select('_id email');
      
      return {
        ...emp.toObject(),
        systemUser: user ? { _id: user._id, email: user.email } : null
      };
    }));

    res.json(enrichedEmployees);
  } catch (e) {
    res.status(500).json({ message: 'Unable to load employees', error: e.message });
  }
});

// GET /api/employees/:id/stats — sales stats for one employee
router.get('/:id/stats', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const { from, to } = req.query;
    const { Types } = require('mongoose');
    const match = { employee: new Types.ObjectId(req.params.id) };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to)   match.createdAt.$lte = new Date(to + 'T23:59:59');
    }
    const allOrders = await Order.find(match).sort({ createdAt: -1 });

    const completedOrders = allOrders.filter(o => o.status === 'Completed');
    const returnedOrders = allOrders.filter(o => o.status === 'Returned');

    const totalSales = completedOrders.reduce((s, o) => s + o.totalAmount, 0);
    const cashSales = completedOrders.filter(o => o.paymentMethod === 'Cash').reduce((s, o) => s + o.totalAmount, 0);
    const instaSales = completedOrders.filter(o => o.paymentMethod !== 'Cash').reduce((s, o) => s + o.totalAmount, 0);

    const returnedAmount = returnedOrders.reduce((s, o) => s + o.totalAmount, 0);

    // ─── Net Profit ────────────────────────────────────────────────────
    const netProfit = completedOrders.reduce((sum, order) => {
      const orderProfit = order.items.reduce((s, item) => {
        return s + ((item.price - (item.costPrice || 0)) * item.quantity);
      }, 0);
      return sum + orderProfit - (order.discount || 0);
    }, 0);

    // ─── Profit Margin % ───────────────────────────────────────────────
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0;

    // ─── Average Order Value ───────────────────────────────────────────
    const avgOrderValue = completedOrders.length > 0 ? totalSales / completedOrders.length : 0;

    // ─── Total Items Sold ──────────────────────────────────────────────
    const totalItemsSold = completedOrders.reduce((sum, o) => {
      return sum + o.items.reduce((s, i) => s + i.quantity, 0);
    }, 0);

    // ─── Category Breakdown & Top Category ─────────────────────────────
    const categorySales = {};
    completedOrders.forEach(o => {
      o.items.forEach(i => {
        const qty = i.quantity - (i.returnedQuantity || 0);
        if (qty > 0) {
          if (!categorySales[i.category]) {
            categorySales[i.category] = { qty: 0, amount: 0 };
          }
          categorySales[i.category].qty += qty;
          categorySales[i.category].amount += qty * i.price;
        }
      });
    });
    const categoryBreakdown = Object.entries(categorySales)
      .map(([category, data]) => ({ category, qty: data.qty, amount: data.amount }))
      .sort((a, b) => b.qty - a.qty);

    const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

    // ─── Contribution % (compared to all employees in same period) ────
    const globalMatch = {};
    if (from || to) {
      globalMatch.createdAt = {};
      if (from) globalMatch.createdAt.$gte = new Date(from);
      if (to)   globalMatch.createdAt.$lte = new Date(to + 'T23:59:59');
    }
    globalMatch.status = 'Completed';
    const globalTotal = await Order.aggregate([
      { $match: globalMatch },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const allSalesTotal = globalTotal.length > 0 ? globalTotal[0].total : 0;
    const contributionPercent = allSalesTotal > 0 ? ((totalSales / allSalesTotal) * 100).toFixed(1) : 0;

    res.json({
      orders: allOrders,
      count: completedOrders.length,
      totalSales,
      cashSales,
      instaSales,
      returnedCount: returnedOrders.length,
      returnedAmount,
      netProfit,
      profitMargin: Number(profitMargin),
      avgOrderValue,
      totalItemsSold,
      categoryBreakdown,
      topCategory,
      contributionPercent: Number(contributionPercent)
    });
  } catch (e) {
    res.status(500).json({ message: 'Unable to load stats', error: e.message });
  }
});

// GET /api/employees/comparison — comparison stats for all employees
router.get('/comparison', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const { from, to } = req.query;
    const match = { 
      status: 'Completed',
      $or: [
        { employee: { $ne: null } },
        { employeeName: { $ne: '' } }
      ]
    };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to)   match.createdAt.$lte = new Date(to + 'T23:59:59');
    }
    const orders = await Order.find(match).populate('employee');

    const empData = {};
    orders.forEach(o => {
      const name = o.employeeName || (o.employee && o.employee.name);
      if (!name) return;
      
      if (!empData[name]) {
        empData[name] = { sales: 0, profit: 0, orderCount: 0, itemsSold: 0, categories: {} };
      }
      const emp = empData[name];
      emp.sales += o.totalAmount;
      emp.orderCount += 1;
      const orderProfit = o.items.reduce((s, item) => s + ((item.price - (item.costPrice || 0)) * item.quantity), 0);
      emp.profit += orderProfit - (o.discount || 0);
      o.items.forEach(item => {
        const qty = item.quantity - (item.returnedQuantity || 0);
        if (qty > 0) {
          emp.itemsSold += qty;
          emp.categories[item.category] = (emp.categories[item.category] || 0) + qty;
        }
      });
    });

    const comparison = Object.entries(empData)
      .map(([name, data]) => {
        const topCatEntry = Object.entries(data.categories).sort((a, b) => b[1] - a[1])[0];
        return {
          name,
          sales: data.sales,
          profit: data.profit,
          orderCount: data.orderCount,
          itemsSold: data.itemsSold,
          avgOrder: data.orderCount > 0 ? Math.round(data.sales / data.orderCount) : 0,
          topCategory: topCatEntry ? { category: topCatEntry[0], qty: topCatEntry[1] } : null
        };
      })
      .sort((a, b) => b.sales - a.sales);

    res.json(comparison);
  } catch (e) {
    res.status(500).json({ message: 'Unable to load comparison', error: e.message });
  }
});

// POST /api/employees
router.post('/', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const { name, phone, notes, startDate } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const emp = new Employee({ name, phone, notes, startDate });
    await emp.save();
    res.status(201).json(emp);
  } catch (e) {
    res.status(500).json({ message: 'Unable to create employee', error: e.message });
  }
});

// PUT /api/employees/:id
router.put('/:id', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    res.json(emp);
  } catch (e) {
    res.status(500).json({ message: 'Unable to update employee', error: e.message });
  }
});

// PATCH /api/employees/:id/toggle — activate/deactivate
router.patch('/:id/toggle', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    emp.active = !emp.active;
    await emp.save();
    res.json(emp);
  } catch (e) {
    res.status(500).json({ message: 'Unable to toggle employee', error: e.message });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', auth, requireRole(ADMIN), async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Employee deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Unable to delete employee', error: e.message });
  }
});

module.exports = router;
