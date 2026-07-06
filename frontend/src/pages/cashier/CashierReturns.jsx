import { useState } from 'react';
import api from '../../services/api';

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;
const SHORT_ID = (id) => id?.slice(-6).toUpperCase() || '------';

function CashierReturns() {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [returning, setReturning] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: '' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    setLoading(true);
    setOrder(null);
    try {
      const res = await api.get(`/cashier/orders/${orderId.trim()}`);
      setOrder(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'لم يُعثر على طلب بهذا الرقم', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!order || order.recovered) return;
    setReturning(true);
    try {
      await api.post('/pos/recover', { orderId: order._id, reason });
      showToast('تم استرداد الطلب وإعادة المخزون بنجاح ✓');
      setOrder(null);
      setOrderId('');
      setReason('');
    } catch (err) {
      showToast(err.response?.data?.message || 'حدث خطأ أثناء الاسترداد', 'error');
    } finally {
      setReturning(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-burgundy/20 bg-white px-4 py-3 text-sm text-burgundy outline-none focus:border-burgundy';

  return (
    <div className="max-w-2xl space-y-6 text-burgundy">
      {toast.msg && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-burgundy/50">كاشير</p>
        <h2 className="text-2xl font-bold">المرتجعات</h2>
        <p className="mt-1 text-sm text-burgundy/60">أدخل رقم الطلب لاسترداده وإعادة المخزون تلقائياً</p>
      </div>

      {/* Search form */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold">البحث عن طلب</h3>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="أدخل ID الطلب الكامل..."
            className={`${inputCls} flex-1`}
          />
          <button type="submit" disabled={loading}
            className="rounded-full bg-burgundy px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#650018] disabled:opacity-60">
            {loading ? '...' : 'بحث'}
          </button>
        </form>
        <p className="mt-2 text-xs text-burgundy/40">الـ ID يظهر على الفاتورة بعد البيع</p>
      </div>

      {/* Order details */}
      {order && (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">تفاصيل الطلب</h3>
            <div className="flex gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : order.status === 'Returned' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                {order.status === 'Completed' ? 'مكتمل' : order.status === 'Returned' ? 'مرتجع بالفعل' : 'معلق'}
              </span>
              {order.recovered && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">تم الاسترداد مسبقاً</span>
              )}
            </div>
          </div>

          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-sm text-burgundy/60">
              <span>رقم الطلب</span>
              <span className="font-mono font-bold">#{SHORT_ID(order._id)}</span>
            </div>
            <div className="flex justify-between text-sm text-burgundy/60">
              <span>التاريخ</span>
              <span>{new Date(order.createdAt).toLocaleString('ar-EG')}</span>
            </div>
            <div className="flex justify-between text-sm text-burgundy/60">
              <span>النوع</span>
              <span>{order.type === 'Offline' ? 'كاشير' : 'أونلاين'}</span>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-burgundy/8 overflow-hidden">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between border-b border-burgundy/5 last:border-0 px-4 py-3 text-sm">
                <span>{item.name} × {item.quantity}</span>
                <span className="font-semibold">{EGP(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between bg-burgundy/5 px-4 py-3 font-bold">
              <span>الإجمالي</span>
              <span>{EGP(order.totalAmount)}</span>
            </div>
          </div>

          {!order.recovered && order.status !== 'Returned' ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">سبب الإرجاع</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={`${inputCls} min-h-[70px]`}
                  placeholder="اكتب سبب الإرجاع..."
                />
              </div>
              <button type="button" onClick={handleReturn} disabled={returning}
                className="w-full rounded-full bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60">
                {returning ? 'جاري الاسترداد...' : '↩ تأكيد الإرجاع وإعادة المخزون'}
              </button>
            </div>
          ) : (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 text-center font-semibold">
              هذا الطلب تم استرداده بالفعل
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CashierReturns;
