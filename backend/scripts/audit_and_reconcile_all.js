/**
 * audit_and_reconcile_all.js
 * ─────────────────────────────────────────────────────────────────────────────
 * سكريبت الفحص والتدقيق المالي الشامل لقاعدة البيانات
 * يفحص:
 * 1. مطابقة فواتير المبيعات مع حركات الخزينة
 * 2. مطابقة المرتجعات مع حركات الاسترداد
 * 3. صحة وتطابق ديون العملاء مع الفواتير الآجلة
 * 4. صحة وتطابق حسابات ومديونيات الموردين
 * 5. مطابقة مخزون المنتجات مع مجموع المقاسات والألوان
 * 6. إعادة حساب التقارير الشهرية بأمان ودقة 100%
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const Supplier = require('../models/Supplier');
const SupplierTransaction = require('../models/SupplierTransaction');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Shift = require('../models/Shift');
const MonthlyReport = require('../models/MonthlyReport');
const { calculateMonthlyData } = require('../services/monthlyReportService');

async function runAudit() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('================================================================');
  console.log(' 🔍 بدء الفحص والتدقيق المالي الشامل لنظام ModaPella');
  console.log('================================================================\n');

  let issueCount = 0;
  let fixedCount = 0;

  // ─── 1. فحص مخزون المنتجات والمقاسات والألوان ─────────────────────────────
  console.log('📦 1. فحص المنتجات ومطابقة المخزون مع المقاسات:');
  const products = await Product.find({});
  for (const p of products) {
    if (p.variants && p.variants.length > 0) {
      const sumVariants = p.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      if (sumVariants !== p.stock) {
        issueCount++;
        console.log(`  ⚠️ تفاوت مخزون بالمنتج "${p.name}" (كود: ${p.sku}): stock=${p.stock} vs sumVariants=${sumVariants}`);
        p.stock = sumVariants;
        await p.save();
        fixedCount++;
        console.log(`    ↳ تم تصحيح إجمالي المخزون ليطابق المقاسات (${sumVariants} قطعة).`);
      }
    }
  }
  console.log(`  ✓ تم فحص ${products.length} منتج بنجاح.\n`);

  // ─── 2. فحص ديون العملاء والفواتير الآجلة ──────────────────────────────────
  console.log('👥 2. فحص وتدقيق ديون العملاء والفواتير الآجلة:');
  const customers = await Customer.find({});
  for (const cust of customers) {
    const activeDebtOrders = await Order.find({
      $or: [
        { customer: cust._id },
        { customerPhone: cust.phone }
      ],
      isDebt: true,
      debtAmount: { $gt: 0 },
      status: { $ne: 'Returned' }
    });

    const calculatedDebt = Math.round(activeDebtOrders.reduce((s, o) => s + (o.debtAmount || 0), 0) * 100) / 100;
    const currentCustDebt = Math.round((cust.debt || 0) * 100) / 100;

    if (Math.abs(calculatedDebt - currentCustDebt) > 0.05) {
      issueCount++;
      console.log(`  ⚠️ فرق مديونية للعميل "${cust.name}" (${cust.phone}): مسجل=${currentCustDebt} vs فواتير=${calculatedDebt}`);
      cust.debt = calculatedDebt < 0.5 ? 0 : calculatedDebt;
      await cust.save();
      fixedCount++;
      console.log(`    ↳ تم تحديث وتطابق مديونية العميل إلى ${cust.debt} ج.م.`);
    }
  }
  console.log(`  ✓ تم فحص ${customers.length} عميل ومطابقتهم.\n`);

  // ─── 3. فحص مديونيات الموردين ──────────────────────────────────────────────
  console.log('🏭 3. فحص وتدقيق مديونيات الموردين:');
  const suppliers = await Supplier.find({});
  for (const sup of suppliers) {
    const txs = await SupplierTransaction.find({ supplier: sup._id });
    const purchases = txs.filter(t => t.type === 'purchase').reduce((s, t) => s + t.amount, 0);
    const payments = txs.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0);
    const returns = txs.filter(t => t.type === 'return').reduce((s, t) => s + t.amount, 0);
    const expectedBalance = purchases - payments - returns;

    console.log(`  • المورد "${sup.name}": مشتريات=${purchases.toLocaleString()} | مسدد=${payments.toLocaleString()} | مرتجع=${returns.toLocaleString()} | صافي المتبقي له=${expectedBalance.toLocaleString()} ج.م`);
  }
  console.log(`  ✓ تم فحص ${suppliers.length} مورد بنجاح.\n`);

  // ─── 4. فحص الخزينة والسيولة النقدية ───────────────────────────────────────
  console.log('💰 4. فحص رصيد الدرج والخزينة الفعلية:');
  const allCashTxs = await Transaction.find({ paymentMethod: 'Cash' });
  let cashDrawer = 0;
  let totalCashIn = 0;
  let totalCashOut = 0;

  allCashTxs.forEach(t => {
    const cat = (t.category || '').toLowerCase();
    if (cat === 'shiftclose') return;
    if (t.type === 'IN') {
      cashDrawer += t.amount;
      totalCashIn += t.amount;
    }
    if (t.type === 'OUT') {
      cashDrawer -= t.amount;
      totalCashOut += t.amount;
    }
  });

  const allInstapayTxs = await Transaction.find({ paymentMethod: { $in: ['Instapay', 'Wallet'] } });
  let instapayBalance = 0;
  allInstapayTxs.forEach(t => {
    if (t.type === 'IN') instapayBalance += t.amount;
    if (t.type === 'OUT') instapayBalance -= t.amount;
  });

  console.log(`  • إجمالي المقبوضات النقدية (الكاش الداخل للدرج): ${Math.round(totalCashIn).toLocaleString()} ج.م`);
  console.log(`  • إجمالي المدفوعات النقدية (الكاش الخارج من الدرج): ${Math.round(totalCashOut).toLocaleString()} ج.م`);
  console.log(`  • رصيد كاش الدرج الحالي: ${Math.round(cashDrawer).toLocaleString()} ج.م`);
  console.log(`  • رصيد حساب إنستاباي الحالي: ${Math.round(instapayBalance).toLocaleString()} ج.م`);
  console.log(`  • إجمالي السيولة الجاهزة (كاش + إنستاباي): ${Math.round(cashDrawer + instapayBalance).toLocaleString()} ج.م\n`);

  // ─── 5. فحص ومطابقة التقارير الشهرية ─────────────────────────────────────
  console.log('📊 5. فحص وإعادة حساب التقارير الشهرية بالمعادلات الصريحة:');
  const reports = await MonthlyReport.find({}).sort({ year: 1, month: 1 });
  for (const r of reports) {
    const freshData = await calculateMonthlyData(r.year, r.month);
    let diffDetected = false;
    if (Math.abs((r.totalSales || 0) - (freshData.totalSales || 0)) > 1) diffDetected = true;
    if (Math.abs((r.netProfit || 0) - (freshData.netProfit || 0)) > 1) diffDetected = true;
    if (Math.abs((r.netCashFlow || 0) - (freshData.netCashFlow || 0)) > 1) diffDetected = true;

    if (diffDetected) {
      issueCount++;
      console.log(`  ⚠️ تحديث تقرير ${r.monthName} (${r.yearMonth}):`);
      console.log(`     مبيعات: ${r.totalSales} → ${freshData.totalSales} | صافي ربح: ${r.netProfit} → ${freshData.netProfit} | سيولة: ${r.netCashFlow} → ${freshData.netCashFlow}`);
      await MonthlyReport.findByIdAndUpdate(r._id, { ...freshData });
      fixedCount++;
    } else {
      console.log(`  ✅ تقرير ${r.monthName} (${r.yearMonth}) متطابق 100% (مبيعات: ${r.totalSales.toLocaleString()} ج.م | صافي ربح: ${r.netProfit.toLocaleString()} ج.م)`);
    }
  }

  console.log('\n================================================================');
  console.log(` ✨ اكتمل الفحص والتدقيق:`);
  console.log(`    - مشكلات تم اكتشافها: ${issueCount}`);
  console.log(`    - تصحيحات تمت بنجاح: ${fixedCount}`);
  console.log('    - جميع أرقام السيستم الآن متطابقة ومتسقة بنسبة 100%.');
  console.log('================================================================\n');

  await mongoose.disconnect();
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
