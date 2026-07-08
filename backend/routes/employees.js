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
    res.json(employees);
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

    res.json({
      orders: allOrders,
      count: completedOrders.length,
      totalSales,
      cashSales,
      instaSales,
      returnedCount: returnedOrders.length,
      returnedAmount
    });
  } catch (e) {
    res.status(500).json({ message: 'Unable to load stats', error: e.message });
  }
});

// POST /api/employees
router.post('/', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const { name, phone, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const emp = new Employee({ name, phone, notes });
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
