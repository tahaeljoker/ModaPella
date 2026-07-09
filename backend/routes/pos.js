const express = require('express');
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Shift = require('../models/Shift');
const StockHistory = require('../models/StockHistory');

const router = express.Router();

router.post('/sell', auth, async (req, res) => {
  try {
    const { customerId, customerName, customerPhone, sellerId, employeeId, items, type = 'Offline', paymentMethod = 'Cash', discount = 0, notes = '' } = req.body;

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

    let employeeName = '';
    if (employeeId) {
      const Employee = require('../models/Employee');
      const empDb = await Employee.findById(employeeId);
      if (empDb) employeeName = empDb.name;
    }

    const order = new Order({
      customer: customerId,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      seller: sellerId || req.user.id,
      employee: employeeId || null,
      employeeName: employeeName,
      items: orderItems,
      totalAmount,
      discount: Number(discount),
      type,
      status: 'Completed',
      paymentMethod,
      notes: notes || ''
    });
    await order.save();

    await Promise.all(productLookups.map(async ({ item, product, variant }) => {
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

      // Log stock history
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
        notes: `مبيعات فاتورة #${order._id.toString().slice(-6).toUpperCase()}`
      });
      await history.save();

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

    let itemsToReturn = [];
    const isFullReturn = !returnItems || returnItems.length === 0;

    if (isFullReturn) {
      // Return all remaining quantities for all items
      order.items.forEach(item => {
        const remainingQty = item.quantity - (item.returnedQuantity || 0);
        if (remainingQty > 0) {
          itemsToReturn.push({
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
      // Validate and return specified quantities
      for (const ri of returnItems) {
        const item = order.items.id(ri.itemId);
        if (!item) {
          return res.status(400).json({ message: `صنف الفاتورة #${ri.itemId} غير موجود` });
        }
        const remainingQty = item.quantity - (item.returnedQuantity || 0);
        if (ri.quantity > remainingQty) {
          return res.status(400).json({ message: `الكمية المرتجعة للـ ${item.name} (${ri.quantity}) أكبر من الكمية المتاحة للإرجاع (${remainingQty})` });
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
    }

    if (itemsToReturn.length === 0) {
      return res.status(400).json({ message: 'لا توجد قطع متبقية للإرجاع في هذا الطلب' });
    }

    // Check if order is fully recovered now
    const fullyRecovered = order.items.every(item => (item.returnedQuantity || 0) === item.quantity);
    if (fullyRecovered) {
      order.status = 'Returned';
      order.recovered = true;
    }

    await order.save();

    // Revert inventory stocks
    await Promise.all(itemsToReturn.map(async (item) => {
      const product = await Product.findById(item.product);
      if (!product) return;
      let prevStock = 0;
      let variant = null;
      if (product.variants && product.variants.length > 0) {
        variant = product.variants.find(v => v.size === item.size && v.color === item.color);
        if (variant) {
          prevStock = variant.stock;
          variant.stock += item.quantity;
        }
      } else {
        prevStock = product.stock;
        product.stock += item.quantity;
      }
      if (product.variants && product.variants.length > 0) {
        product.stock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      }
      product.sold = Math.max(0, product.sold - item.quantity);
      await product.save();

      // Log stock history
      const history = new StockHistory({
        product: product._id,
        productName: product.name,
        size: item.size || '',
        color: item.color || '',
        variantKey: variant ? `${item.size}_${item.color}` : '',
        changeType: 'Refund',
        quantityChanged: item.quantity,
        previousStock: prevStock,
        newStock: variant ? variant.stock : product.stock,
        performedBy: req.user.id,
        referenceId: order._id,
        notes: `مرتجع فاتورة #${order._id.toString().slice(-6).toUpperCase()} - السبب: ${reason || 'غير محدد'}`
      });
      await history.save();

      req.app.locals.io?.emit('inventory:update', product);
    }));

    // Calculate refund amount proportionally
    const originalOrderTotal = order.totalAmount + order.discount;
    let refundAmount = 0;
    if (originalOrderTotal > 0) {
      const returnedItemsValue = itemsToReturn.reduce((sum, ri) => sum + ri.price * ri.quantity, 0);
      const refundProportion = returnedItemsValue / originalOrderTotal;
      refundAmount = Math.round((order.totalAmount * refundProportion) * 100) / 100;
    }

    // Log the refund transaction
    const transaction = new Transaction({
      amount: refundAmount,
      type: 'OUT',
      category: 'Refund',
      paymentMethod: order.paymentMethod,
      description: `مرتجع ${fullyRecovered ? 'كامل' : 'جزئي'} طلب #${order._id.toString().slice(-6).toUpperCase()} - السبب: ${reason || 'غير محدد'}`,
      referenceId: order._id,
      user: req.user.id
    });
    await transaction.save();

    res.json({ order, refundAmount, returnedItems: itemsToReturn, message: fullyRecovered ? 'Full return processed' : 'Partial return processed' });
  } catch (error) {
    res.status(500).json({ message: 'Recovery failed', error: error.message });
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
      const product = await Product.findById(item.product);
      if (!product) throw new Error(`Product ${item.name || item.product} not found`);

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
      return { item, product, variant, costPrice };
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
    order.paymentMethod = paymentMethod;
    order.type = type;
    order.notes = notes || '';
    
    await order.save();

    // Deduct stock for new items
    await Promise.all(productLookups.map(async ({ item, product, variant }) => {
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
    const transaction = await Transaction.findOne({ referenceId: order._id });
    if (transaction) {
      transaction.amount = totalAmount;
      transaction.paymentMethod = paymentMethod;
      transaction.description = `مبيعات طلب #${order._id.toString().slice(-6).toUpperCase()} (معدل)`;
      await transaction.save();
    } else {
      // If missing for some reason, create it
      const openShift = await Shift.findOne({ user: order.seller || req.user.id, status: 'open' });
      const newTransaction = new Transaction({
        amount: totalAmount,
        type: 'IN',
        category: 'Sale',
        paymentMethod: order.paymentMethod,
        description: `مبيعات طلب #${order._id.toString().slice(-6).toUpperCase()} (تم التعديل)`,
        referenceId: order._id,
        user: order.seller || req.user.id,
        shift: openShift?._id
      });
      await newTransaction.save();
    }

    res.json({ order, message: 'Order updated successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Update failed', error: error.message });
  }
});

module.exports = router;
