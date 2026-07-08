const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Supplier = require('../models/Supplier');
const SupplierTransaction = require('../models/SupplierTransaction');

const router = express.Router();
const ADMIN = ['admin'];

// GET /api/suppliers — list all with balance
router.get('/', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    // compute balance for each
    const result = await Promise.all(suppliers.map(async (s) => {
      const txs = await SupplierTransaction.find({ supplier: s._id });
      const totalPurchased = txs.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
      const totalPaid      = txs.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
      const balance = totalPurchased - totalPaid; // المبلغ المستحق للمورد
      return { ...s.toObject(), totalPurchased, totalPaid, balance };
    }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: 'Unable to load suppliers', error: e.message });
  }
});

// GET /api/suppliers/:id/transactions
router.get('/:id/transactions', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    const txs = await SupplierTransaction.find({ supplier: req.params.id }).sort({ date: -1 });
    const totalPurchased = txs.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
    const totalPaid      = txs.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
    res.json({ supplier, transactions: txs, totalPurchased, totalPaid, balance: totalPurchased - totalPaid });
  } catch (e) {
    res.status(500).json({ message: 'Unable to load supplier transactions', error: e.message });
  }
});

// POST /api/suppliers
router.post('/', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const supplier = new Supplier({ name, phone, email, address, notes });
    await supplier.save();
    res.status(201).json(supplier);
  } catch (e) {
    res.status(500).json({ message: 'Unable to create supplier', error: e.message });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (e) {
    res.status(500).json({ message: 'Unable to update supplier', error: e.message });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', auth, requireRole(ADMIN), async (req, res) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    await SupplierTransaction.deleteMany({ supplier: req.params.id });
    res.json({ message: 'Supplier deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Unable to delete supplier', error: e.message });
  }
});

// POST /api/suppliers/:id/transactions — add purchase or payment
router.post('/:id/transactions', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const { type, amount, description, reference, date } = req.body;
    if (!['purchase', 'payment'].includes(type)) return res.status(400).json({ message: 'Invalid type' });
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount must be positive' });
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    const tx = new SupplierTransaction({ supplier: req.params.id, type, amount: Number(amount), description, reference, date: date || new Date() });
    await tx.save();
    res.status(201).json(tx);
  } catch (e) {
    res.status(500).json({ message: 'Unable to add transaction', error: e.message });
  }
});

// DELETE /api/suppliers/:id/transactions/:txId
router.delete('/:id/transactions/:txId', auth, requireRole(ADMIN), async (req, res) => {
  try {
    await SupplierTransaction.findByIdAndDelete(req.params.txId);
    res.json({ message: 'Transaction deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Unable to delete transaction', error: e.message });
  }
});

module.exports = router;
