import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Icon } from '../../components/Icon';
import InfoPopover from '../../components/InfoPopover';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const ACT_CONFIG = {
 sale: { label: 'مبيعات', icon: '', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
 expense: { label: 'مصروفات', icon: '', color: 'border-rose-500 bg-rose-50 text-rose-800' },
 refund: { label: 'مرتجع', icon: '', color: 'border-amber-500 bg-amber-50 text-amber-800' },
 deposit: { label: 'إيداع', icon: '', color: 'border-blue-500 bg-blue-50 text-blue-800' },
 safe_movement: { label: 'حركة خزينة', icon: '', color: 'border-indigo-500 bg-indigo-50 text-indigo-800' },
 stock_adjustment: { label: 'مخزون', icon: '', color: 'border-teal-500 bg-teal-50 text-teal-800' },
 shift_open: { label: 'فتح وردية', icon: '', color: 'border-purple-500 bg-purple-50 text-purple-800' },
 shift_close: { label: 'إغلاق وردية', icon: '', color: 'border-slate-500 bg-slate-50 text-slate-800' }
};

function StatCard({ label, value, sub, color = 'bg-white', icon, onClick, popover }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-[1.75rem] border border-burgundy/10 ${color} p-6 shadow-sm transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-burgundy/20' : ''
      }`}
    >
      {icon && <div className="mb-3 text-2xl">{icon}</div>}
      <p className="text-sm font-medium text-burgundy/60">{label}</p>
      <div className="mt-2 text-3xl font-bold text-burgundy flex items-center gap-1">
        {value}
        {popover && <span onClick={e => e.stopPropagation()}>{popover}</span>}
      </div>
      {sub && <div className="mt-1 text-xs text-burgundy/60 leading-relaxed">{sub}</div>}
    </div>
  );
}

// ─── Pure SVG Bar Chart ───────────────────────────────────────────────────────
function WeeklyChart({ data }) {
 if (!data || data.length === 0) return null;
 const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
 const chartH = 140;
 const chartW = 560;
 
 // Dynamically calculate bar width and gap based on dataset length
 const barW = Math.max(8, Math.min(48, (chartW * 0.6) / data.length));
 const gap = (chartW - data.length * barW) / (data.length + 1);

 return (
 <div className="overflow-x-auto">
 <svg viewBox={`0 0 ${chartW} ${chartH + 60}`} className="w-full max-w-[600px]" style={{ minWidth: '320px' }}>
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
 const instaH = (Math.max(0, d.instapayRevenue || 0) / maxRevenue) * chartH;
 const singleBarW = barW * 0.31;

 return (
 <g key={i}>
 {/* Total Revenue bar (burgundy) */}
 <rect
 x={x} y={chartH - revH} width={singleBarW} height={revH}
 rx={Math.min(3, singleBarW * 0.15)} fill="#7C0A12" opacity="0.9"
 />
 {/* Instapay bar (blue) */}
 <rect
 x={x + barW * 0.34} y={chartH - instaH} width={singleBarW} height={instaH}
 rx={Math.min(3, singleBarW * 0.15)} fill="#2563eb" opacity="0.9"
 />
 {/* Net Profit bar (emerald green) */}
 <rect
 x={x + barW * 0.68} y={chartH - profitH} width={singleBarW} height={profitH}
 rx={Math.min(3, singleBarW * 0.15)} fill="#10b981" opacity="0.9"
 />
 {/* Day label */}
 <text x={x + barW / 2} y={chartH + 16} fontSize={data.length > 10 ? "7" : "10"} fill="#7C0A1299" textAnchor="middle">
 {d.date}
 </text>
 {/* Count label */}
 {d.count > 0 && data.length <= 15 && (
 <text x={x + barW / 2} y={chartH - Math.max(revH, profitH, instaH) - 4} fontSize="9" fill="#7C0A12" textAnchor="middle" fontWeight="bold">
 {d.count}
 </text>
 )}
 </g>
 );
 })}
 {/* Total revenue tooltip at bottom (only show if columns <= 15 to avoid clutter) */}
 {data.length <= 15 && data.map((d, i) => {
 const x = gap + i * (barW + gap);
 return d.revenue > 0 ? (
 <text key={i} x={x + barW / 2} y={chartH + 30} fontSize="8" fill="#7C0A1270" textAnchor="middle">
 {Number(d.revenue / 1000).toFixed(1)}k
 </text>
 ) : null;
 })}
 </svg>
 {/* Legend */}
 <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-burgundy/60">
 <span className="flex items-center gap-1.5">
 <span className="h-3 w-3 rounded-sm bg-burgundy opacity-90" />
 إجمالي الإيرادات
 </span>
 <span className="flex items-center gap-1.5">
 <span className="h-3 w-3 rounded-sm bg-blue-600 opacity-90" />
 إنستاباي اليومي
 </span>
 <span className="flex items-center gap-1.5">
 <span className="h-3 w-3 rounded-sm bg-emerald-500 opacity-90" />
 صافي الأرباح
 </span>
 {data.length <= 15 && <span className="text-burgundy/40">· الرقم فوق العمود = عدد الطلبات</span>}
 </div>
 </div>
 );
}

function AdminOverview() {
 const [overview, setOverview] = useState(null);
 const [summary, setSummary] = useState({ totalRevenue: 0, completed: 0, returned: 0 });
 const [siteConfig, setSiteConfig] = useState(null);
 const [weeklyData, setWeeklyData] = useState([]);
 const [recentActivities, setRecentActivities] = useState([]);
 const [loading, setLoading] = useState(true);
 const [period, setPeriod] = useState('current');
 const navigate = useNavigate();

 // Date range filters
 const [dateFrom, setDateFrom] = useState('');
 const [dateTo, setDateTo] = useState('');
 const [filterLoading, setFilterLoading] = useState(false);

 // Sensitive data visibility states
 const [showSensitive, setShowSensitive] = useState(() => {
 return localStorage.getItem('showSensitiveData') === 'true';
 });
 const [revealedCards, setRevealedCards] = useState({});

 useEffect(() => {
 localStorage.setItem('showSensitiveData', showSensitive ? 'true' : 'false');
 }, [showSensitive]);

 const toggleCardReveal = (cardKey) => {
 if (!showSensitive) {
 setRevealedCards(prev => ({
 ...prev,
 [cardKey]: !prev[cardKey]
 }));
 }
 };

 const handleToggleSensitive = () => {
 setShowSensitive(prev => {
 const newVal = !prev;
 if (!newVal) {
 setRevealedCards({});
 }
 return newVal;
 });
 };

 const formatSensitive = (cardKey, valStr) => {
 const isRevealed = showSensitive || revealedCards[cardKey];
 return (
 <span
 className={`inline-block transition-all duration-300 ${
 !isRevealed ? 'blur-md select-none' : ''
 }`}
 >
 {valStr}
 </span>
 );
 };

 const loadData = async (selectedPeriod = period) => {
 try {
 setLoading(true);
 const [overviewRes, summaryRes, configRes, weeklyRes, activitiesRes] = await Promise.all([
 api.get(`/admin/overview?period=${selectedPeriod}`),
 api.get('/orders/summary'),
 api.get('/admin/site-config'),
 api.get('/orders/weekly'),
 api.get('/cashier/activities')
 ]);
 setOverview(overviewRes.data);
 setSummary(summaryRes.data);
 setSiteConfig(configRes.data);
 setWeeklyData(weeklyRes.data);
 setRecentActivities(activitiesRes.data.slice(0, 5));
 } catch (e) {
 console.error(e);
 } finally {
 setLoading(false);
 }
 };

 const handlePeriodChange = (newPeriod) => {
 setPeriod(newPeriod);
 loadData(newPeriod);
 };

 const handlePublishToggle = async () => {
 try {
 const res = await api.put('/admin/site-config', { published: !siteConfig.published });
 setSiteConfig(res.data);
 } catch (e) {
 console.error(e);
 }
 };

 useEffect(() => { loadData('current'); }, []);

 if (loading && !overview) {
 return (
 <div className="flex h-64 items-center justify-center">
 <div className="h-10 w-10 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
 </div>
 );
 }

  const todayRevenue = weeklyData[weeklyData.length - 1]?.revenue || 0;
  const todayOrders = weeklyData[weeklyData.length - 1]?.count || 0;
  const todayInstapay = weeklyData[weeklyData.length - 1]?.instapayRevenue || 0;
  const todayCash = weeklyData[weeklyData.length - 1]?.cashRevenue || 0;
  const todayRefunds = weeklyData[weeklyData.length - 1]?.refunds || 0;
  const weekTotal = weeklyData.reduce((s, d) => s + d.revenue, 0);
  const weekInstapay = weeklyData.reduce((s, d) => s + (d.instapayRevenue || 0), 0);

 return (
 <div className="space-y-8 text-burgundy">
 {/* Header */}
 <div className="flex flex-wrap items-center justify-between gap-4">
 <div>
 <p className="text-xs uppercase tracking-[0.35em] text-burgundy/50">لوحة التحكم</p>
 <h2 className="mt-1 text-3xl font-bold">مرحباً بك في ModaPella</h2>
 <p className="mt-1 text-sm text-burgundy/60">نظرة عامة على أداء المتجر ({overview?.monthName || 'الشهر الجاري'})</p>
 </div>
 <div className="flex flex-wrap items-center gap-2">
 {/* Period Selector */}
 <div className="flex items-center gap-1 rounded-2xl border border-burgundy/15 bg-white p-1 shadow-sm">
 <button
 type="button"
 onClick={() => handlePeriodChange('current')}
 className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
 period === 'current' ? 'bg-burgundy text-white shadow-sm' : 'text-burgundy/70 hover:bg-burgundy/5'
 }`}
 >
 الشهر الجاري
 </button>
 <button
 type="button"
 onClick={() => handlePeriodChange('previous')}
 className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
 period === 'previous' ? 'bg-burgundy text-white shadow-sm' : 'text-burgundy/70 hover:bg-burgundy/5'
 }`}
 >
 الشهر السابق
 </button>
 <button
 type="button"
 onClick={() => handlePeriodChange('all')}
 className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
 period === 'all' ? 'bg-burgundy text-white shadow-sm' : 'text-burgundy/70 hover:bg-burgundy/5'
 }`}
 >
 كل الأوقات
 </button>
 </div>

 <button
 type="button"
 onClick={handleToggleSensitive}
 className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border border-burgundy/25 bg-white text-burgundy shadow-sm transition hover:bg-burgundy/5"
 title={showSensitive ? 'إخفاء الأرقام المالية الحساسة' : 'عرض الأرقام المالية الحساسة'}
 >
 <Icon name={showSensitive ? 'eyeOff' : 'eye'} className="w-4 h-4" />
 <span>{showSensitive ? 'إخفاء الأرقام' : 'عرض الأرقام'}</span>
 </button>
 {siteConfig && (
 <button
 type="button"
 onClick={handlePublishToggle}
 className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow transition hover:opacity-90 ${
 siteConfig.published ? 'bg-emerald-600' : 'bg-slate-500'
 }`}
 >
 <span className={`h-2 w-2 rounded-full ${siteConfig.published ? 'bg-white animate-pulse' : 'bg-white/60'}`} />
 {siteConfig.published ? 'الموقع منشور' : 'الموقع موقوف'}
 </button>
 )}
 </div>
 </div>

 {/* Today highlight */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
 <div
 onClick={() => toggleCardReveal('todayRevenue')}
 className={`rounded-[1.75rem] bg-burgundy p-6 text-white shadow-lg shadow-burgundy/20 select-none transition-all duration-300 ${
 !showSensitive && !revealedCards['todayRevenue'] ? 'cursor-pointer hover:shadow-xl hover:opacity-95' : ''
 }`}
 >
 <p className="text-xs font-semibold uppercase tracking-widest opacity-70">صافي مبيعات اليوم</p>
 <p className="mt-3 text-3xl font-bold">
 {formatSensitive('todayRevenue', EGP(todayRevenue))}
 </p>
 <p className="mt-2 text-sm opacity-70">
   {todayOrders} طلب اليوم {todayRevenue > 0 ? `(كاش: ${EGP(todayCash)} | إنستاباي: ${EGP(todayInstapay)})` : ''}{todayRefunds > 0 ? ` · مرتجع: -${EGP(todayRefunds)}` : ''}
 </p>
 </div>
        <StatCard
          label={period === 'current' ? 'صافي المبيعات' : period === 'previous' ? 'مبيعات الشهر السابق' : 'إجمالي المبيعات'}
          value={formatSensitive('totalSales', EGP(overview?.totalSales ?? 0))}
          icon=""
          color="bg-white"
          sub={`مرتجعات فواتير الفترة (-${EGP(overview?.orderReturnsTotal ?? overview?.totalRefunds ?? 0)}) والخصومات`}
          onClick={() => toggleCardReveal('totalSales')}
          popover={
            <InfoPopover
              title="صافي المبيعات (المستحق الفعلي)"
              formula="المبيعات قبل الخصم - الخصومات - مرتجعات فواتير هذه الفترة"
              rows={[
                { label: 'إجمالي المبيعات قبل الخصم والمرتجع', value: EGP((overview?.grossSales ?? ((overview?.totalSales ?? 0) + (overview?.orderReturnsTotal ?? overview?.totalRefunds ?? 0))) + (overview?.totalDiscounts ?? 0)) },
                { label: 'الخصومات الممنوحة ف الفواتير', value: `-${EGP(overview?.totalDiscounts ?? 0)}`, negative: true },
                { label: 'مرتجعات فواتير هذه الفترة', value: `-${EGP(overview?.orderReturnsTotal ?? overview?.totalRefunds ?? 0)}`, negative: true },
                { separator: true },
                { label: '= صافي المبيعات الفعلي المستحق', value: EGP(overview?.totalSales ?? 0), highlight: true },
                { separator: true },
                { label: 'صافي المحصل كاش (بعد خصم المرتجع)', value: EGP(overview?.salesCashCollected ?? 0) },
                { label: 'صافي المحصل إلكتروني (إنستاباي)', value: EGP(overview?.salesInstapayCollected ?? 0) },
                { label: 'الآجل المتبقي طرف العملاء', value: EGP(overview?.salesDebtRemaining ?? 0) },
              ]}
              note="صافي المبيعات = مجموع الكاش والإنستاباي والآجل المتبقي بالمليم بعد خصم مرتجعات الفواتير والخصومات."
            />
          }
        />
        <StatCard
          label={dateFrom || dateTo ? 'المرتجعات (الفترة)' : period === 'current' ? 'مرتجعات الشهر' : 'إجمالي المرتجعات'}
          value={formatSensitive('totalRefunds', EGP(overview?.totalRefunds ?? 0))}
          icon={<Icon name="returns" className="w-6 h-6 text-rose-600" />}
          color="bg-rose-50/70 border-rose-200/80 text-rose-900"
          sub={`الشهور السابقة: ${EGP(overview?.previousRefundsAmount || 0)} (${overview?.previousRefundsCount || 0} مرتجع)`}
          onClick={() => toggleCardReveal('totalRefunds')}
          popover={
            <InfoPopover
              title="تفاصيل وتوزيع المرتجعات"
              formula="مرتجعات الشهر الجاري (كاش + إنستاباي) | مرتجعات الشهور السابقة"
              rows={[
                { label: 'مرتجعات نقدية من الدرج (هذا الشهر)', value: EGP(overview?.refundsCash || 0) },
                { label: 'مرتجعات إلكترونية إنستاباي (هذا الشهر)', value: EGP(overview?.refundsInstapay || 0) },
                { separator: true },
                { label: '= إجمالي مرتجعات هذا الشهر', value: EGP(overview?.totalRefunds || 0), highlight: true },
                { separator: true },
                { label: 'مرتجعات الشهور السابقة', value: EGP(overview?.previousRefundsAmount || 0) },
                { label: 'عدد مرتجعات الشهور السابقة', value: `${overview?.previousRefundsCount || 0} مرتجع` },
                { separator: true },
                { label: '= إجمالي كل المرتجعات التراكمية', value: EGP((overview?.totalRefunds || 0) + (overview?.previousRefundsAmount || 0)), highlight: true },
                { separator: true },
                { label: 'الأثر على مبيعات وأرباح هذا الشهر', value: `خصم مرتجعات فواتير هذا الشهر (-${EGP(overview?.orderReturnsTotal || overview?.totalRefunds || 0)})` },
                { label: 'أثر فواتير الشهور السابقة', value: 'تُخصم من شهر فاتورتها الأصلي لحماية أرباح الشهر الجاري من التسليب' },
                { label: 'حركة الخزنة والسيولة', value: 'يخرج الكاش من حركة اليوم/الشهر الذي تم فيه الصرف الفعلي' }
              ]}
              note="مبدأ مطابقة الفترات: تفاصيل الكاش والإنستاباي مفصلة هنا بالكامل، والمرتجعات السابقة مفصولة لتظل لوحة التحكم منظمة ودقيقة 100%."
            />
          }
        />
        <StatCard
          label={
            dateFrom || dateTo
              ? 'إنستاباي (الفترة المحددة)'
              : period === 'current'
              ? 'إنستاباي (الشهر الجاري)'
              : period === 'previous'
              ? 'إنستاباي (الشهر السابق)'
              : 'إجمالي إنستاباي'
          }
          value={formatSensitive('instapayPeriod', EGP(overview?.salesInstapayCollected ?? overview?.instapayRevenue ?? 0))}
          icon=""
          color="bg-blue-50/70 border-blue-200/60"
          sub={
            period === 'current' && !dateFrom && !dateTo
              ? `اليوم: ${EGP(todayInstapay)} | التراكمي: ${EGP(overview?.currentInstapayBalance ?? 0)}`
              : `المحصل في الفترة | التراكمي: ${EGP(overview?.currentInstapayBalance ?? 0)}`
          }
          onClick={() => toggleCardReveal('instapayPeriod')}
          popover={
            <InfoPopover
              title={
                dateFrom || dateTo
                  ? 'مقبوضات إنستاباي (الفترة المحددة)'
                  : period === 'current'
                  ? 'مقبوضات إنستاباي (الشهر الجاري)'
                  : period === 'previous'
                  ? 'مقبوضات إنستاباي (الشهر السابق)'
                  : 'مقبوضات إنستاباي'
              }
              formula="إجمالي مبيعات الدفع الإلكتروني (إنستاباي) المحصلة في الفترة المحددة"
              rows={[
                {
                  label:
                    dateFrom || dateTo
                      ? 'محصل إنستاباي بالفترة المحددة'
                      : period === 'current'
                      ? 'محصل إنستاباي في الشهر الجاري'
                      : 'محصل إنستاباي في الشهر السابق',
                  value: EGP(overview?.salesInstapayCollected ?? overview?.instapayRevenue ?? 0),
                  highlight: true,
                },
                {
                  label: 'محصل مبيعات إنستاباي لليوم',
                  value: EGP(todayInstapay),
                },
                { separator: true },
                {
                  label: 'إجمالي رصيد إنستاباي بالبنك (كل الأوقات)',
                  value: EGP(overview?.currentInstapayBalance ?? 0),
                  highlight: true,
                },
                { separator: true },
                {
                  label: 'صافي مبيعات الفترة (كاش + إنستاباي + آجل)',
                  value: EGP(overview?.totalSales ?? 0),
                },
                {
                  label: 'المحصل كاش في نفس الفترة',
                  value: EGP(overview?.salesCashCollected ?? 0),
                },
                {
                  label: 'الآجل المتبقي طرف العملاء في نفس الفترة',
                  value: EGP(overview?.salesDebtRemaining ?? 0),
                },
              ]}
              note="الرقم المعروض يمثل ما تم تحصيله عبر إنستاباي خلال الفترة المختارة، ويتغير تلقائياً مع اختيار الشهر الجاري أو السابق أو التصفية بالتواريخ."
            />
          }
        />
        <StatCard
          label="إجمالي الخصومات"
          value={formatSensitive('totalDiscounts', EGP(overview?.totalDiscounts ?? 0))}
          icon=""
          color="bg-amber-50/40"
          sub="التخفيضات المطبقة ف الفواتير"
          onClick={() => toggleCardReveal('totalDiscounts')}
          popover={
            <InfoPopover
              title="إجمالي الخصومات"
              formula="مجموع التخفيضات المباشرة المُطبَّقة على الفواتير"
              rows={[
                { label: 'المبيعات قبل الخصم والمرتجع', value: EGP((overview?.grossSales ?? ((overview?.totalSales ?? 0) + (overview?.orderReturnsTotal ?? 0))) + (overview?.totalDiscounts ?? 0)) },
                { label: 'مجموع الخصومات الممنوحة', value: `-${EGP(overview?.totalDiscounts ?? 0)}`, negative: true },
                { separator: true },
                { label: '= إجمالي المبيعات المفوترة (قبل المرتجع)', value: EGP(overview?.grossSales ?? ((overview?.totalSales ?? 0) + (overview?.orderReturnsTotal ?? 0))), highlight: true },
              ]}
              note="الخصومات تُطرح مباشرة ف وقت إخراج الفاتورة للعميل وتخفّض الإيراد قبل حساب الأرباح."
            />
          }
        />
        <StatCard
          label="تكلفة البضاعة المباعة (COGS)"
          value={formatSensitive('cogs', EGP(overview?.cogs ?? 0))}
          icon=""
          color="bg-amber-50/60"
          sub="سعر التكلفة الأصلي لشراء القطع المباعة"
          onClick={() => toggleCardReveal('cogs')}
          popover={
            <InfoPopover
              title="تكلفة البضاعة المباعة (COGS)"
              formula="مجموع (سعر تكلفة شراء القطعة × الكمية المباعة)"
              rows={[
                { label: 'إجمالي إيراد المبيعات الصافية', value: EGP(overview?.totalSales ?? 0) },
                { label: 'تكلفة الشراء الأصلية للبضاعة المباعة (COGS)', value: `-${EGP(overview?.cogs ?? 0)}`, negative: true },
                { separator: true },
                { label: '= مجمل الربح التجاري للبضاعة', value: EGP(overview?.grossProfit ?? 0), highlight: true },
              ]}
              note="دي التكلفة الأصلية لشراء القطع التي تم بيعها هذا الشهر ف الفواتير. تُخصم من المبيعات الصافية للوصول لمجمل ربح البضاعة."
            />
          }
        />
        <StatCard
          label="مجمل الربح التجاري"
          value={formatSensitive('grossProfit', EGP(overview?.grossProfit ?? 0))}
          icon=""
          color="bg-teal-50/60"
          sub="ربح البضاعة (صافي المبيعات تكلفة COGS)"
          onClick={() => toggleCardReveal('grossProfit')}
          popover={
            <InfoPopover
              title="مجمل الربح التجاري"
              formula="صافي المبيعات تكلفة البضاعة المباعة (COGS)"
              rows={[
                { label: 'إجمالي المبيعات الصافية', value: EGP(overview?.totalSales ?? 0) },
                { label: 'تكلفة البضاعة المباعة (COGS)', value: `-${EGP(overview?.cogs ?? 0)}`, negative: true },
                { separator: true },
                { label: '= مجمل الربح التجاري قبل المصاريف', value: EGP(overview?.grossProfit ?? 0), highlight: true },
                { separator: true },
                { label: 'مصروفات التشغيل الإدارية', value: `-${EGP(overview?.operatingExpenses ?? 0)}`, negative: true },
                { separator: true },
                { label: '= صافي ربح النشاط النهائي', value: EGP(overview?.netProfit ?? 0), highlight: true },
              ]}
              note="مجمل الربح ده مكسب تجارة البضاعة فقط ف السعر قبل خصم إيجار المحل والمرتبات والكهرباء."
            />
          }
        />
        <StatCard
          label="مصروفات التشغيل"
          value={formatSensitive('operatingExpenses', EGP(overview?.operatingExpenses ?? 0))}
          icon=""
          color="bg-rose-50/40"
          sub="إيجار المحل، أجور الموظفين، كهرباء ونثريات"
          onClick={() => toggleCardReveal('operatingExpenses')}
          popover={
            <InfoPopover
              title="مصروفات التشغيل"
              formula="إيجار + مرتبات + كهرباء + مرافق + صيانة ونثريات"
              rows={[
                { label: 'مجمل الربح التجاري للبضاعة', value: EGP(overview?.grossProfit ?? 0) },
                { label: 'إجمالي مصاريف التشغيل الفعلية', value: `-${EGP(overview?.operatingExpenses ?? 0)}`, negative: true },
                { separator: true },
                { label: '= صافي ربح النشاط المتبقي', value: EGP(overview?.netProfit ?? 0), highlight: true },
                { separator: true },
                { label: 'مشتريات الموردين (مستبعدة كـ أصول بضاعة)', value: EGP(overview?.supplierPurchases ?? 0) },
                { label: 'المسحوبات الشخصية (مستبعدة لحماية الأرباح)', value: EGP(overview?.personalWithdrawals ?? 0) },
              ]}
              note="مصاريف التشغيل هي فقط التكاليف الإدارية والتشغيلية للمحل ف هذا الشهر (مستبعد منها الموردين والمسحوبات الشخصية)."
            />
          }
        />
        <StatCard
          label="صافي ربح النشاط"
          value={formatSensitive('netProfit', EGP(overview?.netProfit ?? 0))}
          icon=""
          color="bg-emerald-50/60"
          sub="مجمل الربح التجاري مصروفات التشغيل"
          onClick={() => toggleCardReveal('netProfit')}
          popover={
            <InfoPopover
              title="صافي ربح النشاط النهائي"
              formula="مجمل الربح التجاري مصاريف التشغيل"
              rows={[
                { label: 'صافي إيراد المبيعات', value: EGP(overview?.totalSales ?? 0) },
                { label: 'تكلفة البضاعة المباعة (COGS)', value: `-${EGP(overview?.cogs ?? 0)}`, negative: true },
                { label: '= مجمل الربح التجاري', value: EGP(overview?.grossProfit ?? 0) },
                { separator: true },
                { label: 'مصروفات التشغيل (إيجار/مرتبات)', value: `-${EGP(overview?.operatingExpenses ?? 0)}`, negative: true },
                { separator: true },
                { label: '= صافي ربح النشاط النهائي', value: EGP(overview?.netProfit ?? 0), highlight: true },
              ]}
              note="ده الصافي التجاري النهائي للمحل بعد خصم كافة التكاليف والمصاريف الإدارية."
            />
          }
        />
        <StatCard
          label="مشتريات بضائع وموردين"
          value={formatSensitive('supplierPurchases', EGP(overview?.supplierPurchases ?? 0))}
          icon=""
          color="bg-amber-50/50"
          sub="تتحول لأصول بضاعة لا تُخصم من الأرباح الصافية"
          onClick={() => toggleCardReveal('supplierPurchases')}
          popover={
            <InfoPopover
              title="مشتريات بضائع وموردين"
              formula="المبالغ المسدودة لشراء وتغذية مخزون البضائع"
              rows={[
                { label: 'إجمالي قيمة البضائع الموردة هذا الشهر', value: EGP(overview?.supplierPurchases ?? 0), highlight: true },
                { label: 'المسدد نقداً للموردين من الخزنة', value: EGP(overview?.supplierCashPaid ?? 0) },
                { separator: true },
                { label: 'تأثيرها على صافي أرباح النشاط', value: '0 ج.م (لا تُخصم كـ مصروفات)', highlight: false },
                { label: 'تأثيرها على مخزون المحل', value: `+${EGP(overview?.supplierPurchases ?? 0)} (زيادة أصول بضاعة)`, highlight: true },
              ]}
              note="مشتريات البضائع لا تُخصم من أرباح النشاط كـ مصروفات لأن الفلوس اتحولت لبضاعة ملكك على الرفوف. تكلفة كل قطعة بتُخصم تدريجياً (COGS) فقط لما تتباع ف فواتير البيع."
            />
          }
        />
        <StatCard
          label="المسحوبات الشخصية والجمعية"
          value={formatSensitive('personalWithdrawals', EGP(overview?.personalWithdrawals ?? 0))}
          icon=""
          color="bg-purple-50/50"
          sub="سلف الشركاء والجمعيات والمسحوبات الخاصة"
          onClick={() => toggleCardReveal('personalWithdrawals')}
          popover={
            <InfoPopover
              title="المسحوبات الشخصية والجمعية"
              formula="إجمالي المسحوبات النقدية الخاصة للمالك والشركاء (جمعيات وسلف)"
              rows={[
                { label: 'إجمالي المسحوبات الشخصية المسجلة', value: EGP(overview?.personalWithdrawals ?? 0), highlight: true },
                { label: 'عدد حركات المسحوبات', value: `${overview?.personalWithdrawalsList?.length || 0} حركة` },
                { separator: true },
                { label: 'تأثيرها على صافي أرباح المحل', value: '0 ج.م (مستبعدة لحماية أرباح النشاط)' },
                { label: 'تأثيرها على رصيد الخزنة (الكاش)', value: `-${EGP(overview?.personalWithdrawals ?? 0)} (خروج كاش فعلي من الدرج)`, negative: true },
              ]}
              note="المسحوبات الشخصية (مثل دفع الجمعية أو سلفة المالك) تخرج فعلياً من نقدية الخزنة، ولكنها لا تعتبر مصروفاً تشغيلياً للمحل حتى لا تنخفض أرباح التجارة الحقيقية خطأً."
            />
          }
        />
      </div>

 {/* Stats Row */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
 <StatCard label={dateFrom || dateTo ? 'الطلبات (الفترة)' : 'الطلبات المكتملة'} value={summary.completed} icon="" />
 <StatCard label={dateFrom || dateTo ? 'المرتجعات (الفترة)' : 'المرتجعات'} value={summary.returned} icon="" />
 <StatCard label="المنتجات المسجلة" value={overview?.products ?? 0} icon="" />
 <StatCard label="إجمالي القطع بالمخزن" value={overview?.totalStock ? `${overview.totalStock.toLocaleString('en-US')} قطعة` : '0 قطعة'} icon="" />
 <StatCard
 label="تنبيهات المخزون"
 value={overview?.lowStock?.length ?? 0}
 icon=""
 color={overview?.lowStock?.length > 0 ? 'bg-amber-50' : 'bg-white'}
 sub={overview?.lowStock?.length > 0 ? 'يحتاج تعبئة' : 'المخزون بخير'}
 />
 </div>

 {/* Chart & Expense Breakdown Grid */}
 <div className="grid gap-6 lg:grid-cols-3">
 {/* Weekly Chart */}
 <div 
 onClick={() => toggleCardReveal('chart')}
 className={`lg:col-span-2 rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm flex flex-col justify-between select-none transition-all duration-300 ${
 !showSensitive && !revealedCards['chart'] ? 'cursor-pointer hover:shadow-md' : ''
 }`}
 >
 <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
 <div>
 <h3 className="text-lg font-bold"> تحليلات المبيعات</h3>
 <p className="text-xs text-burgundy/50">اعرض وحلل حجم المبيعات بالفترة المحددة</p>
 </div>
 
 {/* Date Filters */}
 <div className="flex flex-wrap items-center gap-2" onClick={e => e.stopPropagation()}>
 <button
 type="button"
 onClick={() => navigate('/admin/reports')}
 className="rounded-xl border border-burgundy/30 bg-burgundy/5 px-3 py-1 text-xs font-bold text-burgundy shadow-sm hover:bg-burgundy hover:text-white transition-all"
 >
 التقارير الشهرية والأرشيف
 </button>
 <div className="flex items-center gap-1.5">
 <span className="text-xs text-burgundy/60">من:</span>
 <input
 type="date"
 value={dateFrom}
 onChange={e => setDateFrom(e.target.value)}
 className="rounded-xl border border-burgundy/15 bg-[#F7F0EC]/30 px-2.5 py-1 text-xs text-burgundy outline-none focus:border-burgundy"
 />
 </div>
 <div className="flex items-center gap-1.5">
 <span className="text-xs text-burgundy/60">إلى:</span>
 <input
 type="date"
 value={dateTo}
 onChange={e => setDateTo(e.target.value)}
 className="rounded-xl border border-burgundy/15 bg-[#F7F0EC]/30 px-2.5 py-1 text-xs text-burgundy outline-none focus:border-burgundy"
 />
 </div>
 <button
 type="button"
 onClick={() => loadFiltered(dateFrom, dateTo)}
 disabled={filterLoading}
 className="rounded-xl bg-burgundy px-3.5 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-[#650018] disabled:opacity-50"
 >
 {filterLoading ? '...' : ' تصفية'}
 </button>
 <button
 type="button"
 onClick={() => {
 const now = new Date();
 const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
 const today = now.toISOString().split('T')[0];
 setDateFrom(first);
 setDateTo(today);
 loadFiltered(first, today);
 }}
 className="rounded-xl border border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
 >
 الشهر الجاري
 </button>
 {(dateFrom || dateTo) && (
 <button
 type="button"
 onClick={() => { setDateFrom(''); setDateTo(''); loadFiltered(); }}
 className="rounded-xl border border-burgundy/20 px-3 py-1 text-xs font-bold text-burgundy hover:bg-burgundy/10 transition"
 >
 إلغاء الفلتر
 </button>
 )}
 </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-burgundy/8 px-3 py-1 text-xs font-semibold text-burgundy">
              إجمالي الفترة: {formatSensitive('chart', EGP(weekTotal))}
            </span>
            <span className="rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1 text-xs font-bold text-blue-800">
              إنستاباي الفترة: {formatSensitive('chartInstapay', EGP(weekInstapay))}
            </span>
          </div>
 </div>

 <div className="relative">
 {filterLoading && (
 <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 backdrop-blur-sm">
 <div className="h-6 w-6 animate-spin rounded-full border-2 border-burgundy/20 border-t-burgundy" />
 </div>
 )}
 <div className={!showSensitive && !revealedCards['chart'] ? 'blur-md select-none pointer-events-none' : ''}>
 <WeeklyChart data={weeklyData} />
 </div>
 </div>
 </div>

  {/* Quick Financial Navigation - links to dedicated detail pages */}
  <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
    <div className="mb-4">
      <h3 className="text-base font-bold text-burgundy">الحسابات المالية</h3>
      <p className="text-xs text-burgundy/50 mt-0.5">اضغط للانتقال للتفاصيل الكاملة</p>
    </div>
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => navigate('/admin/statements')}
        className="w-full flex items-center justify-between rounded-2xl bg-burgundy/5 hover:bg-burgundy/10 border border-burgundy/10 px-4 py-3 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-burgundy/10 flex items-center justify-center">
            <Icon name="statement" className="w-4 h-4 text-burgundy" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-burgundy">كشف حساب شامل</p>
            <p className="text-[10px] text-burgundy/50">كل الحركات والتفاصيل المحاسبية</p>
          </div>
        </div>
        <Icon name="chevronLeft" className="w-4 h-4 text-burgundy/30 group-hover:text-burgundy transition" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/admin/safe')}
        className="w-full flex items-center justify-between rounded-2xl bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200/60 px-4 py-3 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100/80 flex items-center justify-center">
            <Icon name="safe" className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-emerald-900">الخزنة وحركة الدرج</p>
            <p className="text-[10px] text-emerald-700/60">{formatSensitive('safeNav', EGP(overview?.cashDrawer ?? 0))} نقدية فعلية</p>
          </div>
        </div>
        <Icon name="chevronLeft" className="w-4 h-4 text-emerald-400 group-hover:text-emerald-700 transition" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/admin/suppliers')}
        className="w-full flex items-center justify-between rounded-2xl bg-amber-50/60 hover:bg-amber-50 border border-amber-200/60 px-4 py-3 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100/80 flex items-center justify-center">
            <Icon name="suppliers" className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-amber-900">حسابات الموردين</p>
            <p className="text-[10px] text-amber-700/60">{formatSensitive('suppliersNav', EGP(overview?.supplierPurchases ?? 0))} مشتريات الفترة</p>
          </div>
        </div>
        <Icon name="chevronLeft" className="w-4 h-4 text-amber-400 group-hover:text-amber-700 transition" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/admin/debts')}
        className="w-full flex items-center justify-between rounded-2xl bg-rose-50/60 hover:bg-rose-50 border border-rose-200/60 px-4 py-3 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-100/80 flex items-center justify-center">
            <Icon name="debts" className="w-4 h-4 text-rose-700" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-rose-900">ديون ومستحقات العملاء</p>
            <p className="text-[10px] text-rose-700/60">{formatSensitive('debtsNav', EGP(overview?.salesDebtRemaining ?? 0))} مستحق حد الآن</p>
          </div>
        </div>
        <Icon name="chevronLeft" className="w-4 h-4 text-rose-400 group-hover:text-rose-700 transition" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/admin/reports')}
        className="w-full flex items-center justify-between rounded-2xl bg-purple-50/50 hover:bg-purple-50 border border-purple-200/60 px-4 py-3 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-100/60 flex items-center justify-center">
            <Icon name="reports" className="w-4 h-4 text-purple-700" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-purple-900">التقارير الشهرية والأرشيف</p>
            <p className="text-[10px] text-purple-700/60">سجلات مغلقة ومتراكمة شهرياً</p>
          </div>
        </div>
        <Icon name="chevronLeft" className="w-4 h-4 text-purple-400 group-hover:text-purple-700 transition" />
      </button>
    </div>
  </div>
  </div>

   {/* Analytics Grid: Low Stock & Best Sellers */}
 <div className="grid gap-6 md:grid-cols-2">
 {/* Best Sellers */}
 {overview?.bestSellers?.length > 0 ? (
 <div className="rounded-[2rem] border border-[#10b98125] bg-[#10b98108] p-6 shadow-sm flex flex-col justify-between">
 <div>
 <h3 className="text-lg font-bold text-emerald-800 mb-1"> المنتجات الأكثر مبيعاً</h3>
 <p className="text-xs text-emerald-600/70 mb-4">أكثر 5 موديلات طلباً ومبيعاً في المتجر</p>
 <div className="space-y-2">
 {overview.bestSellers.map((item, idx) => (
 <div key={idx} className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 border border-emerald-100/50 shadow-sm">
 <div className="flex items-center gap-2.5">
 <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
 {idx + 1}
 </span>
 <span className="text-xs font-semibold text-burgundy">{item.name}</span>
 </div>
 <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
 {item.qty} قطعة
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>
 ) : (
 <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm flex flex-col items-center justify-center text-center py-10">
 <p className="text-3xl mb-1"></p>
 <p className="text-sm font-semibold text-burgundy/40">لا توجد بيانات مبيعات بعد</p>
 </div>
 )}

 {/* Low Stock Warnings */}
 <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 flex flex-col justify-between">
 <div>
 <div className="mb-3 flex items-center justify-between">
 <h3 className="text-lg font-semibold text-amber-800"> المخزون المنخفض</h3>
 <button
 type="button"
 onClick={() => navigate('/admin/products')}
 className="rounded-full bg-amber-600 px-3 py-1 text-[10px] font-bold text-white transition hover:bg-amber-700"
 >
 إدارة المخزون ←
 </button>
 </div>
 {overview?.lowStock?.length > 0 ? (
 <div className="grid gap-2 max-h-[220px] overflow-y-auto pr-1">
 {overview.lowStock.slice(0, 5).map((p) => (
 <div key={p._id} className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 shadow-sm">
 <div className="min-w-0">
 <p className="font-semibold text-xs text-amber-900 truncate">{p.name}</p>
 {p.sku && <p className="font-mono text-[9px] text-amber-600 mt-0.5">{p.sku}</p>}
 </div>
 <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 whitespace-nowrap">{p.stock} قطعة</span>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-center text-xs text-amber-700/60 py-8">المخزون بخير ولا توجد تنبيهات</p>
 )}
 </div>
 </div>
 </div>

 {/* Category Sales & Employee Performance */}
 <div className="grid gap-6 lg:grid-cols-3">
 {/* Category breakdown */}
 <div 
 onClick={() => toggleCardReveal('categorySales')}
 className={`lg:col-span-2 rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm select-none transition-all duration-300 ${
 !showSensitive && !revealedCards['categorySales'] ? 'cursor-pointer hover:shadow-md' : ''
 }`}
 >
 <h3 className="text-lg font-bold text-burgundy mb-1"> مبيعات الأصناف والفئات</h3>
 <p className="text-xs text-burgundy/50 mb-5">توزيع حجم المبيعات الإجمالي على تصنيفات المنتجات المختلفة</p>
 <CategoryPieChart breakdown={overview?.categoryBreakdown} showValues={showSensitive || revealedCards['categorySales']} />
 </div>

 {/* Employee Performance Leaderboard */}
 <div 
 onClick={() => toggleCardReveal('employeeSales')}
 className={`rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm select-none transition-all duration-300 ${
 !showSensitive && !revealedCards['employeeSales'] ? 'cursor-pointer hover:shadow-md' : ''
 }`}
 >
 <h3 className="text-lg font-bold text-burgundy mb-1"> متصدر المبيعات (الموظفين)</h3>
 <p className="text-xs text-burgundy/50 mb-5">ترتيب الموظفين حسب قيمة المبيعات التي حققوها</p>
 <EmployeeLeaderboard leaderboard={overview?.employeeLeaderboard} showValues={showSensitive || revealedCards['employeeSales']} />
 </div>
 </div>

 {/* Recent orders */}
 {/* Recent Activities */}
 <div 
 onClick={() => toggleCardReveal('recentActivities')}
 className={`rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm select-none transition-all duration-300 ${
 !showSensitive && !revealedCards['recentActivities'] ? 'cursor-pointer hover:shadow-md' : ''
 }`}
 >
 <div className="mb-5 flex items-center justify-between">
 <h3 className="text-xl font-semibold">أحدث حركات النظام</h3>
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); navigate('/admin/activities'); }}
 className="rounded-full border border-burgundy/20 px-4 py-1.5 text-xs font-semibold text-burgundy transition hover:bg-burgundy hover:text-white"
 >
 عرض الكل ←
 </button>
 </div>
 {recentActivities?.length > 0 ? (
 <div className="space-y-3">
 {recentActivities.map((act) => {
 const conf = ACT_CONFIG[act.type] || { label: 'حركة عامة', icon: '', color: 'border-burgundy bg-burgundy/5 text-burgundy' };
 const timeStr = new Date(act.timestamp).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
 const isAmountRevealed = showSensitive || revealedCards['recentActivities'];
 return (
 <div
 key={act.id}
 className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-burgundy/8 bg-burgundy/3 px-4 py-3 hover:shadow-sm transition"
 >
 <div className="flex items-center gap-3">
 <span className="text-xl">{conf.icon}</span>
 <div>
 <div className="flex items-center gap-2 flex-wrap">
 <p className="text-sm font-semibold">{act.title}</p>
 <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${conf.color}`}>
 {conf.label}
 </span>
 {act.paymentMethod && (
 <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
 {act.paymentMethod === 'Cash' ? 'كاش' : 'انستا'}
 </span>
 )}
 </div>
 <p className="mt-0.5 text-xs text-burgundy/50">
 بواسطة: {act.user} • {timeStr}
 </p>
 </div>
 </div>
 <div className={`text-left font-bold text-sm transition-all duration-300 ${!isAmountRevealed ? 'blur-md select-none' : ''}`}>
 {act.amount != null && (
 <span className={act.type === 'expense' || act.direction === 'OUT' || (act.type === 'stock_adjustment' && act.amount < 0) ? 'text-red-600' : 'text-emerald-700'}>
 {act.type === 'stock_adjustment'
 ? `${act.amount > 0 ? '+' : ''}${act.amount} قطعة`
 : EGP(act.amount)
 }
 </span>
 )}
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <p className="text-center text-sm text-burgundy/50 py-8">لا توجد حركات نظام بعد</p>
 )}
 </div>
 </div>
 );
}

const CAT_AR = { Blazer: 'بليزر', Blouse: 'بلوزة', Chemise: 'شميز', Skirt: 'جيبة', Dress: 'فستان', Pantalon: 'بنطلون', 'T-shirt': 'تيشيرت', Bag: 'شنطة', Cardigan: 'كاردن', Suit: 'سوت', Tonic: 'تونيك', Takem: 'طقم' };

function CategoryPieChart({ breakdown, showValues = true }) {
 if (!breakdown || breakdown.length === 0) {
 return <div className="text-center text-xs text-burgundy/40 py-8">لا توجد بيانات مبيعات تصنيفات بعد</div>;
 }
 const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
 if (total === 0) {
 return <div className="text-center text-xs text-burgundy/40 py-8">لا توجد مبيعات فعلية</div>;
 }

 const COLORS = ['#7C0A12', '#D97706', '#059669', '#2563EB', '#7C3AED', '#DB2777', '#0891B2', '#4B5563'];
 let cumulativePercent = 0;

 function getCoordinatesForPercent(percent) {
 const x = Math.cos(2 * Math.PI * percent);
 const y = Math.sin(2 * Math.PI * percent);
 return [x, y];
 }

 const slices = breakdown.map((item, idx) => {
 const percent = item.amount / total;
 const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
 cumulativePercent += percent;
 const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
 const largeArcFlag = percent > 0.5 ? 1 : 0;
 const pathData = [
 `M 0 0`,
 `L ${startX} ${startY}`,
 `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
 `Z`
 ].join(' ');
 const color = COLORS[idx % COLORS.length];
 return { ...item, percent, pathData, color };
 });

 return (
 <div className="flex flex-col md:flex-row items-center gap-6" dir="rtl">
 <div className="relative w-40 h-40 flex-shrink-0 mx-auto md:mx-0">
 <svg viewBox="-1 -1 2 2" className={`w-full h-full -rotate-90 transition-all duration-300 ${!showValues ? 'blur-md select-none' : ''}`}>
 {slices.map((slice, idx) => (
 <path key={idx} d={slice.pathData} fill={slice.color} />
 ))}
 <circle cx="0" cy="0" r="0.6" fill="#ffffff" />
 </svg>
 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
 <p className="text-[10px] text-burgundy/50 font-semibold">إجمالي المبيعات</p>
 <p className={`text-xs font-extrabold text-burgundy transition-all duration-300 ${!showValues ? 'blur-md select-none' : ''}`}>
 {Number(total).toLocaleString('en-US')} ج.م
 </p>
 </div>
 </div>
 
 <div className="flex-1 space-y-2 text-xs w-full">
 {slices.map((slice, idx) => (
 <div key={idx} className="flex justify-between items-center bg-burgundy/3 p-2 rounded-xl border border-burgundy/5">
 <div className="flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
 <span className="font-bold text-burgundy">{CAT_AR[slice.category] || slice.category}</span>
 </div>
 <div className={`flex items-center gap-2 font-mono text-[11px] text-burgundy/60 transition-all duration-300 ${!showValues ? 'blur-sm select-none' : ''}`}>
 <span>{Number(slice.amount).toLocaleString('en-US')} ج.م</span>
 <span className="bg-burgundy/10 text-burgundy px-1.5 py-0.5 rounded font-bold text-[9px] font-sans">
 {(slice.percent * 100).toFixed(0)}%
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}

function EmployeeLeaderboard({ leaderboard, showValues = true }) {
 if (!leaderboard || leaderboard.length === 0) {
 return <div className="text-center text-xs text-burgundy/40 py-8">لا توجد بيانات موظفين بعد</div>;
 }
 const maxAmount = Math.max(...leaderboard.map(l => l.amount), 1);

 return (
 <div className="space-y-4" dir="rtl">
 {leaderboard.map((emp, idx) => {
 const pct = (emp.amount / maxAmount) * 100;
 const rankColor = idx === 0 ? '' : idx === 1 ? '' : idx === 2 ? '' : '';
 return (
 <div key={idx} className="space-y-2 rounded-xl bg-burgundy/3 p-3 border border-burgundy/5">
 {/* Name + Sales */}
 <div className="flex justify-between text-xs font-bold text-burgundy">
 <span className="flex items-center gap-1">
 <span>{rankColor}</span>
 <span>{emp.name}</span>
 </span>
 <span className={`transition-all duration-300 ${!showValues ? 'blur-md select-none' : ''}`}>
 {Number(emp.amount).toLocaleString('en-US')} ج.م
 </span>
 </div>
 {/* Progress bar */}
 <div className="w-full bg-burgundy/5 h-2 rounded-full overflow-hidden">
 <div
 className="bg-burgundy h-full rounded-full transition-all duration-500"
 style={{ width: `${pct}%` }}
 />
 </div>
 {/* Sub-stats row */}
 <div className={`flex flex-wrap items-center gap-2 text-[10px] transition-all duration-300 ${!showValues ? 'blur-sm select-none' : ''}`}>
 {emp.profit != null && (
 <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
 ربح: {Number(emp.profit).toLocaleString('en-US')} ج.م
 </span>
 )}
 {emp.orderCount != null && (
 <span className="rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700">
 {emp.orderCount} فاتورة
 </span>
 )}
 {emp.itemsSold != null && (
 <span className="rounded-full bg-purple-50 px-2 py-0.5 font-bold text-purple-700">
 {emp.itemsSold} قطعة
 </span>
 )}
 {emp.topCategory && (
 <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">
 {CAT_AR[emp.topCategory.category] || emp.topCategory.category}
 </span>
 )}
 </div>
 </div>
 );
 })}
 </div>
 );
}

export default AdminOverview;
