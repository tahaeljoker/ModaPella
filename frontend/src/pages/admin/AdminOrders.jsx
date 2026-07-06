import { useEffect, useState } from 'react';
import api from '../../services/api';
import { exportToCSV } from '../../services/export';

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;

const STATUS_AR = { Completed: 'مكتمل', Returned: 'مرتجع', Pending: 'معلق' };
const STATUS_COLOR = {
  Completed: 'bg-emerald-100 text-emerald-700',
  Returned: 'bg-red-100 text-red-600',
  Pending: 'bg-amber-100 text-amber-700',
};
const TYPE_AR = { Online: 'أونلاين', Offline: 'كاشير' };
const PAY_AR = { Cash: '💵 كاش', Instapay: '💳 انستا باي' };
const PAY_COLOR = { Cash: 'bg-blue-50 text-blue-700', Instapay: 'bg-violet-50 text-violet-700' };

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [returnModal, setReturnModal] = useState(null); // { order }
  const [returnQtys, setReturnQtys] = useState({}); // { itemId: qty }
  const [returnReason, setReturnReason] = useState('');
  const [returning, setReturning] = useState(false);

  const loadOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/orders/${id}`, { status });
      await loadOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const openReturnModal = (order) => {
    const initial = {};
    order.items.forEach(item => { initial[item._id] = 0; });
    setReturnQtys(initial);
    setReturnReason('');
    setReturnModal({ order });
  };

  const handleReturn = async () => {
    if (!returnModal) return;
    setReturning(true);
    try {
      const selectedItems = Object.entries(returnQtys)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => ({ itemId, quantity: Number(qty) }));

      if (selectedItems.length === 0) {
        alert('اختر قطعة واحدة على الأقل للإرجاع');
        return;
      }

      await api.post('/pos/recover', {
        orderId: returnModal.order._id,
        reason: returnReason || 'غير محدد',
        returnItems: selectedItems
      });
      setReturnModal(null);
      await loadOrders();
    } catch (e) {
      alert(e.response?.data?.message || 'حدث خطأ أثناء الاسترجاع');
    } finally {
      setReturning(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const filtered = orders.filter((o) => {
    const matchStatus = filterStatus === 'All' || o.status === filterStatus;
    const matchType = filterType === 'All' || o.type === filterType;
    const shortId = o._id?.slice(-6).toUpperCase() || '';
    const matchSearch = !search ||
      shortId.includes(search.toUpperCase()) ||
      o.items?.some(i => i.name.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchType && matchSearch;
  });

  const totalFiltered = filtered.filter((o) => o.status === 'Completed').reduce((s, o) => s + o.totalAmount, 0);

  const handleExport = () => {
    const headers = ['رقم الطلب', 'التاريخ', 'المنتجات', 'النوع', 'طريقة الدفع', 'الحالة', 'الإجمالي'];
    const rows = filtered.map(o => [
      o._id?.slice(-6).toUpperCase() || '',
      new Date(o.createdAt).toLocaleString('ar-EG'),
      o.items?.map(i => `${i.name} (${i.size || '-'}/${i.color || '-'}) x${i.quantity}`).join(' + ') || '',
      o.type === 'Offline' ? 'كاشير' : 'أونلاين',
      o.paymentMethod === 'Cash' ? 'كاش' : 'انستا باي',
      o.status === 'Completed' ? 'مكتمل' : o.status === 'Returned' ? 'مرتجع' : 'معلق',
      o.totalAmount
    ]);
    exportToCSV(`طلبات_مودابيلا_${new Date().toLocaleDateString('ar-EG')}`, headers, rows);
  };

  return (
    <div className="space-y-6 text-burgundy">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/50">إدارة</p>
          <h2 className="text-3xl font-bold">الطلبات</h2>
          <p className="mt-1 text-sm text-burgundy/50">{orders.length} طلب إجمالي</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-700"
          >
            📥 تصدير Excel
          </button>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الطلب أو المنتج..."
            className="rounded-full border border-burgundy/20 bg-white px-4 py-2 text-sm text-burgundy outline-none transition focus:border-burgundy w-56"
          />
          <div className="rounded-2xl bg-burgundy/8 px-5 py-3 text-right">
            <p className="text-xs text-burgundy/60">إجمالي المعروض</p>
            <p className="text-xl font-bold">{EGP(totalFiltered)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {['All', 'Completed', 'Pending', 'Returned'].map((s) => (
          <button key={s} type="button" onClick={() => setFilterStatus(s)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${filterStatus === s ? 'bg-burgundy text-white' : 'border border-burgundy/20 text-burgundy hover:bg-burgundy/10'}`}>
            {s === 'All' ? 'كل الحالات' : STATUS_AR[s]}
          </button>
        ))}
        <div className="mx-2 w-px bg-burgundy/20" />
        {['All', 'Online', 'Offline'].map((t) => (
          <button key={t} type="button" onClick={() => setFilterType(t)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${filterType === t ? 'bg-burgundy text-white' : 'border border-burgundy/20 text-burgundy hover:bg-burgundy/10'}`}>
            {t === 'All' ? 'كل الأنواع' : TYPE_AR[t]}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white p-12 text-center text-sm text-burgundy/50">
          لا توجد طلبات مطابقة
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div key={order._id} className="rounded-[1.75rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
              <div
                className="flex flex-wrap cursor-pointer items-center justify-between gap-4 px-6 py-4 hover:bg-burgundy/3 transition"
                onClick={() => setExpanded(expanded === order._id ? null : order._id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{order.items?.map((i) => i.name).join('، ')}</p>
                      <span className="rounded bg-burgundy/8 px-1.5 py-0.5 font-mono text-[10px] text-burgundy/60">
                        #{order._id?.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-burgundy/50">
                      {new Date(order.createdAt).toLocaleString('ar-EG')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.type === 'Offline' ? 'bg-burgundy/10 text-burgundy' : 'bg-emerald-100 text-emerald-700'}`}>
                    {TYPE_AR[order.type]}
                  </span>
                  {order.paymentMethod && (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${PAY_COLOR[order.paymentMethod] || 'bg-gray-100 text-gray-600'}`}>
                      {PAY_AR[order.paymentMethod] || order.paymentMethod}
                    </span>
                  )}
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[order.status]}`}>
                    {STATUS_AR[order.status]}
                  </span>
                  <p className="text-lg font-bold">{EGP(order.totalAmount)}</p>
                  <span className="text-burgundy/40">{expanded === order._id ? '▲' : '▼'}</span>
                </div>
              </div>
              {expanded === order._id && (
                <div className="border-t border-burgundy/8 bg-burgundy/3 px-6 py-4">
                  <div className="mb-4 space-y-2">
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-burgundy/80">
                          {item.name} × {item.quantity}
                          {item.size && <span className="mr-1 text-burgundy/50">({item.size}{item.color ? ` / ${item.color}` : ''})</span>}
                        </span>
                        <span className="font-semibold">{EGP(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    {order.discount > 0 && (
                      <div className="flex justify-between text-sm text-red-500">
                        <span>🏷️ خصم</span>
                        <span>-{EGP(order.discount)}</span>
                      </div>
                    )}
                    <div className="mt-2 flex justify-between border-t border-burgundy/10 pt-2 font-bold">
                      <span>الصافي المدفوع</span>
                      <span>{EGP(order.totalAmount)}</span>
                    </div>
                    {order.paymentMethod && (
                      <div className="mt-1 flex justify-between text-sm text-burgundy/60">
                        <span>طريقة الدفع</span>
                        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${PAY_COLOR[order.paymentMethod] || ''}`}>
                          {PAY_AR[order.paymentMethod] || order.paymentMethod}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {order.status === 'Pending' && (
                      <>
                        <button type="button" onClick={() => handleStatusChange(order._id, 'Completed')}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700">
                          تأكيد كمكتمل
                        </button>
                        <button type="button" onClick={() => handleStatusChange(order._id, 'Returned')}
                          className="rounded-xl border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50">
                          مرتجع كامل
                        </button>
                      </>
                    )}
                    {order.status === 'Completed' && !order.recovered && (
                      <button type="button" onClick={() => openReturnModal(order)}
                        className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100">
                        🔄 مرتجع (جزئي أو كامل)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Partial Return Modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setReturnModal(null)}>
          <div className="w-full max-w-md rounded-[2rem] bg-[#F7F0EC] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-1 text-xl font-bold text-burgundy">🔄 تسجيل مرتجع</h3>
            <p className="mb-4 text-xs text-burgundy/50">حدد القطع والكميات التي تريد إرجاعها</p>
            <div className="space-y-3 max-h-[40vh] overflow-y-auto mb-4">
              {returnModal.order.items.map((item) => (
                <div key={item._id} className="flex items-center justify-between rounded-xl border border-burgundy/10 bg-white p-3">
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-burgundy/50">
                      {item.size && `مقاس: ${item.size}`} {item.color && `· ${item.color}`} · الكمية المباعة: {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-burgundy/50">إرجاع:</span>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={returnQtys[item._id] ?? 0}
                      onChange={(e) => setReturnQtys(prev => ({ ...prev, [item._id]: Math.min(item.quantity, Math.max(0, Number(e.target.value))) }))}
                      className="w-14 rounded-lg border border-burgundy/20 bg-white px-2 py-1 text-center text-sm font-bold outline-none focus:border-burgundy"
                    />
                  </div>
                </div>
              ))}
            </div>
            <input
              type="text"
              placeholder="سبب الإرجاع (اختياري)"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="mb-4 w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy"
            />
            <div className="flex gap-3">
              <button type="button" onClick={handleReturn} disabled={returning}
                className="flex-1 rounded-full bg-burgundy py-3 text-sm font-bold text-white transition hover:bg-[#650018] disabled:opacity-60">
                {returning ? 'جاري الاسترجاع...' : 'تأكيد الاسترجاع'}
              </button>
              <button type="button" onClick={() => setReturnModal(null)}
                className="rounded-full border border-burgundy/20 px-5 py-3 text-sm font-medium text-burgundy hover:bg-burgundy/10">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminOrders;
