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
    desc.includes('ادم')
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
      status: { $in: ['Completed', 'Returned'] }
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
  let totalCogs = 0;
  let salesCashCollected = 0;
  let salesInstapayCollected = 0;

  orders.forEach(o => {
    // Exclude manual debt entries from sales revenue (they have no real items sold)
    if (o.isManualDebt) return;

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

    totalCogs += orderCost;
  });

  totalSales = Math.round(totalSales);
  totalDiscounts = Math.round(totalDiscounts);
  totalCogs = Math.round(totalCogs);
  salesCashCollected = Math.round(salesCashCollected);
  salesInstapayCollected = Math.round(salesInstapayCollected);
  const salesDebtRemaining = Math.max(0, Math.round(totalSales - (salesCashCollected + salesInstapayCollected)));

  // Gross profit = Net Sales - COGS (Direct mathematical identity)
  const grossProfit = Math.round(totalSales - totalCogs);

  // Process Safe Transactions
  let debtPaymentsCash = 0;
  let debtPaymentsInstapay = 0;
  let depositsCash = 0;
  let depositsInstapay = 0;
  let refundsCash = 0;
  let refundsInstapay = 0;
  let operatingExpenses = 0;
  let personalWithdrawals = 0;

  const expenseMap = {};
  const operatingExpensesList = [];
  const personalWithdrawalsList = [];
  const refundsList = [];

  transactions.forEach(t => {
    const cat = (t.category || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();

    if (t.type === 'IN') {
      if (cat === 'debtpayment' || cat.includes('دين') || desc.includes('دين') || cat === 'سداد دين عميل') {
        if (t.paymentMethod === 'Cash') {
          debtPaymentsCash += t.amount;
        } else {
          debtPaymentsInstapay += t.amount;
        }
      } else if (cat === 'deposit' || cat.includes('إيداع') || cat.includes('ايداع') || desc.includes('إيداع') || desc.includes('ايداع')) {
        if (t.paymentMethod === 'Cash') {
          depositsCash += t.amount;
        } else {
          depositsInstapay += t.amount;
        }
      }
    } else if (isRefundTx(t)) {
      if (t.paymentMethod === 'Cash') {
        refundsCash += t.amount;
      } else {
        refundsInstapay += t.amount;
      }
      refundsList.push({
        id: t._id,
        amount: t.amount,
        paymentMethod: t.paymentMethod || 'Cash',
        category: t.category || 'Refund',
        description: t.description || 'مرتجع عميل',
        referenceId: t.referenceId,
        date: t.createdAt
      });
    } else if (isPersonalTx(t)) {
      personalWithdrawals += t.amount;
      personalWithdrawalsList.push({
        id: t._id,
        category: t.category || 'مسحوبات شخصية',
        amount: t.amount,
        description: t.description || 'مسحوبات شخصية / جمعية',
        date: t.createdAt
      });
    } else if (t.type === 'OUT' && !isSupplierTx(t) && !isInternalMovement(t)) {
      // Operating expense
      const catName = t.category || 'أخرى';
      expenseMap[catName] = (expenseMap[catName] || 0) + t.amount;
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

  operatingExpenses = Math.round(operatingExpenses);
  personalWithdrawals = Math.round(personalWithdrawals);

  // Calculate Supplier Cash Paid & Purchases
  let supplierCashPaid = 0;
  let supplierPurchases = 0;
  let supplierPaidFromSafe = 0;

  supplierTxs.forEach(st => {
    if (st.type === 'purchase') {
      supplierPurchases += st.amount;
    }
    if (st.type === 'payment') {
      supplierCashPaid += st.amount;
      if (st.paymentSource === 'StoreSafe') {
        supplierPaidFromSafe += st.amount;
      }
    }
  });

  // Also capture supplier safe transactions not tracked in SupplierTransaction model
  transactions.forEach(t => {
    if (isSupplierTx(t)) {
      const isAlreadyInSupplierTx = t.referenceId && supplierTxs.some(st => st._id.toString() === t.referenceId.toString());
      if (!isAlreadyInSupplierTx) {
        supplierCashPaid += t.amount;
        supplierPurchases += t.amount;
        supplierPaidFromSafe += t.amount;
      }
    }
  });

  supplierPurchases = Math.round(supplierPurchases);
  supplierCashPaid = Math.round(supplierCashPaid);
  supplierPaidFromSafe = Math.round(supplierPaidFromSafe);

  if (supplierPurchases > 0) {
    expenseMap['مشتريات وبضائع موردين'] = supplierPurchases;
  }

  const totalExpenses = operatingExpenses + supplierCashPaid;

  const expenseBreakdown = Object.entries(expenseMap).map(([category, amount]) => ({
    category,
    amount
  }));

  // Net Cash Revenue
  const cashRevenue = salesCashCollected + debtPaymentsCash + depositsCash - refundsCash;
  const instapayRevenue = salesInstapayCollected + debtPaymentsInstapay + depositsInstapay - refundsInstapay;

  // Net Operating Profit = Gross Profit - Operating Expenses (Airtight mathematical identity)
  const netProfit = Math.round(grossProfit - operatingExpenses);

  // Net Cash Flow = Inflows - Outflows from store safe (supplier payments only if paid from store safe)
  const netCashFlow = Math.round((cashRevenue + instapayRevenue) - (operatingExpenses + supplierPaidFromSafe + personalWithdrawals));

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

    const dayRevenue = dayOrders.reduce((s, o) => s + (o.isManualDebt ? 0 : o.totalAmount), 0);
    const dayDiscounts = dayOrders.reduce((s, o) => s + (o.isManualDebt ? 0 : (o.discount || 0)), 0);

    let daySalesCash = 0;
    let daySalesInstapay = 0;
    dayOrders.forEach(o => {
      if (o.isManualDebt) return;
      const paid = o.isDebt ? (o.amountPaid || 0) : o.totalAmount;
      if (o.paymentMethod === 'Cash') daySalesCash += paid;
      else daySalesInstapay += paid;
    });

    let dayDebtCash = 0;
    let dayDebtInstapay = 0;
    let dayDepositsCash = 0;
    let dayDepositsInstapay = 0;
    let dayRefundCash = 0;
    let dayRefundInstapay = 0;
    let dayOpExpenses = 0;
    let dayPersonalWithdrawals = 0;

    dayTransactions.forEach(t => {
      const cat = (t.category || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();

      if (t.type === 'IN') {
        if (cat === 'debtpayment' || cat.includes('دين') || desc.includes('دين') || cat === 'سداد دين عميل') {
          if (t.paymentMethod === 'Cash') dayDebtCash += t.amount;
          else dayDebtInstapay += t.amount;
        } else if (cat === 'deposit' || cat.includes('إيداع') || cat.includes('ايداع') || desc.includes('إيداع') || desc.includes('ايداع')) {
          if (t.paymentMethod === 'Cash') dayDepositsCash += t.amount;
          else dayDepositsInstapay += t.amount;
        }
      } else if (isRefundTx(t)) {
        if (t.paymentMethod === 'Cash') dayRefundCash += t.amount;
        else dayRefundInstapay += t.amount;
      } else if (isPersonalTx(t)) {
        dayPersonalWithdrawals += t.amount;
      } else if (t.type === 'OUT' && !isSupplierTx(t) && !isInternalMovement(t)) {
        dayOpExpenses += t.amount;
      }
    });

    let daySupplierPurchases = 0;
    let daySupplierCashPaid = 0;
    let daySupplierPaidFromSafe = 0;
    daySupplierTxs.forEach(st => {
      if (st.type === 'purchase') {
        daySupplierPurchases += st.amount;
      }
      if (st.type === 'payment') {
        daySupplierCashPaid += st.amount;
        if (st.paymentSource === 'StoreSafe') {
          daySupplierPaidFromSafe += st.amount;
        }
      }
    });

    dayTransactions.forEach(t => {
      if (isSupplierTx(t)) {
        const isAlreadyInSupplierTx = t.referenceId && daySupplierTxs.some(st => st._id.toString() === t.referenceId.toString());
        if (!isAlreadyInSupplierTx) {
          daySupplierPurchases += t.amount;
          daySupplierCashPaid += t.amount;
          daySupplierPaidFromSafe += t.amount;
        }
      }
    });

    const dayCash = daySalesCash + dayDebtCash + dayDepositsCash - dayRefundCash;
    const dayInstapay = daySalesInstapay + dayDebtInstapay + dayDepositsInstapay - dayRefundInstapay;

    const dayCogs = dayOrders.reduce((sum, o) => {
      if (o.isManualDebt) return sum;
      return sum + o.items.reduce((cSum, item) => {
        const netQty = Math.max(0, item.quantity - (item.returnedQuantity || 0));
        return cSum + (item.costPrice || 0) * netQty;
      }, 0);
    }, 0);

    const dayGrossProfit = Math.round(dayRevenue - dayCogs);
    const dayProfit = Math.round(dayGrossProfit - dayOpExpenses);

    const dateStr = dStart.toLocaleDateString('ar-EG-u-nu-latn', { month: 'numeric', day: 'numeric' });

    dailyData.push({
      day: d,
      date: dateStr,
      revenue: dayRevenue,
      discounts: dayDiscounts,
      cogs: dayCogs,
      grossProfit: dayGrossProfit,
      profit: dayProfit,
      count: dayOrders.length,
      cashRevenue: dayCash,
      instapayRevenue: dayInstapay,
      expenses: dayOpExpenses,
      operatingExpenses: dayOpExpenses,
      supplierPurchases: daySupplierPurchases,
      supplierCashPaid: daySupplierCashPaid,
      personalWithdrawals: dayPersonalWithdrawals
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
    supplierCashPaidTotal: supplierCashPaid,
    supplierPaidFromSafe,
    debtPaymentsCash,
    debtPaymentsInstapay,
    depositsCash,
    depositsInstapay,
    refundsCash,
    refundsInstapay,
    refundsTotal: Math.round((refundsCash + refundsInstapay) * 100) / 100,
    refundsCount: refundsList.length,
    refundsList,
    salesCashCollected,
    salesInstapayCollected,
    salesDebtRemaining,
    personalWithdrawalsTotal: personalWithdrawals,
    operatingExpensesList,
    personalWithdrawalsList,
    supplierPaymentsList,
    explanations: {
      totalSales: `إجمالي المبيعات الصافية = مجموع الفواتير المكتملة بعد الخصم المباشر (عدد ${orders.length} فاتورة بقيمة إجمالية ${totalSales.toLocaleString()} ج.م). المبيعات الإجمالية قبل الخصم كانت ${(totalSales + totalDiscounts).toLocaleString()} ج.م. منها كاش محصل (${salesCashCollected.toLocaleString()} ج.م) وإنستاباي (${salesInstapayCollected.toLocaleString()} ج.م)${salesDebtRemaining > 0 ? ` ومتبقي آجل طرف العملاء (${salesDebtRemaining.toLocaleString()} ج.م)` : ''}.`,
      totalDiscounts: `إجمالي الخصومات الممنوحة = مجموع التخفيضات التي تم تنزيلها للعملاء في الفواتير بقيمة ${totalDiscounts.toLocaleString()} ج.م. (خصم مباشر تم تنزيله من المبيعات قبل الوصول لصافي الربح).`,
      cogs: `تكلفة البضاعة المباعة (COGS) = مجموع تكلفة شراء الأجناس المباعة بأسعار الجملة/الشراء (إجمالي ${totalCogs.toLocaleString()} ج.م).`,
      grossProfit: `مجمل الربح التجاري = صافي المبيعات (${totalSales.toLocaleString()} ج.م) - تكلفة البضاعة (${totalCogs.toLocaleString()} ج.م) = ${grossProfit.toLocaleString()} ج.م (ربح تجارة البضاعة).`,
      operatingExpenses: `مصاريف التشغيل = إجمالي المصاريف الإدارية والعمومية (عدد ${operatingExpensesList.length} حركة بقيمة ${operatingExpenses.toLocaleString()} ج.م) كالإيجار والمرتبات والكهرباء (مستبعد منها الموردين والمسحوبات الشخصية).`,
      supplierPurchases: `مشتريات بضائع الموردين = إجمالي قيمة البضائع الموردة للمحل بقيمة ${supplierPurchases.toLocaleString()} ج.م (أصول بضاعة يتم تحويلها لمخزون وحساب تكلفتها عند البيع في بند COGS).`,
      personalWithdrawals: `المسحوبات الشخصية والجمعية = إجمالي المبالغ المسحوبة للمالك والشركاء والجمعيات بقيمة ${personalWithdrawals.toLocaleString()} ج.م (سُحبت من الخزنة وخفّضت رصيد الكاش، ولكنها مستبعدة من مصاريف التشغيل لحماية أرباح المحل التجارية).`,
      netProfit: `صافي ربح النشاط = مجمل الربح (${grossProfit.toLocaleString()} ج.م) - مصاريف التشغيل (${operatingExpenses.toLocaleString()} ج.م) = ${netProfit.toLocaleString()} ج.م.`,
      netCashFlow: `صافي حركة الخزنة والسيولة = (المبيعات المحصلة ${(salesCashCollected + salesInstapayCollected).toLocaleString()} ج.م - المرتجعات المستردة ${(refundsCash + refundsInstapay).toLocaleString()} ج.م${(debtPaymentsCash + debtPaymentsInstapay + depositsCash + depositsInstapay) > 0 ? ` + تحصيلات ديون وإيداعات ${(debtPaymentsCash + debtPaymentsInstapay + depositsCash + depositsInstapay).toLocaleString()} ج.م` : ''} = صافي مقبوضات الخزنة ${(cashRevenue + instapayRevenue).toLocaleString()} ج.م) - (مصاريف التشغيل ${operatingExpenses.toLocaleString()} ج.م + المدفوع للموردين من الخزنة ${supplierPaidFromSafe.toLocaleString()} ج.م + المسحوبات الشخصية والجمعية ${personalWithdrawals.toLocaleString()} ج.م) = ${netCashFlow.toLocaleString()} ج.م.`
    }
  };

  return {
    year: numYear,
    month: numMonth,
    yearMonth,
    monthName,
    totalSales,
    grossProfit,
    cogs: totalCogs,
    netProfit,
    totalExpenses,
    operatingExpenses,
    supplierPurchases,
    supplierCashPaid,
    supplierPaidFromSafe,
    personalWithdrawals,
    netCashFlow,
    totalDiscounts,
    totalOrders: orders.length,
    salesCashCollected,
    salesInstapayCollected,
    salesDebtRemaining,
    refundsCash,
    refundsInstapay,
    refundsTotal: Math.round((refundsCash + refundsInstapay) * 100) / 100,
    refundsCount: refundsList.length,
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
