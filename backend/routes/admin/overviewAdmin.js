const express = require('express');
const mongoose = require('mongoose');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const SiteConfig = require('../../models/SiteConfig');
const User = require('../../models/User');
const Shift = require('../../models/Shift');
const Transaction = require('../../models/Transaction');
const StockHistory = require('../../models/StockHistory');
const InventoryTask = require('../../models/InventoryTask');
const InventoryCount = require('../../models/InventoryCount');
const Supplier = require('../../models/Supplier');
const SupplierTransaction = require('../../models/SupplierTransaction');
const { calculateMonthlyData } = require('../../services/monthlyReportService');

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const router = express.Router();

const getSiteConfig = async () => {
  let config = await SiteConfig.findOne({ key: 'default' });
  if (!config) {
    config = await SiteConfig.create({ key: 'default' });
  } else {
    let needsSave = false;
    if (!config.features) {
      config.features = {
        outfitter: false,
        lookbook: false,
        mannequinComparison: true,
        productComparison: true,
        coupons: true,
        shareOutfit: true,
        bestSellers: true,
        socialProof: true
      };
      needsSave = true;
    }
    if (!config.heroImages || config.heroImages.length === 0) {
      config.heroImages = [
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=85'
      ];
      needsSave = true;
    }
    if (needsSave) {
      await config.save();
    }
  }
  return config;
};

const parseAnalyticsDateRange = ({ period, from, to }) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  let startDate = null;
  let endDate = null;
  let activePeriod = period || (from && to ? 'custom' : 'all');
  let label = 'كل الفترات';

  if (from && to) {
    startDate = new Date(from);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);
    activePeriod = 'custom';
    label = `من ${from} إلى ${to}`;
  } else if (period === 'current' || period === 'this_month') {
    startDate = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
    endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    activePeriod = 'current';
    label = `هذا الشهر (${ARABIC_MONTHS[currentMonth - 1]} ${currentYear})`;
  } else if (period === 'previous' || period === 'last_month') {
    let targetYear = currentYear;
    let targetMonth = currentMonth - 1;
    if (targetMonth < 1) {
      targetMonth = 12;
      targetYear -= 1;
    }
    startDate = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
    endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    activePeriod = 'previous';
    label = `الشهر السابق (${ARABIC_MONTHS[targetMonth - 1]} ${targetYear})`;
  } else if (period === 'last_7_days') {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    activePeriod = 'last_7_days';
    label = 'آخر 7 أيام';
  } else if (period === 'last_30_days') {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    activePeriod = 'last_30_days';
    label = 'آخر 30 يوم';
  } else {
    startDate = null;
    endDate = null;
    activePeriod = 'all';
    label = 'كل الفترات';
  }

  return { startDate, endDate, activePeriod, label };
};

router.get('/overview', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { period = 'current', from, to } = req.query;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let startDate, endDate;

    if (!from && !to && (period === 'current' || period === 'previous')) {
      let targetYear = currentYear;
      let targetMonth = currentMonth;
      if (period === 'previous') {
        targetMonth -= 1;
        if (targetMonth < 1) { targetMonth = 12; targetYear -= 1; }
      }

      const [products, recentOrders, siteConfig, monthlyData, allInstapayTxs, allCashTxs] = await Promise.all([
        Product.find({ active: true }),
        Order.find().sort({ createdAt: -1 }).limit(10),
        getSiteConfig(),
        calculateMonthlyData(targetYear, targetMonth),
        Transaction.find({ paymentMethod: { $in: ['Instapay', 'Wallet'] } }),
        Transaction.find({ paymentMethod: 'Cash' })
      ]);

      let currentInstapayBalance = 0;
      allInstapayTxs.forEach(t => {
        if (t.type === 'IN') currentInstapayBalance += t.amount;
        if (t.type === 'OUT') currentInstapayBalance -= t.amount;
      });
      currentInstapayBalance = Math.round(currentInstapayBalance);

      let cashDrawer = 0;
      allCashTxs.forEach(t => {
        const cat = (t.category || '').toLowerCase();
        if (cat === 'shiftclose' || cat === 'shiftopen') return;
        if (t.type === 'IN') cashDrawer += t.amount;
        if (t.type === 'OUT') cashDrawer -= t.amount;
      });
      cashDrawer = Math.round(cashDrawer);

      const totalStock = products.reduce((sum, item) => sum + item.stock, 0);
      const totalValue = Math.round(products.reduce((sum, item) => sum + item.stock * item.price, 0));
      const lowStock = products.filter((item) => item.stock <= 5);

      return res.json({
        period,
        monthName: monthlyData.monthName,
        products: products.length,
        totalStock,
        totalValue,
        grossSales: monthlyData.grossSales,
        totalSales: monthlyData.totalSales,
        totalRefunds: monthlyData.totalRefunds ?? 0,
        refundsCash: monthlyData.refundsCash ?? 0,
        refundsInstapay: monthlyData.refundsInstapay ?? 0,
        refundsCount: monthlyData.refundsCount ?? 0,
        previousRefundsAmount: monthlyData.previousRefundsAmount ?? 0,
        previousRefundsCount: monthlyData.previousRefundsCount ?? 0,
        orderReturnsTotal: monthlyData.orderReturnsTotal ?? 0,
        refundsList: monthlyData.auditDetails?.refundsList || [],
        grossProfit: monthlyData.grossProfit,
        cogs: monthlyData.cogs,
        netProfit: monthlyData.netProfit,
        operatingExpenses: monthlyData.operatingExpenses,
        supplierPurchases: monthlyData.supplierPurchases,
        supplierCashPaid: monthlyData.supplierCashPaid,
        supplierPaidFromSafe: monthlyData.supplierPaidFromSafe,
        personalWithdrawals: monthlyData.personalWithdrawals,
        personalWithdrawalsList: monthlyData.auditDetails?.personalWithdrawalsList || [],
        netCashFlow: monthlyData.netCashFlow,
        salesCashCollected: monthlyData.salesCashCollected,
        salesInstapayCollected: monthlyData.salesInstapayCollected,
        instapayRevenue: monthlyData.instapayRevenue ?? monthlyData.salesInstapayCollected,
        currentInstapayBalance,
        cashDrawer,
        salesDebtRemaining: monthlyData.salesDebtRemaining,
        totalExpenses: monthlyData.totalExpenses,
        totalDiscounts: monthlyData.totalDiscounts,
        totalOrders: monthlyData.totalOrders,
        recentOrders,
        lowStock: lowStock.map((p) => ({ id: p._id, name: p.name, stock: p.stock, category: p.category })),
        lowStock: lowStock.map((p) => ({ id: p._id, name: p.name, stock: p.stock, category: p.category })),
        lowStock: lowStock.map((p) => ({ id: p._id, name: p.name, stock: p.stock, category: p.category })),
      lowStockProducts: lowStock.map((p) => ({ id: p._id, name: p.name, stock: p.stock, category: p.category })),
        expenseBreakdown: monthlyData.expenseBreakdown,
        bestSellers: monthlyData.bestSellers,
        categoryBreakdown: monthlyData.categoryBreakdown,
        employeeLeaderboard: (monthlyData.employeePerformance || []).map(e => ({
          name: e.name,
          amount: e.amount,
          profit: e.profit,
          orderCount: e.orderCount,
          itemsSold: e.itemsSold,
          topCategory: null
        })),
        siteConfig
      });
    }

    if (from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'all') {
      startDate = new Date(2000, 0, 1);
      endDate = new Date(2099, 11, 31);
    } else {
      startDate = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
      endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    }

    const [products, recentOrders, siteConfig, outTransactions, supplierTxs, periodOrders, allInstapayTxs, allCashTxs] = await Promise.all([
      Product.find({ active: true }),
      Order.find().sort({ createdAt: -1 }).limit(10),
      getSiteConfig(),
      Transaction.find({ createdAt: { $gte: startDate, $lte: endDate } }),
      SupplierTransaction.find({ date: { $gte: startDate, $lte: endDate } }),
      Order.find({
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ['Completed', 'Returned'] }
      }).populate('employee'),
      Transaction.find({ paymentMethod: { $in: ['Instapay', 'Wallet'] } }),
      Transaction.find({ paymentMethod: 'Cash' })
    ]);

    let currentInstapayBalance = 0;
    allInstapayTxs.forEach(t => {
      if (t.type === 'IN') currentInstapayBalance += t.amount;
      if (t.type === 'OUT') currentInstapayBalance -= t.amount;
    });
    currentInstapayBalance = Math.round(currentInstapayBalance);

    let cashDrawer = 0;
    allCashTxs.forEach(t => {
      const cat = (t.category || '').toLowerCase();
      if (cat === 'shiftclose' || cat === 'shiftopen') return;
      if (t.type === 'IN') cashDrawer += t.amount;
      if (t.type === 'OUT') cashDrawer -= t.amount;
    });
    cashDrawer = Math.round(cashDrawer);

    const totalStock = products.reduce((sum, item) => sum + item.stock, 0);
    const totalValue = Math.round(products.reduce((sum, item) => sum + item.stock * item.price, 0));
    const grossBilledSales = Math.round(periodOrders.reduce((sum, order) => sum + (order.isManualDebt ? 0 : order.totalAmount), 0));
    const lowStock = products.filter((item) => item.stock <= 5);

    const isInternalMovement = (t) => {
      const cat = (t.category || '').toLowerCase().replace(/\s+/g, '');
      const desc = (t.description || '').toLowerCase();
      return (
        cat === 'shiftopen' ||
        cat === 'shiftclose' ||
        cat === 'transfer' ||
        cat === 'safetransfer' ||
        cat.includes('transfer') ||
        cat.includes('تحويل') ||
        desc.includes('تحويل')
      );
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
        cat.includes('شخصى') ||
        cat.includes('جمعية') ||
        cat.includes('جمعيه') ||
        desc.includes('مسحوبات') ||
        desc.includes('شخصي') ||
        desc.includes('شخصى') ||
        desc.includes('جمعية') ||
        desc.includes('جمعيه') ||
        desc.includes('سلفة') ||
        desc.includes('سلفه') ||
        (/(?:^|\s)(?:آدم|ادم)(?:$|\s)/.test(desc) && !desc.includes('ادمن'))
      );
    };

    let operatingExpenses = 0;
    let supplierPurchases = 0;
    let supplierCashPaid = 0;
    let personalWithdrawals = 0;
    let refundsCash = 0;
    let refundsInstapay = 0;
    let totalRefunds = 0;
    const expenseMap = {};
    const operatingExpensesList = [];
    const personalWithdrawalsList = [];
    const refundsList = [];

    outTransactions.forEach(t => {
      if (isPersonalTx(t)) {
        personalWithdrawals += t.amount;
        personalWithdrawalsList.push({
          id: t._id,
          category: t.category || 'مسحوبات شخصية',
          amount: t.amount,
          description: t.description || 'مسحوبات شخصية / جمعية',
          date: t.createdAt
        });
      } else if (isRefundTx(t)) {
        totalRefunds += t.amount;
        if (t.paymentMethod === 'Cash') {
          refundsCash += t.amount;
        } else {
          refundsInstapay += t.amount;
        }
        refundsList.push({
          id: t._id,
          referenceId: t.referenceId,
          category: t.category || 'Refund',
          amount: t.amount,
          paymentMethod: t.paymentMethod || 'Cash',
          description: t.description || 'مرتجع عميل',
          date: t.createdAt
        });
      } else if (t.type === 'OUT' && !isSupplierTx(t) && !isInternalMovement(t)) {
        const cat = t.category || 'أخرى';
        expenseMap[cat] = (expenseMap[cat] || 0) + t.amount;
        operatingExpenses += t.amount;
        operatingExpensesList.push({
          id: t._id,
          category: t.category || 'أخرى',
          amount: t.amount,
          description: t.description || '',
          date: t.createdAt
        });
      }
    });

    supplierTxs.forEach(st => {
      if (st.type === 'purchase') {
        supplierPurchases += st.amount;
      }
      if (st.type === 'payment') {
        supplierCashPaid += st.amount;
      }
    });

    outTransactions.forEach(t => {
      if (isSupplierTx(t)) {
        const isAlreadyInSupplierTx = t.referenceId && supplierTxs.some(st => st._id.toString() === t.referenceId.toString());
        if (!isAlreadyInSupplierTx) {
          supplierPurchases += t.amount;
          supplierCashPaid += t.amount;
        }
      }
    });

    let cogs = 0;
    let grossCashCollected = 0;
    let grossInstapayCollected = 0;

    periodOrders.forEach(order => {
      if (order.isManualDebt) return;

      const paidAmount = order.isDebt ? (order.amountPaid || 0) : order.totalAmount;
      if (order.paymentMethod === 'Cash') {
        grossCashCollected += paidAmount;
      } else {
        grossInstapayCollected += paidAmount;
      }

      const orderCost = order.items.reduce((s, item) => {
        const netQty = Math.max(0, item.quantity - (item.returnedQuantity || 0));
        return s + (item.costPrice || 0) * netQty;
      }, 0);

      cogs += orderCost;
    });

    cogs = Math.round(cogs);
    totalRefunds = Math.round(totalRefunds);
    refundsCash = Math.round(refundsCash);
    refundsInstapay = Math.round(refundsInstapay);

    // Compute returns specifically tied to this period's billed orders
    let orderReturnsTotal = 0;
    periodOrders.forEach(o => {
      if (o.isManualDebt) return;
      if (o.returnedAmount && o.returnedAmount > 0) {
        orderReturnsTotal += o.returnedAmount;
      } else if (o.status === 'Returned') {
        orderReturnsTotal += (o.totalAmount || 0);
      } else if (Array.isArray(o.items)) {
        const retSum = o.items.reduce((s, it) => s + (it.price || 0) * (it.returnedQuantity || 0), 0);
        if (retSum > 0) orderReturnsTotal += Math.min(o.totalAmount || 0, retSum);
      }
    });
    orderReturnsTotal = Math.round(orderReturnsTotal);

    // Total refunds: max of cash/instapay transactions and order returns in this period
    totalRefunds = Math.max(totalRefunds, orderReturnsTotal);

    // Net Sales = Gross Billed Sales - Returns belonging to this period's invoices
    const totalSales = Math.max(0, Math.round(grossBilledSales - orderReturnsTotal));

    // Gross profit = Net Sales - COGS
    const grossProfit = Math.round(totalSales - cogs);

    // Query past refunds before startDate
    let previousRefundsAmount = 0;
    let previousRefundsCount = 0;
    if (period !== 'all') {
      const pastRefundTxs = await Transaction.find({
        type: 'OUT',
        createdAt: { $lt: startDate },
        $or: [
          { category: { $in: ['Refund', 'مرتجع'] } },
          { description: { $regex: 'مرتجع', $options: 'i' } }
        ]
      });
      previousRefundsAmount = Math.round(pastRefundTxs.reduce((sum, t) => sum + (t.amount || 0), 0));
      previousRefundsCount = pastRefundTxs.length;

      const pastReturnedOrders = await Order.find({
        createdAt: { $lt: startDate },
        $or: [
          { status: 'Returned' },
          { returnedAmount: { $gt: 0 } },
          { 'items.returnedQuantity': { $gt: 0 } }
        ]
      });
      const pastTxOrderIds = new Set(pastRefundTxs.map(t => t.referenceId?.toString()).filter(Boolean));
      pastReturnedOrders.forEach(o => {
        if (!pastTxOrderIds.has(o._id.toString())) {
          const amt = o.returnedAmount || (o.status === 'Returned' ? o.totalAmount : 0);
          if (amt > 0) {
            previousRefundsAmount += amt;
            previousRefundsCount += 1;
          }
        }
      });
      previousRefundsAmount = Math.round(previousRefundsAmount);
    }
    operatingExpenses = Math.round(operatingExpenses);
    supplierPurchases = Math.round(supplierPurchases);
    supplierCashPaid = Math.round(supplierCashPaid);
    personalWithdrawals = Math.round(personalWithdrawals);
    const netProfit = Math.round(grossProfit - operatingExpenses);
    const totalDiscounts = Math.round(periodOrders.reduce((sum, o) => sum + (o.isManualDebt ? 0 : (o.discount || 0)), 0));
    const salesDebtRemaining = Math.round(periodOrders.reduce((sum, o) => sum + (o.isDebt ? (o.debtAmount || 0) : 0), 0));

    const salesCashCollected = Math.max(0, Math.round(grossCashCollected - refundsCash));
    const salesInstapayCollected = Math.max(0, Math.round(grossInstapayCollected - refundsInstapay));
    const cashRevenue = Math.max(0, Math.round(grossCashCollected - refundsCash));
    const instapayRevenue = Math.max(0, Math.round(grossInstapayCollected - refundsInstapay));
    const netCashFlow = Math.round((cashRevenue + instapayRevenue) - (operatingExpenses + supplierCashPaid + personalWithdrawals));

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
      grossSales: grossBilledSales,
      totalSales,
      totalRefunds,
      refundsCash,
      refundsInstapay,
      refundsCount: refundsList.length,
      previousRefundsAmount,
      previousRefundsCount,
      orderReturnsTotal,
      refundsList,
      grossCashCollected: Math.round(grossCashCollected),
      grossInstapayCollected: Math.round(grossInstapayCollected),
      grossProfit,
      cogs,
      netProfit,
      operatingExpenses,
      supplierPurchases,
      supplierCashPaid,
      supplierPaidFromSafe: supplierCashPaid,
      personalWithdrawals,
      personalWithdrawalsList,
      netCashFlow,
      salesCashCollected,
      salesInstapayCollected,
      cashRevenue,
      instapayRevenue,
      currentInstapayBalance,
      cashDrawer,
      salesDebtRemaining,
      totalExpenses: operatingExpenses + supplierCashPaid,
      totalDiscounts,
      totalOrders: periodOrders.length,
      recentOrders,
      lowStock: lowStock.map((p) => ({ id: p._id, name: p.name, stock: p.stock, category: p.category })),
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

// GET /api/admin/products/:id/analytics — Comprehensive product activity and performance report
router.get('/products/:id/analytics', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

    const { startDate, endDate, activePeriod, label } = parseAnalyticsDateRange(req.query);

    // 1. Fetch orders containing this product (within date range if specified)
    const orderQuery = {
      $or: [
        { 'items.product': product._id },
        { 'items.name': product.name }
      ],
      status: { $in: ['Completed', 'Returned'] }
    };
    if (startDate && endDate) {
      orderQuery.createdAt = { $gte: startDate, $lte: endDate };
    }

    const orders = await Order.find(orderQuery).sort({ createdAt: -1 }).lean();

    // Lifetime total orders count for context
    const lifetimeOrdersCount = await Order.countDocuments({
      $or: [
        { 'items.product': product._id },
        { 'items.name': product.name }
      ],
      status: { $in: ['Completed', 'Returned'] }
    });

    // 2. Fetch stock history
    const stockHistoryQuery = { product: product._id };
    if (startDate && endDate) {
      stockHistoryQuery.createdAt = { $gte: startDate, $lte: endDate };
    }
    const stockHistory = await StockHistory.find(stockHistoryQuery)
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    const lifetimeStockHistoryCount = await StockHistory.countDocuments({ product: product._id });

    // 3. Fetch supplier transactions for this product if any
    const supplierQuery = { 'items.product': product._id };
    if (startDate && endDate) {
      supplierQuery.date = { $gte: startDate, $lte: endDate };
    }
    const supplierTxs = await SupplierTransaction.find(supplierQuery)
      .populate('supplier', 'name phone')
      .sort({ date: -1 })
      .lean();

    // 4. Calculate Sales, Costs & Margins
    let unitsSoldGross = 0;
    let unitsReturned = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    const ordersSummary = [];

    const defaultCostPrice = Number(product.costPrice || 0);
    const defaultSellingPrice = Number(product.isDiscountActive ? product.discountPrice : product.price);

    orders.forEach(order => {
      const orderItems = (order.items || []).filter(i => 
        (i.product && i.product.toString() === product._id.toString()) ||
        (!i.product && i.name === product.name)
      );

      orderItems.forEach(item => {
        const qty = Number(item.quantity || 0);
        const retQty = Number(item.returnedQuantity || 0);
        const netQty = Math.max(0, qty - retQty);

        unitsSoldGross += qty;
        unitsReturned += retQty;

        const itemUnitPrice = Number(item.price ?? defaultSellingPrice);
        const itemUnitCost = Number((item.costPrice !== undefined && item.costPrice !== null && Number(item.costPrice) > 0) ? item.costPrice : defaultCostPrice);

        totalRevenue += itemUnitPrice * netQty;
        totalCost += itemUnitCost * netQty;

        ordersSummary.push({
          orderId: order._id,
          date: order.createdAt,
          customerName: order.customerName || 'عميل نقدي',
          size: item.size || '-',
          color: item.color || '-',
          quantity: qty,
          returnedQuantity: retQty,
          netQuantity: netQty,
          price: itemUnitPrice,
          costPrice: itemUnitCost,
          profit: (itemUnitPrice - itemUnitCost) * netQty,
          status: order.status
        });
      });
    });

    const netSold = Math.max(0, unitsSoldGross - unitsReturned);
    const grossProfit = Math.round(totalRevenue - totalCost);
    const profitMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0;

    const currentStock = Number(product.stock || 0);
    const totalReceivedLifetime = Math.max(Number(product.totalReceived || 0), currentStock + (product.sold || netSold));

    // Sell through calculation
    const sellThroughBase = activePeriod === 'all'
      ? totalReceivedLifetime
      : Math.max(1, currentStock + netSold);
    const sellThroughRate = sellThroughBase > 0
      ? Math.round((netSold / sellThroughBase) * 1000) / 10
      : 0;

    // Velocity determination with proper empty / dead stock logic
    let velocity;
    if (netSold === 0) {
      if (currentStock === 0) {
        velocity = {
          status: 'empty',
          badge: '📦 نفد المخزون',
          color: 'slate',
          label: 'الرصيد 0 ولا توجد مبيعات في هذه الفترة'
        };
      } else {
        velocity = {
          status: 'dead',
          badge: '🛑 بضاعة راكدة (Dead Stock)',
          color: 'rose',
          label: 'لم تسجل أي حركة بيع في هذه الفترة — يُنصح بعمل عرض ترويجي'
        };
      }
    } else if (sellThroughRate >= 50 || netSold >= 12) {
      velocity = {
        status: 'fast',
        badge: '🚀 سريع البيع (Star Mover)',
        color: 'emerald',
        label: 'معدل سحب مرتفع وطلب قوي خلال الفترة'
      };
    } else if (sellThroughRate < 20 && currentStock > 0) {
      velocity = {
        status: 'slow',
        badge: '⚠️ حركة بطيئة',
        color: 'amber',
        label: 'سحب بطيء بالنسبة للمخزون المتاح'
      };
    } else {
      velocity = {
        status: 'medium',
        badge: '⚖️ حركة منتظمة',
        color: 'blue',
        label: 'نشاط بيعي مستقر ومقبول'
      };
    }

    res.json({
      periodInfo: {
        period: activePeriod,
        label,
        startDate,
        endDate
      },
      product: {
        id: product._id,
        name: product.name,
        category: product.category,
        sku: product.sku,
        price: product.price,
        effectivePrice: defaultSellingPrice,
        costPrice: defaultCostPrice,
        supplier: product.supplier || '',
        stock: currentStock,
        variants: product.variants || []
      },
      metrics: {
        totalReceived: totalReceivedLifetime,
        currentStock,
        unitsSoldGross,
        unitsReturned,
        netSold,
        totalRevenue: Math.round(totalRevenue),
        totalCost: Math.round(totalCost),
        grossProfit,
        profitMargin,
        sellThroughRate,
        velocity
      },
      ordersSummary: ordersSummary.slice(0, 50),
      totalOrdersCount: ordersSummary.length,
      lifetimeOrdersCount,
      supplierHistory: supplierTxs,
      stockHistory: stockHistory.slice(0, 30),
      lifetimeStockHistoryCount
    });
  } catch (error) {
    res.status(500).json({ message: 'تعذر جلب تقرير نشاط الصنف', error: error.message });
  }
});

// GET /api/admin/products-performance-summary — Overview of top profit makers & dead stocks
router.get('/products-performance-summary', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { startDate, endDate, activePeriod, label } = parseAnalyticsDateRange(req.query);

    const products = await Product.find({ active: { $ne: false } }).lean();

    const orderQuery = { status: { $in: ['Completed', 'Returned'] } };
    if (startDate && endDate) {
      orderQuery.createdAt = { $gte: startDate, $lte: endDate };
    }
    const orders = await Order.find(orderQuery).lean();

    const productSalesMap = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        const pId = item.product?.toString();
        if (!pId) return;
        if (!productSalesMap[pId]) {
          productSalesMap[pId] = { soldQty: 0, returnedQty: 0, revenue: 0, cost: 0 };
        }
        const qty = Number(item.quantity || 0);
        const retQty = Number(item.returnedQuantity || 0);
        const netQty = Math.max(0, qty - retQty);

        productSalesMap[pId].soldQty += qty;
        productSalesMap[pId].returnedQty += retQty;
        productSalesMap[pId].revenue += netQty * (item.price || 0);
        productSalesMap[pId].cost += netQty * (item.costPrice || 0);
      });
    });

    const enriched = products.map(p => {
      const pId = p._id.toString();
      const sData = productSalesMap[pId] || { soldQty: 0, returnedQty: 0, revenue: 0, cost: 0 };
      const netSold = Math.max(0, sData.soldQty - sData.returnedQty);
      const totalCost = sData.cost > 0 ? sData.cost : netSold * (p.costPrice || 0);
      const grossProfit = Math.round(sData.revenue - totalCost);
      const totalRec = Math.max(p.totalReceived || 0, (p.stock || 0) + (p.sold || netSold));
      const sellThrough = totalRec > 0 ? Math.round((netSold / totalRec) * 1000) / 10 : 0;

      return {
        id: p._id,
        name: p.name,
        category: p.category,
        sku: p.sku,
        stock: p.stock,
        costPrice: p.costPrice || 0,
        price: p.price,
        netSold,
        totalRevenue: Math.round(sData.revenue),
        grossProfit,
        sellThrough,
        isDead: p.stock > 0 && (sellThrough < 20 || netSold === 0)
      };
    });

    // Only return products with ACTUAL sales and profit in topProfitProducts (prevents zeroed-out display)
    const topProfitProducts = [...enriched]
      .filter(p => p.netSold > 0 && p.grossProfit > 0)
      .sort((a, b) => b.grossProfit - a.grossProfit)
      .slice(0, 5);

    const fastMovers = [...enriched]
      .filter(p => p.netSold > 0)
      .sort((a, b) => b.sellThrough - a.sellThrough)
      .slice(0, 5);

    const deadStockAlert = [...enriched]
      .filter(p => p.isDead)
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 5);

    res.json({ 
      periodInfo: { period: activePeriod, label, startDate, endDate },
      topProfitProducts, 
      fastMovers, 
      deadStockAlert,
      totalOrdersCount: orders.length
    });
  } catch (error) {
    res.status(500).json({ message: 'تعذر جلب ملخص أداء الأصناف', error: error.message });
  }
});

// GET /api/admin/categories/analytics — Aggregated activity & performance for whole product categories / families
router.get('/categories/analytics', auth, async (req, res) => {
  try {
    const { category, from, to } = req.query;

    const CAT_AR = {
      Blazer: 'بليزر',
      Blouse: 'بلوزة',
      Chemise: 'شميز',
      Skirt: 'جيبة',
      Dress: 'فستان',
      Pantalon: 'بنطلون',
      'T-shirt': 'تيشيرت',
      Bag: 'شنطة',
      Cardigan: 'كاردن',
      Suit: 'سوت',
      Tonic: 'تونيك',
      Takem: 'طقم',
      'بليزر': 'Blazer',
      'بلوزة': 'Blouse',
      'شميز': 'Chemise',
      'جيبة': 'Skirt',
      'فستان': 'Dress',
      'بنطلون': 'Pantalon',
      'تيشيرت': 'T-shirt',
      'شنطة': 'Bag',
      'كاردن': 'Cardigan',
      'سوت': 'Suit',
      'تونيك': 'Tonic',
      'طقم': 'Takem'
    };

    // Include all historical products for mapping order items safely
    const allHistoricalProducts = await Product.find({}).lean();
    const productMap = {};
    allHistoricalProducts.forEach(p => { productMap[p._id.toString()] = p; });

    // Active in-store catalog products (excludes deactivated and season-archived products, matching Cashier POS)
    const products = allHistoricalProducts.filter(p => p.active !== false && p.isSeasonArchived !== true);

    const { startDate, endDate, activePeriod, label } = parseAnalyticsDateRange(req.query);

    const orderQuery = { status: { $in: ['Completed', 'Returned'] } };
    if (startDate && endDate) {
      orderQuery.createdAt = { $gte: startDate, $lte: endDate };
    }
    const orders = await Order.find(orderQuery).sort({ createdAt: -1 }).lean();

    // Helper to canonicalize category names (prevents duplicate Arabic & English entries)
    const toCanonical = (c) => {
      if (!c) return '';
      const trimmed = String(c).trim();
      if (/[\u0600-\u06FF]/.test(trimmed) && CAT_AR[trimmed]) {
        return CAT_AR[trimmed];
      }
      return trimmed;
    };

    // Default registered categories to guarantee complete category family availability
    const defaultCatList = ['Chemise', 'Dress', 'Blouse', 'Bag', 'Cardigan', 'Blazer', 'Skirt', 'Pantalon', 'T-shirt', 'Suit', 'Tonic', 'Takem'];
    const categorySet = new Set(defaultCatList.map(toCanonical));
    
    // Add any custom categories from active products and orders (canonicalized)
    products.forEach(p => {
      if (p.category && String(p.category).trim()) {
        categorySet.add(toCanonical(p.category));
      }
    });

    orders.forEach(o => {
      (o.items || []).forEach(item => {
        const rawCat = item.category || (item.product ? productMap[item.product.toString()]?.category : '');
        if (rawCat && String(rawCat).trim()) {
          categorySet.add(toCanonical(rawCat));
        }
      });
    });

    const allCategoriesList = Array.from(categorySet);

    // Compute metrics per category
    const categoriesData = allCategoriesList.map(catName => {
      const catLower = String(catName || '').trim().toLowerCase();
      const catArEquivalent = CAT_AR[catName] ? CAT_AR[catName].toLowerCase() : '';

      const catProducts = products.filter(p => {
        const pCanonical = toCanonical(p.category).toLowerCase();
        return pCanonical === catLower || (catArEquivalent && pCanonical === catArEquivalent);
      });
      const catProductIds = new Set(catProducts.map(p => p._id.toString()));

      let totalStock = 0;
      let stockValueCost = 0;
      let stockValueRetail = 0;

      catProducts.forEach(p => {
        const stk = Number(p.stock || 0);
        totalStock += stk;
        stockValueCost += stk * Number(p.costPrice || 0);
        stockValueRetail += stk * Number(p.price || 0);
      });

      let unitsSoldGross = 0;
      let unitsReturned = 0;
      let totalRevenue = 0;
      let totalCost = 0;

      const sizesMap = {};
      const colorsMap = {};
      const catRecentOrders = [];
      const productSalesMap = {};

      orders.forEach(order => {
        let orderHasCatItem = false;
        (order.items || []).forEach(item => {
          const rawItemCat = item.category || (item.product ? productMap[item.product.toString()]?.category : '') || '';
          const itemCatCanonical = toCanonical(rawItemCat).toLowerCase();
          const matchesCat = itemCatCanonical === catLower ||
                             (catArEquivalent && itemCatCanonical === catArEquivalent) ||
                             (item.product && catProductIds.has(item.product.toString()));

          if (matchesCat) {
            orderHasCatItem = true;
            const qty = Number(item.quantity || 0);
            const retQty = Number(item.returnedQuantity || 0);
            const netQty = Math.max(0, qty - retQty);

            unitsSoldGross += qty;
            unitsReturned += retQty;

            const unitPrice = Number(item.price || (item.product ? productMap[item.product.toString()]?.price : 0) || 0);
            const unitCost = Number(item.costPrice || (item.product ? productMap[item.product.toString()]?.costPrice : 0) || 0);

            totalRevenue += netQty * unitPrice;
            totalCost += netQty * unitCost;

            if (item.size && item.size !== '-') {
              sizesMap[item.size] = (sizesMap[item.size] || 0) + netQty;
            }
            if (item.color && item.color !== '-') {
              colorsMap[item.color] = (colorsMap[item.color] || 0) + netQty;
            }

            const pId = item.product?.toString() || item.name;
            if (!productSalesMap[pId]) {
              productSalesMap[pId] = { soldQty: 0, returnedQty: 0, revenue: 0, cost: 0 };
            }
            productSalesMap[pId].soldQty += qty;
            productSalesMap[pId].returnedQty += retQty;
            productSalesMap[pId].revenue += netQty * unitPrice;
            productSalesMap[pId].cost += netQty * unitCost;
          }
        });

        if (orderHasCatItem && catRecentOrders.length < 25) {
          catRecentOrders.push({
            orderId: order._id,
            date: order.createdAt,
            customerName: order.customerName || 'عميل نقدي',
            customerPhone: order.customerPhone || '',
            status: order.status,
            paymentMethod: order.paymentMethod,
            items: (order.items || [])
              .filter(i => {
                const iCat = String(i.category || (i.product ? productMap[i.product.toString()]?.category : '') || '').trim().toLowerCase();
                return iCat === catLower || (catArEquivalent && iCat === catArEquivalent) || (i.product && catProductIds.has(i.product.toString()));
              })
              .map(i => ({
                name: i.name,
                size: i.size || '-',
                color: i.color || '-',
                quantity: i.quantity,
                returnedQuantity: i.returnedQuantity || 0,
                price: i.price
              }))
          });
        }
      });

      const netSold = Math.max(0, unitsSoldGross - unitsReturned);
      const grossProfit = Math.round(totalRevenue - totalCost);
      const profitMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0;
      const totalReceived = Math.max(0, totalStock + netSold);
      const sellThroughRate = totalReceived > 0 ? Math.round((netSold / totalReceived) * 1000) / 10 : 0;

      let velocity = {
        status: 'normal',
        badge: '⚖️ نشاط منتظم',
        color: 'amber',
        label: 'حركة بيعية طبيعية ومستقرة'
      };

      if (sellThroughRate >= 40 || netSold >= 20) {
        velocity = {
          status: 'fast',
          badge: '🚀 سريع البيع (طلب قوي)',
          color: 'emerald',
          label: 'إقبال ممتاز ومعدل دوران مرتفع جداً'
        };
      } else if (sellThroughRate < 10 && totalStock > 0) {
        velocity = {
          status: 'dead',
          badge: '🛑 بضاعة راكدة (Dead Stock)',
          color: 'rose',
          label: 'سحب ضعيف — يُنصح بعمل عروض ترويجية لتصريف المخزون وتوفير سيولة'
        };
      }

      // Enriched products under this category
      const enrichedProducts = catProducts.map(p => {
        const pId = p._id.toString();
        const s = productSalesMap[pId] || { soldQty: 0, returnedQty: 0, revenue: 0, cost: 0 };
        const pNetSold = Math.max(0, s.soldQty - s.returnedQty);
        const pRev = Math.round(s.revenue);
        const pCost = Math.round(pNetSold * Number(p.costPrice || 0));
        const pProfit = Math.round(pRev - pCost);
        const pRec = Math.max(Number(p.totalReceived || 0), Number(p.stock || 0) + pNetSold);
        const pSellThrough = pRec > 0 ? Math.round((pNetSold / pRec) * 1000) / 10 : 0;

        return {
          id: p._id,
          _id: p._id,
          name: p.name,
          sku: p.sku || '',
          price: p.price,
          costPrice: p.costPrice || 0,
          stock: p.stock,
          netSold: pNetSold,
          totalRevenue: pRev,
          grossProfit: pProfit,
          profitMargin: pRev > 0 ? Math.round((pProfit / pRev) * 1000) / 10 : 0,
          sellThroughRate: pSellThrough,
          isDead: p.stock > 0 && pSellThrough < 15
        };
      });

      const topProducts = [...enrichedProducts].sort((a, b) => b.netSold - a.netSold).slice(0, 8);
      const slowProducts = [...enrichedProducts].filter(p => p.isDead).sort((a, b) => b.stock - a.stock).slice(0, 8);

      return {
        category: catName,
        labelAr: CAT_AR[catName] || catName,
        productsCount: catProducts.length,
        totalStock,
        stockValueCost: Math.round(stockValueCost),
        stockValueRetail: Math.round(stockValueRetail),
        unitsSoldGross,
        unitsReturned,
        netSold,
        totalReceived,
        sellThroughRate,
        totalRevenue: Math.round(totalRevenue),
        totalCost: Math.round(totalCost),
        grossProfit,
        profitMargin,
        velocity,
        sizesBreakdown: sizesMap,
        colorsBreakdown: colorsMap,
        productsList: enrichedProducts,
        topProducts,
        slowProducts,
        recentOrders: catRecentOrders
      };
    });

    // Sort categories: categories with products first, then by total revenue descending
    categoriesData.sort((a, b) => {
      if (b.productsCount !== a.productsCount) return b.productsCount - a.productsCount;
      return b.totalRevenue - a.totalRevenue;
    });

    const allProductsSummary = products.map(p => ({
      id: p._id,
      _id: p._id,
      name: p.name,
      sku: p.sku || '',
      category: p.category,
      price: p.price,
      costPrice: p.costPrice || 0,
      stock: p.stock
    }));

    // Overall store aggregated summary (always calculated and returned)
    const storeSummary = {
      totalCategories: categoriesData.filter(c => c.productsCount > 0).length || categoriesData.length,
      totalStock: products.reduce((s, p) => s + Number(p.stock || 0), 0),
      stockValueCost: Math.round(products.reduce((s, p) => s + Number(p.stock || 0) * Number(p.costPrice || 0), 0)),
      stockValueRetail: Math.round(products.reduce((s, p) => s + Number(p.stock || 0) * Number(p.price || 0), 0)),
      netSold: categoriesData.reduce((s, c) => s + c.netSold, 0),
      totalRevenue: categoriesData.reduce((s, c) => s + c.totalRevenue, 0),
      grossProfit: categoriesData.reduce((s, c) => s + c.grossProfit, 0),
    };
    storeSummary.profitMargin = storeSummary.totalRevenue > 0
      ? Math.round((storeSummary.grossProfit / storeSummary.totalRevenue) * 1000) / 10
      : 0;

    // Find requested category if specified
    let selected = null;
    if (category && category !== 'all') {
      const qLower = String(category).trim().toLowerCase();
      selected = categoriesData.find(c => c.category.toLowerCase() === qLower) ||
                 categoriesData.find(c => (c.labelAr || '').toLowerCase() === qLower) ||
                 categoriesData.find(c => (CAT_AR[c.category] || '').toLowerCase() === qLower);
    }

    // ALWAYS return complete data bundle so the client has storeSummary + categories list + allProducts + target category
    res.json({
      periodInfo: { period: activePeriod, label, startDate, endDate },
      storeSummary,
      categories: categoriesData,
      selectedCategory: selected || null,
      allProducts: allProductsSummary
    });
  } catch (error) {
    console.error('Error in categories analytics:', error);
    res.status(500).json({ message: 'تعذر جلب تقرير نشاط الفئات', error: error.message });
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


router.put('/categories/rename', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { oldKey, newKey, nameAr } = req.body;
    if (!oldKey || !newKey) {
      return res.status(400).json({ message: 'oldKey and newKey are required' });
    }

    const trimmedOld = oldKey.trim();
    const trimmedNew = newKey.trim();
    const trimmedNameAr = nameAr ? nameAr.trim() : '';

    const siteConfig = await getSiteConfig();
    const categories = siteConfig.categories || [];

    // Check if newKey is already used by another category
    if (trimmedOld.toLowerCase() !== trimmedNew.toLowerCase()) {
      const exists = categories.some(c => c.key.toLowerCase() === trimmedNew.toLowerCase());
      if (exists) {
        return res.status(400).json({ message: 'الرمز الإنجليزي الجديد مستخدم بالفعل لفئة أخرى' });
      }
    }

    // Update categories in SiteConfig
    const updated = categories.map(c => {
      if (c.key === trimmedOld) {
        return {
          key: trimmedNew,
          nameAr: trimmedNameAr || c.nameAr
        };
      }
      return c;
    });

    siteConfig.categories = updated;
    siteConfig.markModified('categories');
    await siteConfig.save();

    // If key changed, update all products referencing old key
    if (trimmedOld !== trimmedNew) {
      await Product.updateMany({ category: trimmedOld }, { $set: { category: trimmedNew } });
    }

    res.json({ message: 'تم تحديث الفئة وتحديث المنتجات المرتبطة بنجاح', config: siteConfig });
  } catch (error) {
    res.status(500).json({ message: 'فشل تحديث الفئة', error: error.message });
  }
});

router.put('/site-config', auth, requireRole(['admin']), async (req, res) => {
  try {
    const siteConfig = await getSiteConfig();
    if (req.body.features) {
      const currentFeatures = siteConfig.features ? (siteConfig.features.toObject ? siteConfig.features.toObject() : siteConfig.features) : {};
      siteConfig.features = { ...currentFeatures, ...req.body.features };
      siteConfig.markModified('features');
      delete req.body.features;
    }
    if (req.body.customColors) {
      const currentColors = siteConfig.customColors ? (siteConfig.customColors.toObject ? siteConfig.customColors.toObject() : siteConfig.customColors) : {};
      siteConfig.customColors = { ...currentColors, ...req.body.customColors };
      siteConfig.markModified('customColors');
      delete req.body.customColors;
    }
    Object.assign(siteConfig, req.body);
    await siteConfig.save();
    res.json(siteConfig);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update site settings', error: error.message });
  }
});


module.exports = router;
