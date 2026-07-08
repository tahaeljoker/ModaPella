import { useEffect, useState } from 'react';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;
const DATE = (d) => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

// ─── Employee Form Modal ───────────────────────────────────────────────────────
function EmployeeModal({ employee, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', phone: '', notes: '', ...employee });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err) { alert(err.response?.data?.message || 'فشل الحفظ'); }
    finally { setLoading(false); }
  };

  const inp = 'w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none transition focus:border-burgundy';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-[2rem] bg-[#F7F0EC] p-7 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="mb-5 text-xl font-bold text-burgundy">{employee?._id ? 'تعديل موظف' : 'إضافة موظف جديد'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">الاسم *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} required placeholder="أحمد محمد" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">رقم الهاتف</label>
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inp} placeholder="010..." dir="ltr" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={`${inp} min-h-[70px]`} placeholder="أي ملاحظات..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="flex-1 rounded-full bg-burgundy py-3 text-sm font-bold text-white transition hover:bg-[#650018] disabled:opacity-60">
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button type="button" onClick={onClose} className="rounded-full border border-burgundy/20 px-6 py-3 text-sm font-medium text-burgundy transition hover:bg-burgundy/10">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Employee Stats Modal ──────────────────────────────────────────────────────
const CAT_AR = { Blouse: 'بلوزة', Chemise: 'شميز', Skirt: 'جيبة', Dress: 'فستان', Pantalon: 'بنطلون', 'T-shirt': 'تيشيرت', Bag: 'شنطة', Cardigan: 'كاردن', Suit: 'سوت' };

function EmployeeStatsModal({ employee, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    api.get(`/employees/${employee._id}/stats?${params}`)
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-burgundy text-white px-6 py-5">
          <p className="text-xs opacity-70 uppercase tracking-widest">تحليلات الأداء التفصيلية</p>
          <h3 className="text-xl font-bold mt-1">{employee.name}</h3>
          {employee.phone && <p className="text-xs opacity-60 mt-0.5">{employee.phone}</p>}
        </div>

        {/* Date filters */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-burgundy/10 bg-[#F7F0EC]">
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs text-burgundy/60 whitespace-nowrap">من:</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="flex-1 rounded-xl border border-burgundy/20 bg-white px-3 py-1.5 text-sm text-burgundy outline-none focus:border-burgundy" />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs text-burgundy/60 whitespace-nowrap">إلى:</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="flex-1 rounded-xl border border-burgundy/20 bg-white px-3 py-1.5 text-sm text-burgundy outline-none focus:border-burgundy" />
          </div>
          <button onClick={load} className="rounded-xl bg-burgundy px-4 py-2 text-xs font-bold text-white hover:bg-[#650018] transition">بحث</button>
        </div>

        {/* Stats Content */}
        {!loading && stats && (
          <div className="overflow-y-auto flex-1">
            {/* Primary Stats Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-burgundy/10">
              {[
                { label: 'إجمالي المبيعات', value: EGP(stats.totalSales), icon: '💰', cls: 'bg-burgundy text-white' },
                { label: 'صافي الأرباح', value: EGP(stats.netProfit), icon: '📈', cls: 'bg-emerald-600 text-white' },
                { label: 'عدد الفواتير', value: stats.count, icon: '🧾', cls: 'bg-emerald-50 border border-emerald-200' },
                { label: 'القطع المباعة', value: `${stats.totalItemsSold} قطعة`, icon: '👚', cls: 'bg-white border border-burgundy/10' },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl p-4 ${s.cls}`}>
                  <p className={`text-xs font-semibold ${s.cls.includes('text-white') ? 'text-white/70' : 'text-burgundy/60'}`}>{s.icon} {s.label}</p>
                  <p className={`text-lg font-extrabold mt-1 ${s.cls.includes('text-white') ? 'text-white' : s.cls.includes('emerald') ? 'text-emerald-800' : 'text-burgundy'}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-6 py-4 border-b border-burgundy/10">
              {[
                { label: 'هامش الربح', value: `${stats.profitMargin}%`, icon: '📊', color: stats.profitMargin >= 40 ? 'text-emerald-700' : stats.profitMargin >= 20 ? 'text-amber-600' : 'text-red-600' },
                { label: 'متوسط الفاتورة', value: EGP(stats.avgOrderValue), icon: '🧮', color: 'text-burgundy' },
                { label: 'القطع المباعة', value: `${stats.totalItemsSold} قطعة`, icon: '👚', color: 'text-burgundy' },
                { label: 'المساهمة الكلية', value: `${stats.contributionPercent}%`, icon: '🏅', color: 'text-indigo-700' },
                { label: 'المرتجعات', value: `${stats.returnedCount || 0} (${EGP(stats.returnedAmount)})`, icon: '🔄', color: 'text-red-600' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl bg-[#F7F0EC] p-3 text-center border border-burgundy/5">
                  <p className="text-xs font-semibold text-burgundy/50">{s.icon} {s.label}</p>
                  <p className={`text-base font-extrabold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Top Category & Category Breakdown */}
            <div className="px-6 py-4 border-b border-burgundy/10">
              {/* Top Category Highlight */}
              {stats.topCategory && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-l from-amber-50 to-amber-100/60 border border-amber-200 px-5 py-4">
                  <span className="text-3xl">⭐</span>
                  <div>
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">الصنف الأكثر مبيعاً</p>
                    <p className="text-lg font-extrabold text-amber-900 mt-0.5">
                      {CAT_AR[stats.topCategory.category] || stats.topCategory.category}
                      <span className="text-sm font-bold text-amber-600 mr-2">({stats.topCategory.qty} قطعة)</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Full Category Breakdown */}
              {stats.categoryBreakdown?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-burgundy mb-3">👚 توزيع المبيعات على الأصناف</h4>
                  <div className="space-y-2.5">
                    {stats.categoryBreakdown.map((cat, idx) => {
                      const maxQty = stats.categoryBreakdown[0]?.qty || 1;
                      const pct = ((cat.qty / maxQty) * 100).toFixed(0);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-burgundy">
                            <span>{CAT_AR[cat.category] || cat.category}</span>
                            <span className="text-burgundy/60">{cat.qty} قطعة · {EGP(cat.amount)}</span>
                          </div>
                          <div className="w-full bg-burgundy/5 h-2 rounded-full overflow-hidden">
                            <div className="bg-burgundy/70 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Orders list */}
            <div className="px-6 py-4">
              <h4 className="text-sm font-bold text-burgundy mb-3">📋 سجل الفواتير</h4>
              {stats?.orders?.length === 0 ? (
                <p className="text-center text-sm text-burgundy/40 py-8">لا توجد مبيعات في هذه الفترة</p>
              ) : (
                <div className="space-y-2">
                  {stats?.orders?.map(order => (
                    <div key={order._id} className={`flex items-center justify-between rounded-2xl px-4 py-3 border ${order.status === 'Returned' ? 'bg-red-50/50 border-red-100' : 'bg-[#F7F0EC] border-transparent'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-burgundy">{order.items?.map(i => i.name).join('، ')}</p>
                          {order.status === 'Returned' && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">مرتجع كامل</span>
                          )}
                        </div>
                        <p className="text-xs text-burgundy/50 mt-0.5">{new Date(order.createdAt).toLocaleString('ar-EG')}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${order.status === 'Returned' ? 'text-red-600 line-through' : 'text-burgundy'}`}>{EGP(order.totalAmount)}</p>
                        <p className="text-xs text-burgundy/50">{order.paymentMethod === 'Cash' ? '💵 كاش' : '📱 انستا'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
        )}

        <div className="p-4 bg-[#F7F0EC] border-t border-burgundy/10">
          <button onClick={onClose} className="w-full rounded-xl border border-burgundy/20 py-2.5 text-sm font-medium text-burgundy hover:bg-burgundy/10 transition">إغلاق</button>
        </div>
      </div>
    </div>
  );
}

// ─── Employee Comparison Chart ─────────────────────────────────────────────────
const CHART_COLORS = ['#7C0A12', '#10b981', '#2563EB', '#D97706', '#7C3AED', '#DB2777', '#0891B2', '#4B5563'];

function EmployeeComparisonChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState('sales'); // sales | profit | itemsSold | orderCount
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const loadData = (f = from, t = to) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f) params.append('from', f);
    if (t) params.append('to', t);
    api.get(`/employees/comparison?${params}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const METRICS = {
    sales:      { label: 'إجمالي المبيعات', icon: '💰', format: v => `${(v/1000).toFixed(1)}k` },
    profit:     { label: 'صافي الأرباح',    icon: '📈', format: v => `${(v/1000).toFixed(1)}k` },
    itemsSold:  { label: 'القطع المباعة',   icon: '👚', format: v => v },
    orderCount: { label: 'عدد الفواتير',    icon: '🧾', format: v => v },
  };

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-burgundy/10 bg-white p-8 shadow-sm">
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-[2rem] border border-burgundy/10 bg-white p-8 shadow-sm text-center py-16">
        <p className="text-4xl mb-2">📊</p>
        <p className="text-sm font-semibold text-burgundy/40">لا توجد بيانات مبيعات موظفين بعد</p>
        <p className="text-xs text-burgundy/30 mt-1">ابدأ بتسجيل مبيعات لرؤية المقارنة</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d[metric]), 1);
  const maxSales = Math.max(...data.map(d => d.sales), 1);
  const maxProfit = Math.max(...data.map(d => Math.max(0, d.profit)), 1);
  const chartH = 200;
  const chartW = Math.max(500, data.length * 100);
  const barW = Math.max(20, Math.min(60, (chartW * 0.5) / data.length));
  const gap = (chartW - data.length * barW * 2) / (data.length + 1);

  const totalSales = data.reduce((s, d) => s + d.sales, 0);

  return (
    <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-burgundy">📊 مقارنة أداء الموظفين</h3>
          <p className="text-xs text-burgundy/50 mt-0.5">مقارنة شاملة بين جميع الموظفين حسب المبيعات والأرباح</p>
        </div>
        {/* Metric Selector */}
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(METRICS).map(([key, m]) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                metric === key 
                  ? 'bg-burgundy text-white shadow-sm' 
                  : 'bg-burgundy/5 text-burgundy/60 hover:bg-burgundy/10'
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#F7F0EC] px-4 py-3 border border-burgundy/5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-burgundy/60">من:</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="rounded-xl border border-burgundy/15 bg-white px-2.5 py-1 text-xs text-burgundy outline-none focus:border-burgundy" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-burgundy/60">إلى:</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="rounded-xl border border-burgundy/15 bg-white px-2.5 py-1 text-xs text-burgundy outline-none focus:border-burgundy" />
        </div>
        <button onClick={() => loadData(from, to)}
          className="rounded-xl bg-burgundy px-3.5 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-[#650018]">
          تحديث
        </button>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); loadData('', ''); }}
            className="rounded-xl border border-burgundy/20 px-3 py-1 text-xs font-medium text-burgundy/60 hover:bg-burgundy/5 transition">
            مسح الفلتر
          </button>
        )}
      </div>

      {/* SVG Bar Chart — Sales vs Profit */}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${chartW} ${chartH + 70}`} className="w-full" style={{ minWidth: '400px', maxWidth: '900px' }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartH - chartH * ratio;
            return (
              <g key={ratio}>
                <line x1={0} y1={y} x2={chartW} y2={y} stroke="#7C0A1210" strokeWidth="1" />
                {ratio > 0 && (
                  <text x={4} y={y - 3} fontSize="9" fill="#7C0A1250" textAnchor="start">
                    {METRICS[metric].format(maxVal * ratio)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Bars */}
          {data.map((emp, i) => {
            const x = gap + i * (barW * 2 + gap);
            const salesH = (emp.sales / maxSales) * chartH;
            const profitH = (Math.max(0, emp.profit) / maxSales) * chartH;
            const metricH = (emp[metric] / maxVal) * chartH;

            return (
              <g key={i}>
                {/* Sales bar (burgundy) */}
                <rect x={x} y={chartH - salesH} width={barW * 0.9} height={salesH}
                  rx={4} fill="#7C0A12" opacity={metric === 'sales' ? 0.95 : 0.3} />
                {/* Profit bar (green) */}
                <rect x={x + barW} y={chartH - profitH} width={barW * 0.9} height={profitH}
                  rx={4} fill="#10b981" opacity={metric === 'profit' ? 0.95 : 0.3} />

                {/* Value label on top */}
                <text x={x + barW} y={chartH - Math.max(salesH, profitH) - 6}
                  fontSize="10" fill="#7C0A12" textAnchor="middle" fontWeight="bold">
                  {METRICS[metric].format(emp[metric])}
                </text>

                {/* Name label */}
                <text x={x + barW} y={chartH + 18}
                  fontSize="11" fill="#7C0A12" textAnchor="middle" fontWeight="bold">
                  {emp.name.length > 10 ? emp.name.slice(0, 10) + '..' : emp.name}
                </text>

                {/* Rank badge */}
                {i < 3 && (
                  <text x={x + barW} y={chartH + 34}
                    fontSize="14" textAnchor="middle">
                    {i === 0 ? '🏆' : i === 1 ? '🥈' : '🥉'}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-burgundy/60">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-burgundy opacity-90" />
            إجمالي المبيعات
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-500 opacity-90" />
            صافي الأرباح
          </span>
        </div>
      </div>

      {/* Employee Detail Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((emp, idx) => {
          const contribution = totalSales > 0 ? ((emp.sales / totalSales) * 100).toFixed(1) : 0;
          const profitMargin = emp.sales > 0 ? ((emp.profit / emp.sales) * 100).toFixed(1) : 0;
          const rank = idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
          return (
            <div key={idx} className="rounded-2xl border border-burgundy/8 bg-[#F7F0EC]/40 p-4 space-y-3">
              {/* Name + Rank */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{typeof rank === 'string' && rank.startsWith('#') ? '' : rank}</span>
                  <div>
                    <p className="text-sm font-bold text-burgundy">{emp.name}</p>
                    <p className="text-[10px] text-burgundy/40">مساهمة: {contribution}% من الإجمالي</p>
                  </div>
                </div>
                {typeof rank === 'string' && rank.startsWith('#') && (
                  <span className="rounded-full bg-burgundy/10 px-2 py-0.5 text-[10px] font-bold text-burgundy">{rank}</span>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-white p-2 border border-burgundy/5">
                  <p className="text-[9px] text-burgundy/40 font-semibold">💰 المبيعات</p>
                  <p className="text-xs font-extrabold text-burgundy">{EGP(emp.sales)}</p>
                </div>
                <div className="rounded-xl bg-white p-2 border border-burgundy/5">
                  <p className="text-[9px] text-burgundy/40 font-semibold">📈 الأرباح</p>
                  <p className="text-xs font-extrabold text-emerald-700">{EGP(emp.profit)}</p>
                </div>
                <div className="rounded-xl bg-white p-2 border border-burgundy/5">
                  <p className="text-[9px] text-burgundy/40 font-semibold">🧾 الفواتير</p>
                  <p className="text-xs font-extrabold text-burgundy">{emp.orderCount}</p>
                </div>
                <div className="rounded-xl bg-white p-2 border border-burgundy/5">
                  <p className="text-[9px] text-burgundy/40 font-semibold">👚 القطع</p>
                  <p className="text-xs font-extrabold text-burgundy">{emp.itemsSold}</p>
                </div>
              </div>

              {/* Bottom row */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700">
                  🧮 متوسط الفاتورة: {EGP(emp.avgOrder)}
                </span>
                {emp.topCategory && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">
                    ⭐ {CAT_AR[emp.topCategory.category] || emp.topCategory.category}
                  </span>
                )}
              </div>

              {/* Profit Margin Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-burgundy/50">هامش الربح</span>
                  <span className={Number(profitMargin) >= 40 ? 'text-emerald-700' : Number(profitMargin) >= 20 ? 'text-amber-600' : 'text-red-600'}>
                    {profitMargin}%
                  </span>
                </div>
                <div className="w-full bg-burgundy/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      Number(profitMargin) >= 40 ? 'bg-emerald-500' : Number(profitMargin) >= 20 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, Number(profitMargin))}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [statsEmp, setStatsEmp] = useState(null);
  const [toast, setToast] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/employees/all'); setEmployees(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (form._id) {
      await api.put(`/employees/${form._id}`, form);
      showToast('✅ تم تحديث الموظف');
    } else {
      await api.post('/employees', form);
      showToast('✅ تم إضافة الموظف');
    }
    await load();
  };

  const handleToggle = async (emp) => {
    await api.patch(`/employees/${emp._id}/toggle`);
    showToast(emp.active ? '⏸️ تم تعطيل الموظف' : '✅ تم تفعيل الموظف');
    await load();
  };

  const handleDelete = async () => {
    await api.delete(`/employees/${deleteId}`);
    showToast('✅ تم الحذف');
    setDeleteId(null);
    await load();
  };

  return (
    <div className="space-y-6 text-burgundy">
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">الإدارة</p>
          <h2 className="text-2xl font-bold">👤 الموظفون</h2>
          <p className="text-sm text-burgundy/50 mt-0.5">إدارة الموظفين وتتبع مبيعاتهم لحساب الكوميشن</p>
        </div>
        <button onClick={() => setModal({})} className="rounded-full bg-burgundy px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-burgundy/20 transition hover:bg-[#650018]">
          + إضافة موظف
        </button>
      </div>

      {/* Employees Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
      ) : employees.length === 0 ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white py-20 text-center">
          <p className="text-5xl mb-3">👤</p>
          <p className="text-lg font-semibold text-burgundy/40">لا يوجد موظفون بعد</p>
          <p className="text-sm text-burgundy/30 mt-1">أضف موظفيك لتتبع مبيعاتهم</p>
        </div>
      ) : (
        <>
          <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_auto] gap-4 bg-[#F7F0EC] px-6 py-3 text-xs font-bold uppercase tracking-wide text-burgundy/50 border-b border-burgundy/8">
              <span>الموظف</span><span>رقم الهاتف</span><span>الحالة</span><span>الإجراءات</span>
            </div>
            <div className="divide-y divide-burgundy/6">
              {employees.map(emp => (
                <div key={emp._id} className={`grid sm:grid-cols-[1fr_1fr_1fr_auto] items-center gap-4 px-6 py-4 transition hover:bg-burgundy/3 ${!emp.active ? 'opacity-50' : ''}`}>
                  <div>
                    <p className="font-semibold text-sm text-burgundy">{emp.name}</p>
                    {emp.notes && <p className="text-xs text-burgundy/40 mt-0.5">{emp.notes}</p>}
                  </div>
                  <p className="text-sm text-burgundy/60 font-mono">{emp.phone || '—'}</p>
                  <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${emp.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {emp.active ? '🟢 نشط' : '🔴 معطّل'}
                  </span>
                  <div className="flex gap-1.5">
                    <button onClick={() => setStatsEmp(emp)} className="rounded-xl border border-burgundy/20 px-3 py-1.5 text-xs font-medium text-burgundy transition hover:bg-burgundy hover:text-white">📊 مبيعات</button>
                    <button onClick={() => setModal(emp)} className="rounded-xl border border-burgundy/20 px-3 py-1.5 text-xs font-medium text-burgundy transition hover:bg-burgundy hover:text-white">تعديل</button>
                    <button onClick={() => handleToggle(emp)} className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${emp.active ? 'border-amber-200 text-amber-600 hover:bg-amber-500 hover:text-white' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`}>
                      {emp.active ? 'تعطيل' : 'تفعيل'}
                    </button>
                    <button onClick={() => setDeleteId(emp._id)} className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500 hover:text-white">حذف</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Employee Comparison Chart */}
          <EmployeeComparisonChart />
        </>
      )}

      {/* Modals */}
      {modal !== null && <EmployeeModal employee={modal?._id ? modal : null} onClose={() => setModal(null)} onSave={handleSave} />}
      {statsEmp && <EmployeeStatsModal employee={statsEmp} onClose={() => setStatsEmp(null)} />}
      <ConfirmModal
        isOpen={!!deleteId}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا الموظف؟ سيتم إزالته نهائياً."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

export default AdminEmployees;
