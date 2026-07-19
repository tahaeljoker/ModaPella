const express = require('express');
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { customerId, sellerId, items, type = 'Online' } = req.body;
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = new Order({ customer: customerId, seller: sellerId, items, totalAmount, type, status: 'Completed', paymentGateway: 'Instapay' });
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
    const totalRevenue = orders.filter(o => o.status === 'Completed').reduce((sum, order) => sum + order.totalAmount, 0);
    const completed = orders.filter((order) => order.status === 'Completed').length;
    const returned = orders.filter((order) => order.status === 'Returned').length;
    res.json({ totalRevenue, completed, returned });
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

    const days = [];
    for (let i = limitDays - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);

      const orders = await Order.find({ createdAt: { $gte: d, $lte: end }, status: 'Completed' });
      const revenue = orders.reduce((s, o) => s + o.totalAmount, 0);
      const cashRevenue = orders.filter(o => o.paymentMethod === 'Cash').reduce((s, o) => s + o.totalAmount, 0);
      const instapayRevenue = orders.filter(o => o.paymentMethod === 'Instapay' || o.paymentMethod === 'Wallet').reduce((s, o) => s + o.totalAmount, 0);
      
      const profit = orders.reduce((sum, order) => {
        const orderCost = order.items.reduce((cSum, item) => cSum + (item.costPrice || 0) * item.quantity, 0);
        return sum + (order.totalAmount - orderCost);
      }, 0);

      days.push({
        date: d.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        revenue,
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

// PATCH /api/orders/:id — update order status (admin only)
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Completed', 'Returned'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update order status', error: error.message });
  }
});

// POST /api/orders/public-checkout — Public endpoint for guest user online checkout
router.post('/public-checkout', async (req, res) => {
  try {
    const { customerName, customerPhone, items, paymentMethod = 'Instapay', notes = '' } = req.body;

    if (!customerPhone || !items || items.length === 0) {
      return res.status(400).json({ message: 'الرجاء إدخال رقم الهاتف والمنتجات المطلوبة' });
    }

    const Customer = require('../models/Customer');
    const Product = require('../models/Product');
    const StockHistory = require('../models/StockHistory');

    // 1. Create or find customer
    let dbCustomer = await Customer.findOne({ phone: customerPhone.trim() });
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

    // 2. Validate product stock and gather cost prices
    const productLookups = await Promise.all(items.map(async (item) => {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`المنتج غير موجود في قاعدة البيانات: ${item.name || item.product}`);
      }

      let availableStock = product.stock ?? 0;
      let variant = null;
      if (product.variants && product.variants.length > 0) {
        variant = product.variants.find(v => v.size === item.size && v.color === item.color);
        if (variant) availableStock = variant.stock ?? 0;
      }

      if ((availableStock || 0) < Number(item.quantity || 0)) {
        throw new Error(`الكمية غير متوفرة للمنتج ${product.name} (المقاس: ${item.size || '-'}، اللون: ${item.color || '-'})`);
      }

      return {
        item,
        product,
        variant,
        costPrice: product.costPrice || 0
      };
    }));

    // 3. Construct Order Items
    const orderItems = productLookups.map(({ item, product, variant, costPrice }) => ({
      product: item.product,
      name: product.name,
      category: product.category,
      quantity: item.quantity,
      price: item.price,
      size: item.size || '',
      color: item.color || '',
      costPrice,
      variantId: variant?._id || null
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // 4. Save Customer Points (give points on checkout)
    dbCustomer.points += Math.floor(totalAmount / 100);
    await dbCustomer.save();

    // 5. Create Order
    const order = new Order({
      customer: dbCustomer._id,
      customerName: dbCustomer.name,
      customerPhone: dbCustomer.phone,
      items: orderItems,
      totalAmount,
      type: 'Online',
      status: 'Pending',
      paymentMethod,
      notes
    });
    await order.save();

    // 6. Deduct Stock & Write Stock History
    await Promise.all(productLookups.map(async ({ item, product, variant }) => {
      const qty = Number(item.quantity);
      
      if (variant) {
        const prevStock = variant.stock;
        variant.stock = Math.max(0, variant.stock - qty);
        product.stock = Math.max(0, product.stock - qty);
        product.sold += qty;
        await product.save();

        await StockHistory.create({
          product: product._id,
          productName: product.name,
          size: variant.size,
          color: variant.color,
          variantKey: `${variant.size}_${variant.color}`,
          changeType: 'POS Sale', // Treat online sale as stock deduction
          quantityChanged: -qty,
          previousStock: prevStock,
          newStock: variant.stock,
          notes: `طلب أونلاين معلق رقم #${order._id.toString().slice(-6).toUpperCase()}`
        });
      } else {
        const prevStock = product.stock;
        product.stock = Math.max(0, product.stock - qty);
        product.sold += qty;
        await product.save();

        await StockHistory.create({
          product: product._id,
          productName: product.name,
          changeType: 'POS Sale',
          quantityChanged: -qty,
          previousStock: prevStock,
          newStock: product.stock,
          notes: `طلب أونلاين معلق رقم #${order._id.toString().slice(-6).toUpperCase()}`
        });
      }

      req.app.locals.io?.emit('inventory:update', product);
    }));

    // Trigger notification
    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        title: '🛒 طلب أونلاين جديد معلق',
        message: `طلب جديد بقيمة ${totalAmount} ج.م من العميل ${dbCustomer.name} (${dbCustomer.phone}) ينتظر الموافقة.`,
        type: 'warning',
        referenceId: order._id
      });
      req.app.locals.io?.emit('notification:new');
    } catch (err) {
      console.error('Failed to create order notification:', err);
    }

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
