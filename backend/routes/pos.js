const express = require('express');
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const posService = require('../services/posService');
const { adjustStorage } = require('../services/inventoryService');

const router = express.Router();

// POST /api/pos/sell — Process a POS sale
router.post('/sell', auth, async (req, res, next) => {
  try {
    const { order, updatedProducts } = await posService.processSale({
      ...req.body,
      user: req.user
    });

    updatedProducts.forEach(prod => {
      req.app.locals.io?.emit('inventory:update', prod);
    });

    // Send customer invoice notification via WhatsApp
    let whatsappDirectLink = '';
    let whatsappSent = false;
    if (order.customerPhone && order.customerPhone !== 'بدون هاتف' && order.customerPhone.trim() !== '') {
      try {
        const { sendOrderInvoiceWhatsApp } = require('../services/whatsappService');
        const waResult = await sendOrderInvoiceWhatsApp({
          order,
          customerName: order.customerName,
          customerPhone: order.customerPhone
        });
        whatsappDirectLink = waResult.directLink || '';
        whatsappSent = Boolean(waResult && waResult.success);
      } catch (waErr) {
        console.error('⚠️ [POS WhatsApp] Failed to send receipt:', waErr.message);
      }
    }

    res.status(201).json({
      order,
      message: 'Sale completed',
      whatsappDirectLink,
      whatsappSent
    });
  } catch (error) {
    res.status(400).json({ message: 'Sale failed', error: error.message });
  }
});

// GET /api/pos/orders — Recent completed / returned orders
router.get('/orders', auth, async (req, res, next) => {
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

// POST /api/pos/recover — Process order returns
router.post('/recover', auth, async (req, res, next) => {
  try {
    const result = await posService.processReturn({
      ...req.body,
      user: req.user
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
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ message: error.message || 'Recovery failed', error: error.message });
  }
});

// POST /api/pos/exchange — Direct exchange (Return + Sale in one transaction)
router.post('/exchange', auth, async (req, res, next) => {
  try {
    const result = await posService.processExchange({
      ...req.body,
      user: req.user
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
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ message: error.message || 'فشلت عملية الاستبدال', error: error.message });
  }
});

// PATCH /api/pos/storage/:productId — Quick storage adjustment
router.patch('/storage/:productId', auth, async (req, res, next) => {
  try {
    const { adjustment, size, color } = req.body;
    const { product } = await adjustStorage({
      productId: req.params.productId,
      adjustment,
      size,
      color,
      performedBy: req.user.id
    });

    req.app.locals.io?.emit('inventory:update', product);
    res.json({ product, message: 'Storage updated' });
  } catch (error) {
    res.status(500).json({ message: 'Storage update failed', error: error.message });
  }
});

// PUT /api/pos/orders/:id — Edit an existing order (Admin only)
router.put('/orders/:id', auth, async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'cashier') {
      return res.status(403).json({ message: 'غير مصرح لحساب الكاشير بتعديل الفواتير السابقة. التعديل متاح للإدارة فقط.' });
    }

    const { customerName, customerPhone, employeeId, items, paymentMethod, discount = 0, type = 'Offline', notes = '' } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status === 'Returned' || order.recovered) {
      return res.status(400).json({ message: 'لا يمكن التعديل على طلب تم استرجاعه' });
    }

    // 1. Revert Old Items Stock
    for (const oldItem of order.items) {
      await adjustStorage({
        productId: oldItem.product,
        adjustment: oldItem.quantity,
        size: oldItem.size,
        color: oldItem.color,
        performedBy: req.user.id,
        reason: `إرجاع مخزون بسبب تعديل الفاتورة #${order._id.toString().slice(-6).toUpperCase()}`
      }).catch(() => {});
    }

    // 2. Deduct New Items Stock
    const orderItems = [];
    for (const item of items) {
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const { product, variant } = await posService.processSale
        ? await Product.atomicDeductStock({ productId: item.product, variantId: item.variantId, size: item.size, color: item.color, quantity: qty })
        : { product: await Product.findById(item.product), variant: null };

      orderItems.push({
        product: product._id,
        name: item.name || product.name,
        category: item.category || product.category,
        quantity: qty,
        price: Number(item.price),
        originalPrice: item.originalPrice || product.price || item.price,
        size: item.size || '',
        color: item.color || '',
        costPrice: product.costPrice || 0,
        variantId: variant?._id || null
      });
      req.app.locals.io?.emit('inventory:update', product);
    }

    const rawTotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
    const totalAmount = Math.max(0, rawTotal - Number(discount));

    let employeeName = '';
    if (employeeId) {
      const Employee = require('../models/Employee');
      const empDb = await Employee.findById(employeeId);
      if (empDb) employeeName = empDb.name;
    }

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
    res.json({ order, message: 'Order updated successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Update failed', error: error.message });
  }
});

// GET /api/pos/online-reservations — Pending online reservations for cashier pickup
router.get('/online-reservations', auth, async (req, res, next) => {
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

      if (isObjectId) orConditions.push({ _id: trimmed });
      query.$or = orConditions;
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

// POST /api/pos/fulfill-reservation/:id — Cashier fulfills reservation at store
router.post('/fulfill-reservation/:id', auth, async (req, res, next) => {
  try {
    const order = await posService.fulfillOnlineReservation({
      orderId: req.params.id,
      ...req.body,
      user: req.user
    });

    req.app.locals.io?.emit('order:update', order);
    res.json({ success: true, order, message: 'تم تسليم الحجز وتحصيل المبلغ بنجاح' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || 'فشل إتمام تسليم الحجز', error: error.message });
  }
});

// POST /api/pos/cancel-reservation/:id — Cancel reservation and restore stock
router.post('/cancel-reservation/:id', auth, async (req, res, next) => {
  try {
    const { order, updatedProducts } = await posService.cancelOnlineReservation({
      orderId: req.params.id,
      reason: req.body.reason,
      user: req.user
    });

    updatedProducts.forEach(prod => {
      req.app.locals.io?.emit('inventory:update', prod);
    });
    req.app.locals.io?.emit('order:update', order);

    res.json({ success: true, message: 'تم إلغاء الحجز وإرجاع الكميات للمخزن بنجاح' });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ message: error.message || 'فشل إلغاء الحجز', error: error.message });
  }
});

// GET /api/pos/customers/lookup — Lookup customer by phone
router.get('/customers/lookup', auth, async (req, res, next) => {
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
