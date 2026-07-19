const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const bcrypt = require('bcryptjs');
const Product = require('../models/Product');
const Order = require('../models/Order');
const SiteConfig = require('../models/SiteConfig');
const User = require('../models/User');
const Shift = require('../models/Shift');
const Transaction = require('../models/Transaction');
const StockHistory = require('../models/StockHistory');
const InventoryTask = require('../models/InventoryTask');
const InventoryCount = require('../models/InventoryCount');

const router = express.Router();

const getSiteConfig = async () => {
  let config = await SiteConfig.findOne({ key: 'default' });
  if (!config) {
    config = await SiteConfig.create({ key: 'default' });
  }
  return config;
};

router.get('/overview', auth, requireRole(['admin']), async (req, res) => {
  try {
    const [products, orders, siteConfig, outTransactions] = await Promise.all([
      Product.find({ active: true }),
      Order.find().sort({ createdAt: -1 }).limit(10),
      getSiteConfig(),
      Transaction.find({ type: 'OUT' })
    ]);

    const allOrders = await Order.find({ status: 'Completed' }).populate('employee');

    const totalStock = products.reduce((sum, item) => sum + item.stock, 0);
    const totalValue = products.reduce((sum, item) => sum + item.stock * item.price, 0);
    const totalSales = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const lowStock = products.filter((item) => item.stock <= 5);

    // Net profit: sum(sellPrice - costPrice) * qty for each sold item
    const netProfit = allOrders.reduce((sum, order) => {
      const orderProfit = order.items.reduce((s, item) => {
        const profit = (item.price - (item.costPrice || 0)) * item.quantity;
        return s + profit;
      }, 0);
      return sum + orderProfit - (order.discount || 0);
    }, 0);

    const totalDiscounts = allOrders.reduce((sum, o) => sum + (o.discount || 0), 0);

    // Aggregate expenses by category
    const expenseMap = {};
    outTransactions.forEach(t => {
      const cat = t.category || 'أخرى';
      expenseMap[cat] = (expenseMap[cat] || 0) + t.amount;
    });
    const expenseBreakdown = Object.entries(expenseMap).map(([category, amount]) => ({
      category,
      amount
    }));

    // Calculate best selling products
    const productSales = {};
    allOrders.forEach(o => {
      o.items.forEach(i => {
        const key = i.name;
        productSales[key] = (productSales[key] || 0) + i.quantity;
      });
    });

    const bestSellers = Object.entries(productSales)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Calculate category breakdown
    const categorySales = {};
    allOrders.forEach(o => {
      o.items.forEach(i => {
        const qty = i.quantity - (i.returnedQuantity || 0);
        if (qty > 0) {
          categorySales[i.category] = (categorySales[i.category] || 0) + (qty * i.price);
        }
      });
    });
    const categoryBreakdown = Object.entries(categorySales).map(([category, amount]) => ({
      category,
      amount
    }));

    // Calculate employee leaderboard
    const employeeData = {};
    allOrders.forEach(o => {
      const name = o.employeeName || (o.employee && o.employee.name);
      if (name) {
        if (!employeeData[name]) {
          employeeData[name] = { amount: 0, profit: 0, orderCount: 0, itemsSold: 0, categories: {} };
        }
        const emp = employeeData[name];
        emp.amount += o.totalAmount;
        emp.orderCount += 1;
        const orderProfit = o.items.reduce((s, item) => {
          return s + ((item.price - (item.costPrice || 0)) * item.quantity);
        }, 0);
        emp.profit += orderProfit - (o.discount || 0);
        o.items.forEach(item => {
          const qty = item.quantity - (item.returnedQuantity || 0);
          if (qty > 0) {
            emp.itemsSold += qty;
            emp.categories[item.category] = (emp.categories[item.category] || 0) + qty;
          }
        });
      }
    });
    const employeeLeaderboard = Object.entries(employeeData)
      .map(([name, data]) => {
        const topCatEntry = Object.entries(data.categories).sort((a, b) => b[1] - a[1])[0];
        return {
          name,
          amount: data.amount,
          profit: data.profit,
          orderCount: data.orderCount,
          itemsSold: data.itemsSold,
          topCategory: topCatEntry ? { category: topCatEntry[0], qty: topCatEntry[1] } : null
        };
      })
      .sort((a, b) => b.amount - a.amount);

    res.json({
      products: products.length,
      totalStock,
      totalValue,
      totalSales,
      netProfit,
      totalDiscounts,
      expenseBreakdown,
      published: siteConfig.published,
      lowStock,
      bestSellers,
      categoryBreakdown,
      employeeLeaderboard,
      recentOrders: orders
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load admin overview', error: error.message });
  }
});

// GET /api/admin/products/:id/stock-history
router.get('/products/:id/stock-history', auth, requireRole(['admin']), async (req, res) => {
  try {
    const history = await StockHistory.find({ product: req.params.id })
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load stock history', error: error.message });
  }
});

// GET /site-config is public so visitors can load landing page configuration
router.get('/site-config', async (req, res) => {
  try {
    const siteConfig = await getSiteConfig();
    res.json(siteConfig);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load site settings', error: error.message });
  }
});

router.put('/site-config', auth, requireRole(['admin']), async (req, res) => {
  try {
    const siteConfig = await getSiteConfig();
    Object.assign(siteConfig, req.body);
    await siteConfig.save();
    res.json(siteConfig);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update site settings', error: error.message });
  }
});

const generateSku = async (category) => {
  // Remove hyphens from category before building prefix (e.g. T-shirt → TSH)
  const sanitized = category.replace(/-/g, '');
  const prefix = sanitized.substring(0, 3).toUpperCase();
  const lastProduct = await Product.findOne({ sku: new RegExp(`^${prefix}-`) }).sort({ sku: -1 });
  if (lastProduct && lastProduct.sku) {
    const parts = lastProduct.sku.split('-');
    const num = parseInt(parts[parts.length - 1]);
    return `${prefix}-${isNaN(num) ? 1001 : num + 1}`;
  }
  return `${prefix}-1001`;
};

router.post('/products', auth, requireRole(['admin']), async (req, res) => {
  try {
    const productData = req.body;
    if (!productData.sku) {
      productData.sku = await generateSku(productData.category);
    }
    const product = new Product(productData);
    await product.save();
    
    // Create Initial Stock History
    if (product.variants && product.variants.length > 0) {
      for (const v of product.variants) {
        if (v.stock > 0) {
          await StockHistory.create({
            product: product._id,
            productName: product.name,
            size: v.size,
            color: v.color,
            variantKey: `${v.size}_${v.color}`,
            changeType: 'Initial Stock',
            quantityChanged: v.stock,
            previousStock: 0,
            newStock: v.stock,
            performedBy: req.user.id,
            performedByName: req.user.name
          });
        }
      }
    } else if (product.stock > 0) {
      await StockHistory.create({
        product: product._id,
        productName: product.name,
        changeType: 'Initial Stock',
        quantityChanged: product.stock,
        previousStock: 0,
        newStock: product.stock,
        performedBy: req.user.id,
        performedByName: req.user.name
      });
    }

    res.status(201).json(product);
  } catch (error) {
    console.error('Failed to create product:', error);
    res.status(500).json({ message: 'Unable to create product', error: error.message });
  }
});

router.put('/products/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    req.app.locals.io?.emit('inventory:update', product);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update product', error: error.message });
  }
});

router.delete('/products/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.active = false;
    await product.save();
    req.app.locals.io?.emit('inventory:update', product);
    res.json({ message: 'Product archived' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to archive product', error: error.message });
  }
});

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
    
    const Customer = require('../models/Customer');
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

// ─── User Management (admin only) ─────────────────────────────────────────

// GET /api/admin/users — list all staff users
router.get('/users', auth, requireRole(['admin']), async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['admin', 'cashier', 'manager', 'employee'] } })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load users', error: error.message });
  }
});

// POST /api/admin/users — create a new cashier/manager/employee account
router.post('/users', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, password, role = 'cashier', phone, employeeId } = req.body;
    if (!['cashier', 'manager', 'admin', 'employee'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already in use' });
    const user = new User({ name, email, password, role, phone: phone || '' });
    await user.save();

    // Link employee to this User
    if (role === 'employee' && employeeId) {
      const Employee = require('../models/Employee');
      const emp = await Employee.findById(employeeId);
      if (emp) {
        emp.user = user._id;
        if (phone) {
          emp.phone = phone;
        } else if (emp.phone) {
          user.phone = emp.phone;
          await user.save();
        }
        await emp.save();
      }
    }

    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Unable to create user', error: error.message });
  }
});

// PATCH /api/admin/users/:id/toggle — enable/disable a user account
router.patch('/users/:id/toggle', auth, requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.active = user.active === false ? true : false;
    await user.save();
    res.json({ id: user.id, active: user.active });
  } catch (error) {
    res.status(500).json({ message: 'Unable to toggle user', error: error.message });
  }
});

// PATCH /api/admin/users/:id/password — reset a user's password (Admin only)
router.patch('/users/:id/password', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot change admin password from here' });
    user.password = password; // will be hashed by pre-save hook
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to change password', error: error.message });
  }
});

// DELETE /api/admin/users/:id — remove a cashier account
router.delete('/users/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot delete admin user' });
    await user.deleteOne();
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete user', error: error.message });
  }
});

// POST /api/admin/reset-transactions-prod — secure production reset
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

module.exports = router;
