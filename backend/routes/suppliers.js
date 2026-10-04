const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Supplier = require('../models/Supplier');
const SupplierTransaction = require('../models/SupplierTransaction');
const Transaction = require('../models/Transaction');
const Shift = require('../models/Shift');
const Product = require('../models/Product');

const StockHistory = require('../models/StockHistory');

const router = express.Router();
const ADMIN = ['admin'];

// GET /api/suppliers — list all with balance
router.get('/', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    // compute balance for each
    const result = await Promise.all(suppliers.map(async (s) => {
      const txs = await SupplierTransaction.find({ supplier: s._id });
      const products = await Product.find({
        active: { $ne: false },
        $or: [
          { supplierId: s._id },
          { supplier: s.name }
        ]
      });
      const totalPurchased = txs.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
      const totalPaid      = txs.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
      const totalReturned  = txs.filter(t => t.type === 'return').reduce((sum, t) => sum + t.amount, 0);
      const balance = totalPurchased - totalPaid - totalReturned; // صافي المبلغ المستحق للمورد بعد السدادات والمرتجعات
      
      const productCount = products.length;
      const totalPieces = products.reduce((sum, p) => sum + (p.stock || 0), 0);

      return { ...s.toObject(), totalPurchased, totalPaid, totalReturned, balance, productCount, totalPieces };
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
    const txs = await SupplierTransaction.find({ supplier: req.params.id })
      .populate('items.product', 'name sku images')
      .sort({ date: -1, createdAt: -1 });
    const totalPurchased = txs.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
    const totalPaid      = txs.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
    const totalReturned  = txs.filter(t => t.type === 'return').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalPurchased - totalPaid - totalReturned;
    res.json({ supplier, transactions: txs, totalPurchased, totalPaid, totalReturned, balance });
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

// POST /api/suppliers/:id/transactions — add purchase, payment, or return
router.post('/:id/transactions', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const { type, amount, description, reference, date, paymentSource = 'PersonalPocket' } = req.body;
    if (!['purchase', 'payment', 'cash_purchase', 'return'].includes(type)) return res.status(400).json({ message: 'Invalid type' });
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
        pairTxId: txPurchase._id,
        date: date || new Date()
      });
      await txPayment.save();

      txPurchase.pairTxId = txPayment._id;
      await txPurchase.save();

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

    // If source is StoreSafe:
    // for payment/purchase -> expense OUT
    // for return with cash refund -> deposit IN
    if (paymentSource === 'StoreSafe') {
      const openShift = await Shift.findOne({ user: req.user.id, status: 'open' });
      if (type === 'return') {
        const safeTx = new Transaction({
          amount: Number(amount),
          type: 'IN',
          category: 'Deposit',
          description: `استرداد نقدي لمرتجع مورد - ${supplier.name} ${reference ? `(مرجع: ${reference})` : ''} ${description ? `| ${description}` : ''}`,
          paymentMethod: 'Cash',
          user: req.user.id,
          shift: openShift?._id,
          referenceId: tx._id
        });
        await safeTx.save();
      } else {
        const safeTx = new Transaction({
          amount: Number(amount),
          type: 'OUT',
          category: 'Expense',
          description: `${type === 'purchase' ? 'شراء بضاعة (مورد)' : 'سداد دفعة (مورد)'} - ${supplier.name} ${reference ? `(مرجع: ${reference})` : ''} ${description ? `| ${description}` : ''}`,
          paymentMethod: 'Cash',
          user: req.user.id,
          shift: openShift?._id,
          referenceId: tx._id
        });
        await safeTx.save();
      }
    }

    res.status(201).json(tx);
  } catch (e) {
    res.status(500).json({ message: 'Unable to add transaction', error: e.message });
  }
});

// POST /api/suppliers/:id/return-products — Return products to supplier (damaged / return)
router.post('/:id/return-products', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const { items, productId, size, color, quantity, costPrice, reason = '', description = '', refundMethod = 'DeductFromBalance' } = req.body;

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'المورد غير موجود' });

    let returnList = [];
    if (Array.isArray(items) && items.length > 0) {
      returnList = items;
    } else if (productId && quantity > 0) {
      returnList = [{ productId, size, color, quantity: Number(quantity), unitPrice: costPrice, reason }];
    } else {
      return res.status(400).json({ message: 'الرجاء تحديد الأصناف المراد إرجاعها' });
    }

    let totalReturnAmount = 0;
    const processedItems = [];
    const updatedProducts = [];
    const stockHistoryRecords = [];

    const userId = (req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id)) ? req.user.id : undefined;
    const userName = req.user?.name || req.user?.email || 'Admin';

    for (const item of returnList) {
      const pId = item.productId || item.product;
      const qty = Number(item.quantity);
      if (!pId || !qty || qty <= 0) continue;

      const product = await Product.findById(pId);
      if (!product) continue;

      const itemSize = item.size || '';
      const itemColor = item.color || '';
      const unitCost = Math.max(0, Number(item.unitPrice ?? item.costPrice ?? product.costPrice ?? 0) || 0);
      const lineTotal = qty * unitCost;
      totalReturnAmount += lineTotal;

      const prevStock = product.stock || 0;
      if (product.variants && product.variants.length > 0 && (itemSize || itemColor)) {
        const v = product.variants.find(it => (it.size || '') === itemSize && (it.color || '') === itemColor);
        if (v) {
          v.stock = Math.max(0, (v.stock || 0) - qty);
        }
        product.stock = product.variants.reduce((sum, it) => sum + (it.stock || 0), 0);
      } else {
        product.stock = Math.max(0, product.stock - qty);
      }

      await product.save();
      updatedProducts.push(product);

      const itemReason = (item.reason || reason || 'تالف / عيب مصنعي').trim();

      const sh = await StockHistory.create({
        product: product._id,
        productName: product.name,
        size: itemSize,
        color: itemColor,
        variantKey: itemSize || itemColor ? `${itemSize}_${itemColor}` : '',
        changeType: 'Supplier Return',
        quantityChanged: -qty,
        previousStock: prevStock,
        newStock: product.stock,
        performedBy: userId,
        performedByName: userName,
        notes: `مرتجع للمورد (${supplier.name}) - السبب: ${itemReason}`
      });
      stockHistoryRecords.push(sh);

      processedItems.push({
        product: product._id,
        name: product.name,
        size: itemSize,
        color: itemColor,
        quantity: qty,
        unitPrice: unitCost,
        reason: itemReason
      });

      req.app.locals.io?.emit('inventory:update', product);
    }

    if (processedItems.length === 0) {
      return res.status(400).json({ message: 'فشل معالجة أي صنف من أصناف المرتجع' });
    }

    const itemNames = processedItems.map(i => `${i.name} (${i.quantity} قطعة)`).join('، ');
    const tx = new SupplierTransaction({
      supplier: supplier._id,
      type: 'return',
      amount: totalReturnAmount,
      description: description || `مرتجع بضاعة للمورد (${itemNames})`,
      paymentSource: refundMethod === 'CashToSafe' ? 'StoreSafe' : 'PersonalPocket',
      items: processedItems,
      date: new Date()
    });
    await tx.save();

    // Link referenceId in stock histories to the created transaction
    if (stockHistoryRecords.length > 0) {
      await StockHistory.updateMany(
        { _id: { $in: stockHistoryRecords.map(s => s._id) } },
        { referenceId: tx._id }
      );
    }

    if (refundMethod === 'CashToSafe' && totalReturnAmount > 0) {
      const openShift = await Shift.findOne({ user: req.user.id, status: 'open' });
      const safeTx = new Transaction({
        amount: totalReturnAmount,
        type: 'IN',
        category: 'Deposit',
        paymentMethod: 'Cash',
        description: `استرداد نقدي لمرتجع مورد (${supplier.name}) - ${itemNames}`,
        user: userId,
        shift: openShift?._id,
        referenceId: tx._id
      });
      await safeTx.save();
    }

    res.status(201).json({
      message: `تم إرجاع ${processedItems.reduce((s, i) => s + i.quantity, 0)} قطعة للمورد بنجاح وتحديث المخزون والحسابات`,
      transaction: tx,
      products: updatedProducts
    });
  } catch (err) {
    console.error('Supplier return error:', err);
    res.status(500).json({ message: 'فشل إرجاع المنتج للمورد', error: err.message });
  }
});

// PUT /api/suppliers/:id/transactions/:txId — Edit existing transaction/bill
router.put('/:id/transactions/:txId', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const { amount, type, description, reference, date, paymentSource } = req.body;
    const tx = await SupplierTransaction.findById(req.params.txId);
    if (!tx) return res.status(404).json({ message: 'العملية غير موجودة' });

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'المورد غير موجود' });

    const oldAmount = tx.amount;
    const newAmount = Number(amount !== undefined ? amount : tx.amount);

    if (newAmount <= 0) {
      return res.status(400).json({ message: 'المبلغ يجب أن يكون أكبر من صفر' });
    }

    // 1. Identify paired transaction (if cash_purchase pair)
    let pairedTx = null;
    if (tx.pairTxId) {
      pairedTx = await SupplierTransaction.findById(tx.pairTxId);
    } else {
      const oppositeType = tx.type === 'purchase' ? 'payment' : tx.type === 'payment' ? 'purchase' : null;
      if (oppositeType) {
        pairedTx = await SupplierTransaction.findOne({
          _id: { $ne: tx._id },
          supplier: tx.supplier,
          type: oppositeType,
          amount: oldAmount,
          createdAt: {
            $gte: new Date(new Date(tx.createdAt).getTime() - 60000),
            $lte: new Date(new Date(tx.createdAt).getTime() + 60000)
          }
        });
      }
    }

    // 2. Update primary transaction
    tx.amount = newAmount;
    if (type && ['purchase', 'payment', 'return'].includes(type)) {
      tx.type = type;
    }
    if (paymentSource && ['StoreSafe', 'PersonalPocket'].includes(paymentSource)) {
      tx.paymentSource = paymentSource;
    }
    if (description !== undefined) tx.description = description;
    if (reference !== undefined) tx.reference = reference;
    if (date) tx.date = new Date(date);
    await tx.save();

    // 3. Update paired transaction if exists
    if (pairedTx) {
      pairedTx.amount = newAmount;
      if (paymentSource) pairedTx.paymentSource = paymentSource;
      if (reference !== undefined) pairedTx.reference = reference;
      if (date) pairedTx.date = new Date(date);
      await pairedTx.save();
    }

    // 4. Update linked Safe transactions
    const safeTxQuery = {
      $or: [
        { referenceId: { $in: [tx._id, pairedTx?._id].filter(Boolean) } },
        {
          category: { $in: ['Expense', 'SupplierPayment', 'Deposit'] },
          amount: oldAmount,
          createdAt: {
            $gte: new Date(new Date(tx.createdAt).getTime() - 120000),
            $lte: new Date(new Date(tx.createdAt).getTime() + 120000)
          },
          description: new RegExp(supplier.name, 'i')
        }
      ]
    };

    const linkedSafeTxs = await Transaction.find(safeTxQuery);

    if (tx.paymentSource === 'StoreSafe') {
      if (linkedSafeTxs.length > 0) {
        for (const st of linkedSafeTxs) {
          st.amount = newAmount;
          st.referenceId = tx._id;
          if (description) {
            st.description = `${tx.type === 'purchase' ? 'شراء بضاعة (مورد)' : 'سداد دفعة (مورد)'} - ${supplier.name} ${reference ? `(مرجع: ${reference})` : ''} | ${description}`;
          }
          await st.save();
        }
      } else {
        // Safe transaction didn't exist yet, create it now!
        const openShift = await Shift.findOne({ status: 'open' });
        const newSafeTx = new Transaction({
          amount: newAmount,
          type: tx.type === 'return' ? 'IN' : 'OUT',
          category: 'SupplierPayment',
          paymentMethod: 'Cash',
          description: `${tx.type === 'purchase' ? 'شراء بضاعة (مورد)' : 'سداد دفعة (مورد)'} - ${supplier.name} ${reference ? `(مرجع: ${reference})` : ''} | ${description || ''}`,
          user: req.user?.id,
          shift: openShift?._id,
          referenceId: tx._id,
          createdAt: tx.date || new Date()
        });
        await newSafeTx.save();
      }
    } else if (tx.paymentSource === 'PersonalPocket') {
      // If switched from StoreSafe to PersonalPocket, delete from safe!
      if (linkedSafeTxs.length > 0) {
        await Transaction.deleteMany(safeTxQuery);
      }
    }

    // 5. Recalculate supplier totals
    const remainingTxs = await SupplierTransaction.find({ supplier: req.params.id });
    const totalPurchased = remainingTxs.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
    const totalPaid      = remainingTxs.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
    const totalReturned  = remainingTxs.filter(t => t.type === 'return').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalPurchased - totalPaid - totalReturned;

    req.app.locals.io?.emit('safe:update');
    req.app.locals.io?.emit('supplier:update', { supplierId: req.params.id });

    res.json({
      message: 'تم تعديل الفاتورة بنجاح وتحديث الحسابات والمصروفات بالخزينة',
      transaction: tx,
      totalPurchased,
      totalPaid,
      totalReturned,
      balance
    });
  } catch (e) {
    console.error('Supplier transaction edit error:', e);
    res.status(500).json({ message: 'تعذر تعديل الفاتورة', error: e.message });
  }
});

// DELETE /api/suppliers/:id/transactions/:txId — Delete transaction and clean all paired + safe records
router.delete('/:id/transactions/:txId', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const tx = await SupplierTransaction.findById(req.params.txId);
    if (!tx) return res.status(404).json({ message: 'العملية غير موجودة' });

    const supplier = await Supplier.findById(req.params.id);

    // 1. Identify any paired transaction (e.g. from cash_purchase)
    let pairedTx = null;
    if (tx.pairTxId) {
      pairedTx = await SupplierTransaction.findById(tx.pairTxId);
    } else {
      const oppositeType = tx.type === 'purchase' ? 'payment' : tx.type === 'payment' ? 'purchase' : null;
      if (oppositeType) {
        pairedTx = await SupplierTransaction.findOne({
          _id: { $ne: tx._id },
          supplier: tx.supplier,
          type: oppositeType,
          amount: tx.amount,
          createdAt: {
            $gte: new Date(new Date(tx.createdAt).getTime() - 60000),
            $lte: new Date(new Date(tx.createdAt).getTime() + 60000)
          }
        });
      }
    }

    const txIdsToDelete = [tx._id];
    if (pairedTx) txIdsToDelete.push(pairedTx._id);

    // 2. If it was a return that had items, restore stock back into inventory!
    if (tx.type === 'return' && Array.isArray(tx.items) && tx.items.length > 0) {
      const userId = (req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id)) ? req.user.id : undefined;
      const userName = req.user?.name || req.user?.email || 'Admin';

      for (const item of tx.items) {
        if (item.product && item.quantity > 0) {
          const product = await Product.findById(item.product);
          if (product) {
            const prevStock = product.stock || 0;
            const itemSize = item.size || '';
            const itemColor = item.color || '';
            if (product.variants && product.variants.length > 0 && (itemSize || itemColor)) {
              const v = product.variants.find(it => (it.size || '') === itemSize && (it.color || '') === itemColor);
              if (v) {
                v.stock = (v.stock || 0) + item.quantity;
              }
              product.stock = product.variants.reduce((sum, it) => sum + (it.stock || 0), 0);
            } else {
              product.stock = (product.stock || 0) + item.quantity;
            }
            await product.save();

            await StockHistory.create({
              product: product._id,
              productName: product.name,
              size: itemSize,
              color: itemColor,
              variantKey: itemSize || itemColor ? `${itemSize}_${itemColor}` : '',
              changeType: 'Restock',
              quantityChanged: item.quantity,
              previousStock: prevStock,
              newStock: product.stock,
              performedBy: userId,
              performedByName: userName,
              notes: `إلغاء مرتجع للمورد (${supplier?.name || ''}) - إعادة القطع للمخزن`
            });
            req.app.locals.io?.emit('inventory:update', product);
          }
        }
      }
    }

    // 3. Find and delete linked cashier safe transactions (both referenceId and description matches)
    await Transaction.deleteMany({ referenceId: { $in: txIdsToDelete } });

    if (supplier) {
      await Transaction.deleteMany({
        category: { $in: ['Expense', 'SupplierPayment', 'Deposit'] },
        amount: tx.amount,
        createdAt: {
          $gte: new Date(new Date(tx.createdAt).getTime() - 120000),
          $lte: new Date(new Date(tx.createdAt).getTime() + 120000)
        },
        description: new RegExp(supplier.name, 'i')
      });
    }

    // 4. Delete the supplier transaction records
    await SupplierTransaction.deleteMany({ _id: { $in: txIdsToDelete } });

    // 5. Recalculate supplier totals
    const remainingTxs = await SupplierTransaction.find({ supplier: req.params.id });
    const totalPurchased = remainingTxs.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
    const totalPaid      = remainingTxs.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
    const totalReturned  = remainingTxs.filter(t => t.type === 'return').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalPurchased - totalPaid - totalReturned;

    req.app.locals.io?.emit('safe:update');
    req.app.locals.io?.emit('supplier:update', { supplierId: req.params.id });

    res.json({
      message: 'تم حذف الفاتورة بنجاح وتحديث كافة الحسابات والمصروفات بالخزينة',
      deletedCount: txIdsToDelete.length,
      totalPurchased,
      totalPaid,
      totalReturned,
      balance
    });
  } catch (e) {
    console.error('Supplier transaction delete error:', e);
    res.status(500).json({ message: 'تعذر حذف العملية', error: e.message });
  }
});

// GET /api/suppliers/:id/audit-duplicates — Audit suspected duplicates for a supplier
router.get('/:id/audit-duplicates', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const txs = await SupplierTransaction.find({ supplier: req.params.id }).sort({ createdAt: 1 });
    const duplicates = [];
    const seen = [];

    for (const t of txs) {
      let isDup = false;
      let matchedTx = null;

      for (const prev of seen) {
        // Paired transactions (one purchase, one payment) are legitimate cash purchases, NOT duplicates!
        if (prev.type !== t.type) continue;

        const timeDiff = Math.abs(new Date(t.createdAt).getTime() - new Date(prev.createdAt).getTime());
        const sameRef = t.reference && t.reference.trim() && prev.reference && prev.reference.trim() === t.reference.trim();
        const sameAmountNearTime = prev.amount === t.amount && timeDiff < 300000; // within 5 minutes

        if (sameRef || sameAmountNearTime) {
          isDup = true;
          matchedTx = prev;
          break;
        }
      }

      if (isDup) {
        duplicates.push({
          duplicateTx: t,
          originalTx: matchedTx
        });
      } else {
        seen.push(t);
      }
    }

    res.json({ count: duplicates.length, duplicates });
  } catch (e) {
    res.status(500).json({ message: 'فشل فحص الفواتير المكررة', error: e.message });
  }
});

// POST /api/suppliers/:id/clean-duplicates — Automatically remove confirmed duplicates
router.post('/:id/clean-duplicates', auth, requireRole(ADMIN), async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'المورد غير موجود' });

    const txs = await SupplierTransaction.find({ supplier: req.params.id }).sort({ createdAt: 1 });
    const duplicateIds = [];
    const seen = [];

    for (const t of txs) {
      let isDup = false;

      for (const prev of seen) {
        if (prev.type !== t.type) continue;

        const timeDiff = Math.abs(new Date(t.createdAt).getTime() - new Date(prev.createdAt).getTime());
        const sameRef = t.reference && t.reference.trim() && prev.reference && prev.reference.trim() === t.reference.trim();
        const sameAmountNearTime = prev.amount === t.amount && timeDiff < 300000;

        if (sameRef || sameAmountNearTime) {
          isDup = true;
          break;
        }
      }

      if (isDup) {
        duplicateIds.push(t._id);
        if (t.pairTxId) duplicateIds.push(t.pairTxId);
      } else {
        seen.push(t);
      }
    }

    if (duplicateIds.length > 0) {
      await Transaction.deleteMany({ referenceId: { $in: duplicateIds } });
      await SupplierTransaction.deleteMany({ _id: { $in: duplicateIds } });
    }

    const remainingTxs = await SupplierTransaction.find({ supplier: req.params.id });
    const totalPurchased = remainingTxs.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
    const totalPaid      = remainingTxs.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
    const totalReturned  = remainingTxs.filter(t => t.type === 'return').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalPurchased - totalPaid - totalReturned;

    req.app.locals.io?.emit('safe:update');
    req.app.locals.io?.emit('supplier:update', { supplierId: req.params.id });

    res.json({
      message: duplicateIds.length > 0
        ? `تم تنظيف وحذف ${duplicateIds.length} معاملة مكررة بنجاح وتحديث رصيد الخزينة`
        : 'لم يتم العثور على أي فواتير مكررة، الحسابات متطابقة تماماً',
      cleanedCount: duplicateIds.length,
      totalPurchased,
      totalPaid,
      totalReturned,
      balance
    });
  } catch (e) {
    res.status(500).json({ message: 'فشل تنظيف الفواتير المكررة', error: e.message });
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
