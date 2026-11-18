const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const Order = require('../../models/Order');
const Customer = require('../../models/Customer');

const router = express.Router();

// ─── Customer Management (CRM) ──────────────────────────────────────────────

router.get('/customers', auth, requireRole(['admin']), async (req, res) => {
  try {
    const orders = await Order.find({ 
      status: 'Completed',
      $or: [
        { customerPhone: { $ne: '' } },
        { customerName: { $ne: '' } }
      ]
    }).sort({ createdAt: -1 });

    const customersMap = {};

    orders.forEach(order => {
      const key = order.customerPhone || order.customerName; // Phone preferred
      if (!customersMap[key]) {
        customersMap[key] = {
          name: order.customerName || 'بدون اسم',
          phone: order.customerPhone || 'بدون رقم',
          totalSpent: 0,
          ordersCount: 0,
          lastOrderDate: order.createdAt,
          orders: []
        };
      }
      
      customersMap[key].totalSpent += order.totalAmount;
      customersMap[key].ordersCount += 1;
      customersMap[key].orders.push({
        id: order._id,
        date: order.createdAt,
        total: order.totalAmount,
        items: order.items.map(i => ({ name: i.name, qty: i.quantity, price: i.price, size: i.size, color: i.color }))
      });

      // Keep the most recent order date
      if (new Date(order.createdAt) > new Date(customersMap[key].lastOrderDate)) {
        customersMap[key].lastOrderDate = order.createdAt;
      }
    });

    const customersList = Object.values(customersMap).sort((a, b) => b.totalSpent - a.totalSpent);
    
    await Promise.all(customersList.map(async (c) => {
      const dbCust = await Customer.findOne({ phone: c.phone });
      c.points = dbCust ? dbCust.points : 0;
      c.debt = dbCust ? dbCust.debt : 0;
    }));

    res.json(customersList);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load customers', error: error.message });
  }
});

// PUT /api/admin/customers/update
router.put('/customers/update', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { oldPhone, oldName, newPhone, newName } = req.body;
    const query = oldPhone ? { customerPhone: oldPhone } : { customerName: oldName };
    const result = await Order.updateMany(query, {
      $set: {
        customerName: newName,
        customerPhone: newPhone
      }
    });
    res.json({ message: 'Customer updated successfully', modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update customer', error: error.message });
  }
});

// POST /api/admin/customers/delete
router.post('/customers/delete', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { phone, name } = req.body;
    const query = phone ? { customerPhone: phone } : { customerName: name };
    const result = await Order.updateMany(query, {
      $set: {
        customerName: '',
        customerPhone: ''
      }
    });
    res.json({ message: 'Customer deleted successfully', modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete customer', error: error.message });
  }
});


module.exports = router;
