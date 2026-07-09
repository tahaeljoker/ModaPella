const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Supplier = require('../models/Supplier');
const SupplierTransaction = require('../models/SupplierTransaction');
const Transaction = require('../models/Transaction');
const Shift = require('../models/Shift');
const Product = require('../models/Product');

const router = express.Router();
const ADMIN = ['admin'];

// GET /api/suppliers — list all with balance
router.get('/', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    // compute balance for each
    const result = await Promise.all(suppliers.map(async (s) => {
      const txs = await SupplierTransaction.find({ supplier: s._id });
      const products = await Product.find({ supplier: s.name, active: { $ne: false } });
      const totalPurchased = txs.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
      const totalPaid      = txs.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
      const balance = totalPurchased - totalPaid; // المبلغ المستحق للمورد
      
      const productCount = products.length;
      const totalPieces = products.reduce((sum, p) => sum + (p.stock || 0), 0);

      return { ...s.toObject(), totalPurchased, totalPaid, balance, productCount, totalPieces };
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
    const { type, amount, description, reference, date, paymentSource = 'PersonalPocket' } = req.body;
    if (!['purchase', 'payment', 'cash_purchase'].includes(type)) return res.status(400).json({ message: 'Invalid type' });
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount must be positive' });
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    
    if (type === 'cash_purchase') {
      const txPurchase = new SupplierTransaction({
        supplier: req.params.id,
        type: 'purchase',
        amount: Number(amount),
        description: description ? `${description} (شراء نقدي فوري)` : 'شراء نقدي فوري',
        reference,
        paymentSource,
        date: date || new Date()
      });
      await txPurchase.save();

      const txPayment = new SupplierTransaction({
        supplier: req.params.id,
        type: 'payment',
        amount: Number(amount),
        description: description ? `${description} (شراء نقدي فوري)` : 'شراء نقدي فوري',
        reference,
        paymentSource,
        date: date || new Date()
      });
      await txPayment.save();

      if (paymentSource === 'StoreSafe') {
        const openShift = await Shift.findOne({ user: req.user.id, status: 'open' });
        const safeTx = new Transaction({
          amount: Number(amount),
          type: 'OUT',
          category: 'Expense',
          paymentMethod: 'Cash',
          description: `شراء نقدي فوري (مورد) - ${supplier.name} ${reference ? `(مرجع: ${reference})` : ''} ${description ? `| ${description}` : ''}`,
          user: req.user.id,
          shift: openShift?._id,
          referenceId: txPayment._id
        });
        await safeTx.save();
      }

      return res.status(201).json(txPurchase);
    }

    const tx = new SupplierTransaction({
      supplier: req.params.id,
      type,
      amount: Number(amount),
      description,
      reference,
      paymentSource,
      date: date || new Date()
    });
    await tx.save();

    // If source is StoreSafe, sync to Cashier Safe as an expense OUT
    if (paymentSource === 'StoreSafe') {
      const openShift = await Shift.findOne({ user: req.user.id, status: 'open' });
      const safeTx = new Transaction({
        amount: Number(amount),
        type: 'OUT',
        category: 'Expense', // Treat as cashier expense
        description: `${type === 'purchase' ? 'شراء بضاعة (مورد)' : 'سداد دفعة (مورد)'} - ${supplier.name} ${reference ? `(مرجع: ${reference})` : ''} ${description ? `| ${description}` : ''}`,
        paymentMethod: 'Cash',
        user: req.user.id,
        shift: openShift?._id,
        referenceId: tx._id // Link to SupplierTransaction
      });
      await safeTx.save();
    }

    res.status(201).json(tx);
  } catch (e) {
    res.status(500).json({ message: 'Unable to add transaction', error: e.message });
  }
});

// DELETE /api/suppliers/:id/transactions/:txId
router.delete('/:id/transactions/:txId', auth, requireRole(ADMIN), async (req, res) => {
  try {
    await SupplierTransaction.findByIdAndDelete(req.params.txId);
    
    // Also delete any linked cashier safe transaction
    await Transaction.deleteMany({ referenceId: req.params.txId });
    
    res.json({ message: 'Transaction deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Unable to delete transaction', error: e.message });
  }
});

// GET /api/suppliers/:id/products — get all products linked to this supplier
router.get('/:id/products', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    // Support both supplierId (ObjectId) and legacy name-based matching
    const products = await Product.find({
      active: true,
      $or: [
        { supplierId: req.params.id },
        { supplier: supplier.name }
      ]
    }).sort({ createdAt: -1 });

    res.json(products);
  } catch (e) {
    res.status(500).json({ message: 'Unable to load supplier products', error: e.message });
  }
});

module.exports = router;
