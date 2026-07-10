import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const ACT_CONFIG = {
  sale: { label: 'مبيعات', icon: '💰', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
  expense: { label: 'مصروفات', icon: '💸', color: 'border-rose-500 bg-rose-50 text-rose-800' },
  refund: { label: 'مرتجع', icon: '🔄', color: 'border-amber-500 bg-amber-50 text-amber-800' },
  deposit: { label: 'إيداع', icon: '📥', color: 'border-blue-500 bg-blue-50 text-blue-800' },
  safe_movement: { label: 'حركة خزينة', icon: '🏦', color: 'border-indigo-500 bg-indigo-50 text-indigo-800' },
  stock_adjustment: { label: 'مخزون', icon: '📦', color: 'border-teal-500 bg-teal-50 text-teal-800' },
  shift_open: { label: 'فتح وردية', icon: '🔑', color: 'border-purple-500 bg-purple-50 text-purple-800' },
  shift_close: { label: 'إغلاق وردية', icon: '🔒', color: 'border-slate-500 bg-slate-50 text-slate-800' }
};

function StatCard({ label, value, sub, color = 'bg-white', icon }) {
  return (
    <div className={`rounded-[1.75rem] border border-burgundy/10 ${color} p-6 shadow-sm`}>
      {icon && <div className="mb-3 text-2xl">{icon}</div>}
      <p className="text-sm font-medium text-burgundy/60">{label}</p>
      <p className="mt-2 text-3xl font-bold text-burgundy">{value}</p>
      {sub && <p className="mt-1 text-xs text-burgundy/50">{sub}</p>}
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

          return (
            <g key={i}>
              {/* Total Revenue bar (burgundy) */}
              <rect
                x={x} y={chartH - revH} width={barW * 0.46} height={revH}
                rx={Math.min(4, barW * 0.1)} fill="#7C0A12" opacity="0.9"
              />
              {/* Net Profit bar (emerald green) */}
              <rect
                x={x + barW * 0.5} y={chartH - profitH} width={barW * 0.46} height={profitH}
                rx={Math.min(4, barW * 0.1)} fill="#10b981" opacity="0.9"
              />
              {/* Day label */}
              <text x={x + barW / 2} y={chartH + 16} fontSize={data.length > 10 ? "7" : "10"} fill="#7C0A1299" textAnchor="middle">
                {d.date}
              </text>
              {/* Count label */}
              {d.count > 0 && data.length <= 15 && (
                <text x={x + barW / 2} y={chartH - Math.max(revH, profitH) - 4} fontSize="9" fill="#7C0A12" textAnchor="middle" fontWeight="bold">
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
  const navigate = useNavigate();

  // Date range filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [filterLoading, setFilterLoading] = useState(false);

  const loadFiltered = async (from = '', to = '') => {
    setFilterLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to)   params.append('to', to);
      const [summaryRes, weeklyRes] = await Promise.all([
        api.get(`/orders/summary?${params}`),
        api.get(`/orders/weekly?${params}`),
      ]);
      setSummary(summaryRes.data);
      setWeeklyData(weeklyRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setFilterLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [overviewRes, summaryRes, configRes, weeklyRes, activitiesRes] = await Promise.all([
        api.get('/admin/overview'),
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

  const handlePublishToggle = async () => {
    try {
      const res = await api.put('/admin/site-config', { published: !siteConfig.published });
      setSiteConfig(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
      </div>
    );
  }

  const todayRevenue = weeklyData[weeklyData.length - 1]?.revenue || 0;
  const todayOrders = weeklyData[weeklyData.length - 1]?.count || 0;
  const weekTotal = weeklyData.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="space-y-8 text-burgundy">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/50">لوحة التحكم</p>
          <h2 className="mt-1 text-3xl font-bold">مرحباً بك في ModaPella</h2>
          <p className="mt-1 text-sm text-burgundy/60">نظرة عامة على أداء المتجر</p>
        </div>
        <div className="flex gap-2">
          {siteConfig && (
            <button
              type="button"
              onClick={handlePublishToggle}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90 ${
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[1.75rem] bg-burgundy p-6 text-white shadow-lg shadow-burgundy/20">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70">مبيعات اليوم</p>
          <p className="mt-3 text-3xl font-bold">{EGP(todayRevenue)}</p>
          <p className="mt-2 text-sm opacity-70">{todayOrders} طلب اليوم</p>
        </div>
        <StatCard
          label={dateFrom || dateTo ? `إيرادات الفترة المحددة` : 'الإيرادات الكلية'}
          value={EGP(summary.totalRevenue)}
          icon="💰"
          color="bg-white"
          sub={dateFrom || dateTo ? `${dateFrom || '...'} → ${dateTo || '...'}` : undefined}
        />
        <StatCard 
          label="صافي الأرباح الكلية" 
          value={EGP(overview?.netProfit ?? 0)} 
          icon="📈" 
          color="bg-emerald-50/60" 
          sub="هامش الربح بعد خصم التكلفة والخصومات"
        />
        <StatCard 
          label="إجمالي الخصومات" 
          value={EGP(overview?.totalDiscounts ?? 0)} 
          icon="🏷️" 
          color="bg-red-50/40" 
          sub="إجمالي الخصومات الممنوحة للفواتير"
        />
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label={dateFrom || dateTo ? 'الطلبات (الفترة)' : 'الطلبات المكتملة'} value={summary.completed} icon="✅" />
        <StatCard label={dateFrom || dateTo ? 'المرتجعات (الفترة)' : 'المرتجعات'} value={summary.returned} icon="🔄" />
        <StatCard label="المنتجات المسجلة" value={overview?.products ?? 0} icon="🛍️" />
        <StatCard label="إجمالي القطع بالمخزن" value={overview?.totalStock ? `${overview.totalStock.toLocaleString('en-US')} قطعة` : '0 قطعة'} icon="📦" />
        <StatCard
          label="تنبيهات المخزون"
          value={overview?.lowStock?.length ?? 0}
          icon="⚠️"
          color={overview?.lowStock?.length > 0 ? 'bg-amber-50' : 'bg-white'}
          sub={overview?.lowStock?.length > 0 ? 'يحتاج تعبئة' : 'المخزون بخير'}
        />
      </div>

      {/* Chart & Expense Breakdown Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">📊 تحليلات المبيعات</h3>
              <p className="text-xs text-burgundy/50">اعرض وحلل حجم المبيعات بالفترة المحددة</p>
            </div>
            
            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-2">
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
                {filterLoading ? '...' : '🔍 تصفية'}
              </button>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => { setDateFrom(''); setDateTo(''); loadFiltered(); }}
                  className="rounded-xl border border-burgundy/20 px-3 py-1 text-xs font-bold text-burgundy hover:bg-burgundy/10 transition"
                >
                  ✕ إلغاء الفلتر
                </button>
              )}
            </div>

            <span className="rounded-full bg-burgundy/8 px-3 py-1 text-xs font-semibold text-burgundy">
              إجمالي الفترة: {EGP(weekTotal)}
            </span>
          </div>

          <div className="relative">
            {filterLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 backdrop-blur-sm">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-burgundy/20 border-t-burgundy" />
              </div>
            )}
            <WeeklyChart data={weeklyData} />
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold mb-5">💸 تحليل المصروفات</h3>
          {overview?.expenseBreakdown?.length > 0 ? (
            <div className="space-y-4">
              {overview.expenseBreakdown.map((exp, idx) => {
                const totalExpenses = overview.expenseBreakdown.reduce((sum, e) => sum + e.amount, 0);
                const percent = totalExpenses > 0 ? ((exp.amount / totalExpenses) * 100).toFixed(0) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">{exp.category === 'Refund' ? 'مرتجعات' : exp.category}</span>
                      <span className="text-burgundy/80 font-bold">{EGP(exp.amount)} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-burgundy/5 rounded-full h-2">
                      <div className="bg-burgundy h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-burgundy/10 pt-4 mt-2 flex justify-between font-bold text-sm">
                <span>إجمالي المصروفات</span>
                <span className="text-burgundy">{EGP(overview.expenseBreakdown.reduce((sum, e) => sum + e.amount, 0))}</span>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-burgundy/50 py-12">لا توجد مصروفات مسجلة</p>
          )}
        </div>
      </div>

      {/* Analytics Grid: Low Stock & Best Sellers */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Best Sellers */}
        {overview?.bestSellers?.length > 0 ? (
          <div className="rounded-[2rem] border border-[#10b98125] bg-[#10b98108] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-emerald-800 mb-1">⭐ المنتجات الأكثر مبيعاً</h3>
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
            <p className="text-3xl mb-1">⭐</p>
            <p className="text-sm font-semibold text-burgundy/40">لا توجد بيانات مبيعات بعد</p>
          </div>
        )}

        {/* Low Stock Warnings */}
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 flex flex-col justify-between">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-amber-800">⚠️ المخزون المنخفض</h3>
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
        <div className="lg:col-span-2 rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-burgundy mb-1">👚 مبيعات الأصناف والفئات</h3>
          <p className="text-xs text-burgundy/50 mb-5">توزيع حجم المبيعات الإجمالي على تصنيفات المنتجات المختلفة</p>
          <CategoryPieChart breakdown={overview?.categoryBreakdown} />
        </div>

        {/* Employee Performance Leaderboard */}
        <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-burgundy mb-1">🏆 متصدر المبيعات (الموظفين)</h3>
          <p className="text-xs text-burgundy/50 mb-5">ترتيب الموظفين حسب قيمة المبيعات التي حققوها</p>
          <EmployeeLeaderboard leaderboard={overview?.employeeLeaderboard} />
        </div>
      </div>

      {/* Recent orders */}
      {/* Recent Activities */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold">أحدث حركات النظام</h3>
          <button
            type="button"
            onClick={() => navigate('/admin/activities')}
            className="rounded-full border border-burgundy/20 px-4 py-1.5 text-xs font-semibold text-burgundy transition hover:bg-burgundy hover:text-white"
          >
            عرض الكل ←
          </button>
        </div>
        {recentActivities?.length > 0 ? (
          <div className="space-y-3">
            {recentActivities.map((act) => {
              const conf = ACT_CONFIG[act.type] || { label: 'حركة عامة', icon: '⚙️', color: 'border-burgundy bg-burgundy/5 text-burgundy' };
              const timeStr = new Date(act.timestamp).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
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
                  <div className="text-left font-bold text-sm">
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

function CategoryPieChart({ breakdown }) {
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
        <svg viewBox="-1 -1 2 2" className="w-full h-full -rotate-90">
          {slices.map((slice, idx) => (
            <path key={idx} d={slice.pathData} fill={slice.color} />
          ))}
          <circle cx="0" cy="0" r="0.6" fill="#ffffff" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] text-burgundy/50 font-semibold">إجمالي المبيعات</p>
          <p className="text-xs font-extrabold text-burgundy">{Number(total).toLocaleString('en-US')} ج.م</p>
        </div>
      </div>
      
      <div className="flex-1 space-y-2 text-xs w-full">
        {slices.map((slice, idx) => (
          <div key={idx} className="flex justify-between items-center bg-burgundy/3 p-2 rounded-xl border border-burgundy/5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="font-bold text-burgundy">{CAT_AR[slice.category] || slice.category}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-burgundy/60">
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

function EmployeeLeaderboard({ leaderboard }) {
  if (!leaderboard || leaderboard.length === 0) {
    return <div className="text-center text-xs text-burgundy/40 py-8">لا توجد بيانات موظفين بعد</div>;
  }
  const maxAmount = Math.max(...leaderboard.map(l => l.amount), 1);

  return (
    <div className="space-y-4" dir="rtl">
      {leaderboard.map((emp, idx) => {
        const pct = (emp.amount / maxAmount) * 100;
        const rankColor = idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '👤';
        return (
          <div key={idx} className="space-y-2 rounded-xl bg-burgundy/3 p-3 border border-burgundy/5">
            {/* Name + Sales */}
            <div className="flex justify-between text-xs font-bold text-burgundy">
              <span className="flex items-center gap-1">
                <span>{rankColor}</span>
                <span>{emp.name}</span>
              </span>
              <span>{Number(emp.amount).toLocaleString('en-US')} ج.م</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-burgundy/5 h-2 rounded-full overflow-hidden">
              <div
                className="bg-burgundy h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {/* Sub-stats row */}
            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              {emp.profit != null && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
                  📈 ربح: {Number(emp.profit).toLocaleString('en-US')} ج.م
                </span>
              )}
              {emp.orderCount != null && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700">
                  🧾 {emp.orderCount} فاتورة
                </span>
              )}
              {emp.itemsSold != null && (
                <span className="rounded-full bg-purple-50 px-2 py-0.5 font-bold text-purple-700">
                  👚 {emp.itemsSold} قطعة
                </span>
              )}
              {emp.topCategory && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">
                  ⭐ {CAT_AR[emp.topCategory.category] || emp.topCategory.category}
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
