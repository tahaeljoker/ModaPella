import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;

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
  const barW = 48;
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
                  {Number(maxRevenue * ratio).toLocaleString('ar-EG')}
                </text>
              )}
            </g>
          );
        })}
        {/* Bars */}
        {data.map((d, i) => {
          const x = gap + i * (barW + gap);
          const cashH = (d.cashRevenue / maxRevenue) * chartH;
          const instapayH = (d.instapayRevenue / maxRevenue) * chartH;

          return (
            <g key={i}>
              {/* Cash bar (burgundy) */}
              <rect
                x={x} y={chartH - cashH} width={barW * 0.55} height={cashH}
                rx={4} fill="#7C0A12" opacity="0.85"
              />
              {/* Instapay bar (violet) */}
              <rect
                x={x + barW * 0.58} y={chartH - instapayH} width={barW * 0.38} height={instapayH}
                rx={4} fill="#7c3aed" opacity="0.75"
              />
              {/* Day label */}
              <text x={x + barW / 2} y={chartH + 16} fontSize="10" fill="#7C0A1299" textAnchor="middle">
                {d.date}
              </text>
              {/* Count label */}
              {d.count > 0 && (
                <text x={x + barW / 2} y={chartH - Math.max(cashH, instapayH) - 4} fontSize="9" fill="#7C0A12" textAnchor="middle" fontWeight="bold">
                  {d.count}
                </text>
              )}
            </g>
          );
        })}
        {/* Total revenue tooltip at bottom */}
        {data.map((d, i) => {
          const x = gap + i * (barW + gap);
          return d.revenue > 0 ? (
            <text key={i} x={x + barW / 2} y={chartH + 30} fontSize="8" fill="#7C0A1270" textAnchor="middle">
              {Number(d.revenue / 1000).toFixed(1)}k
            </text>
          ) : null;
        })}
      </svg>
      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-xs text-burgundy/60">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-burgundy opacity-85" />
          كاش
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-violet-600 opacity-75" />
          انستا باي / فيزا
        </span>
        <span className="text-burgundy/40">· الرقم فوق العمود = عدد الطلبات</span>
      </div>
    </div>
  );
}

function AdminOverview() {
  const [overview, setOverview] = useState(null);
  const [summary, setSummary] = useState({ totalRevenue: 0, completed: 0, returned: 0 });
  const [siteConfig, setSiteConfig] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const [overviewRes, summaryRes, configRes, weeklyRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/orders/summary'),
        api.get('/admin/site-config'),
        api.get('/orders/weekly'),
      ]);
      setOverview(overviewRes.data);
      setSummary(summaryRes.data);
      setSiteConfig(configRes.data);
      setWeeklyData(weeklyRes.data);
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

  const handleProdReset = async () => {
    if (!window.confirm('⚠️ تحذير: هذا الإجراء سيحذف كافة الطلبات والورديات والتعاملات الحالية نهائياً على الاستضافة. هل أنت متأكد؟')) return;
    try {
      const res = await api.post('/admin/reset-transactions-prod');
      alert(`✅ تم التصفير بنجاح!\nالعمليات المحذوفة: ${res.data.deletedTransactions}\nالورديات المحذوفة: ${res.data.deletedShifts}\nالفواتير المحذوفة: ${res.data.deletedOrders}`);
      loadData();
    } catch (e) {
      alert(e.response?.data?.message || 'فشل تصفير قاعدة بيانات الاستضافة');
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
          <button
            type="button"
            onClick={handleProdReset}
            className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-red-700"
          >
            🗑️ تصفير الاستضافة
          </button>
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
        <StatCard label="الإيرادات الكلية" value={EGP(summary.totalRevenue)} icon="💰" color="bg-white" />
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="الطلبات المكتملة" value={summary.completed} icon="✅" />
        <StatCard label="المرتجعات" value={summary.returned} icon="🔄" />
        <StatCard label="عدد المنتجات" value={overview?.products ?? 0} icon="🛍️" />
        <StatCard
          label="تنبيهات المخزون"
          value={overview?.lowStock?.length ?? 0}
          icon="⚠️"
          color={overview?.lowStock?.length > 0 ? 'bg-amber-50' : 'bg-white'}
          sub={overview?.lowStock?.length > 0 ? 'منتج يحتاج إعادة تعبئة' : 'المخزون بخير'}
        />
      </div>

      {/* Chart & Expense Breakdown Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-semibold">📊 مبيعات آخر 7 أيام</h3>
            <span className="rounded-full bg-burgundy/8 px-3 py-1 text-xs font-semibold text-burgundy">
              إجمالي: {EGP(weekTotal)}
            </span>
          </div>
          <WeeklyChart data={weeklyData} />
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

      {/* Low stock warnings */}
      {overview?.lowStock?.length > 0 && (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-amber-800">⚠️ تحذيرات المخزون المنخفض</h3>
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="rounded-full bg-amber-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-amber-700"
            >
              إدارة المنتجات ←
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {overview.lowStock.map((p) => (
              <div key={p._id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                <div>
                  <span className="font-medium text-amber-900">{p.name}</span>
                  {p.sku && <span className="mr-2 font-mono text-xs text-amber-600">{p.sku}</span>}
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-sm font-bold text-amber-700">{p.stock} متبقي</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold">أحدث الطلبات</h3>
          <button
            type="button"
            onClick={() => navigate('/admin/orders')}
            className="rounded-full border border-burgundy/20 px-4 py-1.5 text-xs font-semibold text-burgundy transition hover:bg-burgundy hover:text-white"
          >
            عرض الكل ←
          </button>
        </div>
        {overview?.recentOrders?.length > 0 ? (
          <div className="space-y-2">
            {overview.recentOrders.map((order) => (
              <div
                key={order._id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-burgundy/8 bg-burgundy/3 px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{order.items?.map((i) => i.name).join('، ')}</p>
                    <span className="rounded bg-burgundy/8 px-1.5 py-0.5 font-mono text-[10px] text-burgundy/50">
                      #{order._id?.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-burgundy/50">
                    {new Date(order.createdAt).toLocaleString('ar-EG')} •{' '}
                    <span className={order.type === 'Offline' ? 'text-burgundy' : 'text-emerald-700'}>
                      {order.type === 'Offline' ? 'كاشير' : 'أونلاين'}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{EGP(order.totalAmount)}</p>
                  <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                    order.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'Returned' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {order.status === 'Completed' ? 'مكتمل' : order.status === 'Returned' ? 'مرتجع' : 'معلق'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-burgundy/50 py-8">لا توجد طلبات بعد</p>
        )}
      </div>
    </div>
  );
}

export default AdminOverview;
