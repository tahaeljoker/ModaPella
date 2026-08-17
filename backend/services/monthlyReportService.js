const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const SupplierTransaction = require('../models/SupplierTransaction');
const MonthlyReport = require('../models/MonthlyReport');
const SystemNotification = require('../models/SystemNotification');
require('../models/Employee');

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/**
 * Helper to identify internal non-expense shift movements
 */
const isInternalMovement = (t) => {
  const cat = (t.category || '').toLowerCase();
  return cat === 'shiftopen' || cat === 'shiftclose' || cat === 'transfer' || cat === 'safetransfer';
};

/**
 * Helper to identify customer refund transactions
 */
const isRefundTx = (t) => {
  if (t.type !== 'OUT') return false;
  const cat = (t.category || '').toLowerCase();
  return cat === 'refund' || cat.includes('مرتجع');
};

/**
 * Helper to identify supplier payment or stock purchase transactions
 */
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

/**
 * Calculates all metrics for a given year and month (1-indexed).
 */
async function calculateMonthlyData(year, month) {
  const numYear = Number(year);
  const numMonth = Number(month);

  const startDate = new Date(numYear, numMonth - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(numYear, numMonth, 0, 23, 59, 59, 999);
  const daysInMonth = new Date(numYear, numMonth, 0).getDate();

  const yearMonth = `${numYear}-${String(numMonth).padStart(2, '0')}`;
  const monthName = `${ARABIC_MONTHS[numMonth - 1]} ${numYear}`;

  // Fetch orders, transactions, and supplier transactions within date range
  const [orders, transactions, supplierTxs] = await Promise.all([
    Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'Completed'
    }).populate('employee'),
    Transaction.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    SupplierTransaction.find({
      date: { $gte: startDate, $lte: endDate }
    })
  ]);

  // Overall totals from completed orders
  let totalSales = 0;
  let totalDiscounts = 0;
  let grossProfit = 0;
  let salesCashCollected = 0;
  let salesInstapayCollected = 0;

  orders.forEach(o => {
    totalSales += o.totalAmount;
    totalDiscounts += (o.discount || 0);

    // Cash vs Instapay collected at order creation
    const paidAmount = o.isDebt ? (o.amountPaid || 0) : o.totalAmount;
    if (o.paymentMethod === 'Cash') {
      salesCashCollected += paidAmount;
    } else {
      salesInstapayCollected += paidAmount;
    }

    // Cost of goods sold for net non-returned quantities
    const orderCost = o.items.reduce((sum, item) => {
      const netQty = Math.max(0, item.quantity - (item.returnedQuantity || 0));
      return sum + (item.costPrice || 0) * netQty;
    }, 0);

    // Gross profit = Revenue actually collected - COGS
    // For debt orders we use amountPaid (collected) not totalAmount (billed)
    // to avoid overstating profit with uncollected receivables.
    const effectiveRevenue = o.isDebt ? (o.amountPaid || 0) : o.totalAmount;
    const orderProfit = effectiveRevenue - orderCost;
    grossProfit += orderProfit;
  });

  // Process Safe Transactions
  let debtPaymentsCash = 0;
  let debtPaymentsInstapay = 0;
  let refundsCash = 0;
  let refundsInstapay = 0;
  let operatingExpenses = 0;

  const expenseMap = {};

  transactions.forEach(t => {
    if (t.type === 'IN' && (t.category === 'DebtPayment' || t.category === 'سداد دين عميل')) {
      if (t.paymentMethod === 'Cash') {
        debtPaymentsCash += t.amount;
      } else {
        debtPaymentsInstapay += t.amount;
      }
    } else if (isRefundTx(t)) {
      if (t.paymentMethod === 'Cash') {
        refundsCash += t.amount;
      } else {
        refundsInstapay += t.amount;
      }
    } else if (t.type === 'OUT' && !isSupplierTx(t) && !isInternalMovement(t) && !isPersonalTx(t)) {
      // Operating expense
      const cat = t.category || 'أخرى';
      expenseMap[cat] = (expenseMap[cat] || 0) + t.amount;
      operatingExpenses += t.amount;
    }
  });

  // Calculate Supplier Purchases & Payments
  // Only count 'purchase' type to avoid double-counting:
  // cash_purchase creates both a 'purchase' AND a 'payment' record,
  // so summing both types would double the amount.
  let supplierPurchases = 0;

  supplierTxs.forEach(st => {
    if (st.type === 'purchase') {
      supplierPurchases += st.amount;
    }
  });

  // If there are safe transactions for supplier payments not tracked in SupplierTransaction
  transactions.forEach(t => {
    if (isSupplierTx(t)) {
      const isAlreadyInSupplierTx = t.referenceId && supplierTxs.some(st => st._id.toString() === t.referenceId.toString());
      if (!isAlreadyInSupplierTx) {
        supplierPurchases += t.amount;
      }
    }
  });

  if (supplierPurchases > 0) {
    expenseMap['مشتريات وبضائع موردين'] = supplierPurchases;
  }

  const totalExpenses = operatingExpenses + supplierPurchases;

  const expenseBreakdown = Object.entries(expenseMap).map(([category, amount]) => ({
    category,
    amount
  }));

  // Net Cash Revenue
  const cashRevenue = salesCashCollected + debtPaymentsCash - refundsCash;
  const instapayRevenue = salesInstapayCollected + debtPaymentsInstapay - refundsInstapay;

  // Net Operating Profit = Gross Profit - Operating Expenses
  const netProfit = grossProfit - operatingExpenses;

  // Net Cash Flow = (Cash Collected + Instapay Collected) - Total Outflows
  const netCashFlow = (cashRevenue + instapayRevenue) - (operatingExpenses + supplierPurchases);

  // Daily Breakdown
  const dailyData = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dStart = new Date(numYear, numMonth - 1, d, 0, 0, 0, 0);
    const dEnd = new Date(numYear, numMonth - 1, d, 23, 59, 59, 999);

    const dayOrders = orders.filter(o => {
      const t = new Date(o.createdAt).getTime();
      return t >= dStart.getTime() && t <= dEnd.getTime();
    });

    const dayTransactions = transactions.filter(t => {
      const time = new Date(t.createdAt).getTime();
      return time >= dStart.getTime() && time <= dEnd.getTime();
    });

    const daySupplierTxs = supplierTxs.filter(st => {
      const time = new Date(st.date || st.createdAt).getTime();
      return time >= dStart.getTime() && time <= dEnd.getTime();
    });

    const dayRevenue = dayOrders.reduce((s, o) => s + o.totalAmount, 0);
    const dayDiscounts = dayOrders.reduce((s, o) => s + (o.discount || 0), 0);

    let daySalesCash = 0;
    let daySalesInstapay = 0;
    dayOrders.forEach(o => {
      const paid = o.isDebt ? (o.amountPaid || 0) : o.totalAmount;
      if (o.paymentMethod === 'Cash') daySalesCash += paid;
      else daySalesInstapay += paid;
    });

    let dayDebtCash = 0;
    let dayDebtInstapay = 0;
    let dayRefundCash = 0;
    let dayRefundInstapay = 0;
    let dayOpExpenses = 0;

    dayTransactions.forEach(t => {
      if (t.type === 'IN' && (t.category === 'DebtPayment' || t.category === 'سداد دين عميل')) {
        if (t.paymentMethod === 'Cash') dayDebtCash += t.amount;
        else dayDebtInstapay += t.amount;
      } else if (isRefundTx(t)) {
        if (t.paymentMethod === 'Cash') dayRefundCash += t.amount;
        else dayRefundInstapay += t.amount;
      } else if (t.type === 'OUT' && !isSupplierTx(t) && !isInternalMovement(t)) {
        dayOpExpenses += t.amount;
      }
    });

    let daySupplierPurchases = 0;
    daySupplierTxs.forEach(st => {
      if (st.type === 'payment' || st.type === 'purchase' || st.type === 'cash_purchase') {
        daySupplierPurchases += st.amount;
      }
    });

    dayTransactions.forEach(t => {
      if (isSupplierTx(t)) {
        const isAlreadyInSupplierTx = t.referenceId && daySupplierTxs.some(st => st._id.toString() === t.referenceId.toString());
        if (!isAlreadyInSupplierTx) {
          daySupplierPurchases += t.amount;
        }
      }
    });

    const dayCash = daySalesCash + dayDebtCash - dayRefundCash;
    const dayInstapay = daySalesInstapay + dayDebtInstapay - dayRefundInstapay;
    const dayExpenses = dayOpExpenses + daySupplierPurchases;

    const dayGrossProfit = dayOrders.reduce((sum, o) => {
      const orderCost = o.items.reduce((cSum, item) => {
        const netQty = Math.max(0, item.quantity - (item.returnedQuantity || 0));
        return cSum + (item.costPrice || 0) * netQty;
      }, 0);
      return sum + (o.totalAmount - orderCost);
    }, 0);

    const dayProfit = dayGrossProfit - dayOpExpenses;

    const dateStr = dStart.toLocaleDateString('ar-EG-u-nu-latn', { month: 'numeric', day: 'numeric' });

    dailyData.push({
      day: d,
      date: dateStr,
      revenue: dayRevenue,
      discounts: dayDiscounts,
      profit: dayProfit,
      count: dayOrders.length,
      cashRevenue: dayCash,
      instapayRevenue: dayInstapay,
      expenses: dayExpenses,
      operatingExpenses: dayOpExpenses,
      supplierPurchases: daySupplierPurchases
    });
  }

  // Best Selling Products
  const productSalesMap = {};
  orders.forEach(o => {
    o.items.forEach(i => {
      const qty = i.quantity - (i.returnedQuantity || 0);
      if (qty > 0) {
        productSalesMap[i.name] = (productSalesMap[i.name] || 0) + qty;
      }
    });
  });

  const bestSellers = Object.entries(productSalesMap)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  // Category Breakdown
  const categorySalesMap = {};
  orders.forEach(o => {
    o.items.forEach(i => {
      const qty = i.quantity - (i.returnedQuantity || 0);
      if (qty > 0 && i.category) {
        categorySalesMap[i.category] = (categorySalesMap[i.category] || 0) + (qty * i.price);
      }
    });
  });

  const categoryBreakdown = Object.entries(categorySalesMap).map(([category, amount]) => ({
    category,
    amount
  }));

  // Employee Performance
  const empMap = {};
  orders.forEach(o => {
    const name = o.employeeName || (o.employee && o.employee.name);
    if (name) {
      if (!empMap[name]) {
        empMap[name] = { amount: 0, profit: 0, orderCount: 0, itemsSold: 0 };
      }
      const emp = empMap[name];
      emp.amount += o.totalAmount;
      emp.orderCount += 1;
      const orderCost = o.items.reduce((s, item) => {
        const netQty = Math.max(0, item.quantity - (item.returnedQuantity || 0));
        return s + (item.costPrice || 0) * netQty;
      }, 0);
      emp.profit += (o.totalAmount - orderCost);
      o.items.forEach(i => {
        const qty = i.quantity - (i.returnedQuantity || 0);
        if (qty > 0) emp.itemsSold += qty;
      });
    }
  });

  const employeePerformance = Object.entries(empMap).map(([name, data]) => ({
    name,
    amount: data.amount,
    profit: data.profit,
    orderCount: data.orderCount,
    itemsSold: data.itemsSold
  })).sort((a, b) => b.amount - a.amount);

  // Detailed Financial Audit & Explanations ("دي جت ازاي")
  const totalCogs = orders.reduce((sum, o) => {
    return sum + o.items.reduce((s, item) => {
      const netQty = Math.max(0, item.quantity - (item.returnedQuantity || 0));
      return s + (item.costPrice || 0) * netQty;
    }, 0);
  }, 0);

  const operatingExpensesList = transactions
    .filter(t => t.type === 'OUT' && !isSupplierTx(t) && !isInternalMovement(t) && !isRefundTx(t))
    .map(t => ({
      id: t._id,
      category: t.category || 'أخرى',
      amount: t.amount,
      description: t.description || '',
      date: t.createdAt
    }));

  const supplierPaymentsList = supplierTxs.map(st => ({
    id: st._id,
    type: st.type,
    amount: st.amount,
    description: st.description || '',
    paymentSource: st.paymentSource || 'PersonalPocket',
    date: st.date || st.createdAt
  }));

  const auditDetails = {
    totalCogs,
    grossProfit,
    operatingExpensesTotal: operatingExpenses,
    supplierPurchasesTotal: supplierPurchases,
    debtPaymentsCash,
    debtPaymentsInstapay,
    refundsCash,
    refundsInstapay,
    salesCashCollected,
    salesInstapayCollected,
    operatingExpensesList,
    supplierPaymentsList,
    explanations: {
      totalSales: `إجمالي المبيعات الصافية = مجموع الفواتير المكتملة بعد الخصم المباشر (عدد ${orders.length} فاتورة بقيمة إجمالية ${totalSales.toLocaleString()} ج.م). المبيعات الإجمالية قبل الخصم كانت ${(totalSales + totalDiscounts).toLocaleString()} ج.م.`,
      totalDiscounts: `إجمالي الخصومات الممنوحة = مجموع التخفيضات التي تم تنزيلها للعملاء في الفواتير بقيمة ${totalDiscounts.toLocaleString()} ج.م. (خصم مباشر تم تنزيله من المبيعات قبل الوصول لصافي الربح).`,
      cogs: `تكلفة البضاعة المباعة (COGS) = مجموع تكلفة شراء الأجناس المباعة بأسعار الجملة/الشراء (إجمالي ${totalCogs.toLocaleString()} ج.م).`,
      grossProfit: `مجمل الربح التجاري = المبيعات الصافية (${totalSales.toLocaleString()} ج.م) ➖ تكلفة البضاعة (${totalCogs.toLocaleString()} ج.م) = ${grossProfit.toLocaleString()} ج.م. (دون تخصيم الخصم مرتين).`,
      operatingExpenses: `مصاريف التشغيل = إجمالي المصاريف الإدارية والعمومية (عدد ${operatingExpensesList.length} حركة بقيمة ${operatingExpenses.toLocaleString()} ج.م) مع استبعاد الموردين والورديات.`,
      supplierPurchases: `مشتريات بضائع الموردين = إجمالي مبالغ البضائع وسداد الموردين (عدد ${supplierPaymentsList.length} حركة بقيمة ${supplierPurchases.toLocaleString()} ج.م) من الخزنة أو من خارجها.`,
      netProfit: `صافي ربح النشاط = مجمل الربح (${grossProfit.toLocaleString()} ج.م) ➖ مصاريف التشغيل (${operatingExpenses.toLocaleString()} ج.م) = ${netProfit.toLocaleString()} ج.م.`,
      netCashFlow: `صافي حركة الخزنة = (السيولة المباشرة ${ (cashRevenue + instapayRevenue).toLocaleString() } ج.م) ➖ (المصروفات ${operatingExpenses.toLocaleString()} ج.م + الموردين ${supplierPurchases.toLocaleString()} ج.م) = ${netCashFlow.toLocaleString()} ج.م.`
    }
  };

  return {
    year: numYear,
    month: numMonth,
    yearMonth,
    monthName,
    totalSales,
    netProfit,
    totalExpenses,
    operatingExpenses,
    supplierPurchases,
    netCashFlow,
    totalDiscounts,
    totalOrders: orders.length,
    cashRevenue,
    instapayRevenue,
    dailyData,
    expenseBreakdown,
    categoryBreakdown,
    bestSellers,
    employeePerformance,
    auditDetails
  };
}

/**
 * Generates and saves a MonthlyReport in MongoDB.
 */
async function generateAndSaveReport(year, month, autoGenerated = true) {
  const reportData = await calculateMonthlyData(year, month);
  const now = new Date();
  const isPastMonth = (year < now.getFullYear()) || (year === now.getFullYear() && month < (now.getMonth() + 1));

  const report = await MonthlyReport.findOneAndUpdate(
    { yearMonth: reportData.yearMonth },
    {
      ...reportData,
      isClosed: isPastMonth,
      closedAt: isPastMonth ? now : undefined,
      autoGenerated
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return report;
}

/**
 * Checks for past unclosed months and automatically saves reports for them.
 */
async function checkAndAutoClosePreviousMonths() {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Check previous month
    let prevYear = currentYear;
    let prevMonth = currentMonth - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }

    const prevYearMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const existing = await MonthlyReport.findOne({ yearMonth: prevYearMonth });

    if (!existing || !existing.isClosed) {
      const report = await generateAndSaveReport(prevYear, prevMonth, true);

      // Create notification for admin
      await SystemNotification.create({
        title: `تم حفظ تقرير شهر ${report.monthName} تلقائياً`,
        message: `تم إغلاق تقرير شهر ${report.monthName} وإجمالياته: المبيعات ${report.totalSales.toLocaleString('en-US')} ج.م، صافي الربح ${report.netProfit.toLocaleString('en-US')} ج.م.`,
        type: 'info'
      });
      console.log(`[MonthlyReportService] Auto-generated report for ${prevYearMonth}`);
    }
  } catch (error) {
    console.error('[MonthlyReportService] Error during auto-close:', error.message);
  }
}

module.exports = {
  calculateMonthlyData,
  generateAndSaveReport,
  checkAndAutoClosePreviousMonths,
  ARABIC_MONTHS
};
