const express = require('express');
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Shift = require('../models/Shift');

const router = express.Router();

router.post('/sell', auth, async (req, res) => {
  try {
    const { customerId, sellerId, items, type = 'Offline', paymentMethod = 'Cash', discount = 0 } = req.body;

    const productLookups = await Promise.all(items.map(async (item) => {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product ${item.name || item.product} not found`);
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
      return {
        item,
        product,
        variant,
        costPrice
      };
    }));

    const orderItems = productLookups.map(({ item, product, variant, costPrice }) => ({
      product: item.product,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      price: item.price,
      size: item.size || '',
      color: item.color || '',
      costPrice,
      variantId: variant?._id || null
    }));

    const rawTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalAmount = Math.max(0, rawTotal - Number(discount));

    const order = new Order({
      customer: customerId,
      seller: sellerId || req.user.id,
      items: orderItems,
      totalAmount,
      discount: Number(discount),
      type,
      status: 'Completed',
      paymentMethod
    });
    await order.save();

    await Promise.all(productLookups.map(async ({ item, product, variant }) => {
      if (variant) {
        variant.stock = Math.max(0, variant.stock - item.quantity);
      } else {
        product.stock = Math.max(0, product.stock - item.quantity);
      }
      product.sold += item.quantity;
      await product.save();
      req.app.locals.io?.emit('inventory:update', product);
    }));

    const openShift = await Shift.findOne({ user: sellerId || req.user.id, status: 'open' });
    const transaction = new Transaction({
      amount: totalAmount,
      type: 'IN',
      category: 'Sale',
      paymentMethod: order.paymentMethod,
      description: `مبيعات طلب #${order._id.toString().slice(-6).toUpperCase()}`,
      referenceId: order._id,
      user: sellerId || req.user.id,
      shift: openShift?._id
    });
    await transaction.save();

    res.status(201).json({ order, message: 'Sale completed' });
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
    const { orderId, reason, returnItems } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.recovered) return res.status(400).json({ message: 'Order already recovered' });

    // Determine which items to return
    const itemsToReturn = returnItems && returnItems.length > 0
      ? order.items.filter(oi => returnItems.find(ri => ri.itemId === oi._id.toString()))
          .map(oi => {
            const ri = returnItems.find(r => r.itemId === oi._id.toString());
            return { ...oi.toObject(), quantity: Math.min(ri.quantity, oi.quantity) };
          })
      : order.items.map(oi => oi.toObject()); // full return

    const isFullReturn = !returnItems || returnItems.length === 0;

    let refundAmount;
    if (isFullReturn) {
      refundAmount = order.totalAmount;
    } else {
      const originalOrderTotal = order.totalAmount + order.discount;
      if (originalOrderTotal > 0) {
        const returnedItemsValue = itemsToReturn.reduce((sum, ri) => sum + ri.price * ri.quantity, 0);
        // Calculate refund amount proportionally to the total amount paid
        const refundProportion = returnedItemsValue / originalOrderTotal;
        refundAmount = Math.round((order.totalAmount * refundProportion) * 100) / 100;
      } else {
        refundAmount = 0;
      }
    }

    if (isFullReturn) {
      order.status = 'Returned';
      order.recovered = true;
    }
    await order.save();

    await Promise.all(itemsToReturn.map(async (item) => {
      const product = await Product.findById(item.product);
      if (!product) return;
      if (product.variants && product.variants.length > 0) {
        const variant = product.variants.find(v => v.size === item.size && v.color === item.color);
        if (variant) variant.stock += item.quantity;
      } else {
        product.stock += item.quantity;
      }
      product.sold = Math.max(0, product.sold - item.quantity);
      await product.save();
      req.app.locals.io?.emit('inventory:update', product);
    }));

    const transaction = new Transaction({
      amount: refundAmount,
      type: 'OUT',
      category: 'Refund',
      paymentMethod: order.paymentMethod,
      description: `مرتجع ${isFullReturn ? 'كامل' : 'جزئي'} طلب #${order._id.toString().slice(-6).toUpperCase()} - السبب: ${reason || 'غير محدد'}`,
      referenceId: order._id,
      user: req.user.id
    });
    await transaction.save();

    res.json({ order, refundAmount, returnedItems: itemsToReturn, message: isFullReturn ? 'Full return processed' : 'Partial return processed' });
  } catch (error) {
    res.status(500).json({ message: 'Recovery failed', error: error.message });
  }
});

router.patch('/storage/:productId', auth, async (req, res) => {
  try {
    const { adjustment, size, color } = req.body;
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    if (product.variants && product.variants.length > 0 && size && color) {
      const variant = product.variants.find(v => v.size === size && v.color === color);
      if (variant) {
        variant.stock = Math.max(0, variant.stock + Number(adjustment));
      }
    } else {
      product.stock = Math.max(0, product.stock + Number(adjustment));
    }
    await product.save();
    req.app.locals.io?.emit('inventory:update', product);
    res.json({ product, message: 'Storage updated' });
  } catch (error) {
    res.status(500).json({ message: 'Storage update failed', error: error.message });
  }
});

module.exports = router;
