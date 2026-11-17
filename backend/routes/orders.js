const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const { getNextInvoiceNumber } = require('../models/Counter');
const { runInTransaction } = require('../config/db');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { customerId, sellerId, items, type = 'Online' } = req.body;
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const invoiceNumber = await getNextInvoiceNumber();

    const order = new Order({ invoiceNumber, customer: customerId, seller: sellerId, items, totalAmount, type, status: 'Completed', paymentGateway: 'Instapay' });
    await order.save();

    await Promise.all(items.map(async (item) => {
      const product = await Product.findById(item.product);
      if (!product) throw new Error(`Product ${item.name} not found`);
      product.stock = Math.max(0, product.stock - item.quantity);
      product.sold += item.quantity;
      await product.save();
      req.app.locals.io?.emit('inventory:update', product);
    }));

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Unable to create order', error: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find().populate('customer seller', 'name email role').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch orders', error: error.message });
  }
});

router.get('/summary', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const query = {};
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from + 'T00:00:00');
      if (to)   query.createdAt.$lte = new Date(to   + 'T23:59:59');
    }
    const orders = await Order.find(query);

    const refundQuery = { type: 'OUT', category: { $in: ['Refund', 'مرتجع'] } };
    if (from || to) {
      refundQuery.createdAt = {};
      if (from) refundQuery.createdAt.$gte = new Date(from + 'T00:00:00');
      if (to)   refundQuery.createdAt.$lte = new Date(to   + 'T23:59:59');
    }
    const refundTxs = await Transaction.find(refundQuery);
    const totalRefunds = refundTxs.reduce((sum, t) => sum + t.amount, 0);

    const grossRevenue = orders.filter(o => o.status === 'Completed').reduce((sum, order) => sum + order.totalAmount, 0);
    const totalRevenue = Math.max(0, Math.round(grossRevenue - totalRefunds));
    const completed = orders.filter((order) => order.status === 'Completed').length;
    const returned = orders.filter((order) => order.status === 'Returned' || (order.items && order.items.some(i => (i.returnedQuantity || 0) > 0))).length;

    res.json({ totalRevenue, grossRevenue, totalRefunds, completed, returned });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch order summary', error: error.message });
  }
});

// GET /api/orders/weekly — revenue for custom date range (default to last 7 days)
router.get('/weekly', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    let endDate = new Date();

    if (from) {
      startDate = new Date(from);
    }
    if (to) {
      endDate = new Date(to + 'T23:59:59');
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const limitDays = Math.min(diffDays, 31); // Cap at 31 days to prevent performance issues

    const allRefundTxs = await Transaction.find({
      createdAt: { $gte: startDate, $lte: endDate },
      type: 'OUT',
      category: { $in: ['Refund', 'مرتجع'] }
    });

    const days = [];
    for (let i = limitDays - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);

      const orders = await Order.find({ createdAt: { $gte: d, $lte: end }, status: 'Completed' });
      const rawRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
      const rawCash = orders.filter(o => o.paymentMethod === 'Cash').reduce((s, o) => s + o.totalAmount, 0);
      const rawInstapay = orders.filter(o => o.paymentMethod === 'Instapay' || o.paymentMethod === 'Wallet').reduce((s, o) => s + o.totalAmount, 0);

      const dayRefunds = allRefundTxs.filter(t => {
        const time = new Date(t.createdAt).getTime();
        return time >= d.getTime() && time <= end.getTime();
      });
      const dayRefundCash = dayRefunds.filter(t => t.paymentMethod === 'Cash').reduce((s, t) => s + t.amount, 0);
      const dayRefundInstapay = dayRefunds.filter(t => t.paymentMethod !== 'Cash').reduce((s, t) => s + t.amount, 0);
      const totalDayRefund = dayRefundCash + dayRefundInstapay;

      const revenue = Math.max(0, Math.round(rawRevenue - totalDayRefund));
      const cashRevenue = Math.max(0, Math.round(rawCash - dayRefundCash));
      const instapayRevenue = Math.max(0, Math.round(rawInstapay - dayRefundInstapay));

      // Calculate actual profit based on real cost price (COGS) and net non-returned quantities
      const profit = Math.round(orders.reduce((sum, order) => {
        const orderNetRevenue = order.items.reduce((rSum, item) => {
          const netQty = Math.max(0, item.quantity - (item.returnedQuantity || 0));
          return rSum + (item.price || 0) * netQty;
        }, 0) - (order.discount || 0);

        const orderCost = order.items.reduce((cSum, item) => {
          const netQty = Math.max(0, item.quantity - (item.returnedQuantity || 0));
          return cSum + (item.costPrice || 0) * netQty;
        }, 0);

        return sum + Math.max(0, orderNetRevenue - orderCost);
      }, 0));

      days.push({
        date: d.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        revenue,
        grossRevenue: rawRevenue,
        refunds: totalDayRefund,
        refundsCash: dayRefundCash,
        refundsInstapay: dayRefundInstapay,
        cashRevenue,
        instapayRevenue,
        profit,
        count: orders.length
      });
    }
    res.json(days);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch weekly data', error: error.message });
  }
});

// GET /api/orders/:id — fetch single order
router.get('/:id', auth, async (req, res) => {
  try {
    const cleanId = req.params.id.trim();
    let order = null;

    if (cleanId.length === 24 && /^[0-9a-fA-F]{24}$/.test(cleanId)) {
      order = await Order.findById(cleanId).populate('customer seller employee', 'name email role');
    } else if (cleanId.length === 6) {
      order = await Order.findOne({
        $expr: {
          $eq: [
            { $strcasecmp: [ { $substrCP: [ { $toString: "$_id" }, 18, 6 ] }, cleanId ] },
            0
          ]
        }
      }).populate('customer seller employee', 'name email role').sort({ createdAt: -1 });
    }

    if (!order) return res.status(404).json({ message: 'لم يُعثر على طلب بهذا الرقم أو الكود' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch order', error: error.message });
  }
});

// PATCH /api/orders/:id — update order status (admin and manager only)
router.patch('/:id', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Completed', 'Returned'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const prevStatus = order.status;
    order.status = status;
    await order.save();

    // Fix: when an online order is returned or cancelled, restore the deducted stock.
    // Stock was deducted at checkout time (public-checkout), but was never restored on return.
    const shouldRestoreStock =
      (status === 'Returned') &&
      (prevStatus === 'Pending' || prevStatus === 'Completed') &&
      order.type === 'Online' &&
      !order.recovered; // don't double-restore if already processed via /recover

    if (shouldRestoreStock) {
      const StockHistory = require('../models/StockHistory');
      const invDisplay = order.invoiceNumber || `#${order._id.toString().slice(-6).toUpperCase()}`;

      for (const item of order.items) {
        const qty = item.quantity - (item.returnedQuantity || 0);
        if (qty <= 0) continue;

        const restoreRes = await Product.atomicRestoreStock({
          productId: item.product,
          size: item.size,
          color: item.color,
          quantity: qty
        });

        if (restoreRes.product) {
          await StockHistory.create({
            product: restoreRes.product._id,
            productName: restoreRes.product.name,
            size: item.size || '',
            color: item.color || '',
            changeType: 'Refund',
            quantityChanged: qty,
            previousStock: restoreRes.prevStock,
            newStock: restoreRes.newStock,
            notes: `إرجاع طلب أونلاين ${invDisplay}`
          });

          req.app.locals.io?.emit('inventory:update', restoreRes.product);
        }
      }

      // Mark order as recovered so stock isn't restored twice
      order.recovered = true;
      await order.save();
    }

    // Sync income with Safe/Treasury when order transitions to Completed
    if (status === 'Completed' && prevStatus !== 'Completed') {
      const existingTx = await Transaction.findOne({ referenceId: order._id, category: 'Sale' });
      if (!existingTx && (order.totalAmount || 0) > 0) {
        const Shift = require('../models/Shift');
        let openShift = await Shift.findOne({ status: 'open' }).sort({ createdAt: -1 });
        const effectivePaymentMethod = order.paymentMethod === 'Instapay' ? 'Instapay' : 'Cash';
        const finalCollected = order.amountPaid || order.totalAmount;

        const saleTransaction = new Transaction({
          amount: finalCollected,
          type: 'IN',
          category: 'Sale',
          paymentMethod: effectivePaymentMethod,
          description: `مبيعات طلب أونلاين تم اعتماده #${order.invoiceNumber || order._id.toString().slice(-6).toUpperCase()} - العميل: ${order.customerName || order.customerPhone || 'بدون اسم'}`,
          referenceId: order._id,
          user: req.user.id,
          shift: openShift?._id
        });
        await saleTransaction.save();
        req.app.locals.io?.emit('safe:update');
      }
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update order status', error: error.message });
  }
});


// POST /api/orders/public-checkout — Public endpoint for guest user online checkout
router.post('/public-checkout', async (req, res) => {
  try {
    const { 
      customerName, 
      customerPhone, 
      items, 
      paymentMethod = 'Cash', 
      notes = '', 
      paymentScreenshot = '',
      governorate = '',
      shippingAddress = '',
      couponCode = '',
      trafficSource = {}
    } = req.body;

    if (!customerPhone || !items || items.length === 0) {
      return res.status(400).json({ message: 'الرجاء إدخال رقم الهاتف والمنتجات المطلوبة' });
    }

    const Customer = require('../models/Customer');
    const Product = require('../models/Product');
    const StockHistory = require('../models/StockHistory');
    const Coupon = require('../models/Coupon');

    const result = await runInTransaction(async (session) => {
      // 1. Create or find customer
      let dbCustomer = await Customer.findOne({ phone: customerPhone.trim() }).session(session);
      if (!dbCustomer) {
        dbCustomer = new Customer({
          name: customerName || 'عميل أونلاين',
          phone: customerPhone.trim(),
          points: 0,
          debt: 0
        });
      } else {
        if (customerName && customerName.trim() !== '') {
          dbCustomer.name = customerName.trim();
        }
      }

      // Server-side helper to determine authentic active product price
      const resolveProductPrice = (prod) => {
        if (!prod) return 0;
        const basePrice = Number(prod.price || 0);
        if (
          prod.allowDiscount !== false &&
          prod.discountPrice &&
          prod.discountPrice > 0 &&
          prod.discountPrice < basePrice
        ) {
          const now = new Date();
          const startValid = !prod.discountStartDate || new Date(prod.discountStartDate) <= now;
          let endValid = true;
          if (prod.discountEndDate) {
            const end = new Date(prod.discountEndDate);
            end.setHours(23, 59, 59, 999);
            endValid = end >= now;
          }
          if (startValid && endValid) {
            return Number(prod.discountPrice);
          }
        }
        return basePrice;
      };

      // 2. Validate product existence, pricing and atomic stock deduction
      const orderItems = [];
      const stockHistories = [];
      const updatedProducts = [];

      for (const item of items) {
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const product = await Product.findById(item.product).session(session);
        if (!product) {
          throw new Error(`المنتج غير موجود في قاعدة البيانات: ${item.name || item.product}`);
        }

        const verifiedPrice = resolveProductPrice(product);

        // Atomic deduction
        const deductionResult = await Product.atomicDeductStock({
          productId: product._id,
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
          name: prod.name,
          onlineName: (prod.onlineName || item.onlineName || '').trim(),
          category: prod.category,
          quantity: qty,
          price: verifiedPrice,
          originalPrice: Number(prod.price || verifiedPrice),
          size: item.size || '',
          color: item.color || '',
          costPrice: prod.costPrice || 0,
          variantId: matchedVariant?._id || null
        });

        stockHistories.push({
          product: prod._id,
          productName: prod.name,
          size: matchedVariant ? matchedVariant.size : (item.size || ''),
          color: matchedVariant ? matchedVariant.color : (item.color || ''),
          variantKey: matchedVariant ? `${matchedVariant.size}_${matchedVariant.color}` : '',
          changeType: 'POS Sale',
          quantityChanged: -qty,
          previousStock: deductionResult.prevStock,
          newStock: deductionResult.newStock
        });
      }

      // 3. Coupon validation & Discount calculation
      const rawTotal = orderItems.reduce((sum, oi) => sum + oi.price * oi.quantity, 0);
      let discount = 0;
      let appliedCoupon = null;

      if (couponCode && typeof couponCode === 'string') {
        const normalizedCode = couponCode.trim().toUpperCase();
        const coupon = await Coupon.findOne({ code: normalizedCode, active: true }).session(session);
        if (coupon) {
          const now = new Date();
          const isNotExpired = !coupon.expiryDate || new Date(coupon.expiryDate) >= now;
          const isUnderLimit = !coupon.usageLimit || (coupon.timesUsed || 0) < coupon.usageLimit;
          const meetsMin = !coupon.minOrderAmount || rawTotal >= coupon.minOrderAmount;

          if (isNotExpired && isUnderLimit && meetsMin) {
            if (coupon.discountType === 'percentage') {
              discount = Math.round((rawTotal * coupon.discountValue) / 100);
              if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                discount = coupon.maxDiscount;
              }
            } else {
              discount = Math.min(coupon.discountValue, rawTotal);
            }
            appliedCoupon = coupon;
          }
        }
      }

      const finalTotalAmount = Math.max(0, rawTotal - discount);

      // 4. Save Customer Points
      dbCustomer.points += Math.floor(finalTotalAmount / 100);
      await dbCustomer.save({ session });

      let finalNotes = notes;
      if (governorate || shippingAddress) {
        const addressInfo = [governorate && `المحافظة: ${governorate}`, shippingAddress && `العنوان: ${shippingAddress}`].filter(Boolean).join(' - ');
        finalNotes = notes ? `${addressInfo} | ملاحظات: ${notes}` : addressInfo;
      }

      // 5. Create Order
      const invoiceNumber = await getNextInvoiceNumber();
      const order = new Order({
        invoiceNumber,
        customer: dbCustomer._id,
        customerName: dbCustomer.name,
        customerPhone: dbCustomer.phone,
        items: orderItems,
        totalAmount: finalTotalAmount,
        discount,
        couponCode: appliedCoupon ? appliedCoupon.code : '',
        type: 'Online',
        status: 'Pending',
        paymentMethod: paymentMethod === 'COD' ? 'Cash' : paymentMethod,
        paymentScreenshot,
        governorate,
        shippingAddress,
        notes: finalNotes,
        trafficSource: trafficSource && trafficSource.source ? trafficSource : { source: 'Direct' }
      });
      await order.save({ session });

      if (appliedCoupon) {
        appliedCoupon.timesUsed = (appliedCoupon.timesUsed || 0) + 1;
        await appliedCoupon.save({ session });
      }

      // Save Stock Histories
      for (const sh of stockHistories) {
        sh.notes = `طلب أونلاين معلق رقم ${invoiceNumber}`;
        sh.referenceId = order._id;
        const history = new StockHistory(sh);
        await history.save({ session });
      }

      return { order, dbCustomer, finalTotalAmount, updatedProducts };
    });

    // 6. Broadcast inventory and order updates post-commit
    result.updatedProducts.forEach(prod => {
      req.app.locals.io?.emit('inventory:update', prod);
    });

    try {
      const SystemNotification = require('../models/SystemNotification');
      const notification = await SystemNotification.create({
        title: 'طلب أونلاين جديد معلق',
        message: `طلب جديد بقيمة ${result.finalTotalAmount} ج.م من العميل ${result.dbCustomer.name} (${result.dbCustomer.phone}) ينتظر الموافقة.`,
        type: 'info',
        recipient: null
      });
      req.app.locals.io?.emit('notification:new', notification);
      req.app.locals.io?.emit('order:new', {
        order: result.order,
        customerName: result.dbCustomer.name,
        totalAmount: result.finalTotalAmount
      });
    } catch (err) {
      console.error('Failed to create order notification:', err);
    }

    res.status(201).json({ success: true, order: result.order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
