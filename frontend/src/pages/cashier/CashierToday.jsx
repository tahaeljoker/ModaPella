import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderBarcodeSVG } from '../../utils/barcode';
import api from '../../services/api';
import { exportToCSV } from '../../services/export';

const EGP    = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;
const SHORT  = (id) => id?.slice(-6).toUpperCase() || '------';
const TIME   = (d) => new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
const DATE   = (d) => new Date(d).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// ─── Order Detail Modal ────────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose }) {
  const navigate = useNavigate();
  if (!order) return null;
  const isReturned = order.status === 'Returned';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`text-white text-center py-5 px-6 ${isReturned ? 'bg-red-500' : 'bg-burgundy'}`}>
          <p className="text-xs tracking-widest uppercase opacity-70">ModaPella</p>
          <h3 className="text-lg font-bold mt-1">{isReturned ? 'طلب مرتجع' : 'فاتورة بيع'}</h3>
          <p className="text-xs opacity-60 mt-1 font-mono">#{SHORT(order._id)}</p>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Meta */}
          <div className="flex justify-between text-xs text-burgundy/50">
            <span>الوقت</span>
            <span>{new Date(order.createdAt).toLocaleString('ar-EG')}</span>
          </div>
          <div className="flex justify-between text-xs text-burgundy/50">
            <span>طريقة الدفع</span>
            <span>{order.paymentMethod === 'Cash' ? '💵 كاش' : '📱 انستا باي'}</span>
          </div>

          <div className="border-t border-dashed border-burgundy/15" />

          {/* Items */}
          <p className="text-xs font-bold text-burgundy/50 uppercase tracking-wider">المنتجات</p>
          <div className="space-y-2">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between items-start gap-3 bg-[#F7F0EC] rounded-2xl px-4 py-3">
                <div>
                  <p className="font-semibold text-sm text-burgundy">{item.name}</p>
                  <p className="text-xs text-burgundy/50 mt-0.5">
                    {item.size && <span>المقاس: {item.size}</span>}
                    {item.size && item.color && <span> · </span>}
                    {item.color && <span>اللون: {item.color}</span>}
                  </p>
                  <p className="text-xs text-burgundy/40 mt-0.5">
                    {EGP(item.price)} × {item.quantity}
                  </p>
                </div>
                <p className="font-bold text-burgundy text-sm whitespace-nowrap">{EGP(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-burgundy/15" />

          {/* Totals */}
          <div className="space-y-1.5 text-sm">
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>خصم</span>
                <span>- {EGP(order.discount)}</span>
              </div>
            )}
            <div className={`flex justify-between font-bold text-base ${isReturned ? 'text-red-500 line-through' : 'text-burgundy'}`}>
              <span>الإجمالي</span>
              <span>{EGP(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Close & Print */}
        <div className="p-4 bg-[#F7F0EC] flex gap-3">
          <button
            onClick={() => {
              const shortId = order._id?.toString().slice(-6).toUpperCase() || '------';
              const dateStr = new Date(order.createdAt).toLocaleString('ar-EG');
              const itemsHTML = order.items.map(item => `
                <div style="display:flex;justify-content:space-between;margin:4px 0;font-size:10px">
                  <span>${item.name} ${item.size ? `(${item.size})` : ''} ${item.color ? `(${item.color})` : ''} x${item.quantity}</span>
                  <span style="white-space:nowrap">${(item.price * item.quantity).toLocaleString('ar-EG')} ج.م</span>
                </div>
              `).join('');

              const printDiv = document.createElement('div');
              printDiv.id = 'receipt-reprint-root';
              printDiv.innerHTML = `
                <div style="direction:rtl;text-align:right;font-family:Cairo,sans-serif;padding:2mm 3mm;width:58mm;font-size:10px;color:#000;line-height:1.4;box-sizing:border-box;">
                  <div style="text-align:center;font-weight:bold;font-size:14px;margin-bottom:3px">ModaPella 🎠</div>
                  <div style="text-align:center;margin-bottom:8px;font-size:8px;color:#444">إعادة طباعة فاتورة</div>
                  
                  <div style="border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:8px;font-size:9px">
                    <div><strong>رقم الفاتورة:</strong> #${shortId}</div>
                    <div><strong>التاريخ:</strong> ${dateStr}</div>
                    <div><strong>طريقة الدفع:</strong> ${order.paymentMethod === 'Cash' ? 'كاش' : order.paymentMethod === 'Instapay' ? 'انستا باي' : 'محفظة'}</div>
                    ${order.employeeName ? `<div><strong>البائع:</strong> ${order.employeeName}</div>` : ''}
                    ${order.notes ? `<div><strong>ملاحظات:</strong> ${order.notes}</div>` : ''}
                  </div>

                  <div style="border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:8px">
                    ${itemsHTML}
                  </div>

                  <div style="font-weight:bold;font-size:10px">
                    ${order.discount > 0 ? `<div style="display:flex;justify-content:space-between"><span>خصم:</span><span>-${order.discount} ج.م</span></div>` : ''}
                    <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:3px">
                      <span>الإجمالي الفعلي:</span>
                      <span>${order.totalAmount.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  </div>

                  <div style="text-align:center;margin-top:15px;font-size:8.5px;color:#666">
                    شكراً لتعاملكم معنا! ModaPella
                  </div>
                </div>
              `;

              document.body.appendChild(printDiv);
              setTimeout(() => {
                window.print();
                document.body.removeChild(printDiv);
              }, 100);
            }}
            className="rounded-xl bg-burgundy text-white px-4 py-2.5 text-xs font-bold transition hover:bg-[#650018]"
          >
            🖨️ طباعة الفاتورة
          </button>
          <button
            onClick={() => {
              const id = order._id?.toString().slice(-8).toUpperCase();
              const barcodeSVG = renderBarcodeSVG(order._id?.toString().toUpperCase(), 60);
              const printDiv = document.createElement('div');
              printDiv.id = 'invoice-barcode-print-root';
              printDiv.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:58mm;font-family:Cairo,sans-serif;background:#fff;padding:5mm;box-sizing:border-box;">
                  <div style="font-weight:900;font-size:14px;margin-bottom:2px">ModaPella</div>
                  <div style="font-size:10px;margin-bottom:5px">كود الفاتورة</div>
                  <div style="width:100%;height:15mm;">${barcodeSVG}</div>
                  <div style="font-size:12px;margin-top:2px;font-weight:bold">#${id}</div>
                </div>
                <div style="page-break-after: always;"></div>
              `;
              document.body.appendChild(printDiv);
              setTimeout(() => {
                window.print();
                document.body.removeChild(printDiv);
              }, 100);
            }}
            className="rounded-xl border-2 border-burgundy bg-[#F7F0EC] px-4 py-2.5 text-xs font-bold text-burgundy transition hover:bg-burgundy/10"
          >
            🏷️ طباعة كود
          </button>
          {!isReturned && (
            <button
              onClick={() => navigate(`/cashier/pos?edit=${order._id}`)}
              className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100 transition"
            >
              ✏️ تعديل
            </button>
          )}
          <button onClick={onClose} className="rounded-xl border border-burgundy/20 px-4 py-2.5 text-sm font-medium text-burgundy hover:bg-burgundy/10 transition">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
function CashierToday() {
  const [data, setData]         = useState({ orders: [], totalRevenue: 0, count: 0 });
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');   // all | completed | returned
  const [filterPay, setFilterPay] = useState('all'); // all | Cash | Instapay
  const [selected, setSelected] = useState(null);    // order for detail modal
  const [search, setSearch]     = useState('');

  const load = () => {
    setLoading(true);
    api.get('/cashier/today')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const completed = data.orders.filter(o => o.status === 'Completed');
  const returned  = data.orders.filter(o => o.status === 'Returned');
  const cashTotal = completed.filter(o => o.paymentMethod === 'Cash').reduce((s, o) => s + o.totalAmount, 0);
  const instaTotal = completed.filter(o => o.paymentMethod !== 'Cash').reduce((s, o) => s + o.totalAmount, 0);

  const filtered = data.orders.filter(o => {
    const ms  = !search || o._id?.toLowerCase().includes(search.toLowerCase()) ||
      o.items?.some(i => i.name.toLowerCase().includes(search.toLowerCase()));
    const mf  = filter === 'all' ? true : filter === 'completed' ? o.status === 'Completed' : o.status === 'Returned';
    const mp  = filterPay === 'all' ? true : o.paymentMethod === filterPay;
    return ms && mf && mp;
  });

  const handleExport = () => {
    const headers = ['رقم الطلب', 'الوقت', 'المنتجات', 'طريقة الدفع', 'الحالة', 'الإجمالي'];
    const rows = data.orders.map(o => [
      SHORT(o._id),
      TIME(o.createdAt),
      o.items?.map(i => `${i.name} (${i.size || '-'}/${i.color || '-'}) ×${i.quantity}`).join(' | ') || '',
      o.paymentMethod === 'Cash' ? 'كاش' : 'انستا باي',
      o.status === 'Completed' ? 'مكتمل' : 'مرتجع',
      o.totalAmount,
    ]);
    exportToCSV(`مبيعات_اليوم_${new Date().toLocaleDateString('ar-EG')}`, headers, rows);
  };

  return (
    <div className="space-y-5 text-burgundy">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">كاشير</p>
          <h2 className="text-2xl font-bold">سجل اليوم</h2>
          <p className="mt-0.5 text-sm text-burgundy/50">{DATE(new Date())}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="rounded-full border border-burgundy/20 px-4 py-2 text-xs font-medium text-burgundy hover:bg-burgundy/8 transition">🔄 تحديث</button>
          {data.orders.length > 0 && (
            <button onClick={handleExport} className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-emerald-700">
              📥 تصدير CSV
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'إجمالي اليوم', value: EGP(data.totalRevenue), icon: '💰', cls: 'bg-burgundy text-white', vcls: 'text-white/90', lcls: 'text-white/70' },
          { label: 'مبيعات مكتملة', value: completed.length, icon: '✅', cls: 'bg-emerald-50 border border-emerald-200', vcls: 'text-emerald-800', lcls: 'text-emerald-600' },
          { label: 'كاش', value: EGP(cashTotal), icon: '💵', cls: 'bg-white border border-burgundy/10', vcls: 'text-burgundy', lcls: 'text-burgundy/50' },
          { label: 'انستا باي', value: EGP(instaTotal), icon: '📱', cls: 'bg-white border border-burgundy/10', vcls: 'text-burgundy', lcls: 'text-burgundy/50' },
        ].map(s => (
          <div key={s.label} className={`rounded-[1.5rem] p-5 ${s.cls}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{s.icon}</span>
              <p className={`text-xs font-semibold ${s.lcls}`}>{s.label}</p>
            </div>
            <p className={`text-2xl font-extrabold ${s.vcls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 بحث برقم الطلب أو اسم المنتج..."
          className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2 text-sm text-burgundy outline-none focus:border-burgundy min-w-[220px]"
        />
        {/* Status filter */}
        <div className="flex rounded-2xl border border-burgundy/20 bg-white overflow-hidden">
          {[{ id: 'all', l: 'الكل' }, { id: 'completed', l: '✅ مكتمل' }, { id: 'returned', l: '↩️ مرتجع' }].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3.5 py-2 text-xs font-semibold transition ${filter === f.id ? 'bg-burgundy text-white' : 'text-burgundy/60 hover:bg-burgundy/8'}`}>
              {f.l}
            </button>
          ))}
        </div>
        {/* Payment filter */}
        <div className="flex rounded-2xl border border-burgundy/20 bg-white overflow-hidden">
          {[{ id: 'all', l: 'كل الدفع' }, { id: 'Cash', l: '💵 كاش' }, { id: 'Instapay', l: '📱 انستا باي' }].map(f => (
            <button key={f.id} onClick={() => setFilterPay(f.id)}
              className={`px-3.5 py-2 text-xs font-semibold transition ${filterPay === f.id ? 'bg-burgundy text-white' : 'text-burgundy/60 hover:bg-burgundy/8'}`}>
              {f.l}
            </button>
          ))}
        </div>
        <span className="text-xs text-burgundy/40 mr-auto">{filtered.length} حركة</span>
      </div>

      {/* Orders List — full height, scrolls naturally */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white py-16 text-center">
          <p className="text-5xl mb-3">📋</p>
          <p className="text-lg font-semibold text-burgundy/40">
            {data.orders.length === 0 ? 'لا توجد مبيعات اليوم بعد' : 'لا توجد نتائج مطابقة'}
          </p>
          {data.orders.length === 0 && <p className="text-sm text-burgundy/30 mt-1">ابدأ بيعة جديدة من صفحة البيع</p>}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[60px_1fr_2fr_100px_90px_100px] gap-3 bg-[#F7F0EC] px-5 py-3 text-xs font-bold uppercase tracking-wide text-burgundy/50 border-b border-burgundy/8">
            <span>الرقم</span>
            <span>الوقت</span>
            <span>المنتجات</span>
            <span>الدفع</span>
            <span>الحالة</span>
            <span className="text-left">الإجمالي</span>
          </div>

          <div className="divide-y divide-burgundy/6">
            {filtered.map(order => {
              const isRet = order.status === 'Returned';
              return (
                <button
                  key={order._id}
                  onClick={() => setSelected(order)}
                  className="w-full text-right grid sm:grid-cols-[60px_1fr_2fr_100px_90px_100px] gap-3 px-5 py-4 hover:bg-[#F7F0EC]/60 transition items-center group"
                >
                  {/* ID */}
                  <span className="font-mono text-xs font-bold text-burgundy/40">#{SHORT(order._id)}</span>

                  {/* Time */}
                  <span className="text-sm text-burgundy/60">{TIME(order.createdAt)}</span>

                  {/* Items */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-burgundy truncate">
                      {order.items?.map(i => i.name).join('، ')}
                    </p>
                    <p className="text-xs text-burgundy/40 truncate mt-0.5">
                      {order.items?.map(i => `${i.size || ''}${i.size && i.color ? '/' : ''}${i.color || ''} ×${i.quantity}`).join(' · ')}
                    </p>
                  </div>

                  {/* Payment */}
                  <span className="text-xs font-semibold">
                    {order.paymentMethod === 'Cash' ? '💵 كاش' : '📱 انستا'}
                  </span>

                  {/* Status */}
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold w-fit ${isRet ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isRet ? 'مرتجع' : 'مكتمل'}
                  </span>

                  {/* Amount */}
                  <span className={`font-bold text-sm text-left ${isRet ? 'text-red-500 line-through' : 'text-burgundy'}`}>
                    {EGP(order.totalAmount)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer total */}
          <div className="border-t border-burgundy/10 bg-[#F7F0EC] flex justify-between px-5 py-4">
            <div className="flex gap-4 text-sm text-burgundy/60">
              <span>✅ {completed.length} مكتمل</span>
              {returned.length > 0 && <span>↩️ {returned.length} مرتجع</span>}
            </div>
            <div className="text-right">
              <p className="text-xs text-burgundy/50">صافي اليوم</p>
              <p className="text-lg font-extrabold text-burgundy">{EGP(data.totalRevenue)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && <OrderDetailModal order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default CashierToday;
