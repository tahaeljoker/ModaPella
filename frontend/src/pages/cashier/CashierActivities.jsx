import { useEffect, useState } from 'react';
import api from '../../services/api';

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

function CashierActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  // Cashier page shows today's activities by default
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [from] = useState(getTodayString());
  const [to] = useState(getTodayString());

  const loadActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const res = await api.get(`/cashier/activities?${params.toString()}`);
      setActivities(res.data);
    } catch (e) {
      console.error('Failed to load cashier activities:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [from, to]);

  const filtered = activities.filter(act => {
    const matchType = filterType === 'All' || act.type === filterType;
    const searchLower = search.toLowerCase();
    const matchSearch = !search || 
      act.title.toLowerCase().includes(searchLower) ||
      (act.description || '').toLowerCase().includes(searchLower) ||
      act.user.toLowerCase().includes(searchLower);
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">الوردية الحالية</p>
          <h2 className="text-2xl font-bold">📜 حركات اليوم بالنظام</h2>
          <p className="text-sm text-burgundy/50 mt-0.5">سجل تفصيلي لكافة الأنشطة والعمليات التي تمت اليوم</p>
        </div>
        <button
          onClick={loadActivities}
          className="rounded-full border border-burgundy/25 bg-white px-4 py-2 text-xs font-bold transition hover:bg-burgundy hover:text-white"
        >
          🔄 تحديث
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-burgundy/10 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 ابحث في حركات اليوم..."
          className="flex-1 rounded-xl border border-burgundy/20 bg-white px-4 py-2 text-sm text-burgundy outline-none focus:border-burgundy"
        />
        <div className="flex rounded-xl border border-burgundy/20 bg-white overflow-hidden">
          <button
            onClick={() => setFilterType('All')}
            className={`px-3 py-2 text-xs font-bold transition ${
              filterType === 'All' ? 'bg-burgundy text-white' : 'text-burgundy/60 hover:bg-burgundy/5'
            }`}
          >
            الكل
          </button>
          {['sale', 'expense', 'refund', 'safe_movement'].map(type => {
            const config = TYPE_CONFIG[type];
            if (!config) return null;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-2 text-xs font-bold transition ${
                  filterType === type ? 'bg-burgundy text-white' : 'text-burgundy/60 hover:bg-burgundy/5'
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline view */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white py-16 text-center">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-xs text-burgundy/40 font-bold">لا توجد حركات مسجلة لليوم تطابق البحث</p>
        </div>
      ) : (
        <div className="relative mr-3 pr-5 border-r border-burgundy/15 space-y-5 py-2">
          {filtered.map(act => {
            const conf = TYPE_CONFIG[act.type] || { label: 'حركة عامة', icon: '⚙️', color: 'border-burgundy bg-burgundy/5 text-burgundy' };
            const timeStr = new Date(act.timestamp).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={act.id} className="relative group transition-all duration-300">
                {/* Node icon dot */}
                <div className={`absolute right-[-29px] top-1.5 h-6.5 w-6.5 rounded-full border-2 flex items-center justify-center bg-white shadow-md z-10 ${conf.color.split(' ')[0]}`}>
                  <span className="text-xs">{conf.icon}</span>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-burgundy/10 bg-white p-4 shadow-sm transition hover:border-burgundy/20 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-xs text-burgundy">{act.title}</h4>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${conf.color.split(' ').slice(0, 3).join(' ')}`}>
                          {conf.label}
                        </span>
                        {act.paymentMethod && (
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                            {act.paymentMethod === 'Cash' ? 'كاش' : 'انستا'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-burgundy/40 mt-0.5 font-bold">
                        المسؤول: <span className="text-burgundy/60">{act.user}</span>
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-burgundy bg-burgundy/5 px-2 py-0.5 rounded-lg">{timeStr}</span>
                  </div>

                  {act.description && (
                    <p className="text-xs text-burgundy/70 bg-[#F7F0EC]/20 p-2 rounded-xl border border-burgundy/5">
                      {act.description}
                    </p>
                  )}

                  {act.amount != null && (
                    <div className="flex justify-between items-center pt-1 border-t border-burgundy/5 text-xs">
                      <span className="text-burgundy/50">المبلغ:</span>
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CashierActivities;
