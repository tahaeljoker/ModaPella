const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const MonthlyReport = require('../models/MonthlyReport');
const Transaction = require('../models/Transaction');
const SupplierTransaction = require('../models/SupplierTransaction');
const Supplier = require('../models/Supplier');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const {
  calculateMonthlyData,
  generateAndSaveReport,
  ARABIC_MONTHS
} = require('../services/monthlyReportService');

const router = express.Router();

// GET /api/reports/monthly — List all available months (past archived + current active)
router.get('/monthly', auth, requireRole(['admin']), async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentYearMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    // Get all stored past reports
    const reports = await MonthlyReport.find({}, 'year month yearMonth monthName totalSales netProfit totalExpenses totalOrders isClosed closedAt createdAt')
      .sort({ year: -1, month: -1 });

    const reportMap = new Map();
    reports.forEach(r => reportMap.set(r.yearMonth, r));

    // Ensure current month is included in the list dynamically
    if (!reportMap.has(currentYearMonth)) {
      const currentMonthData = await calculateMonthlyData(currentYear, currentMonth);
      reportMap.set(currentYearMonth, {
        year: currentYear,
        month: currentMonth,
        yearMonth: currentYearMonth,
        monthName: `${currentMonthData.monthName} (الجاري)`,
        totalSales: currentMonthData.totalSales,
        netProfit: currentMonthData.netProfit,
        totalExpenses: currentMonthData.totalExpenses,
        totalOrders: currentMonthData.totalOrders,
        isClosed: false
      });
    }

    const availableMonths = Array.from(reportMap.values()).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });

    res.json(availableMonths);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch monthly reports list', error: error.message });
  }
});

// GET /api/reports/monthly/:year/:month — Get detailed report for specific month
router.get('/monthly/:year/:month', auth, requireRole(['admin']), async (req, res) => {
  try {
    const year = Number(req.params.year);
    const month = Number(req.params.month);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: 'سنة أو شهر غير صحيح' });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const isCurrentMonth = (year === currentYear && month === currentMonth);
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

    if (isCurrentMonth || req.query.live === 'true') {
      // Calculate live data for active month
      const liveData = await calculateMonthlyData(year, month);
      return res.json({ ...liveData, isClosed: false });
    }

    // Check if archived in DB
    let report = await MonthlyReport.findOne({ yearMonth });
    if (!report) {
      // Generate and save if not found
      report = await generateAndSaveReport(year, month, true);
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch monthly report', error: error.message });
  }
});

// POST /api/reports/monthly/:year/:month/generate — Manually generate or update month report
router.post('/monthly/:year/:month/generate', auth, requireRole(['admin']), async (req, res) => {
  try {
    const year = Number(req.params.year);
    const month = Number(req.params.month);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: 'سنة أو شهر غير صحيح' });
    }

    const report = await generateAndSaveReport(year, month, false);
    res.json({ message: 'تم تحديث وإنشاء التقرير الشهري بنجاح', report });
  } catch (error) {
    res.status(500).json({ message: 'Unable to generate monthly report', error: error.message });
  }
});

// GET /api/reports/current-month-daily — Daily performance starting from Day 1 of current month
router.get('/current-month-daily', auth, async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const data = await calculateMonthlyData(year, month);

    res.json({
      monthName: data.monthName,
      totalSales: data.totalSales,
      netProfit: data.netProfit,
      totalExpenses: data.totalExpenses,
      totalOrders: data.totalOrders,
      dailyData: data.dailyData
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch current month daily data', error: error.message });
  }
});


// GET /api/reports/statements — Comprehensive Statement of Account (كشف حساب شامل)
router.get('/statements', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { tab = 'all', from, to, supplierId, search = '' } = req.query;

    let startDate = null;
    let endDate = null;
    if (from) {
      startDate = new Date(from);
      startDate.setHours(0, 0, 0, 0);
    }
    if (to) {
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
    }

    const txDateFilter = {};
    const supplierDateFilter = {};
    const orderDateFilter = {};
    if (startDate && endDate) {
      txDateFilter.createdAt = { $gte: startDate, $lte: endDate };
      supplierDateFilter.date = { $gte: startDate, $lte: endDate };
      orderDateFilter.createdAt = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      txDateFilter.createdAt = { $gte: startDate };
      supplierDateFilter.date = { $gte: startDate };
      orderDateFilter.createdAt = { $gte: startDate };
    } else if (endDate) {
      txDateFilter.createdAt = { $lte: endDate };
      supplierDateFilter.date = { $lte: endDate };
      orderDateFilter.createdAt = { $lte: endDate };
    }

    const [
      allTransactions,
      allSupplierTxs,
      suppliers,
      allOrders
    ] = await Promise.all([
      Transaction.find(txDateFilter).populate('user', 'name role').sort({ createdAt: -1 }),
      SupplierTransaction.find(supplierDateFilter).populate('supplier', 'name phone').sort({ date: -1 }),
      Supplier.find({ active: true }).lean(),
      Order.find({
        ...orderDateFilter,
        $or: [
          { status: 'Returned' },
          { 'items.returnedQuantity': { $gt: 0 } },
          { returnedAmount: { $gt: 0 } }
        ]
      }).populate('customer seller employee', 'name phone').sort({ createdAt: -1 })
    ]);

    // Calculate Supplier balances & stats
    const allSupplierTxsAllTime = await SupplierTransaction.find().sort({ date: 1 });
    const supplierBalances = {};
    suppliers.forEach(s => {
      supplierBalances[s._id.toString()] = {
        supplier: s,
        purchases: 0,
        payments: 0,
        returns: 0,
        balance: 0 // Purchases - (Payments + Returns)
      };
    });

    allSupplierTxsAllTime.forEach(st => {
      const sId = st.supplier?.toString();
      if (!supplierBalances[sId]) return;
      if (st.type === 'purchase') {
        supplierBalances[sId].purchases += st.amount;
        supplierBalances[sId].balance += st.amount;
      } else if (st.type === 'payment') {
        supplierBalances[sId].payments += st.amount;
        supplierBalances[sId].balance -= st.amount;
      } else if (st.type === 'return') {
        supplierBalances[sId].returns += st.amount;
        supplierBalances[sId].balance -= st.amount;
      }
    });

    // Compute Summary Numbers
    let totalSuppliersPurchases = 0;
    let totalSuppliersPayments = 0;
    let totalSuppliersReturns = 0;
    allSupplierTxs.forEach(st => {
      if (st.type === 'purchase') totalSuppliersPurchases += st.amount;
      if (st.type === 'payment') totalSuppliersPayments += st.amount;
      if (st.type === 'return') totalSuppliersReturns += st.amount;
    });

    let totalReturnsAmount = 0;
    let returnsCash = 0;
    let returnsInstapay = 0;
    let returnsCount = 0;

    let totalInstapayIn = 0;
    let totalInstapayOut = 0;

    let totalSafeCashIn = 0;
    let totalSafeCashOut = 0;

    let totalExpenses = 0;
    let totalPersonalWithdrawals = 0;

    allTransactions.forEach(t => {
      const cat = (t.category || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const isRet = cat === 'refund' || cat.includes('مرتجع');

      if (isRet) {
        totalReturnsAmount += t.amount;
        returnsCount++;
        if (t.paymentMethod === 'Cash') returnsCash += t.amount;
        else returnsInstapay += t.amount;
      }

      if (t.paymentMethod === 'Instapay' || t.paymentMethod === 'Wallet') {
        if (t.type === 'IN') totalInstapayIn += t.amount;
        if (t.type === 'OUT') totalInstapayOut += t.amount;
      }

      if (t.paymentMethod === 'Cash') {
        if (t.type === 'IN') totalSafeCashIn += t.amount;
        if (t.type === 'OUT') totalSafeCashOut += t.amount;
      }

      if (t.type === 'OUT') {
        if (cat === 'personalwithdrawal' || desc.includes('شخصي') || desc.includes('جمعية')) {
          totalPersonalWithdrawals += t.amount;
        } else if (!isRet && cat !== 'shiftopen' && cat !== 'shiftclose' && cat !== 'transfer' && cat !== 'safetransfer' && !cat.includes('مورد')) {
          totalExpenses += t.amount;
        }
      }
    });

    // Build unified Statement Items based on selected Tab
    let statementItems = [];

    if (tab === 'all') {
      // 1. All Supplier Transactions
      allSupplierTxs.forEach(st => {
        statementItems.push({
          id: st._id,
          source: 'supplier',
          date: st.date || st.createdAt,
          section: 'موردين',
          type: st.type === 'purchase' ? 'مشتريات بضاعة' : st.type === 'payment' ? 'سداد دفعة' : 'مرتجع لمورد',
          typeColor: st.type === 'purchase' ? 'amber' : st.type === 'payment' ? 'emerald' : 'rose',
          flow: st.type === 'purchase' ? 'DEBT_INCREASE' : 'DEBT_DECREASE',
          amount: st.amount,
          partyName: st.supplier?.name || 'مورد',
          partyPhone: st.supplier?.phone || '',
          paymentMethod: st.paymentSource === 'StoreSafe' ? 'خزينة المحل' : 'خارج الخزينة',
          description: st.description || (st.type === 'purchase' ? 'فاتورة مشتريات' : st.type === 'payment' ? 'سداد لمورد' : 'مرتجع بضاعة معيبة'),
          reference: st.reference || '',
          itemsCount: st.items?.length || 0,
          items: st.items || []
        });
      });

      // 2. All Store Transactions (mapped uniquely without duplicates)
      const supplierTxIds = new Set(allSupplierTxs.map(s => s._id.toString()));
      allTransactions.forEach(t => {
        const cat = (t.category || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const isRet = cat === 'refund' || cat.includes('مرتجع');
        const isPersonal = cat === 'personalwithdrawal' || desc.includes('شخصي') || desc.includes('جمعية') || cat.includes('شخصي');
        const isSupplier = cat.includes('مورد') || desc.includes('مورد') || cat === 'supplierpayment';

        // Avoid duplicating supplier payments that already exist in allSupplierTxs
        if (isSupplier && t.referenceId && supplierTxIds.has(t.referenceId.toString())) {
          return;
        }

        let section = 'نقدية الدرج';
        let type = t.category || 'حركة خزينة';
        let typeColor = 'blue';

        if (isRet) {
          section = 'مرتجعات عملاء';
          type = 'مرتجع مسترد';
          typeColor = 'rose';
        } else if (isPersonal) {
          section = 'مسحوبات شخصية';
          type = 'مسحوبات شخصية / جمعية';
          typeColor = 'purple';
        } else if (isSupplier) {
          section = 'سداد موردين';
          type = 'سداد لمورد';
          typeColor = 'amber';
        } else if (t.type === 'OUT') {
          section = 'مصروفات تشغيل';
          type = t.category || 'مصروف تشغيل';
          typeColor = 'rose';
        } else if (t.type === 'IN') {
          typeColor = 'emerald';
          if (cat.includes('دين')) {
            section = 'تحصيل ديون';
            type = 'تحصيل دين';
          } else if (cat.includes('إيداع')) {
            section = 'إيداع بالخزينة';
            type = 'إيداع نقدية';
          } else if (t.paymentMethod === 'Instapay' || t.paymentMethod === 'Wallet') {
            section = 'إنستاباي';
            type = 'مبيعات إنستاباي';
          } else {
            section = 'مبيعات كاش';
            type = 'مبيعات كاش';
          }
        }

        statementItems.push({
          id: t._id,
          source: isRet ? 'return' : isPersonal || (t.type === 'OUT' && !isSupplier) ? 'expense' : t.paymentMethod === 'Cash' ? 'safe' : 'instapay',
          date: t.createdAt,
          section,
          type,
          typeColor,
          flow: t.type,
          amount: t.amount,
          partyName: isRet ? 'مرتجع عميل' : isPersonal ? 'المالك / الشركاء' : isSupplier ? (t.description || 'مورد') : t.paymentMethod === 'Instapay' ? 'دفع إلكتروني' : 'الدرج النقدي',
          partyPhone: '',
          paymentMethod: t.paymentMethod === 'Instapay' ? 'إنستاباي' : 'كاش',
          description: t.description || t.category || '',
          reference: t.referenceId ? '#' + t.referenceId.toString().slice(-6).toUpperCase() : '',
          user: t.user?.name || ''
        });
      });
    } else if (tab === 'suppliers') {
      allSupplierTxs.forEach(st => {
        if (supplierId && st.supplier?._id?.toString() !== supplierId && st.supplier?.toString() !== supplierId) {
          return;
        }
        statementItems.push({
          id: st._id,
          source: 'supplier',
          date: st.date || st.createdAt,
          section: 'موردين',
          type: st.type === 'purchase' ? 'مشتريات بضاعة' : st.type === 'payment' ? 'سداد دفعة' : 'مرتجع لمورد',
          typeColor: st.type === 'purchase' ? 'amber' : st.type === 'payment' ? 'emerald' : 'rose',
          flow: st.type === 'purchase' ? 'DEBT_INCREASE' : 'DEBT_DECREASE',
          amount: st.amount,
          partyName: st.supplier?.name || 'مورد',
          partyPhone: st.supplier?.phone || '',
          paymentMethod: st.paymentSource === 'StoreSafe' ? 'خزينة المحل' : 'خارج الخزينة',
          description: st.description || (st.type === 'purchase' ? 'فاتورة مشتريات' : st.type === 'payment' ? 'سداد لمورد' : 'مرتجع بضاعة معيبة'),
          reference: st.reference || '',
          itemsCount: st.items?.length || 0,
          items: st.items || []
        });
      });
    } else if (tab === 'returns') {
      allTransactions.filter(t => {
        const cat = (t.category || '').toLowerCase();
        return cat === 'refund' || cat.includes('مرتجع');
      }).forEach(t => {
        statementItems.push({
          id: t._id,
          source: 'return',
          date: t.createdAt,
          section: 'مرتجعات عملاء',
          type: 'مرتجع مسترد',
          typeColor: 'rose',
          flow: 'OUT',
          amount: t.amount,
          partyName: 'مرتجع عميل',
          partyPhone: '',
          paymentMethod: t.paymentMethod === 'Cash' ? 'كاش (من الدرج)' : 'إنستاباي (إلكتروني)',
          description: t.description || 'استرداد قيمة مرتجع',
          reference: t.referenceId ? '#' + t.referenceId.toString().slice(-6).toUpperCase() : '',
          user: t.user?.name || 'الكاشير'
        });
      });
    } else if (tab === 'instapay') {
      allTransactions.filter(t => t.paymentMethod === 'Instapay' || t.paymentMethod === 'Wallet').forEach(t => {
        const isRet = (t.category || '').toLowerCase() === 'refund';
        statementItems.push({
          id: t._id,
          source: 'instapay',
          date: t.createdAt,
          section: 'إنستاباي',
          type: t.type === 'IN' ? 'تحصيل مبيعات' : isRet ? 'مرتجع مسترد' : 'تحويل/سحب',
          typeColor: t.type === 'IN' ? 'emerald' : 'blue',
          flow: t.type,
          amount: t.amount,
          partyName: 'دفع إلكتروني',
          partyPhone: '',
          paymentMethod: 'إنستاباي / بنك',
          description: t.description || (t.type === 'IN' ? 'مبيعات إنستاباي' : 'خروج من إنستاباي'),
          reference: t.referenceId ? '#' + t.referenceId.toString().slice(-6).toUpperCase() : '',
          user: t.user?.name || ''
        });
      });
    } else if (tab === 'safe') {
      allTransactions.filter(t => t.paymentMethod === 'Cash').forEach(t => {
        const cat = (t.category || '').toLowerCase();
        statementItems.push({
          id: t._id,
          source: 'safe',
          date: t.createdAt,
          section: 'نقدية الدرج',
          type: t.type === 'IN' ? (cat.includes('دين') ? 'تحصيل دين' : cat.includes('إيداع') ? 'إيداع' : 'مبيعات كاش') : (cat.includes('مرتجع') ? 'مرتجع كاش' : cat.includes('مورد') ? 'سداد مورد' : cat.includes('شخصي') ? 'مسحوبات شخصية' : 'مصروف تشغيل'),
          typeColor: t.type === 'IN' ? 'emerald' : 'rose',
          flow: t.type,
          amount: t.amount,
          partyName: 'الدرج النقدي',
          partyPhone: '',
          paymentMethod: 'كاش',
          description: t.description || t.category || '',
          reference: t.referenceId ? '#' + t.referenceId.toString().slice(-6).toUpperCase() : '',
          user: t.user?.name || ''
        });
      });
    } else if (tab === 'expenses') {
      allTransactions.filter(t => {
        if (t.type !== 'OUT') return false;
        const cat = (t.category || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const isRet = cat === 'refund' || cat.includes('مرتجع');
        if (isRet || cat === 'shiftopen' || cat === 'shiftclose' || cat === 'transfer' || cat === 'safetransfer') {
          return false;
        }
        return true;
      }).forEach(t => {
        const cat = (t.category || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const isPersonal = cat === 'personalwithdrawal' || desc.includes('شخصي') || desc.includes('جمعية') || cat.includes('شخصي') || cat.includes('جمعية');
        const isSupplier = cat.includes('مورد') || desc.includes('مورد') || cat === 'supplierpayment';

        statementItems.push({
          id: t._id,
          source: 'expense',
          date: t.createdAt,
          section: isPersonal ? 'مسحوبات شخصية' : isSupplier ? 'سداد موردين' : 'مصروفات تشغيل',
          type: isPersonal ? 'مسحوبات شخصية / جمعية' : isSupplier ? 'سداد لمورد' : (t.category || 'مصروف تشغيل'),
          typeColor: isPersonal ? 'purple' : isSupplier ? 'amber' : 'rose',
          flow: 'OUT',
          amount: t.amount,
          partyName: isPersonal ? 'المالك / الشركاء' : isSupplier ? (t.description || 'مورد') : (t.category || 'مصاريف عامة'),
          partyPhone: '',
          paymentMethod: t.paymentMethod === 'Instapay' ? 'إنستاباي' : 'خزينة المحل (كاش)',
          description: t.description || t.category || 'صرف مصروف',
          reference: t.referenceId ? '#' + t.referenceId.toString().slice(-6).toUpperCase() : '',
          user: t.user?.name || ''
        });
      });
    }

    // Filter by search query if provided
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      statementItems = statementItems.filter(item => {
        return (
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.partyName && item.partyName.toLowerCase().includes(q)) ||
          (item.partyPhone && item.partyPhone.includes(q)) ||
          (item.reference && item.reference.toLowerCase().includes(q)) ||
          (item.type && item.type.toLowerCase().includes(q))
        );
      });
    }

    // Sort by date descending
    statementItems.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      summary: {
        totalSuppliersPurchases,
        totalSuppliersPayments,
        totalSuppliersReturns,
        totalReturnsAmount,
        returnsCash,
        returnsInstapay,
        returnsCount,
        totalInstapayIn,
        totalInstapayOut,
        netInstapay: totalInstapayIn - totalInstapayOut,
        totalSafeCashIn,
        totalSafeCashOut,
        netSafeCash: totalSafeCashIn - totalSafeCashOut,
        totalExpenses,
        totalPersonalWithdrawals
      },
      suppliersList: Object.values(supplierBalances),
      returnedOrders: allOrders.map(o => {
        const returnedVal = (o.returnedAmount && o.returnedAmount > 0)
          ? o.returnedAmount
          : (o.items || []).reduce((sum, i) => sum + ((i.returnedQuantity || 0) * (i.price || 0)), 0);

        return {
          id: o._id,
          code: '#' + o._id.toString().slice(-6).toUpperCase(),
          date: o.createdAt,
          customerName: o.customerName || o.customer?.name || 'عميل',
          customerPhone: o.customerPhone || o.customer?.phone || '',
          totalAmount: o.totalAmount,
          returnedAmount: returnedVal,
          paymentMethod: o.paymentMethod,
          status: o.status,
          items: o.items.filter(i => (i.returnedQuantity || 0) > 0)
        };
      }),
      statements: statementItems
    });
  } catch (error) {
    console.error('Statements error:', error);
    res.status(500).json({ message: 'Unable to fetch statements', error: error.message });
  }
});

module.exports = router;
