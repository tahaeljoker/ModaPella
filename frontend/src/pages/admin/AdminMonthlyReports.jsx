import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Icon } from '../../components/Icon';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

// ─── Pure SVG Monthly Daily Chart ─────────────────────────────────────────────
function MonthlyChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const chartH = 160;
  const chartW = 700;

  const barW = Math.max(6, Math.min(24, (chartW * 0.7) / data.length));
  const gap = (chartW - data.length * barW) / (data.length + 1);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${chartW} ${chartH + 60}`} className="w-full min-w-[640px]">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chartH - chartH * ratio;
          return (
            <g key={ratio}>
              <line x1={0} y1={y} x2={chartW} y2={y} stroke="#7C0A1215" strokeWidth="1" />
              {ratio > 0 && (
                <text x={4} y={y - 3} fontSize="9" fill="#7C0A1260" textAnchor="start">
                  {Number(maxRevenue * ratio).toLocaleString('en-US')}
                </text>
              )}
            </g>
          );
        })}
        {/* Bars */}
        {data.map((d, i) => {
          const x = gap + i * (barW + gap);
          const revH = (d.revenue / maxRevenue) * chartH;
          const profitH = (Math.max(0, d.profit || 0) / maxRevenue) * chartH;

          return (
            <g key={i}>
              {/* Total Revenue bar */}
              <rect
                x={x} y={chartH - revH} width={barW * 0.46} height={revH}
                rx={Math.min(3, barW * 0.1)} fill="#7C0A12" opacity="0.9"
              >
                <title>{`يوم ${d.day}: مبيعات ${EGP(d.revenue)}`}</title>
              </rect>
              {/* Net Profit bar */}
              <rect
                x={x + barW * 0.5} y={chartH - profitH} width={barW * 0.46} height={profitH}
                rx={Math.min(3, barW * 0.1)} fill="#10b981" opacity="0.9"
              >
                <title>{`يوم ${d.day}: ربح ${EGP(d.profit)}`}</title>
              </rect>
              {/* Day label */}
              <text x={x + barW / 2} y={chartH + 16} fontSize="9" fill="#7C0A1299" textAnchor="middle">
                {d.day}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-burgundy/70">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-burgundy opacity-90" />
          إجمالي الإيراد Daily Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-emerald-500 opacity-90" />
          صافي الربح Net Profit
        </span>
      </div>
    </div>
  );
}

export default function AdminMonthlyReports() {
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedYearMonth, setSelectedYearMonth] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [showFullAudit, setShowFullAudit] = useState(false);

  // Fetch list of available months
  useEffect(() => {
    fetchMonthsList();
  }, []);

  const fetchMonthsList = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/monthly');
      setAvailableMonths(res.data);
      if (res.data.length > 0) {
        // Select first month (current or most recent)
        const initial = res.data[0].yearMonth;
        setSelectedYearMonth(initial);
        fetchReportDetail(initial);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchReportDetail = async (yearMonth) => {
    try {
      setLoading(true);
      const [year, month] = yearMonth.split('-');
      const res = await api.get(`/reports/monthly/${year}/${month}`);
      setReport(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (e) => {
    const ym = e.target.value;
    setSelectedYearMonth(ym);
    fetchReportDetail(ym);
  };

  const handleRegenerate = async () => {
    if (!selectedYearMonth) return;
    try {
      setGenerating(true);
      setMessage('');
      const [year, month] = selectedYearMonth.split('-');
      const res = await api.post(`/reports/monthly/${year}/${month}/generate`);
      setReport(res.data.report);
      setMessage('تم إعادة تجميع وحفظ تقرير الشهر بنجاح');
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      console.error(err);
      setMessage('حدث خطأ أثناء تحديث التقرير الشهري');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !report) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-burgundy print:p-0 print:space-y-4">
      {/* Printable Header / Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/50">التقارير والأرشيف</p>
          <h2 className="mt-1 text-3xl font-bold">التقارير الشهرية للمتجر</h2>
          <p className="mt-1 text-sm text-burgundy/60">
            تجميع وحفظ الإحصائيات الشهرية والبدء من الصفر تلقائياً في التقارير اليومية مع بداية كل شهر
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2 rounded-2xl border border-burgundy/15 bg-white p-2 shadow-sm">
            <span className="text-xs font-bold text-burgundy/70 pr-2">اختر الشهر:</span>
            <select
              value={selectedYearMonth}
              onChange={handleMonthChange}
              className="rounded-xl border border-burgundy/10 bg-[#F7F0EC]/50 px-3 py-1.5 text-sm font-bold text-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/30"
            >
              {availableMonths.map(m => (
                <option key={m.yearMonth} value={m.yearMonth}>
                  {m.monthName} {m.isClosed ? '(مُغلق)' : '(نشط)'}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Audit Button */}
          <button
            type="button"
            onClick={() => setShowFullAudit(!showFullAudit)}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold shadow-sm transition-all ${
              showFullAudit
                ? 'border-burgundy bg-burgundy text-cream'
                : 'border-burgundy/20 bg-white text-burgundy hover:bg-burgundy/5'
            }`}
          >
            📋 {showFullAudit ? 'إخفاء تفاصيل الحسابات' : 'عرض التقرير الشهري الكامل والتفصيلي'}
          </button>

          {/* Regenerate Button */}
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={generating}
            className="flex items-center gap-2 rounded-2xl border border-burgundy/20 bg-white px-4 py-2 text-sm font-semibold text-burgundy shadow-sm hover:bg-burgundy/5 transition-all disabled:opacity-50"
          >
            <span className={generating ? 'animate-spin' : ''}>🔄</span>
            {generating ? 'جاري التجميع...' : 'تحديث التقرير الشهري'}
          </button>

          {/* Print / Export Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-2xl bg-burgundy px-5 py-2 text-sm font-bold text-cream shadow-md hover:bg-burgundy/90 transition-all"
          >
            🖨️ طباعة / تصدير التقرير
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 print:hidden">
          {message}
        </div>
      )}

      {/* Official Print Header (Visible only when printing) */}
      <div className="hidden print:block border-b border-burgundy/20 pb-4 text-right">
        <h1 className="text-2xl font-bold text-burgundy">ModaPella - تقرير مبيعات وأرباح شهري</h1>
        <p className="text-sm text-burgundy/70 mt-1">
          عن شهر: <span className="font-bold">{report?.monthName}</span> | تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}
        </p>
      </div>

      {report && (
        <>
          {/* Status Banner */}
          <div className="flex items-center justify-between rounded-2xl border border-burgundy/10 bg-white p-4 shadow-sm print:shadow-none">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <h3 className="text-xl font-bold text-burgundy">{report.monthName}</h3>
                <p className="text-xs text-burgundy/60">
                  {report.isClosed
                    ? `مُغلق ومؤرشف بتاريخ ${report.closedAt ? new Date(report.closedAt).toLocaleDateString('ar-EG') : ''}`
                    : 'الشهر الجاري (البيانات محدثة تلقائياً وتتصفير يومياً للتقرير الشهرى)'}
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                report.isClosed ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {report.isClosed ? '🔒 تقرير مؤرشف' : '⚡ شهر نشط جاري'}
            </span>
          </div>

          {/* Full Audit Detailed Section (دي جت ازاي وكدا) */}
          {showFullAudit && (
            <div className="rounded-[1.75rem] border-2 border-burgundy/30 bg-[#FFFDFB] p-6 shadow-md space-y-6 animate-fadeIn print:block">
              <div className="flex items-center justify-between border-b border-burgundy/15 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  <h3 className="text-xl font-bold text-burgundy">التدقيق المالي والتقرير التفصيلي الكامل (كيف تم حساب كل رقم)</h3>
                </div>
                <span className="rounded-full bg-burgundy/10 px-3 py-1 text-xs font-bold text-burgundy">دليل التدقيق المحاسبي</span>
              </div>

              {/* Explanations Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* 1. Total Sales */}
                <div className="rounded-2xl border border-burgundy/10 bg-white p-4 space-y-2">
                  <h4 className="font-bold text-sm text-burgundy flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-burgundy" /> 1. إجمالي المبيعات (Total Sales)
                  </h4>
                  <p className="text-xs text-burgundy/80 leading-relaxed font-medium">
                    {report.auditDetails?.explanations?.totalSales || `إجمالي المبيعات هو مجموع صافي الفواتير المكتملة (${report.totalOrders} فاتورة) بقيمة ${EGP(report.totalSales)}.`}
                  </p>
                  <div className="text-[11px] text-burgundy/60 bg-burgundy/5 p-2 rounded-xl">
                    المبيعات كاش: {EGP(report.cashRevenue)} | مبيعات إنستاباي: {EGP(report.instapayRevenue)}
                  </div>
                </div>

                {/* 2. Total Discounts */}
                <div className="rounded-2xl border border-amber-500/20 bg-amber-50/40 p-4 space-y-2">
                  <h4 className="font-bold text-sm text-amber-900 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-600" /> 2. إجمالي الخصومات (Discounts)
                  </h4>
                  <p className="text-xs text-amber-950 leading-relaxed font-medium">
                    {report.auditDetails?.explanations?.totalDiscounts || `إجمالي الخصومات الممنوحة = مجموع التخفيضات المباشرة في الفواتير بقيمة ${EGP(report.totalDiscounts)}.`}
                  </p>
                  <div className="text-[11px] text-amber-900 bg-amber-100/60 p-2 rounded-xl">
                    قبل الخصم: {EGP((report.totalSales || 0) + (report.totalDiscounts || 0))} | الخصومات: -{EGP(report.totalDiscounts)} | صافي المبيعات: {EGP(report.totalSales)}
                  </div>
                </div>

                {/* 3. Gross Profit & COGS */}
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/40 p-4 space-y-2">
                  <h4 className="font-bold text-sm text-emerald-800 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" /> 3. مجمل الربح وتكلفة البضاعة (COGS)
                  </h4>
                  <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                    {report.auditDetails?.explanations?.grossProfit || `مجمل الربح = المبيعات الصافية ➖ تكلفة شراء البضاعة المباعة.`}
                  </p>
                  <div className="text-[11px] text-emerald-800 bg-emerald-100/60 p-2 rounded-xl">
                    تكلفة البضاعة المباعة (COGS): {EGP(report.auditDetails?.totalCogs || 0)} | مجمل الربح الصافي: {EGP(report.auditDetails?.grossProfit || (report.totalSales - (report.auditDetails?.totalCogs || 0)))}
                  </div>
                </div>

                {/* 4. Operating Expenses */}
                <div className="rounded-2xl border border-rose-500/20 bg-rose-50/40 p-4 space-y-2">
                  <h4 className="font-bold text-sm text-rose-800 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-600" /> 4. مصروفات التشغيل (Operating Expenses)
                  </h4>
                  <p className="text-xs text-rose-900 leading-relaxed font-medium">
                    {report.auditDetails?.explanations?.operatingExpenses || `مجموع المصاريف العمومية والإدارية كالإيجار والكهرباء والأجور فقط دون مشتريات الموردين أو حركات التصفية.`}
                  </p>
                  <div className="text-[11px] text-rose-800 bg-rose-100/60 p-2 rounded-xl">
                    إجمالي المصروفات التشغيلية: {EGP(report.operatingExpenses)}
                  </div>
                </div>

                {/* 5. Supplier Purchases */}
                <div className="rounded-2xl border border-amber-500/20 bg-amber-50/40 p-4 space-y-2">
                  <h4 className="font-bold text-sm text-amber-900 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-600" /> 5. مشتريات الموردين (Supplier Stock)
                  </h4>
                  <p className="text-xs text-amber-950 leading-relaxed font-medium">
                    {report.auditDetails?.explanations?.supplierPurchases || `إجمالي المبالغ المدفوعة لشراء مخزون سواء من الخزنة أو من خارجها.`}
                  </p>
                  <div className="text-[11px] text-amber-900 bg-amber-100/60 p-2 rounded-xl">
                    إجمالي المشتريات والموردين: {EGP(report.supplierPurchases)}
                  </div>
                </div>
              </div>

              {/* Formula Summary Card */}
              <div className="rounded-2xl bg-burgundy/5 p-4 border border-burgundy/10 space-y-2">
                <h4 className="font-bold text-sm text-burgundy">📌 القواعد والقيود المحاسبية المعتمدة للتقفيل الشهري:</h4>
                <p className="text-xs text-burgundy/80">
                  <span className="font-bold">1. صافي المبيعات = </span> إجمالي قيم المبيعات قبل الخصم ➖ إجمالي الخصومات الممنوحة ({EGP(report.totalDiscounts)})
                </p>
                <p className="text-xs text-burgundy/80">
                  <span className="font-bold">2. مجمل الربح التجاري = </span> صافي المبيعات ➖ تكلفة شراء البضاعة المباعة (COGS) <span className="text-burgundy/60 font-semibold">(عدم خصم التخفيض مرتين)</span>
                </p>
                <p className="text-xs text-burgundy/80">
                  <span className="font-bold">3. صافي الربح النهائي = </span> مجمل الربح التجاري ➖ مصروفات التشغيل
                </p>
                <p className="text-xs text-burgundy/80">
                  <span className="font-bold">4. صافي السيولة النقدية = </span> (المبيعات الكاش والإنستاباي + تحصيلات الديون) ➖ (مصاريف التشغيل + الموردين)
                </p>
              </div>

              {/* Itemized Operating Expense List */}
              {report.auditDetails?.operatingExpensesList && report.auditDetails.operatingExpensesList.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-burgundy">📜 كشف حساب مصاريف التشغيل المفصل لهذا الشهر:</h4>
                  <div className="max-h-60 overflow-y-auto rounded-2xl border border-burgundy/10 bg-white">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#F7F0EC]/60 font-bold sticky top-0">
                        <tr className="border-b border-burgundy/10">
                          <th className="py-2.5 px-3">التاريخ</th>
                          <th className="py-2.5 px-3">فئة المصروف</th>
                          <th className="py-2.5 px-3">الوصف</th>
                          <th className="py-2.5 px-3">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-burgundy/5">
                        {report.auditDetails.operatingExpensesList.map((exp, idx) => (
                          <tr key={idx} className="hover:bg-burgundy/[0.02]">
                            <td className="py-2 px-3 text-burgundy/60">{new Date(exp.date).toLocaleDateString('ar-EG')}</td>
                            <td className="py-2 px-3 font-semibold text-rose-800">{exp.category}</td>
                            <td className="py-2 px-3 text-burgundy/70">{exp.description || '—'}</td>
                            <td className="py-2 px-3 font-bold text-rose-700">{EGP(exp.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metric Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {/* Total Sales */}
            <div className="rounded-[1.5rem] border border-burgundy/10 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-burgundy/60 text-xs font-medium">
                <span>إجمالي المبيعات</span>
                <span>💰</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-burgundy">{EGP(report.totalSales)}</p>
              <div className="mt-2 flex justify-between text-[11px] text-burgundy/60">
                <span>كاش: {EGP(report.cashRevenue)}</span>
                <span>إنستاباي: {EGP(report.instapayRevenue)}</span>
              </div>
            </div>

            {/* Total Discounts Card */}
            <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-50/50 p-5 shadow-sm">
              <div className="flex items-center justify-between text-amber-900 text-xs font-medium">
                <span>إجمالي الخصومات</span>
                <span>🏷️</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-800">{EGP(report.totalDiscounts)}</p>
              <p className="mt-2 text-[11px] text-amber-900/70">
                خصومات الفواتير (قبل صافي المبيعات)
              </p>
            </div>

            {/* Net Operating Profit */}
            <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-50/50 p-5 shadow-sm">
              <div className="flex items-center justify-between text-emerald-800 text-xs font-medium">
                <span>صافي ربح النشاط</span>
                <span>📈</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{EGP(report.netProfit)}</p>
              <p className="mt-2 text-[11px] text-emerald-800/70">
                أرباح البضاعة المباعة ➖ مصاريف التشغيل
              </p>
            </div>

            {/* Operating Expenses */}
            <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-50/50 p-5 shadow-sm">
              <div className="flex items-center justify-between text-rose-800 text-xs font-medium">
                <span>مصروفات التشغيل</span>
                <span>💸</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-rose-700">
                {EGP(report.operatingExpenses ?? (report.totalExpenses - (report.supplierPurchases || 0)))}
              </p>
              <p className="mt-2 text-[11px] text-rose-800/70">
                إيجار، كهرباء، أجور، نثريات وشحن
              </p>
            </div>

            {/* Supplier / Inventory Purchases */}
            <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-50/50 p-5 shadow-sm">
              <div className="flex items-center justify-between text-amber-900 text-xs font-medium">
                <span>مشتريات بضائع وموردين</span>
                <span>📦</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-800">
                {EGP(report.supplierPurchases ?? 0)}
              </p>
              <p className="mt-2 text-[11px] text-amber-900/70">
                مبالغ مدفوعة لشراء مخزون وبضائع
              </p>
            </div>

            {/* Net Cash Flow / Safe Balance */}
            <div className="rounded-[1.5rem] border border-blue-500/20 bg-blue-50/50 p-5 shadow-sm">
              <div className="flex items-center justify-between text-blue-900 text-xs font-medium">
                <span>صافي حركة السيولة الخزينة</span>
                <span>🏦</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-800">
                {EGP(report.netCashFlow ?? (report.totalSales - report.totalExpenses))}
              </p>
              <p className="mt-2 text-[11px] text-blue-900/70">
                إجمالي الداخل كاش ➖ إجمالي الخارج
              </p>
            </div>
          </div>

          {/* Daily Performance Chart */}
          {report.dailyData && report.dailyData.length > 0 && (
            <div className="rounded-[1.75rem] border border-burgundy/10 bg-white p-6 shadow-sm print:shadow-none">
              <h3 className="mb-4 text-lg font-bold text-burgundy">المخطط البياني اليومي للشهر ({report.monthName})</h3>
              <MonthlyChart data={report.dailyData} />
            </div>
          )}

          {/* Detailed Day-by-Day Table */}
          <div className="rounded-[1.75rem] border border-burgundy/10 bg-white p-6 shadow-sm print:shadow-none">
            <h3 className="mb-4 text-lg font-bold text-burgundy">جدول الأداء اليومي المفصل للشهر</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-burgundy/10 bg-[#F7F0EC]/50 text-xs font-bold text-burgundy/70">
                    <th className="py-3 px-4">اليوم والتاريخ</th>
                    <th className="py-3 px-4">إجمالي الإيراد</th>
                    <th className="py-3 px-4">الخصومات</th>
                    <th className="py-3 px-4">صافي الربح</th>
                    <th className="py-3 px-4">المصروفات</th>
                    <th className="py-3 px-4">نقدية (كاش)</th>
                    <th className="py-3 px-4">إنستاباي / محفظة</th>
                    <th className="py-3 px-4 text-center">عدد الفواتير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-burgundy/5">
                  {report.dailyData?.map((day) => (
                    <tr key={day.day} className={`hover:bg-burgundy/[0.02] ${day.revenue > 0 ? '' : 'opacity-60'}`}>
                      <td className="py-2.5 px-4 font-semibold text-burgundy">
                        يوم {day.day} ({day.date})
                      </td>
                      <td className="py-2.5 px-4 font-bold text-burgundy">
                        {day.revenue > 0 ? EGP(day.revenue) : '—'}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-amber-800">
                        {day.discounts > 0 ? EGP(day.discounts) : '—'}
                      </td>
                      <td className={`py-2.5 px-4 font-bold ${day.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {day.revenue > 0 || day.expenses > 0 ? EGP(day.profit) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-rose-700 font-medium">
                        {day.expenses > 0 ? EGP(day.expenses) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-burgundy/70">
                        {day.cashRevenue > 0 ? EGP(day.cashRevenue) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-burgundy/70">
                        {day.instapayRevenue > 0 ? EGP(day.instapayRevenue) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-burgundy/80">
                        {day.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-burgundy/20 bg-burgundy/5 font-bold text-burgundy">
                    <td className="py-3 px-4">الإجمالي الشهري</td>
                    <td className="py-3 px-4">{EGP(report.totalSales)}</td>
                    <td className="py-3 px-4 text-amber-800">{EGP(report.totalDiscounts)}</td>
                    <td className="py-3 px-4 text-emerald-700">{EGP(report.netProfit)}</td>
                    <td className="py-3 px-4 text-rose-700">{EGP(report.totalExpenses)}</td>
                    <td className="py-3 px-4">{EGP(report.cashRevenue)}</td>
                    <td className="py-3 px-4">{EGP(report.instapayRevenue)}</td>
                    <td className="py-3 px-4 text-center">{report.totalOrders} فاتورة</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Breakdown Section: Expenses, Categories, Best Sellers, Employees */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Category Breakdown */}
            <div className="rounded-[1.75rem] border border-burgundy/10 bg-white p-6 shadow-sm print:shadow-none">
              <h4 className="mb-4 text-base font-bold text-burgundy">مبيعات الأقسام في الشهر</h4>
              {report.categoryBreakdown && report.categoryBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {report.categoryBreakdown.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-burgundy">{cat.category}</span>
                      <span className="font-bold text-burgundy">{EGP(cat.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-burgundy/50">لا توجد مبيعات أقسام مسجلة لهذا الشهر</p>
              )}
            </div>

            {/* Expenses Breakdown */}
            <div className="rounded-[1.75rem] border border-burgundy/10 bg-white p-6 shadow-sm print:shadow-none">
              <h4 className="mb-4 text-base font-bold text-burgundy">توزيع المصروفات في الشهر</h4>
              {report.expenseBreakdown && report.expenseBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {report.expenseBreakdown.map((exp, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-rose-800">{exp.category}</span>
                      <span className="font-bold text-rose-700">{EGP(exp.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-burgundy/50">لا توجد مصروفات مسجلة لهذا الشهر</p>
              )}
            </div>

            {/* Top Best Sellers */}
            <div className="rounded-[1.75rem] border border-burgundy/10 bg-white p-6 shadow-sm print:shadow-none">
              <h4 className="mb-4 text-base font-bold text-burgundy">المنتجات الأكثر مبيعاً في الشهر</h4>
              {report.bestSellers && report.bestSellers.length > 0 ? (
                <div className="space-y-3">
                  {report.bestSellers.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-burgundy">{idx + 1}. {item.name}</span>
                      <span className="font-bold text-burgundy/80">{item.qty} قطعة</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-burgundy/50">لا توجد بيانات بيع منتجات لهذا الشهر</p>
              )}
            </div>

            {/* Employee Performance */}
            <div className="rounded-[1.75rem] border border-burgundy/10 bg-white p-6 shadow-sm print:shadow-none">
              <h4 className="mb-4 text-base font-bold text-burgundy">أداء الموظفين في الشهر</h4>
              {report.employeePerformance && report.employeePerformance.length > 0 ? (
                <div className="space-y-3">
                  {report.employeePerformance.map((emp, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-bold text-burgundy">{emp.name}</p>
                        <p className="text-[11px] text-burgundy/60">{emp.orderCount} عمليات | {emp.itemsSold} قطعة</p>
                      </div>
                      <span className="font-bold text-emerald-700">{EGP(emp.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-burgundy/50">لا توجد عمليات موظفين لهذا الشهر</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
