import { useEffect, useState } from 'react';
import api from '../../services/api';
import { exportToCSV } from '../../services/export';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const TYPE_CONFIG = {
  sale: { label: 'مبيعات', icon: '💰', color: 'border-emerald-500 bg-emerald-50 text-emerald-800 node-bg-emerald' },
  expense: { label: 'مصروفات', icon: '💸', color: 'border-rose-500 bg-rose-50 text-rose-800 node-bg-rose' },
  refund: { label: 'مرتجع', icon: '🔄', color: 'border-amber-500 bg-amber-50 text-amber-800 node-bg-amber' },
  deposit: { label: 'إيداع', icon: '📥', color: 'border-blue-500 bg-blue-50 text-blue-800 node-bg-blue' },
  safe_movement: { label: 'حركة خزينة', icon: '🏦', color: 'border-indigo-500 bg-indigo-50 text-indigo-800 node-bg-indigo' },
  stock_adjustment: { label: 'مخزون', icon: '📦', color: 'border-teal-500 bg-teal-50 text-teal-800 node-bg-teal' },
  shift_open: { label: 'فتح وردية', icon: '🔑', color: 'border-purple-500 bg-purple-50 text-purple-800 node-bg-purple' },
  shift_close: { label: 'إغلاق وردية', icon: '🔒', color: 'border-slate-500 bg-slate-50 text-slate-800 node-bg-slate' }
};

function AdminActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  // Date filters - default to today
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [from, setFrom] = useState(getTodayString());
  const [to, setTo] = useState(getTodayString());

  const loadActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const res = await api.get(`/cashier/activities?${params.toString()}`);
      setActivities(res.data);
    } catch (e) {
      console.error('Failed to load activities:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [from, to]);

  const handleExport = () => {
    const headers = ['الوقت', 'المستخدم', 'نوع الحركة', 'العنوان', 'التفاصيل', 'المبلغ / التغيير', 'طريقة الدفع / المرجع'];
    const rows = filtered.map(act => [
      new Date(act.timestamp).toLocaleString('ar-EG-u-nu-latn'),
      act.user,
      TYPE_CONFIG[act.type]?.label || act.type,
      act.title,
      act.description || act.notes || '',
      act.amount != null ? act.amount : '',
      act.paymentMethod || act.referenceId || ''
    ]);
    exportToCSV(`حركات_النظام_${from}_إلى_${to}`, headers, rows);
  };

  const filtered = activities.filter(act => {
    const matchType = filterType === 'All' || act.type === filterType;
    const searchLower = search.toLowerCase();
    const matchSearch = !search || 
      act.title.toLowerCase().includes(searchLower) ||
      (act.description || '').toLowerCase().includes(searchLower) ||
      (act.notes || '').toLowerCase().includes(searchLower) ||
      act.user.toLowerCase().includes(searchLower);
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">سجلات النظام</p>
          <h2 className="text-2xl font-bold">📜 سجل حركات النظام اليومية</h2>
          <p className="text-sm text-burgundy/50 mt-0.5">مراقبة تفصيلية لعمليات البيع، المصروفات، الخزينة والمخزون</p>
        </div>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="rounded-full bg-burgundy px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-burgundy/20 transition hover:bg-[#650018] disabled:opacity-40"
        >
          📥 تصدير كملف CSV
        </button>
      </div>

      {/* Date Filters & Search */}
      <div className="grid gap-4 md:grid-cols-3 bg-white p-5 rounded-[2rem] border border-burgundy/10 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-burgundy/60 whitespace-nowrap">من تاريخ:</span>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="w-full rounded-xl border border-burgundy/20 bg-white px-3 py-2 text-sm text-burgundy outline-none focus:border-burgundy"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-burgundy/60 whitespace-nowrap">إلى تاريخ:</span>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="w-full rounded-xl border border-burgundy/20 bg-white px-3 py-2 text-sm text-burgundy outline-none focus:border-burgundy"
          />
        </div>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 بحث بالبيان، المستخدم، التفاصيل..."
            className="w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2 text-sm text-burgundy outline-none focus:border-burgundy"
          />
        </div>
      </div>

      {/* Type Filters tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType('All')}
          className={`rounded-full px-4 py-2 text-xs font-bold transition ${
            filterType === 'All'
              ? 'bg-burgundy text-white shadow-md'
              : 'border border-burgundy/20 bg-white text-burgundy hover:bg-burgundy/5'
          }`}
        >
          الكل ({activities.length})
        </button>
        {Object.entries(TYPE_CONFIG).map(([key, config]) => {
          const count = activities.filter(a => a.type === key).length;
          if (count === 0 && filterType !== key) return null; // hide unused categories dynamically to clean UI unless selected
          return (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
                filterType === key
                  ? 'bg-burgundy text-white shadow-md'
                  : 'border border-burgundy/20 bg-white text-burgundy hover:bg-burgundy/5'
              }`}
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
              <span className="bg-burgundy/10 px-1.5 py-0.5 rounded-full text-[10px]">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Timeline view */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white py-16 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm text-burgundy/40 font-bold">لا توجد حركات مسجلة للفترة أو الفلاتر المحددة</p>
        </div>
      ) : (
        <div className="relative mr-4 pr-6 border-r border-burgundy/15 space-y-6 py-2">
          {filtered.map((act, index) => {
            const conf = TYPE_CONFIG[act.type] || { label: 'حركة عامة', icon: '⚙️', color: 'border-burgundy bg-burgundy/5 text-burgundy' };
            const timeStr = new Date(act.timestamp).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date(act.timestamp).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' });

            return (
              <div key={act.id} className="relative group transition-all duration-300">
                {/* Node icon dot */}
                <div className={`absolute right-[-33px] top-1.5 h-7 w-7 rounded-full border-2 flex items-center justify-center bg-white shadow-md z-10 transition-transform duration-300 group-hover:scale-110 ${conf.color.split(' ')[0]}`}>
                  <span className="text-xs">{conf.icon}</span>
                </div>

                {/* Timeline Card */}
                <div className="rounded-2xl border border-burgundy/10 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-burgundy/20 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-burgundy">{act.title}</h4>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${conf.color.split(' ').slice(0, 3).join(' ')}`}>
                          {conf.label}
                        </span>
                        {act.paymentMethod && (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {act.paymentMethod === 'Cash' ? '💵 كاش' : act.paymentMethod === 'Instapay' ? '📱 انستا باي' : '💳 محفظة كاش'}
                          </span>
                        )}
                        {act.referenceId && (
                          <span className="font-mono bg-burgundy/5 text-burgundy/50 px-2 py-0.5 rounded text-[10px]">
                            #{act.referenceId.toString().slice(-6).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-burgundy/40 mt-1 font-bold">
                        بواسطة: <span className="text-burgundy/60">{act.user}</span>
                      </p>
                    </div>
                    {/* Time Badge */}
                    <div className="text-left">
                      <p className="text-xs font-extrabold text-burgundy">{timeStr}</p>
                      <p className="text-[10px] text-burgundy/40 font-bold mt-0.5">{dateStr}</p>
                    </div>
                  </div>

                  {/* Description */}
                  {act.description && (
                    <p className="text-xs text-burgundy/75 leading-relaxed bg-[#F7F0EC]/30 p-2.5 rounded-xl border border-burgundy/5">
                      {act.description}
                    </p>
                  )}

                  {/* Transaction amount or note */}
                  {(act.amount != null || act.notes) && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-burgundy/5 text-xs">
                      {act.amount != null && (
                        <div className="flex items-center gap-1">
                          <span className="text-burgundy/50">القيمة/المبلغ:</span>
                          <span className={`font-extrabold text-sm ${
                            act.type === 'expense' || act.direction === 'OUT' || (act.type === 'stock_adjustment' && act.amount < 0)
                              ? 'text-red-600'
                              : 'text-emerald-700'
                          }`}>
                            {act.type === 'stock_adjustment' 
                              ? `${act.amount > 0 ? '+' : ''}${act.amount} قطعة`
                              : EGP(act.amount)
                            }
                          </span>
                        </div>
                      )}
                      {act.notes && (
                        <p className="text-[10px] text-burgundy/50 italic">
                          ملاحظات: {act.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminActivities;
