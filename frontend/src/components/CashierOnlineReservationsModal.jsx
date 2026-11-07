import { useState, useEffect } from 'react';
import api from '../services/api';
import { cleanProductName } from '../utils/discount';
import { resolveImageUrl } from '../utils/imageUrl';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

export default function CashierOnlineReservationsModal({
  isOpen,
  onClose,
  onOrderFulfilled,
  employees = [],
  showToast
}) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [fulfillingOrder, setFulfillingOrder] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);
  const [cancelingOrder, setCancelingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('لم يحضر العميل للاستلام');

  const fetchReservations = async (query = '') => {
    setLoading(true);
    try {
      const res = await api.get('/pos/online-reservations', {
        params: query ? { q: query } : {}
      });
      setReservations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      showToast?.('تعذر تحميل الحجوزات الأونلاين', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReservations(search);
    }
  }, [isOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReservations(search);
  };

  const handleOpenFulfill = (order) => {
    setFulfillingOrder(order);
    setPaymentMethod(order.paymentMethod === 'Instapay' ? 'Instapay' : 'Cash');
    setSelectedEmployee(employees[0]?._id || '');
  };

  const handleConfirmFulfill = async () => {
    if (!fulfillingOrder) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/pos/fulfill-reservation/${fulfillingOrder._id}`, {
        employeeId: selectedEmployee || null,
        paymentMethod
      });

      showToast?.('تم تسليم الحجز وتحصيل المبلغ بنجاح! 🎉', 'success');
      
      const emp = employees.find(e => e._id === selectedEmployee);
      const completedOrderData = {
        ...res.data.order,
        _employeeName: emp?.name || ''
      };

      setFulfillingOrder(null);
      fetchReservations(search);
      onOrderFulfilled?.(completedOrderData);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'فشل إتمام تسليم الحجز';
      showToast?.(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelingOrder) return;
    setSubmitting(true);
    try {
      await api.post(`/pos/cancel-reservation/${cancelingOrder._id}`, {
        reason: cancelReason
      });
      showToast?.('تم إلغاء الحجز وإعادة القطع للمخزن بنجاح', 'success');
      setCancelingOrder(null);
      fetchReservations(search);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'فشل إلغاء الحجز';
      showToast?.(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 animate-fade-in"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-burgundy/15"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-burgundy/10 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/30">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-xs">
              📦
            </span>
            <div>
              <h2 className="text-lg font-black text-burgundy flex items-center gap-2">
                <span>حجوزات وطلبات الأونلاين المعلقة</span>
                <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold">
                  {reservations.length} حجز معلق
                </span>
              </h2>
              <p className="text-xs text-burgundy/60 mt-0.5">
                استعلام وتسليم القطع المحجوزة أونلاين وتحصيلها في الكاشير
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-burgundy/5 text-burgundy/70 hover:bg-burgundy/10 hover:text-burgundy flex items-center justify-center font-bold text-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-[#FAF7F5] border-b border-burgundy/10">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث برقم الهاتف، كود الحجز (مثال: A4B29E)، أو اسم العميل..."
                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-burgundy/20 bg-white text-xs sm:text-sm font-semibold text-burgundy placeholder:text-burgundy/40 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-burgundy/40 text-sm">
                🔍
              </span>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy/90 text-white text-xs sm:text-sm font-bold transition shadow-xs"
            >
              بحث
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchReservations('');
                }}
                className="px-3 py-2.5 rounded-xl bg-burgundy/10 text-burgundy text-xs font-bold transition hover:bg-burgundy/15"
              >
                مسح
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchReservations(search)}
              className="px-3.5 py-2.5 rounded-xl border border-burgundy/20 bg-white text-burgundy text-xs font-bold transition hover:bg-amber-50"
              title="تحديث القائمة"
            >
              🔄
            </button>
          </form>
        </div>

        {/* Reservations List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-burgundy/60">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold">جاري البحث وتحميل الحجوزات...</p>
            </div>
          ) : reservations.length === 0 ? (
            <div className="py-16 text-center text-burgundy/50">
              <span className="text-4xl block mb-2">✨</span>
              <p className="text-sm font-bold text-burgundy/70">لا توجد حجوزات أونلاين معلقة حالياً</p>
              <p className="text-xs text-burgundy/50 mt-1">
                أي عميل يطلب أو يحجز من الموقع سيظهر هنا فوراً مع إمكانية تسليمه وتحصيله في المحل
              </p>
            </div>
          ) : (
            reservations.map((order) => {
              const shortId = order._id.toString().slice(-6).toUpperCase();
              const dateStr = new Date(order.createdAt).toLocaleDateString('ar-EG', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              });
              const cleanPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');

              return (
                <div
                  key={order._id}
                  className="rounded-2xl border border-burgundy/15 bg-white p-4 sm:p-5 shadow-xs hover:border-amber-400 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Customer & Order Metadata */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                        #{shortId}
                      </span>
                      <span className="text-sm font-black text-burgundy">
                        {order.customerName || 'عميل أونلاين'}
                      </span>
                      <span className="text-xs font-mono font-bold text-burgundy/70">
                        {order.customerPhone}
                      </span>
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 px-2 py-0.5 rounded-full font-bold transition flex items-center gap-1"
                        >
                          <span>واتساب</span>
                        </a>
                      )}
                      <span className="text-[11px] text-burgundy/40">
                        {dateStr}
                      </span>
                    </div>

                    {/* Order Items */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {order.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-1.5 rounded-xl bg-[#FAF7F5] border border-burgundy/10 text-xs"
                        >
                          {it.product?.images?.[0] && (
                            <img
                              src={resolveImageUrl(it.product.images[0])}
                              alt={it.name}
                              className="w-8 h-8 rounded-lg object-contain bg-white border border-burgundy/10"
                            />
                          )}
                          <div>
                            <p className="font-bold text-burgundy line-clamp-1">{it.name}</p>
                            <p className="text-[10px] text-burgundy/60">
                              {it.size ? `مقاس: ${it.size} • ` : ''}
                              {it.color ? `لون: ${it.color} • ` : ''}
                              الكمية: {it.quantity}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Notes if any */}
                    {order.notes && (
                      <p className="text-xs text-amber-900/80 bg-amber-50/70 p-2 rounded-xl border border-amber-200/50">
                        📌 {order.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions & Price */}
                  <div className="flex md:flex-col items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-burgundy/10 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-burgundy/60 font-semibold">المبلغ المطلوب</p>
                      <p className="text-base sm:text-lg font-black text-burgundy">
                        {EGP(order.totalAmount)}
                      </p>
                      <span className="text-[10px] text-burgundy/70 font-bold block">
                        الدفع: {order.paymentMethod === 'Instapay' ? 'إنستاباي' : 'كاش عند الاستلام'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenFulfill(order)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                      >
                        <span>✓ تسليم وتحصيل بالمحل</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancelingOrder(order)}
                        className="px-2.5 py-2 rounded-xl bg-stone-100 hover:bg-red-50 text-stone-600 hover:text-red-700 text-xs font-bold transition border border-stone-200"
                        title="إلغاء الحجز وإعادة القطع للمخزن"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Fulfill Confirmation Sub-Modal */}
        {fulfillingOrder && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-burgundy/20 space-y-4">
              <h3 className="text-base font-black text-burgundy flex items-center gap-2">
                <span>تأكيد تسليم الحجز وتحصيل الفاتورة</span>
              </h3>

              <div className="bg-[#FAF7F5] p-3 rounded-2xl border border-burgundy/10 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-burgundy/60">العميل:</span>
                  <span className="font-bold">{fulfillingOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-burgundy/60">رقم الهاتف:</span>
                  <span className="font-bold font-mono">{fulfillingOrder.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-burgundy/60">إجمالي المبلغ:</span>
                  <span className="font-black text-emerald-700 text-sm">{EGP(fulfillingOrder.totalAmount)}</span>
                </div>
              </div>

              {/* Select Employee */}
              <div>
                <label className="block text-xs font-bold text-burgundy mb-1">
                  الموظف / البائع المسؤول عن التسليم:
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-burgundy/20 text-xs font-bold bg-white"
                >
                  <option value="">(بدون تحديد موظف محدد)</option>
                  {employees.map(e => (
                    <option key={e._id} value={e._id}>{e.name}</option>
                  ))}
                </select>
              </div>

              {/* Select Payment Method */}
              <div>
                <label className="block text-xs font-bold text-burgundy mb-1">
                  طريقة التحصيل في المحل:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      paymentMethod === 'Cash'
                        ? 'bg-burgundy text-white border-burgundy shadow-xs'
                        : 'bg-white text-burgundy/70 border-burgundy/20'
                    }`}
                  >
                    كاش (نقدية بالخزينة)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Instapay')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      paymentMethod === 'Instapay'
                        ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                        : 'bg-white text-burgundy/70 border-burgundy/20'
                    }`}
                  >
                    إنستاباي / تحويل
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmFulfill}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'جاري التحصيل...' : 'تأكيد التسليم وطباعة الفاتورة ✓'}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setFulfillingOrder(null)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs hover:bg-stone-200 transition"
                >
                  رجوع
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Sub-Modal */}
        {cancelingOrder && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-red-200 space-y-4">
              <h3 className="text-base font-black text-red-700">
                إلغاء الحجز وإرجاع القطع للمخزن
              </h3>
              <p className="text-xs text-burgundy/80 leading-relaxed">
                هل أنت متأكد من إلغاء طلب الحجز للعميل ({cancelingOrder.customerName})؟ سيتم فوراً إعادة القطع للمخزون لتصبح متاحة للبيع بالمحل.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-burgundy/70 mb-1">
                  سبب الإلغاء:
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2 rounded-xl border border-burgundy/20 text-xs font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmCancel}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setCancelingOrder(null)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs hover:bg-stone-200 transition"
                >
                  تراجع
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
