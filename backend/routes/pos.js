const express = require('express');
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Shift = require('../models/Shift');
const StockHistory = require('../models/StockHistory');
const Customer = require('../models/Customer');
const { getNextInvoiceNumber } = require('../models/Counter');
const { runInTransaction } = require('../config/db');

const router = express.Router();

router.post('/sell', auth, async (req, res) => {
  try {
    const { 
      customerId, 
      customerName, 
      customerPhone, 
      sellerId, 
      employeeId, 
      items, 
      type = 'Offline', 
      paymentMethod = 'Cash', 
      discount = 0, 
      notes = '',
      isDebt = false,
      amountPaid = 0 
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'لا توجد منتجات في الفاتورة' });
    }

    let employeeName = '';
    if (employeeId) {
      const Employee = require('../models/Employee');
      const empDb = await Employee.findById(employeeId);
      if (empDb) employeeName = empDb.name;
    }

    const rawTotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
    const totalAmount = Math.max(0, rawTotal - Number(discount));
    const finalAmountPaid = isDebt ? Math.min(totalAmount, Math.max(0, Number(amountPaid))) : totalAmount;
    const debtAmount = isDebt ? Math.max(0, totalAmount - finalAmountPaid) : 0;

    const result = await runInTransaction(async (session) => {
      // 1. Customer check/creation/update
      let dbCustomer = null;
      const cleanPhone = (customerPhone || '').trim();
      const cleanName = (customerName || '').trim();

      if (cleanPhone || cleanName) {
        if (cleanPhone) {
          dbCustomer = await Customer.findOne({ phone: cleanPhone }).session(session);
        } else if (cleanName) {
          dbCustomer = await Customer.findOne({ name: cleanName }).session(session);
        }

        if (!dbCustomer) {
          dbCustomer = new Customer({
            name: cleanName || 'عميل غير معروف',
            phone: cleanPhone || 'بدون هاتف',
            points: 0,
            debt: 0
          });
        } else if (cleanName) {
          dbCustomer.name = cleanName;
        }

        dbCustomer.points += Math.floor(totalAmount / 100);
        if (isDebt && debtAmount > 0) {
          dbCustomer.debt = Math.max(0, (dbCustomer.debt || 0) + debtAmount);
        }
        await dbCustomer.save({ session });
      }

      // 2. Generate permanent invoice number
      const invoiceNumber = await getNextInvoiceNumber();

      // 3. Atomically deduct stock for each item & prepare order items
      const orderItems = [];
      const stockHistories = [];
      const updatedProducts = [];

      for (const item of items) {
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const deductionResult = await Product.atomicDeductStock({
          productId: item.product,
          variantId: item.variantId,
          size: item.size,
          color: item.color,
          quantity: qty,
          session
        });

        const prod = deductionResult.product;
        const matchedVariant = deductionResult.variant;
        updatedProducts.push(prod);

        orderItems.push({
          product: prod._id,
          name: item.name || prod.name,
          category: item.category || prod.category,
          quantity: qty,
          price: Number(item.price),
          originalPrice: item.originalPrice || prod.price || item.price,
          size: item.size || '',
          color: item.color || '',
          costPrice: prod.costPrice || 0,
          variantId: matchedVariant?._id || null
        });

        stockHistories.push({
          product: prod._id,
          productName: prod.name,
          size: item.size || '',
          color: item.color || '',
          variantKey: matchedVariant ? `${matchedVariant.size}_${matchedVariant.color}` : '',
          changeType: 'POS Sale',
          quantityChanged: -qty,
          previousStock: deductionResult.prevStock,
          newStock: deductionResult.newStock,
          performedBy: req.user.id,
          notes: `مبيعات فاتورة ${invoiceNumber}`
        });
      }

      // 4. Create and save Order
      const order = new Order({
        invoiceNumber,
        customer: dbCustomer ? dbCustomer._id : (customerId || null),
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        seller: sellerId || req.user.id,
        employee: employeeId || null,
        employeeName: employeeName,
        items: orderItems,
        totalAmount,
        discount: Number(discount),
        showDiscountInInvoice: req.body.showDiscountInInvoice !== false,
        type,
        status: 'Completed',
        paymentMethod,
        notes: notes || '',
        isDebt,
        amountPaid: finalAmountPaid,
        debtAmount: debtAmount
      });
      await order.save({ session });

      // Link order._id in stock histories and save
      for (const shData of stockHistories) {
        shData.referenceId = order._id;
        const history = new StockHistory(shData);
        await history.save({ session });
      }

      // 5. Create Safe Transaction if money collected
      if (finalAmountPaid > 0) {
        let openShift = await Shift.findOne({ user: sellerId || req.user.id, status: 'open' }).session(session);
        if (!openShift) {
          openShift = await Shift.findOne({ status: 'open' }).sort({ createdAt: -1 }).session(session);
        }
        const transaction = new Transaction({
          amount: finalAmountPaid,
          type: 'IN',
          category: 'Sale',
          paymentMethod: order.paymentMethod,
          description: `مبيعات طلب ${invoiceNumber}${isDebt ? ' (دفع جزئي - آجل)' : ''}`,
          referenceId: order._id,
          user: sellerId || req.user.id,
          shift: openShift?._id
        });
        await transaction.save({ session });
      }

      return { order, updatedProducts };
    });

    // Broadcast inventory updates after commit
    result.updatedProducts.forEach(prod => {
      req.app.locals.io?.emit('inventory:update', prod);
    });

    res.status(201).json({ order: result.order, message: 'Sale completed' });
  } catch (error) {
    res.status(400).json({ message: 'Sale failed', error: error.message });
  }
});

router.get('/orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ status: { $in: ['Completed', 'Returned'] } })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load orders', error: error.message });
  }
});

router.post('/recover', auth, async (req, res) => {
  try {
    const { orderId, reason, returnItems, refundPaymentMethod } = req.body;

    const result = await runInTransaction(async (session) => {
      const order = await Order.findById(orderId).session(session);
      if (!order) {
        const notFoundErr = new Error('Order not found');
        notFoundErr.statusCode = 404;
        throw notFoundErr;
      }
      if (order.recovered) {
        throw new Error('Order already recovered');
      }

      let itemsToReturn = [];
      const isFullReturn = !returnItems || returnItems.length === 0;

      if (isFullReturn) {
        order.items.forEach(item => {
          const remainingQty = item.quantity - (item.returnedQuantity || 0);
          if (remainingQty > 0) {
            itemsToReturn.push({
              itemId: item._id,
              product: item.product,
              name: item.name,
              size: item.size,
              color: item.color,
              quantity: remainingQty,
              price: item.price
            });
            item.returnedQuantity = item.quantity;
          }
        });
      } else {
        for (const ri of returnItems) {
          const item = order.items.id(ri.itemId);
          if (!item) {
            throw new Error(`صنف الفاتورة #${ri.itemId} غير موجود`);
          }
          const remainingQty = item.quantity - (item.returnedQuantity || 0);
          if (ri.quantity > remainingQty) {
            throw new Error(`الكمية المرتجعة للـ ${item.name} (${ri.quantity}) أكبر من الكمية المتاحة للإرجاع (${remainingQty})`);
          }
          item.returnedQuantity = (item.returnedQuantity || 0) + ri.quantity;
          itemsToReturn.push({
            itemId: item._id,
            product: item.product,
            name: item.name,
            size: item.size,
            color: item.color,
            quantity: ri.quantity,
            price: item.price
          });
        }
      }

      if (itemsToReturn.length === 0) {
        throw new Error('لا توجد قطع متبقية للإرجاع في هذا الطلب');
      }

      const fullyRecovered = order.items.every(item => (item.returnedQuantity || 0) === item.quantity);
      if (fullyRecovered) {
        order.status = 'Returned';
        order.recovered = true;
      }

      const displayInvoice = order.invoiceNumber || `#${order._id.toString().slice(-6).toUpperCase()}`;
      const updatedProducts = [];

      // Revert inventory stocks atomically
      for (const item of itemsToReturn) {
        const restoreRes = await Product.atomicRestoreStock({
          productId: item.product,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          session
        });

        if (restoreRes.product) {
          updatedProducts.push(restoreRes.product);
          const history = new StockHistory({
            product: restoreRes.product._id,
            productName: restoreRes.product.name,
            size: item.size || '',
            color: item.color || '',
            variantKey: restoreRes.variant ? `${restoreRes.variant.size}_${restoreRes.variant.color}` : '',
            changeType: 'Refund',
            quantityChanged: item.quantity,
            previousStock: restoreRes.prevStock,
            newStock: restoreRes.newStock,
            performedBy: req.user.id,
            referenceId: order._id,
            notes: `مرتجع فاتورة ${displayInvoice} - السبب: ${reason || 'غير محدد'}`
          });
          await history.save({ session });
        }
      }

      // Calculate refund amount proportionally
      const returnedItemsValue = itemsToReturn.reduce((sum, ri) => sum + ri.price * ri.quantity, 0);
      const originalOrderTotal = (order.totalAmount || 0) + (order.discount || 0);
      const refundTotal = (originalOrderTotal > 0 && (order.discount || 0) > 0)
        ? Math.round((returnedItemsValue * (order.totalAmount / originalOrderTotal)) * 100) / 100
        : returnedItemsValue;

      let debtReduction = 0;
      let cashRefundAmount = 0;

      if (order.isDebt && (order.debtAmount || 0) > 0) {
        debtReduction = Math.min(refundTotal, order.debtAmount);
        debtReduction = Math.round(debtReduction * 100) / 100;

        order.debtAmount = Math.max(0, Math.round((order.debtAmount - debtReduction) * 100) / 100);
        if (order.debtAmount < 0.5) {
          order.debtAmount = 0;
          order.isDebt = false;
        }

        if (order.customer) {
          const customer = await Customer.findById(order.customer).session(session);
          if (customer) {
            customer.debt = Math.max(0, Math.round(((customer.debt || 0) - debtReduction) * 100) / 100);
            if (customer.debt < 0.5) {
              customer.debt = 0;
            }
            await customer.save({ session });
          }
        }

        const remainingAfterDebt = Math.max(0, Math.round((refundTotal - debtReduction) * 100) / 100);
        const maxCashRefundable = Math.max(0, (order.amountPaid || 0) - (order.returnedAmount || 0));
        cashRefundAmount = Math.min(remainingAfterDebt, maxCashRefundable);
        cashRefundAmount = Math.round(cashRefundAmount * 100) / 100;
      } else {
        const maxCashRefundable = Math.max(0, (order.amountPaid || order.totalAmount) - (order.returnedAmount || 0));
        cashRefundAmount = Math.min(refundTotal, maxCashRefundable);
        cashRefundAmount = Math.round(cashRefundAmount * 100) / 100;
      }

      order.returnedAmount = Math.round(((order.returnedAmount || 0) + cashRefundAmount) * 100) / 100;
      await order.save({ session });

      const effectivePaymentMethod = refundPaymentMethod || order.paymentMethod || 'Cash';
      if (cashRefundAmount > 0) {
        let openShift = await Shift.findOne({ user: req.user.id, status: 'open' }).session(session);
        if (!openShift) {
          openShift = await Shift.findOne({ status: 'open' }).sort({ createdAt: -1 }).session(session);
        }
        const transaction = new Transaction({
          amount: cashRefundAmount,
          type: 'OUT',
          category: 'Refund',
          paymentMethod: effectivePaymentMethod,
          description: `مرتجع ${fullyRecovered ? 'كامل' : 'جزئي'} طلب ${displayInvoice} - السبب: ${reason || 'غير محدد'} (${effectivePaymentMethod === 'Cash' ? 'كاش' : 'إنستاباي'})`,
          referenceId: order._id,
          user: req.user.id,
          shift: openShift?._id
        });
        await transaction.save({ session });
      }

      return {
        order,
        refundAmount: cashRefundAmount,
        debtReduction,
        returnedItems: itemsToReturn,
        fullyRecovered,
        updatedProducts
      };
    });

    result.updatedProducts.forEach(prod => {
      req.app.locals.io?.emit('inventory:update', prod);
    });

    res.json({
      order: result.order,
      refundAmount: result.refundAmount,
      debtReduction: result.debtReduction,
      returnedItems: result.returnedItems,
      message: result.fullyRecovered ? 'Full return processed' : 'Partial return processed'
    });
  } catch (error) {
    const statusCode = error.statusCode || (error.message === 'Order not found' ? 404 : 400);
    res.status(statusCode).json({ message: error.message || 'Recovery failed', error: error.message });
  }
});

// POST /api/pos/exchange — Process a direct exchange (Return + New Sale in one seamless transaction)
router.post('/exchange', auth, async (req, res) => {
  try {
    const { originalOrderId, returnItems, newItems, discount = 0, paymentMethod = 'Cash', reason = '', notes = '', employeeId } = req.body;

    if (!returnItems || returnItems.length === 0) {
      return res.status(400).json({ message: 'يجب اختيار صنف واحد على الأقل لإرجاعه في الاستبدال' });
    }
    if (!newItems || newItems.length === 0) {
      return res.status(400).json({ message: 'يجب اختيار صنف جديد واحد على الأقل للشراء في الاستبدال' });
    }

    let employeeName = '';
    if (employeeId) {
      const Employee = require('../models/Employee');
      const empDb = await Employee.findById(employeeId);
      if (empDb) employeeName = empDb.name;
    }

    const result = await runInTransaction(async (session) => {
      const originalOrder = await Order.findById(originalOrderId).session(session);
      if (!originalOrder) {
        const notFoundErr = new Error('الفاتورة الأصلية غير موجودة');
        notFoundErr.statusCode = 404;
        throw notFoundErr;
      }
      if (originalOrder.recovered) {
        throw new Error('الفاتورة تم استردادها بالكامل مسبقاً');
      }

      // 1. Validate and process returned items
      const itemsToReturn = [];
      for (const ri of returnItems) {
        const item = originalOrder.items.id(ri.itemId);
        if (!item) throw new Error(`صنف الفاتورة #${ri.itemId} غير موجود`);
        const remainingQty = item.quantity - (item.returnedQuantity || 0);
        if (ri.quantity > remainingQty) {
          throw new Error(`الكمية المرتجعة للـ ${item.name} أكبر من المتاحة (${remainingQty})`);
        }
        item.returnedQuantity = (item.returnedQuantity || 0) + ri.quantity;
        itemsToReturn.push({
          product: item.product,
          name: item.name,
          size: item.size,
          color: item.color,
          quantity: ri.quantity,
          price: item.price
        });
      }

      const fullyRecovered = originalOrder.items.every(item => (item.returnedQuantity || 0) === item.quantity);
      if (fullyRecovered) {
        originalOrder.status = 'Returned';
        originalOrder.recovered = true;
      }

      const origDisplayInvoice = originalOrder.invoiceNumber || `#${originalOrder._id.toString().slice(-6).toUpperCase()}`;
      const updatedProducts = [];

      // 2. Restock returned items atomically
      for (const item of itemsToReturn) {
        const restoreRes = await Product.atomicRestoreStock({
          productId: item.product,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          session
        });

        if (restoreRes.product) {
          updatedProducts.push(restoreRes.product);
          const history = new StockHistory({
            product: restoreRes.product._id,
            productName: restoreRes.product.name,
            size: item.size || '',
            color: item.color || '',
            variantKey: restoreRes.variant ? `${restoreRes.variant.size}_${restoreRes.variant.color}` : '',
            changeType: 'Refund',
            quantityChanged: item.quantity,
            previousStock: restoreRes.prevStock,
            newStock: restoreRes.newStock,
            performedBy: req.user.id,
            referenceId: originalOrder._id,
            notes: `مرتجع استبدال فاتورة ${origDisplayInvoice} - السبب: ${reason || 'استبدال'}`
          });
          await history.save({ session });
        }
      }

      // 3. Atomically deduct stock for new sale items
      const newOrderItems = [];
      const newStockHistories = [];

      for (const item of newItems) {
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const deductionResult = await Product.atomicDeductStock({
          productId: item.product,
          variantId: item.variantId,
          size: item.size,
          color: item.color,
          quantity: qty,
          session
        });

        const prod = deductionResult.product;
        const matchedVariant = deductionResult.variant;
        updatedProducts.push(prod);

        newOrderItems.push({
          product: prod._id,
          name: item.name || prod.name,
          category: item.category || prod.category,
          quantity: qty,
          price: Number(item.price),
          size: item.size || '',
          color: item.color || '',
          costPrice: prod.costPrice || 0,
          variantId: matchedVariant?._id || null
        });

        newStockHistories.push({
          product: prod._id,
          productName: prod.name,
          size: item.size || '',
          color: item.color || '',
          variantKey: matchedVariant ? `${matchedVariant.size}_${matchedVariant.color}` : '',
          changeType: 'POS Sale',
          quantityChanged: -qty,
          previousStock: deductionResult.prevStock,
          newStock: deductionResult.newStock,
          performedBy: req.user.id
        });
      }

      // 4. Calculate accounting totals
      const returnedValue = itemsToReturn.reduce((sum, ri) => sum + ri.price * ri.quantity, 0);
      const originalOrderTotal = (originalOrder.totalAmount || 0) + (originalOrder.discount || 0);
      const returnedItemsProportionalValue = (originalOrderTotal > 0 && (originalOrder.discount || 0) > 0)
        ? Math.round((returnedValue * (originalOrder.totalAmount / originalOrderTotal)) * 100) / 100
        : returnedValue;

      let debtReduction = 0;
      let returnCreditValue = 0;

      if (originalOrder.isDebt && (originalOrder.debtAmount || 0) > 0) {
        debtReduction = Math.min(returnedItemsProportionalValue, originalOrder.debtAmount);
        debtReduction = Math.round(debtReduction * 100) / 100;
        originalOrder.debtAmount = Math.max(0, Math.round((originalOrder.debtAmount - debtReduction) * 100) / 100);
        if (originalOrder.debtAmount < 0.5) {
          originalOrder.debtAmount = 0;
          originalOrder.isDebt = false;
        }

        if (originalOrder.customer) {
          const customer = await Customer.findById(originalOrder.customer).session(session);
          if (customer) {
            customer.debt = Math.max(0, Math.round(((customer.debt || 0) - debtReduction) * 100) / 100);
            if (customer.debt < 0.5) {
              customer.debt = 0;
            }
            await customer.save({ session });
          }
        }

        returnCreditValue = Math.max(0, Math.round((returnedItemsProportionalValue - debtReduction) * 100) / 100);
      } else {
        returnCreditValue = returnedItemsProportionalValue;
      }

      const rawNewTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const newTotalAmount = Math.max(0, rawNewTotal - Number(discount));
      const netDifference = newTotalAmount - returnCreditValue;

      const invoiceNumber = await getNextInvoiceNumber();

      const newOrder = new Order({
        invoiceNumber,
        customer: originalOrder.customer || null,
        customerName: originalOrder.customerName || '',
        customerPhone: originalOrder.customerPhone || '',
        seller: req.user.id,
        employee: employeeId || null,
        employeeName: employeeName,
        items: newOrderItems,
        totalAmount: newTotalAmount,
        discount: Number(discount),
        type: 'Offline',
        status: 'Completed',
        paymentMethod,
        notes: `استبدال مباشر عن الفاتورة ${origDisplayInvoice} ${notes ? `(${notes})` : ''}`
      });

      originalOrder.returnedAmount = Math.round(((originalOrder.returnedAmount || 0) + returnCreditValue) * 100) / 100;
      await originalOrder.save({ session });
      await newOrder.save({ session });

      const newCode = newOrder.invoiceNumber;
      for (const sh of newStockHistories) {
        sh.referenceId = newOrder._id;
        sh.notes = `مبيعات استبدال فاتورة جديدة ${newCode} (عن الفاتورة ${origDisplayInvoice})`;
        const history = new StockHistory(sh);
        await history.save({ session });
      }

      let openShift = await Shift.findOne({ user: req.user.id, status: 'open' }).session(session);
      if (!openShift) {
        openShift = await Shift.findOne({ status: 'open' }).sort({ createdAt: -1 }).session(session);
      }

      if (returnCreditValue > 0) {
        const refundTx = new Transaction({
          amount: returnCreditValue,
          type: 'OUT',
          category: 'Refund',
          paymentMethod,
          description: `مرتجع استبدال عن الفاتورة ${origDisplayInvoice} (استبدلت بطلب ${newCode})`,
          referenceId: originalOrder._id,
          user: req.user.id,
          shift: openShift?._id
        });
        await refundTx.save({ session });
      }

      if (newTotalAmount > 0) {
        const saleTx = new Transaction({
          amount: newTotalAmount,
          type: 'IN',
          category: 'Sale',
          paymentMethod,
          description: `مبيعات استبدال فاتورة جديدة ${newCode} (عن الفاتورة ${origDisplayInvoice})`,
          referenceId: newOrder._id,
          user: req.user.id,
          shift: openShift?._id
        });
        await saleTx.save({ session });
      }

      return {
        newOrder,
        returnCreditValue,
        newTotalAmount,
        netDifference,
        updatedProducts
      };
    });

    result.updatedProducts.forEach(prod => {
      req.app.locals.io?.emit('inventory:update', prod);
    });

    res.json({
      newOrder: result.newOrder,
      returnCreditValue: result.returnCreditValue,
      newTotalAmount: result.newTotalAmount,
      netDifference: result.netDifference,
      message: 'تم إتمام عملية الاستبدال بنجاح'
    });
  } catch (error) {
    console.error('Exchange failed:', error);
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ message: error.message || 'فشلت عملية الاستبدال', error: error.message });
  }
});

router.patch('/storage/:productId', auth, async (req, res) => {
  try {
    const { adjustment, size, color } = req.body;
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    let prevStock = 0;
    let variant = null;
    if (product.variants && product.variants.length > 0 && size && color) {
      variant = product.variants.find(v => v.size === size && v.color === color);
      if (variant) {
        prevStock = variant.stock;
        variant.stock = Math.max(0, variant.stock + Number(adjustment));
      }
    } else {
      prevStock = product.stock;
      product.stock = Math.max(0, product.stock + Number(adjustment));
    }
    if (product.variants && product.variants.length > 0) {
      product.stock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    }
    if ((product.stock + (product.sold || 0)) > (product.totalReceived || 0)) {
      product.totalReceived = product.stock + (product.sold || 0);
    }
    await product.save();

    // Log stock history
    const history = new StockHistory({
      product: product._id,
      productName: product.name,
      size: size || '',
      color: color || '',
      variantKey: variant ? `${size}_${color}` : '',
      changeType: 'Manual Adjustment',
      quantityChanged: Number(adjustment),
      previousStock: prevStock,
      newStock: variant ? variant.stock : product.stock,
      performedBy: req.user.id,
      notes: `تعديل يدوي للمخزون بقيمة ${adjustment > 0 ? '+' : ''}${adjustment}`
    });
    await history.save();

    req.app.locals.io?.emit('inventory:update', product);
    res.json({ product, message: 'Storage updated' });
  } catch (error) {
    res.status(500).json({ message: 'Storage update failed', error: error.message });
  }
});

// PUT /api/pos/orders/:id — Edit an entire order
router.put('/orders/:id', auth, async (req, res) => {
  try {
    // Prevent cashier role from editing invoices
    if (req.user && req.user.role === 'cashier') {
      return res.status(403).json({ message: 'غير مصرح لحساب الكاشير بتعديل الفواتير السابقة. التعديل متاح للإدارة فقط.' });
    }
    const { customerName, customerPhone, employeeId, items, paymentMethod, discount = 0, type = 'Offline', notes = '' } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // Prevent editing of fully returned or heavily modified orders if needed
    if (order.status === 'Returned' || order.recovered) {
      return res.status(400).json({ message: 'لا يمكن التعديل على طلب تم استرجاعه' });
    }

    // 1. Revert Old Items Stock
    for (const oldItem of order.items) {
      const product = await Product.findById(oldItem.product);
      if (product) {
        let prevStock = 0;
        let variant = null;
        if (product.variants && product.variants.length > 0) {
          variant = product.variants.find(v => v.size === oldItem.size && v.color === oldItem.color);
          if (variant) {
            prevStock = variant.stock;
            variant.stock += oldItem.quantity;
          }
        } else {
          prevStock = product.stock;
          product.stock += oldItem.quantity;
        }
        if (product.variants && product.variants.length > 0) {
          product.stock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        }
        product.sold = Math.max(0, product.sold - oldItem.quantity);
        await product.save();

        const history = new StockHistory({
          product: product._id,
          productName: product.name,
          size: oldItem.size || '',
          color: oldItem.color || '',
          variantKey: variant ? `${oldItem.size}_${oldItem.color}` : '',
          changeType: 'Manual Adjustment',
          quantityChanged: oldItem.quantity,
          previousStock: prevStock,
          newStock: variant ? variant.stock : product.stock,
          performedBy: req.user.id,
          referenceId: order._id,
          notes: `إرجاع مخزون بسبب تعديل الفاتورة #${order._id.toString().slice(-6).toUpperCase()}`
        });
        await history.save();
        req.app.locals.io?.emit('inventory:update', product);
      }
    }

    // 2. Validate and Deduct New Items Stock
    const productLookups = await Promise.all(items.map(async (item) => {
      // Skip stock validation if product ID is empty (shouldn't happen normally)
      if (!item.product || item.product === '') {
        return { item, product: null, variant: null, costPrice: item.costPrice || 0, skipStock: true };
      }

      let product = null;
      try {
        product = await Product.findById(item.product);
      } catch (e) {
        // Invalid ObjectId — treat as deleted product
        product = null;
      }

      // If product was deleted, allow editing without stock check
      if (!product) {
        return { item, product: null, variant: null, costPrice: item.costPrice || 0, skipStock: true };
      }

      let availableStock = product.stock ?? 0;
      let variant = null;
      if (product.variants && product.variants.length > 0) {
        variant = product.variants.find(v => v.size === item.size && v.color === item.color);
        if (variant) availableStock = variant.stock ?? 0;
      }

      if ((availableStock || 0) < Number(item.quantity || 0)) {
        throw new Error(`الكمية غير متوفرة للمنتج ${product.name}`);
      }

      const costPrice = product ? (product.costPrice || 0) : 0;
      return { item, product, variant, costPrice, skipStock: false };
    }));

    const orderItems = productLookups.map(({ item, product, variant, costPrice }) => ({
      product: item.product,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      price: item.price,
      originalPrice: item.originalPrice || product?.price || item.price,
      size: item.size || '',
      color: item.color || '',
      costPrice,
      variantId: variant?._id || null
    }));

    const rawTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalAmount = Math.max(0, rawTotal - Number(discount));

    let employeeName = '';
    if (employeeId) {
      const Employee = require('../models/Employee');
      const empDb = await Employee.findById(employeeId);
      if (empDb) employeeName = empDb.name;
    }

    // Update order fields
    order.customerName = customerName || '';
    order.customerPhone = customerPhone || '';
    order.employee = employeeId || null;
    order.employeeName = employeeName;
    order.items = orderItems;
    order.totalAmount = totalAmount;
    order.discount = Number(discount);
    if (req.body.showDiscountInInvoice !== undefined) {
      order.showDiscountInInvoice = req.body.showDiscountInInvoice !== false;
    }
    order.paymentMethod = paymentMethod;
    order.type = type;
    order.notes = notes || '';
    
    await order.save();

    // Deduct stock for new items
    await Promise.all(productLookups.map(async ({ item, product, variant, skipStock }) => {
      // Skip stock operations for deleted/missing products
      if (skipStock || !product) return;

      const prevStock = variant ? variant.stock : product.stock;
      if (variant) {
        variant.stock = Math.max(0, variant.stock - item.quantity);
      } else {
        product.stock = Math.max(0, product.stock - item.quantity);
      }
      if (product.variants && product.variants.length > 0) {
        product.stock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      }
      product.sold += item.quantity;
      await product.save();

      const history = new StockHistory({
        product: product._id,
        productName: product.name,
        size: item.size || '',
        color: item.color || '',
        variantKey: variant ? `${item.size}_${item.color}` : '',
        changeType: 'POS Sale',
        quantityChanged: -item.quantity,
        previousStock: prevStock,
        newStock: variant ? variant.stock : product.stock,
        performedBy: req.user.id,
        referenceId: order._id,
        notes: `خصم مخزون بسبب تعديل الفاتورة #${order._id.toString().slice(-6).toUpperCase()}`
      });
      await history.save();
      req.app.locals.io?.emit('inventory:update', product);
    }));

    // 3. Update Transaction
    // For debt orders, the transaction should reflect what was actually collected (amountPaid),
    // not the full totalAmount which may include uncollected debt.
    const isDebtOrder = req.body.isDebt ?? order.isDebt ?? false;
    const finalAmountPaidEdit = isDebtOrder
      ? Math.min(totalAmount, Math.max(0, Number(req.body.amountPaid ?? order.amountPaid ?? 0)))
      : totalAmount;
    const transaction = await Transaction.findOne({ referenceId: order._id, category: 'Sale' });
    if (transaction) {
      transaction.amount = finalAmountPaidEdit;
      transaction.paymentMethod = paymentMethod;
      transaction.description = `مبيعات طلب #${order._id.toString().slice(-6).toUpperCase()} (معدل)${isDebtOrder ? ' (آجل)' : ''}`;
      await transaction.save();
    } else if (finalAmountPaidEdit > 0) {
      // If missing for some reason, create it
      const openShift = await Shift.findOne({ user: order.seller || req.user.id, status: 'open' });
      const newTransaction = new Transaction({
        amount: finalAmountPaidEdit,
        type: 'IN',
        category: 'Sale',
        paymentMethod: order.paymentMethod,
        description: `مبيعات طلب #${order._id.toString().slice(-6).toUpperCase()} (تم التعديل)${isDebtOrder ? ' (آجل)' : ''}`,
        referenceId: order._id,
        user: order.seller || req.user.id,
        shift: openShift?._id
      });
      await newTransaction.save();
    }

        // 4. Recalculate debt if this is a debt order
    order.isDebt = Boolean(isDebtOrder);
    
    if (isDebtOrder) {
      const oldDebt = order.debtAmount || 0;
      const newAmountPaid = Math.min(totalAmount, finalAmountPaidEdit);
      const newDebt = Math.max(0, totalAmount - newAmountPaid);
      const debtDelta = newDebt - oldDebt;

      order.amountPaid = newAmountPaid;
      order.debtAmount = newDebt;

      // Link or find customer
      const cleanPhone = (customerPhone || order.customerPhone || '').trim();
      const cleanName = (customerName || order.customerName || '').trim();

      let customer = null;
      if (order.customer) {
        customer = await Customer.findById(order.customer);
      }
      if (!customer && cleanPhone) {
        customer = await Customer.findOne({ phone: cleanPhone });
      }
      if (!customer && cleanName) {
        customer = await Customer.findOne({ name: cleanName });
      }
      if (!customer && (cleanPhone || cleanName)) {
        customer = new Customer({
          name: cleanName || 'عميل غير معروف',
          phone: cleanPhone || 'بدون هاتف',
          points: 0,
          debt: 0
        });
      }

      if (customer) {
        customer.debt = Math.max(0, (customer.debt || 0) + debtDelta);
        await customer.save();
        order.customer = customer._id;
      }
      await order.save();
    } else {
      // If order was changed from debt to fully paid
      if (order.isDebt && order.customer) {
        const customer = await Customer.findById(order.customer);
        if (customer) {
          customer.debt = Math.max(0, (customer.debt || 0) - (order.debtAmount || 0));
          await customer.save();
        }
      }
      order.amountPaid = totalAmount;
      order.debtAmount = 0;
      await order.save();
    }

    res.json({ order, message: 'Order updated successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Update failed', error: error.message });
  }
});

// GET /api/pos/online-reservations — get pending online orders / reservations for cashier
router.get('/online-reservations', auth, async (req, res) => {
  try {
    const { q } = req.query;
    let query = { type: 'Online', status: 'Pending' };

    if (q && typeof q === 'string' && q.trim()) {
      const trimmed = q.trim();
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(trimmed);

      const orConditions = [
        { customerPhone: { $regex: trimmed, $options: 'i' } },
        { customerName: { $regex: trimmed, $options: 'i' } },
        { invoiceNumber: { $regex: trimmed, $options: 'i' } }
      ];

      if (isObjectId) {
        orConditions.push({ _id: trimmed });
      }

      query = {
        ...query,
        $or: orConditions
      };
    }

    const orders = await Order.find(query)
      .populate('items.product', 'name images mannequinImage price category stock')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch online reservations', error: error.message });
  }
});

// POST /api/pos/fulfill-reservation/:id — cashier fulfills / completes an online order upon store pickup
router.post('/fulfill-reservation/:id', auth, async (req, res) => {
  try {
    const { employeeId, paymentMethod = 'Cash', amountPaid, notes } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'طلب الحجز غير موجود' });
    }

    if (order.status === 'Completed') {
      return res.status(400).json({ message: 'تم تسليم هذا الطلب بالفعل مسبقاً' });
    }

    order.status = 'Completed';
    order.seller = req.user.id;
    if (employeeId) order.employee = employeeId;
    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (notes) order.notes = order.notes ? `${order.notes} | ${notes}` : notes;

    const finalAmount = amountPaid !== undefined ? Number(amountPaid) : order.totalAmount;
    order.amountPaid = finalAmount;

    await order.save();

    // Create Transaction for cashier's shift so the cash register / safe is credited
    if (finalAmount > 0) {
      let openShift = await Shift.findOne({ user: req.user.id, status: 'open' });
      if (!openShift) {
        openShift = await Shift.findOne({ status: 'open' }).sort({ createdAt: -1 });
      }

      const resDisplayInv = order.invoiceNumber || `#${order._id.toString().slice(-6).toUpperCase()}`;
      const transaction = new Transaction({
        amount: finalAmount,
        type: 'IN',
        category: 'Sale',
        paymentMethod: order.paymentMethod,
        description: `تسليم حجز أونلاين بالمحل ${resDisplayInv} - العميل: ${order.customerName || order.customerPhone}`,
        referenceId: order._id,
        user: req.user.id,
        shift: openShift?._id
      });
      await transaction.save();
    }

    req.app.locals.io?.emit('order:update', order);

    res.json({ success: true, order, message: 'تم تسليم الحجز وتحصيل المبلغ بنجاح' });
  } catch (error) {
    res.status(500).json({ message: 'فشل إتمام تسليم الحجز', error: error.message });
  }
});

// POST /api/pos/cancel-reservation/:id — cancel reservation and restore stock to inventory
router.post('/cancel-reservation/:id', auth, async (req, res) => {
  try {
    const { reason = 'إلغاء حجز من قبل الكاشير' } = req.body;

    const result = await runInTransaction(async (session) => {
      const order = await Order.findById(req.params.id).session(session);

      if (!order) {
        const notFound = new Error('طلب الحجز غير موجود');
        notFound.statusCode = 404;
        throw notFound;
      }

      if (order.status !== 'Pending') {
        throw new Error('لا يمكن إلغاء طلب غير معلق');
      }

      order.status = 'Returned';
      order.notes = order.notes ? `${order.notes} | تم الإلغاء: ${reason}` : `تم الإلغاء: ${reason}`;
      const updatedProducts = [];

      // Restore stock if not already recovered
      if (!order.recovered) {
        for (const item of order.items) {
          const qty = Number(item.quantity) || 1;
          const restoreRes = await Product.atomicRestoreStock({
            productId: item.product,
            size: item.size,
            color: item.color,
            quantity: qty,
            session
          });

          if (restoreRes.product) {
            updatedProducts.push(restoreRes.product);
            const history = new StockHistory({
              product: restoreRes.product._id,
              productName: restoreRes.product.name,
              size: item.size || '',
              color: item.color || '',
              changeType: 'Refund',
              quantityChanged: qty,
              previousStock: restoreRes.prevStock,
              newStock: restoreRes.newStock,
              performedBy: req.user.id,
              referenceId: order._id,
              notes: `إلغاء حجز أونلاين #${order.invoiceNumber || order._id.toString().slice(-6).toUpperCase()} - ${reason}`
            });
            await history.save({ session });
          }
        }

        order.recovered = true;
      }

      await order.save({ session });

      return { order, updatedProducts };
    });

    result.updatedProducts.forEach(prod => {
      req.app.locals.io?.emit('inventory:update', prod);
    });
    req.app.locals.io?.emit('order:update', result.order);

    res.json({ success: true, message: 'تم إلغاء الحجز وإرجاع الكميات للمخزن بنجاح' });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ message: error.message || 'فشل إلغاء الحجز', error: error.message });
  }
});

// GET /api/pos/customers/lookup — look up a customer by phone
router.get('/customers/lookup', auth, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'Phone parameter is required' });
    const customer = await Customer.findOne({ phone: phone.trim() });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Failed to look up customer', error: error.message });
  }
});

module.exports = router;
