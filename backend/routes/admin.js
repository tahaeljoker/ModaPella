const express = require('express');
const mongoose = require('mongoose');
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
const Supplier = require('../models/Supplier');
const SupplierTransaction = require('../models/SupplierTransaction');
const { calculateMonthlyData } = require('../services/monthlyReportService');

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

    // 1. Fetch all orders containing this product
    const orders = await Order.find({
      'items.product': product._id,
      status: { $in: ['Completed', 'Returned'] }
    }).sort({ createdAt: -1 }).lean();

    // 2. Fetch stock history
    const stockHistory = await StockHistory.find({ product: product._id })
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // 3. Fetch supplier transactions for this product if any
    const supplierTxs = await SupplierTransaction.find({
      'items.product': product._id
    }).populate('supplier', 'name phone').sort({ date: -1 }).lean();

    // 4. Calculate Sales, Costs & Margins
    let unitsSoldGross = 0;
    let unitsReturned = 0;
    let totalRevenue = 0;
    const ordersSummary = [];

    orders.forEach(order => {
      const orderItems = (order.items || []).filter(i => i.product?.toString() === product._id.toString());
      orderItems.forEach(item => {
        const qty = Number(item.quantity || 0);
        const retQty = Number(item.returnedQuantity || 0);
        const netQty = Math.max(0, qty - retQty);

        unitsSoldGross += qty;
        unitsReturned += retQty;
        totalRevenue += (item.price || product.price || 0) * netQty;

        ordersSummary.push({
          orderId: order._id,
          date: order.createdAt,
          customerName: order.customerName || 'عميل نقدي',
          size: item.size || '-',
          color: item.color || '-',
          quantity: qty,
          returnedQuantity: retQty,
          netQuantity: netQty,
          price: item.price || product.price,
          status: order.status
        });
      });
    });

    const netSold = Math.max(0, unitsSoldGross - unitsReturned);
    const costPrice = Number(product.costPrice || 0);
    const sellingPrice = Number(product.isDiscountActive ? product.discountPrice : product.price);
    const totalCost = netSold * costPrice;
    const grossProfit = Math.round(totalRevenue - totalCost);
    const profitMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0;

    const currentStock = Number(product.stock || 0);
    const totalReceived = Math.max(Number(product.totalReceived || 0), currentStock + netSold);
    const sellThroughRate = totalReceived > 0 ? Math.round((netSold / totalReceived) * 1000) / 10 : 0;

    // Determine product velocity
    let velocity = {
      status: 'medium',
      badge: '⚖️ حركة منتظمة',
      color: 'amber',
      label: 'نشاط بيعي مستقر ومقبول'
    };

    if (sellThroughRate >= 60 || netSold >= 15) {
      velocity = {
        status: 'fast',
        badge: '🚀 سريع البيع (Star Mover)',
        color: 'emerald',
        label: 'معدل سحب مرتفع وطلب قوي'
      };
    } else if (sellThroughRate < 25 && currentStock > 0) {
      velocity = {
        status: 'dead',
        badge: '🛑 بضاعة راكدة (Dead Stock)',
        color: 'rose',
        label: 'حركة ضعيفة — يُنصح بعمل عرض ترويجي أو خصم'
      };
    }

    res.json({
      product: {
        id: product._id,
        name: product.name,
        category: product.category,
        sku: product.sku,
        price: product.price,
        effectivePrice: sellingPrice,
        costPrice: product.costPrice || 0,
        supplier: product.supplier || '',
        stock: currentStock,
        variants: product.variants || []
      },
      metrics: {
        totalReceived,
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
      ordersSummary: ordersSummary.slice(0, 15),
      supplierHistory: supplierTxs,
      stockHistory: stockHistory.slice(0, 20)
    });
  } catch (error) {
    res.status(500).json({ message: 'تعذر جلب تقرير نشاط الصنف', error: error.message });
  }
});

// GET /api/admin/products-performance-summary — Overview of top profit makers & dead stocks
router.get('/products-performance-summary', auth, requireRole(['admin']), async (req, res) => {
  try {
    const products = await Product.find({ active: true }).lean();
    const orders = await Order.find({ status: { $in: ['Completed', 'Returned'] } }).lean();

    const productSalesMap = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        const pId = item.product?.toString();
        if (!pId) return;
        if (!productSalesMap[pId]) {
          productSalesMap[pId] = { soldQty: 0, returnedQty: 0, revenue: 0 };
        }
        const netQty = Math.max(0, (item.quantity || 0) - (item.returnedQuantity || 0));
        productSalesMap[pId].soldQty += (item.quantity || 0);
        productSalesMap[pId].returnedQty += (item.returnedQuantity || 0);
        productSalesMap[pId].revenue += netQty * (item.price || 0);
      });
    });

    const enriched = products.map(p => {
      const pId = p._id.toString();
      const sData = productSalesMap[pId] || { soldQty: 0, returnedQty: 0, revenue: 0 };
      const netSold = Math.max(0, sData.soldQty - sData.returnedQty);
      const totalCost = netSold * (p.costPrice || 0);
      const grossProfit = Math.round(sData.revenue - totalCost);
      const totalRec = Math.max(p.totalReceived || 0, (p.stock || 0) + netSold);
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
        isDead: p.stock > 0 && sellThrough < 20
      };
    });

    const topProfitProducts = [...enriched].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 5);
    const fastMovers = [...enriched].filter(p => p.netSold > 0).sort((a, b) => b.sellThrough - a.sellThrough).slice(0, 5);
    const deadStockAlert = [...enriched].filter(p => p.isDead).sort((a, b) => b.stock - a.stock).slice(0, 5);

    res.json({ topProfitProducts, fastMovers, deadStockAlert });
  } catch (error) {
    res.status(500).json({ message: 'تعذر جلب ملخص أداء الأصناف', error: error.message });
  }
});

// GET /api/admin/categories/analytics — Aggregated activity & performance for whole product categories / families
router.get('/categories/analytics', auth, requireRole(['admin', 'cashier', 'manager']), async (req, res) => {
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
      Takem: 'طقم'
    };

    const products = await Product.find({ active: { $ne: false } }).lean();
    const productMap = {};
    products.forEach(p => { productMap[p._id.toString()] = p; });

    const orderQuery = { status: { $in: ['Completed', 'Returned'] } };
    if (from && to) {
      orderQuery.createdAt = {
        $gte: new Date(from),
        $lte: new Date(new Date(to).setHours(23, 59, 59, 999))
      };
    }
    const orders = await Order.find(orderQuery).sort({ createdAt: -1 }).lean();

    // Discover all categories from products and orders
    const categorySet = new Set(products.map(p => p.category).filter(Boolean));
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        if (item.category) categorySet.add(item.category);
        else if (item.product && productMap[item.product.toString()]?.category) {
          categorySet.add(productMap[item.product.toString()].category);
        }
      });
    });
    const allCategoriesList = Array.from(categorySet);

    // Compute metrics per category
    const categoriesData = allCategoriesList.map(catName => {
      const catProducts = products.filter(p => (p.category || '').toLowerCase() === catName.toLowerCase());
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
          const itemCat = item.category || (item.product ? productMap[item.product.toString()]?.category : '');
          const matchesCat = (itemCat || '').toLowerCase() === catName.toLowerCase() ||
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
                const iCat = i.category || (i.product ? productMap[i.product.toString()]?.category : '');
                return (iCat || '').toLowerCase() === catName.toLowerCase() || (i.product && catProductIds.has(i.product.toString()));
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

      if (sellThroughRate >= 45 || netSold >= 25) {
        velocity = {
          status: 'fast',
          badge: '🚀 سريع البيع (طلب قوي)',
          color: 'emerald',
          label: 'إقبال ممتاز ومعدل دوران مرتفع جداً'
        };
      } else if (sellThroughRate < 15 && totalStock > 0) {
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

      const topProducts = [...enrichedProducts].sort((a, b) => b.netSold - a.netSold).slice(0, 6);
      const slowProducts = [...enrichedProducts].filter(p => p.isDead).sort((a, b) => b.stock - a.stock).slice(0, 6);

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

    // Sort categories by total revenue descending
    categoriesData.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // If user specified a specific category, return detailed target + list
    if (category && category !== 'all') {
      const selected = categoriesData.find(c => c.category.toLowerCase() === category.toLowerCase()) ||
                       categoriesData.find(c => c.labelAr === category);
      return res.json({
        selectedCategory: selected || null,
        categories: categoriesData.map(c => ({
          category: c.category,
          labelAr: c.labelAr,
          productsCount: c.productsCount,
          totalStock: c.totalStock,
          netSold: c.netSold,
          totalRevenue: c.totalRevenue,
          grossProfit: c.grossProfit,
          profitMargin: c.profitMargin,
          sellThroughRate: c.sellThroughRate,
          velocity: c.velocity
        }))
      });
    }

    // Default: Return all categories + overall aggregated summary
    const storeSummary = {
      totalCategories: categoriesData.length,
      totalStock: categoriesData.reduce((s, c) => s + c.totalStock, 0),
      stockValueCost: categoriesData.reduce((s, c) => s + c.stockValueCost, 0),
      stockValueRetail: categoriesData.reduce((s, c) => s + c.stockValueRetail, 0),
      netSold: categoriesData.reduce((s, c) => s + c.netSold, 0),
      totalRevenue: categoriesData.reduce((s, c) => s + c.totalRevenue, 0),
      grossProfit: categoriesData.reduce((s, c) => s + c.grossProfit, 0),
    };
    storeSummary.profitMargin = storeSummary.totalRevenue > 0
      ? Math.round((storeSummary.grossProfit / storeSummary.totalRevenue) * 1000) / 10
      : 0;

    res.json({
      storeSummary,
      categories: categoriesData
    });
  } catch (error) {
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

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

const sanitizeSku = (str) => {
  if (!str || typeof str !== 'string') return '';
  let s = str.trim();
  for (let i = 0; i < 10; i++) {
    s = s.replaceAll(ARABIC_DIGITS[i], String(i)).replaceAll(PERSIAN_DIGITS[i], String(i));
  }
  return s.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
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

const handleSupplierProductBilling = async ({ supplierId, supplierName, product, quantity, costPrice, option, invoiceRef, userId }) => {
  if (!option || option === 'none') return;
  const qty = Number(quantity || product?.stock || 0);
  const cost = Number(costPrice || product?.costPrice || 0);
  if (qty <= 0 || cost <= 0) return;

  let supplierDoc = null;
  if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
    supplierDoc = await Supplier.findById(supplierId);
  }
  if (!supplierDoc && supplierName && supplierName.trim()) {
    const rawName = supplierName.trim();
    supplierDoc = await Supplier.findOne({ name: rawName });
    if (!supplierDoc) {
      const escaped = rawName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
        .replace(/[أإآا]/g, '[أإآا]')
        .replace(/[ةه]/g, '[ةه]')
        .replace(/[ىي]/g, '[ىي]')
        .replace(/\s+/g, '\\s+');
      supplierDoc = await Supplier.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
    }
    if (!supplierDoc) {
      supplierDoc = new Supplier({ name: rawName });
      await supplierDoc.save();
    }
  }
  if (!supplierDoc) return;

  // Ensure product is explicitly linked to this supplier
  if (product && (!product.supplierId || product.supplierId.toString() !== supplierDoc._id.toString() || product.supplier !== supplierDoc.name)) {
    product.supplierId = supplierDoc._id;
    product.supplier = supplierDoc.name;
    await product.save();
  }

  const totalAmount = qty * cost;

  if (option === 'credit') {
    // آجل على المحل (دين للمورد)
    const tx = new SupplierTransaction({
      supplier: supplierDoc._id,
      type: 'purchase',
      amount: totalAmount,
      description: `فاتورة بضاعة (شراء آجل) - ${product.name} (${qty} قطعة × ${cost} ج.م)`,
      reference: invoiceRef || '',
      paymentSource: 'PersonalPocket',
      items: [{ product: product._id, name: product.name, quantity: qty, unitPrice: cost }],
      date: new Date()
    });
    await tx.save();
  } else if (option === 'cash_safe') {
    // شراء نقدي فوري مسدد من درج الخزنة
    const txPurchase = new SupplierTransaction({
      supplier: supplierDoc._id,
      type: 'purchase',
      amount: totalAmount,
      description: `فاتورة بضاعة (شراء نقدي) - ${product.name} (${qty} قطعة × ${cost} ج.م)`,
      reference: invoiceRef || '',
      paymentSource: 'StoreSafe',
      items: [{ product: product._id, name: product.name, quantity: qty, unitPrice: cost }],
      date: new Date()
    });
    await txPurchase.save();

    const txPayment = new SupplierTransaction({
      supplier: supplierDoc._id,
      type: 'payment',
      amount: totalAmount,
      description: `سداد فاتورة بضاعة من درج الخزنة - ${product.name}`,
      reference: invoiceRef || '',
      paymentSource: 'StoreSafe',
      date: new Date()
    });
    await txPayment.save();

    const openShift = await Shift.findOne({ user: userId, status: 'open' });
    const safeTx = new Transaction({
      amount: totalAmount,
      type: 'OUT',
      category: 'Expense',
      description: `سداد بضاعة مورد (كاش الخزنة) - ${supplierDoc.name} | ${product.name} (${qty} قطعة)`,
      paymentMethod: 'Cash',
      user: userId,
      shift: openShift?._id,
      referenceId: txPayment._id
    });
    await safeTx.save();
  } else if (option === 'cash_personal') {
    // مسدد كاش من جيب شخصي
    const txPurchase = new SupplierTransaction({
      supplier: supplierDoc._id,
      type: 'purchase',
      amount: totalAmount,
      description: `فاتورة بضاعة (مسددة جيب شخصي) - ${product.name} (${qty} قطعة × ${cost} ج.م)`,
      reference: invoiceRef || '',
      paymentSource: 'PersonalPocket',
      items: [{ product: product._id, name: product.name, quantity: qty, unitPrice: cost }],
      date: new Date()
    });
    await txPurchase.save();

    const txPayment = new SupplierTransaction({
      supplier: supplierDoc._id,
      type: 'payment',
      amount: totalAmount,
      description: `سداد فاتورة بضاعة (جيب شخصي) - ${product.name}`,
      reference: invoiceRef || '',
      paymentSource: 'PersonalPocket',
      date: new Date()
    });
    await txPayment.save();
  }
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

    // Process Supplier Billing if selected
    if (productData.supplierBillOption && productData.supplierBillOption !== 'none') {
      await handleSupplierProductBilling({
        supplierId: productData.supplierId || product.supplierId,
        supplierName: productData.supplier || product.supplier,
        product,
        quantity: product.stock,
        costPrice: product.costPrice,
        option: productData.supplierBillOption,
        invoiceRef: productData.supplierInvoiceRef,
        userId: req.user.id
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

    if (req.body.variants && Array.isArray(req.body.variants) && req.body.variants.length > 0) {
      // Fix race condition: frontend sends originalVariants (snapshot at modal-open time).
      // We compute the delta the admin intended, then apply it on top of the *live* DB stock
      // so any sales that occurred while the modal was open are NOT erased.
      const originalVariants = req.body.originalVariants || [];
      const originalMap = {};
      originalVariants.forEach(ov => {
        const key = `${ov.size || ''}_${ov.color || ''}`;
        originalMap[key] = Number(ov.stock || 0);
      });

      req.body.variants = req.body.variants.map(v => {
        const key = `${v.size || ''}_${v.color || ''}`;
        const originalStock = originalMap.hasOwnProperty(key) ? originalMap[key] : Number(v.stock || 0);
        const intendedStock = Number(v.stock || 0);
        const delta = intendedStock - originalStock; // positive = admin added, negative = admin removed

        // Find the current live DB stock for this variant
        const dbVariant = existingProduct.variants
          ? existingProduct.variants.find(dv => dv.size === v.size && dv.color === v.color)
          : null;
        const liveStock = dbVariant != null ? (dbVariant.stock || 0) : intendedStock;

        // Apply delta on top of live stock (never go below 0)
        const correctedStock = Math.max(0, liveStock + delta);
        return { ...v, stock: correctedStock };
      });

      delete req.body.originalVariants; // don't persist this helper field
      req.body.stock = req.body.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
    }

    const currentSold = existingProduct.sold || 0;
    const incomingStock = Number(req.body.stock ?? existingProduct.stock ?? 0);
    if (req.body.totalReceived !== undefined && !isNaN(Number(req.body.totalReceived))) {
      req.body.totalReceived = Math.max(Number(req.body.totalReceived), incomingStock + currentSold);
    } else if ((incomingStock + currentSold) > (existingProduct.totalReceived || 0)) {
      req.body.totalReceived = incomingStock + currentSold;
    }

    const prevStock = existingProduct.stock || 0;
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Log stock change in StockHistory if stock changed during edit
    const newStock = product.stock || 0;
    if (prevStock !== newStock) {
      await StockHistory.create({
        product: product._id,
        productName: product.name,
        changeType: 'Product Edit',
        quantityChanged: newStock - prevStock,
        previousStock: prevStock,
        newStock: newStock,
        performedBy: req.user.id,
        performedByName: req.user.name || '',
        notes: `تعديل يدوي للمخزون عبر شاشة المنتجات (${prevStock} ➔ ${newStock})`
      });
    }

    // Process Supplier Billing if selected during edit
    if (req.body.supplierBillOption && req.body.supplierBillOption !== 'none') {
      await handleSupplierProductBilling({
        supplierId: req.body.supplierId || product.supplierId,
        supplierName: req.body.supplier || product.supplier,
        product,
        quantity: Number(product.stock || 0),
        costPrice: Number(product.costPrice || 0),
        option: req.body.supplierBillOption,
        invoiceRef: req.body.supplierInvoiceRef,
        userId: req.user.id
      });
    }

    req.app.locals.io?.emit('inventory:update', product);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update product', error: error.message });
  }
});

// POST /api/admin/products/bulk-season — Bulk update seasons or switch active season
router.post('/products/bulk-season', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { action, productIds = [], season, targetSeason } = req.body;

    if (action === 'setSeason') {
      if (!['summer', 'winter', 'all'].includes(season)) {
        return res.status(400).json({ message: 'موسم غير صالح' });
      }
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: 'يرجى تحديد المنتجات المراد تعديلها' });
      }
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { season } }
      );
      return res.json({ message: `تم تحديد موسم ${productIds.length} منتج بنجاح` });
    }

    if (action === 'archiveSeason') {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: 'يرجى تحديد المنتجات المراد تخزينها' });
      }
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { isSeasonArchived: true } }
      );
      req.app.locals.io?.emit('inventory:update');
      return res.json({ message: `تم تخزين ${productIds.length} منتج وإخفاؤها من الجرد والكاشير` });
    }

    if (action === 'activateSeason') {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: 'يرجى تحديد المنتجات المراد تنشيطها' });
      }
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { isSeasonArchived: false } }
      );
      req.app.locals.io?.emit('inventory:update');
      return res.json({ message: `تم تنشيط وإتاحة ${productIds.length} منتج في المحل والجرد` });
    }

    if (action === 'switchActiveSeason') {
      if (!['summer', 'winter'].includes(targetSeason)) {
        return res.status(400).json({ message: 'يرجى تحديد الموسم المستهدف (شتوي أو صيفي)' });
      }

      let archivedCount = 0;
      let activatedCount = 0;

      if (targetSeason === 'winter') {
        const resArch = await Product.updateMany(
          { season: 'summer', isSeasonArchived: { $ne: true } },
          { $set: { isSeasonArchived: true } }
        );
        archivedCount = resArch.modifiedCount || 0;

        const resAct = await Product.updateMany(
          { season: { $in: ['winter', 'all'] }, isSeasonArchived: true },
          { $set: { isSeasonArchived: false } }
        );
        activatedCount = resAct.modifiedCount || 0;
      } else if (targetSeason === 'summer') {
        const resArch = await Product.updateMany(
          { season: 'winter', isSeasonArchived: { $ne: true } },
          { $set: { isSeasonArchived: true } }
        );
        archivedCount = resArch.modifiedCount || 0;

        const resAct = await Product.updateMany(
          { season: { $in: ['summer', 'all'] }, isSeasonArchived: true },
          { $set: { isSeasonArchived: false } }
        );
        activatedCount = resAct.modifiedCount || 0;
      }

      req.app.locals.io?.emit('inventory:update');
      return res.json({
        message: `تم التحويل إلى الموسم ${targetSeason === 'winter' ? 'الشتوي' : 'الصيفي'} بنجاح (تم تخزين ${archivedCount} منتج وتنشيط ${activatedCount} منتج)`,
        archivedCount,
        activatedCount
      });
    }

    return res.status(400).json({ message: 'إجراء غير معروف' });
  } catch (error) {
    console.error('Bulk season action failed:', error);
    res.status(500).json({ message: 'فشل تنفيذ الإجراء الموسمي', error: error.message });
  }
});

// POST /api/admin/products/:id/restock — Restock a product (add new incoming shipment)
router.post('/products/:id/restock', auth, requireRole(['admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

    const { additions = [], quantity = 0, costPrice, supplier, supplierId, notes = '', supplierBillOption, supplierInvoiceRef } = req.body;

    let totalAdded = 0;
    const prevStock = product.stock || 0;

    if (product.variants && product.variants.length > 0 && Array.isArray(additions) && additions.length > 0) {
      additions.forEach(add => {
        const qty = Number(add.quantity || 0);
        if (qty <= 0) return;
        const v = product.variants.find(item => item.size === add.size && item.color === add.color);
        if (v) {
          v.stock = (v.stock || 0) + qty;
          totalAdded += qty;
        } else {
          product.variants.push({ size: add.size, color: add.color, stock: qty });
          totalAdded += qty;
        }
      });
      product.stock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    } else {
      const qty = Number(quantity || 0);
      if (qty > 0) {
        product.stock = (product.stock || 0) + qty;
        totalAdded = qty;
      }
    }

    if (totalAdded <= 0) {
      return res.status(400).json({ message: 'يرجى إدخال كمية موجبة لتزويد المخزون' });
    }

    product.totalReceived = (product.totalReceived || 0) + totalAdded;

    if (costPrice && Number(costPrice) > 0) {
      product.costPrice = Number(costPrice);
    }
    if (supplier && supplier.trim()) {
      product.supplier = supplier.trim();
    }
    if (product.active === false) {
      product.active = true;
    }

    await product.save();

    // Log Stock History
    await StockHistory.create({
      product: product._id,
      productName: product.name,
      changeType: 'Restock',
      quantityChanged: totalAdded,
      previousStock: prevStock,
      newStock: product.stock,
      performedBy: req.user.id,
      performedByName: req.user.name || '',
      notes: notes ? `تزويد شحنة جديدة (+${totalAdded} قطعة) - ${notes}` : `تزويد شحنة جديدة (+${totalAdded} قطعة)`
    });

    // Process Supplier Billing if selected
    if (supplierBillOption && supplierBillOption !== 'none') {
      await handleSupplierProductBilling({
        supplierId: supplierId || product.supplierId,
        supplierName: supplier || product.supplier,
        product,
        quantity: totalAdded,
        costPrice: Number(costPrice ?? product.costPrice ?? 0),
        option: supplierBillOption,
        invoiceRef: supplierInvoiceRef,
        userId: req.user.id
      });
    }

    req.app.locals.io?.emit('inventory:update', product);
    res.json({ message: 'تم تزويد المخزون بنجاح', product });
  } catch (error) {
    console.error('Restock error:', error);
    res.status(500).json({ message: 'فشل تزويد المخزون', error: error.message });
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

// PATCH /api/admin/users/:id — update user role, name, email, phone, active
router.patch('/users/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, role, phone, active } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

    if (name) user.name = name.trim();
    if (email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: user._id } });
      if (existing) return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل بحساب آخر' });
      user.email = email.toLowerCase().trim();
    }
    if (role) {
      if (!['admin', 'cashier', 'manager', 'employee'].includes(role)) {
        return res.status(400).json({ message: 'الصلاحية المحددة غير صحيحة' });
      }
      user.role = role;
    }
    if (phone !== undefined) user.phone = phone.trim();
    if (active !== undefined) user.active = Boolean(active);

    await user.save();

    // If Employee model exists and is linked, sync name and phone
    const Employee = require('../models/Employee');
    const linkedEmp = await Employee.findOne({ user: user._id });
    if (linkedEmp) {
      linkedEmp.name = user.name;
      if (user.phone) linkedEmp.phone = user.phone;
      await linkedEmp.save();
    }

    res.json({
      message: 'تم تحديث بيانات المستخدم وصلاحياته بنجاح',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        active: user.active
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'تعذر تعديل بيانات المستخدم', error: error.message });
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

// POST /api/admin/heal-records — One-click sync & heal past supplier bills and misclassified/duplicate expenses
router.post('/heal-records', auth, requireRole(['admin']), async (req, res) => {
  try {
    const report = {
      suppliersMerged: 0,
      chemiseBillsLinked: 0,
      chemiseActivated: 0,
      duplicateGlassExpensesCleaned: 0,
      expensesReclassified: 0
    };

    // 1. Fix duplicate glass cleaning / 350 EGP transactions
    // Find all OUT transactions with description matching glass or amount 350 with cleaning category
    const glassTxs = await Transaction.find({
      type: 'OUT',
      $or: [
        { description: /زجاج/i },
        {
          amount: 350,
          $or: [
            { category: /نظافة|نضاف/i },
            { description: /زجاج|نضاف|تنظيف|واجهة/i },
            { description: { $exists: false } },
            { description: '' }
          ]
        }
      ]
    }).sort({ createdAt: 1 });

    if (glassTxs.length > 1) {
      // Keep the first one, delete duplicate identical ones
      const firstTx = glassTxs[0];
      firstTx.category = 'نظافة';
      if (!firstTx.description || firstTx.description.trim() === '') {
        firstTx.description = 'نظافة وتلميع زجاج المحل';
      }
      await firstTx.save();
      report.expensesReclassified++;

      for (let i = 1; i < glassTxs.length; i++) {
        const dup = glassTxs[i];
        await Transaction.findByIdAndDelete(dup._id);
        report.duplicateGlassExpensesCleaned++;
      }
    } else if (glassTxs.length === 1) {
      const tx = glassTxs[0];
      if (tx.category !== 'نظافة') {
        tx.category = 'نظافة';
        await tx.save();
        report.expensesReclassified++;
      }
    }

    // 2. Fix all transactions misclassified because of 'ادمن' or 'ادم' (excluding any goods/suppliers/chemise)
    const misclassifiedAdminTxs = await Transaction.find({
      type: 'OUT',
      description: /ادمن|الادمن/i,
      category: { $in: ['personalwithdrawal', 'مسحوبات شخصية', 'مسحوبات شخصية / جمعية'] },
      $and: [
        { description: { $not: /شميز|بضاعة|مورد|148|كارفن|جيبة/i } }
      ]
    });
    for (const mTx of misclassifiedAdminTxs) {
      mTx.category = 'مصروف تشغيل';
      await mTx.save();
      report.expensesReclassified++;
    }

    // 3. Clean up any auto-generated supplier transactions for OLD chemises (not 148)
    const oldChemiseSupplierTxs = await SupplierTransaction.find({
      $or: [
        { description: /فاتورة بضاعة.*شميز/i },
        { description: /سداد فاتورة بضاعة.*شميز/i }
      ],
      description: { $not: /148/ }
    });

    for (const ost of oldChemiseSupplierTxs) {
      await Transaction.updateMany({ referenceId: ost._id }, { $unset: { referenceId: 1 } });
      await SupplierTransaction.findByIdAndDelete(ost._id);
      report.oldChemiseTransactionsCleaned = (report.oldChemiseTransactionsCleaned || 0) + 1;
    }

    // 3.5. Clean up phantom ShiftClose OUT transactions that drained the safe drawer into negative numbers
    const shiftCloseTxs = await Transaction.find({ category: 'ShiftClose' });
    if (shiftCloseTxs.length > 0) {
      report.shiftCloseTransactionsCleaned = shiftCloseTxs.length;
      await Transaction.deleteMany({ category: 'ShiftClose' });
    }

    // 4. Specifically find and handle ONLY the target product: "شميز مشجر 148" (or matching 148 / مشجر)
    let targetProduct = await Product.findOne({
      $or: [
        { name: /148/i },
        { barcode: /148/i },
        { sku: /148/i },
        { name: /شميز.*مشجر|مشجر.*شميز/i }
      ]
    });
    if (!targetProduct) {
      targetProduct = await Product.findOne({ name: /مشجر/i });
    }
    if (!targetProduct) {
      targetProduct = await Product.findOne({ name: /شميز/i });
    }

    if (targetProduct) {
      if (targetProduct.isSeasonArchived) {
        targetProduct.isSeasonArchived = false;
        await targetProduct.save();
        report.chemiseActivated++;
      }

      // Check supplier for this product
      let supplierDoc = null;
      if (targetProduct.supplierId && mongoose.Types.ObjectId.isValid(targetProduct.supplierId)) {
        supplierDoc = await Supplier.findById(targetProduct.supplierId);
      }
      if (!supplierDoc && targetProduct.supplier && targetProduct.supplier.trim()) {
        const rawName = targetProduct.supplier.trim();
        supplierDoc = await Supplier.findOne({ name: rawName });
        if (!supplierDoc) {
          const escaped = rawName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
            .replace(/[أإآا]/g, '[أإآا]')
            .replace(/[ةه]/g, '[ةه]')
            .replace(/[ىي]/g, '[ىي]')
            .replace(/\s+/g, '\\s+');
          supplierDoc = await Supplier.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
        }
      }
      if (!supplierDoc) {
        supplierDoc = await Supplier.findOne({ name: /كارفن/i });
      }
      if (!supplierDoc) {
        supplierDoc = await Supplier.findOne({ active: { $ne: false } }).sort({ createdAt: 1 });
      }
      if (!supplierDoc) {
        supplierDoc = await Supplier.findOne().sort({ createdAt: 1 });
      }

      if (supplierDoc) {
        if (!targetProduct.supplierId || targetProduct.supplierId.toString() !== supplierDoc._id.toString() || targetProduct.supplier !== supplierDoc.name) {
          targetProduct.supplierId = supplierDoc._id;
          targetProduct.supplier = supplierDoc.name;
          await targetProduct.save();
        }

        const safeName = (targetProduct.name || '').replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const qty = Number(targetProduct.stock || 0) > 0 ? Number(targetProduct.stock) : 4;
        let cost = Number(targetProduct.costPrice || 0);
        if (cost <= 0) {
          const price = Number(targetProduct.price || 0);
          cost = price > 0 ? Math.round(price * 0.7) : 300;
        }

        // Check if there is an existing purchase or payment transaction with the real amount
        const existingSupplierTxs = await SupplierTransaction.find({
          $or: [
            { 'items.product': targetProduct._id },
            { description: new RegExp(safeName, 'i') },
            { description: /148/i },
            { description: /مشجر/i }
          ]
        }).sort({ createdAt: -1 });

        let totalAmount = qty * cost;
        const txWithValidAmount = existingSupplierTxs.find(t => Number(t.amount || 0) > 0);
        if (txWithValidAmount && txWithValidAmount.amount > 0) {
          totalAmount = txWithValidAmount.amount;
          if (txWithValidAmount.items?.length && txWithValidAmount.items[0]?.unitPrice) {
            cost = txWithValidAmount.items[0].unitPrice;
          }
        }
        if (!totalAmount || totalAmount <= 0) totalAmount = 1200;

        // 1. Ensure Purchase exists and is StoreSafe
        let txPurchase = existingSupplierTxs.find(t => t.type === 'purchase');
        if (!txPurchase) {
          txPurchase = new SupplierTransaction({
            supplier: supplierDoc._id,
            type: 'purchase',
            amount: totalAmount,
            description: `فاتورة بضاعة (شراء نقدي) - ${targetProduct.name} (${qty} قطعة × ${cost} ج.م)`,
            paymentSource: 'StoreSafe',
            items: [{ product: targetProduct._id, name: targetProduct.name, quantity: qty, unitPrice: cost }],
            date: targetProduct.createdAt || new Date()
          });
          await txPurchase.save();
        } else {
          txPurchase.supplier = supplierDoc._id;
          txPurchase.amount = totalAmount;
          txPurchase.paymentSource = 'StoreSafe';
          txPurchase.description = `فاتورة بضاعة (شراء نقدي) - ${targetProduct.name} (${qty} قطعة × ${cost} ج.م)`;
          if (!txPurchase.items || txPurchase.items.length === 0) {
            txPurchase.items = [{ product: targetProduct._id, name: targetProduct.name, quantity: qty, unitPrice: cost }];
          }
          await txPurchase.save();
        }

        // 2. Ensure Payment exists and is StoreSafe
        let txPayment = existingSupplierTxs.find(t => t.type === 'payment');
        if (!txPayment) {
          txPayment = new SupplierTransaction({
            supplier: supplierDoc._id,
            type: 'payment',
            amount: totalAmount,
            description: `سداد فاتورة بضاعة من درج الخزنة - ${targetProduct.name}`,
            paymentSource: 'StoreSafe',
            date: txPurchase.date || targetProduct.createdAt || new Date()
          });
          await txPayment.save();
        } else {
          txPayment.supplier = supplierDoc._id;
          txPayment.amount = totalAmount;
          txPayment.paymentSource = 'StoreSafe';
          txPayment.description = `سداد فاتورة بضاعة من درج الخزنة - ${targetProduct.name}`;
          await txPayment.save();
        }

        // 3. Ensure Transaction exists in Safe (OUT) with category 'SupplierPayment' so it shows up as Goods / Supplier Payment!
        const chemiseSafeTxs = await Transaction.find({
          type: 'OUT',
          $or: [
            { referenceId: txPayment._id },
            { description: new RegExp(`سداد بضاعة مورد.*${safeName}`, 'i') },
            { description: new RegExp(safeName, 'i') },
            { description: /شميز.*مشجر|مشجر.*شميز/i },
            { description: /148/i }
          ]
        }).sort({ createdAt: 1 });

        let safeTx = null;
        if (chemiseSafeTxs.length > 0) {
          safeTx = chemiseSafeTxs[0];
          safeTx.amount = totalAmount;
          safeTx.type = 'OUT';
          safeTx.category = 'SupplierPayment';
          safeTx.paymentMethod = 'Cash';
          safeTx.description = `سداد بضاعة مورد (كاش الخزنة) - ${supplierDoc.name} | ${targetProduct.name} (${qty} قطعة)`;
          safeTx.referenceId = txPayment._id;
          if (!safeTx.createdAt) {
            safeTx.createdAt = txPurchase.date || targetProduct.createdAt || new Date();
          }
          await safeTx.save();
          report.chemiseSafeTxCreated = 1;

          // Delete any extra duplicate transactions
          for (let i = 1; i < chemiseSafeTxs.length; i++) {
            await Transaction.findByIdAndDelete(chemiseSafeTxs[i]._id);
            report.duplicateChemiseTxsDeleted = (report.duplicateChemiseTxsDeleted || 0) + 1;
          }
        } else {
          const openShift = await Shift.findOne({ status: 'open' });
          safeTx = new Transaction({
            amount: totalAmount,
            type: 'OUT',
            category: 'SupplierPayment',
            description: `سداد بضاعة مورد (كاش الخزنة) - ${supplierDoc.name} | ${targetProduct.name} (${qty} قطعة)`,
            paymentMethod: 'Cash',
            shift: openShift?._id,
            referenceId: txPayment._id,
            createdAt: txPurchase.date || targetProduct.createdAt || new Date()
          });
          await safeTx.save();
          report.chemiseSafeTxCreated = 1;
        }
        report.chemiseBillsLinked++;
      }
    }

    req.app.locals.io?.emit('inventory:update');
    res.json({
      success: true,
      message: 'تمت معالجة فواتير الموردين وحذف حركات الشميزات القديمة لمنع التكرار وتثبيت حركة الخزنة بنجاح',
      report
    });
  } catch (error) {
    console.error('Heal records failed:', error);
    res.status(500).json({ message: error.message || 'فشلت عملية المعالجة والتسوية', error: error.stack });
  }
});

module.exports = router;
