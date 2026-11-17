const express = require('express');
const mongoose = require('mongoose');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const Transaction = require('../../models/Transaction');
const Shift = require('../../models/Shift');
const Order = require('../../models/Order');
const InventoryTask = require('../../models/InventoryTask');
const InventoryCount = require('../../models/InventoryCount');
const Supplier = require('../../models/Supplier');
const SupplierTransaction = require('../../models/SupplierTransaction');
const Product = require('../../models/Product');

const router = express.Router();

router.post('/reset-transactions-prod', auth, requireRole(['admin']), async (req, res) => {
  try {
    const txRes = await Transaction.deleteMany({});
    const shiftRes = await Shift.deleteMany({});
    const orderRes = await Order.deleteMany({});
    
    // Reset product sold counters
    await Product.updateMany({}, { $set: { sold: 0 } });

    res.json({
      message: 'Production database transactions reset successfully',
      deletedTransactions: txRes.deletedCount,
      deletedShifts: shiftRes.deletedCount,
      deletedOrders: orderRes.deletedCount
    });
  } catch (e) {
    res.status(500).json({ message: 'Reset failed', error: e.message });
  }
});

// TEMPORARY: Delete all inventory tasks and counts (training data cleanup)
router.delete('/reset-inventory-tasks', auth, requireRole(['admin']), async (req, res) => {
  try {
    const tasksRes = await InventoryTask.deleteMany({});
    const countsRes = await InventoryCount.deleteMany({});
    res.json({
      message: 'تم حذف جميع التكاليف والجردات بنجاح',
      deletedTasks: tasksRes.deletedCount,
      deletedCounts: countsRes.deletedCount
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed', error: e.message });
  }
});

// POST /api/admin/heal-records — One-click sync & heal past supplier bills and misclassified/duplicate expenses
router.post('/heal-records', auth, requireRole(['admin']), async (req, res) => {
  try {
    const report = {
      suppliersMerged: 0,
      chemiseBillsLinked: 0,
      chemiseActivated: 0,
      duplicateGlassExpensesCleaned: 0,
      expensesReclassified: 0
    };

    // 1. Fix duplicate glass cleaning / 350 EGP transactions
    // Find all OUT transactions with description matching glass or amount 350 with cleaning category
    const glassTxs = await Transaction.find({
      type: 'OUT',
      $or: [
        { description: /زجاج/i },
        {
          amount: 350,
          $or: [
            { category: /نظافة|نضاف/i },
            { description: /زجاج|نضاف|تنظيف|واجهة/i },
            { description: { $exists: false } },
            { description: '' }
          ]
        }
      ]
    }).sort({ createdAt: 1 });

    if (glassTxs.length > 1) {
      // Keep the first one, delete duplicate identical ones
      const firstTx = glassTxs[0];
      firstTx.category = 'نظافة';
      if (!firstTx.description || firstTx.description.trim() === '') {
        firstTx.description = 'نظافة وتلميع زجاج المحل';
      }
      await firstTx.save();
      report.expensesReclassified++;

      for (let i = 1; i < glassTxs.length; i++) {
        const dup = glassTxs[i];
        await Transaction.findByIdAndDelete(dup._id);
        report.duplicateGlassExpensesCleaned++;
      }
    } else if (glassTxs.length === 1) {
      const tx = glassTxs[0];
      if (tx.category !== 'نظافة') {
        tx.category = 'نظافة';
        await tx.save();
        report.expensesReclassified++;
      }
    }

    // 2. Fix all transactions misclassified because of 'ادمن' or 'ادم' (excluding any goods/suppliers/chemise)
    const misclassifiedAdminTxs = await Transaction.find({
      type: 'OUT',
      description: /ادمن|الادمن/i,
      category: { $in: ['personalwithdrawal', 'مسحوبات شخصية', 'مسحوبات شخصية / جمعية'] },
      $and: [
        { description: { $not: /شميز|بضاعة|مورد|148|كارفن|جيبة/i } }
      ]
    });
    for (const mTx of misclassifiedAdminTxs) {
      mTx.category = 'مصروف تشغيل';
      await mTx.save();
      report.expensesReclassified++;
    }

    // 3. Clean up any auto-generated supplier transactions for OLD chemises (not 148)
    const oldChemiseSupplierTxs = await SupplierTransaction.find({
      $or: [
        { description: /فاتورة بضاعة.*شميز/i },
        { description: /سداد فاتورة بضاعة.*شميز/i }
      ],
      description: { $not: /148/ }
    });

    for (const ost of oldChemiseSupplierTxs) {
      await Transaction.updateMany({ referenceId: ost._id }, { $unset: { referenceId: 1 } });
      await SupplierTransaction.findByIdAndDelete(ost._id);
      report.oldChemiseTransactionsCleaned = (report.oldChemiseTransactionsCleaned || 0) + 1;
    }

    // 3.5. Clean up phantom ShiftClose OUT transactions that drained the safe drawer into negative numbers
    const shiftCloseTxs = await Transaction.find({ category: 'ShiftClose' });
    if (shiftCloseTxs.length > 0) {
      report.shiftCloseTransactionsCleaned = shiftCloseTxs.length;
      await Transaction.deleteMany({ category: 'ShiftClose' });
    }

    // 4. Specifically find and handle ONLY the target product: "شميز مشجر 148" (or matching 148 / مشجر)
    let targetProduct = await Product.findOne({
      $or: [
        { name: /148/i },
        { barcode: /148/i },
        { sku: /148/i },
        { name: /شميز.*مشجر|مشجر.*شميز/i }
      ]
    });
    if (!targetProduct) {
      targetProduct = await Product.findOne({ name: /مشجر/i });
    }
    if (!targetProduct) {
      targetProduct = await Product.findOne({ name: /شميز/i });
    }

    if (targetProduct) {
      if (targetProduct.isSeasonArchived) {
        targetProduct.isSeasonArchived = false;
        await targetProduct.save();
        report.chemiseActivated++;
      }

      // Check supplier for this product
      let supplierDoc = null;
      if (targetProduct.supplierId && mongoose.Types.ObjectId.isValid(targetProduct.supplierId)) {
        supplierDoc = await Supplier.findById(targetProduct.supplierId);
      }
      if (!supplierDoc && targetProduct.supplier && targetProduct.supplier.trim()) {
        const rawName = targetProduct.supplier.trim();
        supplierDoc = await Supplier.findOne({ name: rawName });
        if (!supplierDoc) {
          const escaped = rawName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
            .replace(/[أإآا]/g, '[أإآا]')
            .replace(/[ةه]/g, '[ةه]')
            .replace(/[ىي]/g, '[ىي]')
            .replace(/\s+/g, '\\s+');
          supplierDoc = await Supplier.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
        }
      }
      if (!supplierDoc) {
        supplierDoc = await Supplier.findOne({ name: /كارفن/i });
      }
      if (!supplierDoc) {
        supplierDoc = await Supplier.findOne({ active: { $ne: false } }).sort({ createdAt: 1 });
      }
      if (!supplierDoc) {
        supplierDoc = await Supplier.findOne().sort({ createdAt: 1 });
      }

      if (supplierDoc) {
        if (!targetProduct.supplierId || targetProduct.supplierId.toString() !== supplierDoc._id.toString() || targetProduct.supplier !== supplierDoc.name) {
          targetProduct.supplierId = supplierDoc._id;
          targetProduct.supplier = supplierDoc.name;
          await targetProduct.save();
        }

        const safeName = (targetProduct.name || '').replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const qty = Number(targetProduct.stock || 0) > 0 ? Number(targetProduct.stock) : 4;
        let cost = Number(targetProduct.costPrice || 0);
        if (cost <= 0) {
          const price = Number(targetProduct.price || 0);
          cost = price > 0 ? Math.round(price * 0.7) : 300;
        }

        // Check if there is an existing purchase or payment transaction with the real amount
        const existingSupplierTxs = await SupplierTransaction.find({
          $or: [
            { 'items.product': targetProduct._id },
            { description: new RegExp(safeName, 'i') },
            { description: /148/i },
            { description: /مشجر/i }
          ]
        }).sort({ createdAt: -1 });

        let totalAmount = qty * cost;
        const txWithValidAmount = existingSupplierTxs.find(t => Number(t.amount || 0) > 0);
        if (txWithValidAmount && txWithValidAmount.amount > 0) {
          totalAmount = txWithValidAmount.amount;
          if (txWithValidAmount.items?.length && txWithValidAmount.items[0]?.unitPrice) {
            cost = txWithValidAmount.items[0].unitPrice;
          }
        }
        if (!totalAmount || totalAmount <= 0) totalAmount = 1200;

        // 1. Ensure Purchase exists and is StoreSafe
        let txPurchase = existingSupplierTxs.find(t => t.type === 'purchase');
        if (!txPurchase) {
          txPurchase = new SupplierTransaction({
            supplier: supplierDoc._id,
            type: 'purchase',
            amount: totalAmount,
            description: `فاتورة بضاعة (شراء نقدي) - ${targetProduct.name} (${qty} قطعة × ${cost} ج.م)`,
            paymentSource: 'StoreSafe',
            items: [{ product: targetProduct._id, name: targetProduct.name, quantity: qty, unitPrice: cost }],
            date: targetProduct.createdAt || new Date()
          });
          await txPurchase.save();
        } else {
          txPurchase.supplier = supplierDoc._id;
          txPurchase.amount = totalAmount;
          txPurchase.paymentSource = 'StoreSafe';
          txPurchase.description = `فاتورة بضاعة (شراء نقدي) - ${targetProduct.name} (${qty} قطعة × ${cost} ج.م)`;
          if (!txPurchase.items || txPurchase.items.length === 0) {
            txPurchase.items = [{ product: targetProduct._id, name: targetProduct.name, quantity: qty, unitPrice: cost }];
          }
          await txPurchase.save();
        }

        // 2. Ensure Payment exists and is StoreSafe
        let txPayment = existingSupplierTxs.find(t => t.type === 'payment');
        if (!txPayment) {
          txPayment = new SupplierTransaction({
            supplier: supplierDoc._id,
            type: 'payment',
            amount: totalAmount,
            description: `سداد فاتورة بضاعة من درج الخزنة - ${targetProduct.name}`,
            paymentSource: 'StoreSafe',
            date: txPurchase.date || targetProduct.createdAt || new Date()
          });
          await txPayment.save();
        } else {
          txPayment.supplier = supplierDoc._id;
          txPayment.amount = totalAmount;
          txPayment.paymentSource = 'StoreSafe';
          txPayment.description = `سداد فاتورة بضاعة من درج الخزنة - ${targetProduct.name}`;
          await txPayment.save();
        }

        // 3. Ensure Transaction exists in Safe (OUT) with category 'SupplierPayment' so it shows up as Goods / Supplier Payment!
        const chemiseSafeTxs = await Transaction.find({
          type: 'OUT',
          $or: [
            { referenceId: txPayment._id },
            { description: new RegExp(`سداد بضاعة مورد.*${safeName}`, 'i') },
            { description: new RegExp(safeName, 'i') },
            { description: /شميز.*مشجر|مشجر.*شميز/i },
            { description: /148/i }
          ]
        }).sort({ createdAt: 1 });

        let safeTx = null;
        if (chemiseSafeTxs.length > 0) {
          safeTx = chemiseSafeTxs[0];
          safeTx.amount = totalAmount;
          safeTx.type = 'OUT';
          safeTx.category = 'SupplierPayment';
          safeTx.paymentMethod = 'Cash';
          safeTx.description = `سداد بضاعة مورد (كاش الخزنة) - ${supplierDoc.name} | ${targetProduct.name} (${qty} قطعة)`;
          safeTx.referenceId = txPayment._id;
          if (!safeTx.createdAt) {
            safeTx.createdAt = txPurchase.date || targetProduct.createdAt || new Date();
          }
          await safeTx.save();
          report.chemiseSafeTxCreated = 1;

          // Delete any extra duplicate transactions
          for (let i = 1; i < chemiseSafeTxs.length; i++) {
            await Transaction.findByIdAndDelete(chemiseSafeTxs[i]._id);
            report.duplicateChemiseTxsDeleted = (report.duplicateChemiseTxsDeleted || 0) + 1;
          }
        } else {
          const openShift = await Shift.findOne({ status: 'open' });
          safeTx = new Transaction({
            amount: totalAmount,
            type: 'OUT',
            category: 'SupplierPayment',
            description: `سداد بضاعة مورد (كاش الخزنة) - ${supplierDoc.name} | ${targetProduct.name} (${qty} قطعة)`,
            paymentMethod: 'Cash',
            shift: openShift?._id,
            referenceId: txPayment._id,
            createdAt: txPurchase.date || targetProduct.createdAt || new Date()
          });
          await safeTx.save();
          report.chemiseSafeTxCreated = 1;
        }
        report.chemiseBillsLinked++;
      }
    }

    req.app.locals.io?.emit('inventory:update');
    res.json({
      success: true,
      message: 'تمت معالجة فواتير الموردين وحذف حركات الشميزات القديمة لمنع التكرار وتثبيت حركة الخزنة بنجاح',
      report
    });
  } catch (error) {
    console.error('Heal records failed:', error);
    res.status(500).json({ message: error.message || 'فشلت عملية المعالجة والتسوية', error: error.stack });
  }
});


module.exports = router;
