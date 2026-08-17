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
const SupplierTransaction = require('../models/SupplierTransaction');

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

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
    const { period = 'current', from, to } = req.query;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let startDate, endDate;

    if (from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'previous') {
      let prevYear = currentYear;
      let prevMonth = currentMonth - 1;
      if (prevMonth < 1) { prevMonth = 12; prevYear -= 1; }
      startDate = new Date(prevYear, prevMonth - 1, 1, 0, 0, 0, 0);
      endDate = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);
    } else if (period === 'all') {
      startDate = new Date(2000, 0, 1);
      endDate = new Date(2099, 11, 31);
    } else {
      // Default: Current Active Month (Auto-resets to 0 on day 1 of every month!)
      startDate = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
      endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    }

    const [products, recentOrders, siteConfig, outTransactions, supplierTxs, periodOrders] = await Promise.all([
      Product.find({ active: true }),
      Order.find().sort({ createdAt: -1 }).limit(10),
      getSiteConfig(),
      Transaction.find({ createdAt: { $gte: startDate, $lte: endDate } }),
      SupplierTransaction.find({ date: { $gte: startDate, $lte: endDate } }),
      Order.find({
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'Completed'
      }).populate('employee')
    ]);

    const totalStock = products.reduce((sum, item) => sum + item.stock, 0);
    const totalValue = Math.round(products.reduce((sum, item) => sum + item.stock * item.price, 0));
    const totalSales = Math.round(periodOrders.reduce((sum, order) => sum + order.totalAmount, 0));
    const lowStock = products.filter((item) => item.stock <= 5);

    const isInternalMovement = (t) => {
      const cat = (t.category || '').toLowerCase();
      return cat === 'shiftopen' || cat === 'shiftclose' || cat === 'transfer' || cat === 'safetransfer';
    };

    const isSupplierTx = (t) => {
      if (t.type !== 'OUT') return false;
      if (isInternalMovement(t)) return false;
      const cat = (t.category || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      if (cat === 'refund' || cat.includes('مرتجع') || cat === 'sale' || cat === 'debtpayment') return false;
      return (
        cat === 'supplierpayment' ||
        cat === 'supplierpurchase' ||
        cat.includes('مورد') ||
        cat.includes('بضاعة') ||
        desc.includes('مورد') ||
        desc.includes('بضاعة')
      );
    };

    const isRefundTx = (t) => {
      if (t.type !== 'OUT') return false;
      const cat = (t.category || '').toLowerCase();
      return cat === 'refund' || cat.includes('مرتجع');
    };

    const isPersonalTx = (t) => {
      if (t.type !== 'OUT') return false;
      const cat = (t.category || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      return (
        cat === 'personalwithdrawal' ||
        cat.includes('مسحوبات') ||
        cat.includes('شخصي') ||
        cat.includes('جمعية') ||
        cat.includes('جمعيه') ||
        desc.includes('مسحوبات شخصية') ||
        desc.includes('جمعيه بيد ام ادم')
      );
    };

    let operatingExpenses = 0;
    let supplierPurchases = 0;
    let personalWithdrawals = 0;
    const expenseMap = {};

    outTransactions.forEach(t => {
      if (isPersonalTx(t)) {
        personalWithdrawals += t.amount;
      } else if (t.type === 'OUT' && !isSupplierTx(t) && !isInternalMovement(t) && !isRefundTx(t)) {
        const cat = t.category || 'أخرى';
        expenseMap[cat] = (expenseMap[cat] || 0) + t.amount;
        operatingExpenses += t.amount;
      }
    });

    supplierTxs.forEach(st => {
      if (st.type === 'payment' || st.type === 'purchase' || st.type === 'cash_purchase') {
        supplierPurchases += st.amount;
      }
    });

    outTransactions.forEach(t => {
      if (isSupplierTx(t)) {
        const isAlreadyInSupplierTx = t.referenceId && supplierTxs.some(st => st._id.toString() === t.referenceId.toString());
        if (!isAlreadyInSupplierTx) {
          supplierPurchases += t.amount;
        }
      }
    });

    let cogs = 0;
    let grossProfit = 0;

    periodOrders.forEach(order => {
      const orderCost = order.items.reduce((s, item) => {
        const netQty = Math.max(0, item.quantity - (item.returnedQuantity || 0));
        return s + (item.costPrice || 0) * netQty;
      }, 0);

      cogs += orderCost;
      const effectiveRevenue = order.isDebt ? (order.amountPaid || 0) : order.totalAmount;
      grossProfit += (effectiveRevenue - orderCost);
    });

    cogs = Math.round(cogs);
    grossProfit = Math.round(grossProfit);
    operatingExpenses = Math.round(operatingExpenses);
    supplierPurchases = Math.round(supplierPurchases);
    const netProfit = Math.round(grossProfit - operatingExpenses);
    const totalDiscounts = Math.round(periodOrders.reduce((sum, o) => sum + (o.discount || 0), 0));

    // Calculate best selling products
    const productSales = {};
    periodOrders.forEach(o => {
      o.items.forEach(i => {
        const netQty = Math.max(0, i.quantity - (i.returnedQuantity || 0));
        if (netQty > 0) {
          productSales[i.name] = (productSales[i.name] || 0) + netQty;
        }
      });
    });

    const bestSellers = Object.entries(productSales)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Calculate category breakdown
    const categorySales = {};
    periodOrders.forEach(o => {
      o.items.forEach(i => {
        const netQty = Math.max(0, i.quantity - (i.returnedQuantity || 0));
        if (netQty > 0 && i.category) {
          categorySales[i.category] = (categorySales[i.category] || 0) + (netQty * i.price);
        }
      });
    });

    const categoryBreakdown = Object.entries(categorySales).map(([category, amount]) => ({
      category,
      amount
    }));

    // Calculate employee leaderboard
    const employeeData = {};
    periodOrders.forEach(o => {
      const name = o.employeeName || (o.employee && o.employee.name);
      if (name) {
        if (!employeeData[name]) {
          employeeData[name] = { amount: 0, profit: 0, orderCount: 0, itemsSold: 0, categories: {} };
        }
        const emp = employeeData[name];
        emp.amount += o.totalAmount;
        emp.orderCount += 1;
        const orderCost = o.items.reduce((s, item) => {
          const netQty = Math.max(0, item.quantity - (item.returnedQuantity || 0));
          return s + (item.costPrice || 0) * netQty;
        }, 0);
        emp.profit += (o.totalAmount - orderCost);
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
      period,
      monthName: `${ARABIC_MONTHS[currentMonth - 1]} ${currentYear}`,
      products: products.length,
      totalStock,
      totalValue,
      totalSales,
      grossProfit,
      cogs,
      netProfit,
      operatingExpenses,
      supplierPurchases,
      totalExpenses: operatingExpenses + supplierPurchases,
      totalDiscounts,
      totalOrders: periodOrders.length,
      recentOrders,
      lowStockProducts: lowStock.map((p) => ({ id: p._id, name: p.name, stock: p.stock, category: p.category })),
      expenseBreakdown: Object.entries(expenseMap).map(([category, amount]) => ({ category, amount })),
      bestSellers,
      categoryBreakdown,
      employeeLeaderboard,
      siteConfig
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load dashboard overview', error: error.message });
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

const sanitizeSku = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
};

const generateSku = async () => {
  const products = await Product.find({}, { sku: 1 }).lean();
  let maxNum = 1000;

  for (const p of products) {
    if (p.sku) {
      const digits = p.sku.replace(/[^0-9]/g, '');
      const num = parseInt(digits, 10);
      if (!isNaN(num) && num > maxNum && num <= 99999) {
        maxNum = num;
      }
    }
  }

  return (maxNum + 1).toString();
};

router.post('/products', auth, requireRole(['admin']), async (req, res) => {
  try {
    const productData = req.body;
    const cleanedSku = sanitizeSku(productData.sku);
    if (cleanedSku) {
      productData.sku = cleanedSku;
    } else {
      productData.sku = await generateSku();
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
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) return res.status(404).json({ message: 'Product not found' });

    const cleanedInputSku = sanitizeSku(req.body.sku);

    if (cleanedInputSku) {
      req.body.sku = cleanedInputSku;
    } else if (existingProduct.sku && existingProduct.sku.trim()) {
      // Retain existing SKU unconditionally
      req.body.sku = existingProduct.sku.trim();
    } else {
      // If product has no SKU at all in DB, generate one now
      req.body.sku = await generateSku();
    }

    if (existingProduct.sku && existingProduct.sku !== req.body.sku && !req.body.oldSku) {
      req.body.oldSku = existingProduct.sku;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
    
    // Self-healing: Resolve and sync phone number from linked Employee if user.phone is missing or incorrect
    const Employee = require('../models/Employee');
    const enrichedUsers = await Promise.all(users.map(async (u) => {
      if (u.role === 'employee') {
        let emp = await Employee.findOne({ user: u._id });
        if (!emp) {
          emp = await Employee.findOne({ name: u.name });
          if (emp && !emp.user) {
            emp.user = u._id;
            await emp.save();
          }
        }
        if (emp && emp.phone && u.phone !== emp.phone) {
          u.phone = emp.phone;
          await u.save();
        }
      }
      return u;
    }));

    res.json(enrichedUsers);
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
