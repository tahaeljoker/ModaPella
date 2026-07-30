const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const MonthlyReport = require('../models/MonthlyReport');
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

module.exports = router;
