const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const MonthlyReport = require('../models/MonthlyReport');
const SystemNotification = require('../models/SystemNotification');

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

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

  // Fetch orders and expense transactions within date range
  const [orders, transactions] = await Promise.all([
    Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'Completed'
    }).populate('employee'),
    Transaction.find({
      createdAt: { $gte: startDate, $lte: endDate },
      type: 'OUT'
    })
  ]);

  // Overall totals
  let totalSales = 0;
  let totalDiscounts = 0;
  let cashRevenue = 0;
  let instapayRevenue = 0;
  let grossProfit = 0;

  orders.forEach(o => {
    totalSales += o.totalAmount;
    totalDiscounts += (o.discount || 0);

    if (o.paymentMethod === 'Cash') {
      cashRevenue += o.totalAmount;
    } else {
      instapayRevenue += o.totalAmount;
    }

    const orderCost = o.items.reduce((sum, item) => {
      const qty = item.quantity - (item.returnedQuantity || 0);
      return sum + (item.costPrice || 0) * Math.max(0, qty);
    }, 0);

    const orderProfit = (o.totalAmount - orderCost) - (o.discount || 0);
    grossProfit += orderProfit;
  });

  // Helper helper to distinguish supplier/inventory payments vs operational expenses
  const isSupplierTx = (t) => {
    const cat = (t.category || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();
    return (
      cat.includes('مورد') ||
      cat.includes('بضاعة') ||
      desc.includes('مورد') ||
      desc.includes('بضاعة') ||
      Boolean(t.referenceId)
    );
  };

  // Expense breakdown & total
  const expenseMap = {};
  let totalExpenses = 0;
  let operatingExpenses = 0;
  let supplierPurchases = 0;

  transactions.forEach(t => {
    const cat = t.category || 'أخرى';
    expenseMap[cat] = (expenseMap[cat] || 0) + t.amount;
    totalExpenses += t.amount;

    if (isSupplierTx(t)) {
      supplierPurchases += t.amount;
    } else {
      operatingExpenses += t.amount;
    }
  });

  const expenseBreakdown = Object.entries(expenseMap).map(([category, amount]) => ({
    category,
    amount
  }));

  // Net Operating Profit = Gross Profit from sales - Operating Expenses (Rent, Utilities, Wages, etc.)
  const netProfit = grossProfit - operatingExpenses;

  // Net Cash Flow = Total Money Received - Total Outgoing (Operating + Supplier Investments)
  const netCashFlow = (cashRevenue + instapayRevenue) - (operatingExpenses + supplierPurchases);

  // Daily breakdown
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

    const dayRevenue = dayOrders.reduce((s, o) => s + o.totalAmount, 0);
    const dayCash = dayOrders.filter(o => o.paymentMethod === 'Cash').reduce((s, o) => s + o.totalAmount, 0);
    const dayInstapay = dayOrders.filter(o => o.paymentMethod !== 'Cash').reduce((s, o) => s + o.totalAmount, 0);

    let dayOpExpenses = 0;
    let daySupplierPurchases = 0;

    dayTransactions.forEach(t => {
      if (isSupplierTx(t)) {
        daySupplierPurchases += t.amount;
      } else {
        dayOpExpenses += t.amount;
      }
    });

    const dayExpenses = dayOpExpenses + daySupplierPurchases;

    const dayGrossProfit = dayOrders.reduce((sum, o) => {
      const orderCost = o.items.reduce((cSum, item) => cSum + (item.costPrice || 0) * item.quantity, 0);
      return sum + (o.totalAmount - orderCost) - (o.discount || 0);
    }, 0);

    const dayProfit = dayGrossProfit - dayOpExpenses;

    const dateStr = dStart.toLocaleDateString('ar-EG-u-nu-latn', { month: 'numeric', day: 'numeric' });

    dailyData.push({
      day: d,
      date: dateStr,
      revenue: dayRevenue,
      profit: dayProfit,
      count: dayOrders.length,
      cashRevenue: dayCash,
      instapayRevenue: dayInstapay,
      expenses: dayExpenses,
      operatingExpenses: dayOpExpenses,
      supplierPurchases: daySupplierPurchases
    });
  }
      profit: dayProfit,
      count: dayOrders.length,
      cashRevenue: dayCash,
      instapayRevenue: dayInstapay,
      expenses: dayExpenses
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
      const orderCost = o.items.reduce((s, item) => s + (item.costPrice || 0) * item.quantity, 0);
      emp.profit += (o.totalAmount - orderCost) - (o.discount || 0);
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
    employeePerformance
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
