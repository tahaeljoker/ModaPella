import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;
const DATE = (d) => new Date(d).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });

// ─── Supplier Form Modal ───────────────────────────────────────────────────────
function SupplierModal({ supplier, onClose, onSave }) {
 const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '', ...supplier });
 const [loading, setLoading] = useState(false);
 const inp = 'w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none transition focus:border-burgundy';

 const handleSubmit = async (e) => {
 e.preventDefault(); setLoading(true);
 try { await onSave(form); onClose(); }
 catch (err) { alert(err.response?.data?.message || 'فشل الحفظ'); }
 finally { setLoading(false); }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
 <div className="w-full max-w-lg rounded-[2rem] bg-[#F7F0EC] p-7 shadow-2xl" onClick={e => e.stopPropagation()}>
 <h3 className="mb-5 text-xl font-bold text-burgundy">{supplier?._id ? 'تعديل مورد' : 'إضافة مورد جديد'}</h3>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid sm:grid-cols-2 gap-4">
 <div>
 <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">اسم المورد *</label>
 <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} required placeholder="شركة الملابس..." />
 </div>
 <div>
 <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">رقم الهاتف</label>
 <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inp} placeholder="010..." dir="ltr" />
 </div>
 <div>
 <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">العنوان</label>
 <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className={inp} placeholder="القاهرة، مصر..." />
 </div>
 </div>
 <div>
 <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">ملاحظات</label>
 <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={`${inp} min-h-[70px]`} placeholder="أي ملاحظات..." />
 </div>
 <div className="flex gap-3 pt-2">
 <button type="submit" disabled={loading} className="flex-1 rounded-full bg-burgundy py-3 text-sm font-bold text-white transition hover:bg-[#650018] disabled:opacity-60">{loading ? 'جاري الحفظ...' : 'حفظ المورد'}</button>
 <button type="button" onClick={onClose} className="rounded-full border border-burgundy/20 px-6 py-3 text-sm font-medium text-burgundy transition hover:bg-burgundy/10">إلغاء</button>
 </div>
 </form>
 </div>
 </div>
 );
}

// ─── Add Transaction Modal ─────────────────────────────────────────────────────
function AddTransactionModal({ supplierId, onClose, onSave }) {
 const [form, setForm] = useState({ type: 'purchase', amount: '', description: '', reference: '', date: new Date().toISOString().split('T')[0], paymentSource: 'PersonalPocket' });
 const [loading, setLoading] = useState(false);
 const inp = 'w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none transition focus:border-burgundy';

 const handleSubmit = async (e) => {
 e.preventDefault(); setLoading(true);
 try {
 await api.post(`/suppliers/${supplierId}/transactions`, form);
 onSave(); onClose();
 } catch (err) {
 if (err.response?.status === 409 && err.response?.data?.isDuplicateWarning) {
 if (window.confirm(err.response.data.message)) {
 try {
 await api.post(`/suppliers/${supplierId}/transactions`, { ...form, forceDuplicate: true });
 onSave(); onClose();
 return;
 } catch (retryErr) { alert(retryErr.response?.data?.message || 'فشل الإضافة'); }
 }
 } else {
 alert(err.response?.data?.message || 'فشل الإضافة');
 }
 }
 finally { setLoading(false); }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
 <div className="w-full max-w-md rounded-[2rem] bg-[#F7F0EC] p-7 shadow-2xl" onClick={e => e.stopPropagation()}>
 <h3 className="mb-5 text-xl font-bold text-burgundy">تسجيل تعامل</h3>
 <form onSubmit={handleSubmit} className="space-y-4">
 {/* Type selector */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
 {[
 { id: 'purchase', label: 'مشتريات آجل', hint: 'يزيد الدين', cls: 'border-red-400 bg-red-50', textCls: 'text-red-500' },
 { id: 'payment', label: 'سداد دفعة', hint: 'يقلل الدين', cls: 'border-emerald-400 bg-emerald-50', textCls: 'text-emerald-600' },
 { id: 'cash_purchase', label: 'شراء نقدي', hint: 'كاش فوري', cls: 'border-blue-400 bg-blue-50', textCls: 'text-blue-600' },
 { id: 'return', label: 'مرتجع بضاعة', hint: 'يقلل الدين/تالف', cls: 'border-amber-400 bg-amber-50', textCls: 'text-amber-600' }
 ].map(t => (
 <button key={t.id} type="button" onClick={() => setForm(p => ({ ...p, type: t.id }))}
 className={`rounded-2xl border-2 p-2 text-right transition ${form.type === t.id ? t.cls : 'border-burgundy/15 bg-white hover:border-burgundy/30'}`}>
 <p className="font-bold text-[10px] text-burgundy">{t.label}</p>
 <p className={`text-[8px] mt-0.5 ${t.textCls}`}>{t.hint}</p>
 </button>
 ))}
 </div>

 {/* Payment Source Selector */}
 <div>
 <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">مصدر التمويل / الدفع</label>
 <div className="grid grid-cols-2 gap-3">
 {[
 { id: 'PersonalPocket', label: ' جيب شخصي / آجل', hint: 'لا يؤثر على الخزينة' },
 { id: 'StoreSafe', label: ' درج كاش المحل', hint: 'يخصم من الخزينة' }
 ].map(s => (
 <button key={s.id} type="button" onClick={() => setForm(p => ({ ...p, paymentSource: s.id }))}
 className={`rounded-2xl border-2 p-3 text-right transition ${form.paymentSource === s.id ? 'border-burgundy bg-burgundy/5' : 'border-burgundy/15 bg-white hover:border-burgundy/30'}`}>
 <p className="font-bold text-xs text-burgundy">{s.label}</p>
 <p className="text-[10px] text-burgundy/50 mt-0.5">{s.hint}</p>
 </button>
 ))}
 </div>
 </div>

 <div>
 <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">المبلغ (ج.م) *</label>
 <input type="number" min="1" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className={inp} required placeholder="0.00" />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">التاريخ</label>
 <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inp} />
 </div>
 <div>
 <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">رقم الفاتورة/الوصل</label>
 <input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} className={inp} placeholder="INV-001" dir="ltr" />
 </div>
 </div>
 <div>
 <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">الوصف / التفاصيل</label>
 <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inp} placeholder="مثال: شحنة ملابس صيف 2026" />
 </div>
 <div className="flex gap-3 pt-2">
 <button type="submit" disabled={loading} className="flex-1 rounded-full bg-burgundy py-3 text-sm font-bold text-white transition hover:bg-[#650018] disabled:opacity-60">{loading ? 'جاري الحفظ...' : 'حفظ التعامل'}</button>
 <button type="button" onClick={onClose} className="rounded-full border border-burgundy/20 px-6 py-3 text-sm font-medium text-burgundy transition hover:bg-burgundy/10">إلغاء</button>
 </div>
 </form>
 </div>
 </div>
 );
}

// ─── Supplier Return Modal ─────────────────────────────────────────────────────
const QUICK_RETURN_REASONS = [
  'تالف / عيب مصنعي',
  'مقاس أو موديل غير مطابق',
  'عيوب خياطة وتصنيع',
  'بضاعة راكدة بطلب المورد',
  'أخرى'
];

function SupplierReturnModal({ supplierId, supplierName, onClose, onSave }) {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [items, setItems] = useState([]);
  const [selectedProdId, setSelectedProdId] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [reason, setReason] = useState('تالف / عيب مصنعي');
  const [refundMethod, setRefundMethod] = useState('DeductFromBalance');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/suppliers/${supplierId}/products`)
      .then(res => {
        setProducts(res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoadingProducts(false));
  }, [supplierId]);

  const selectedProduct = products.find(p => p._id === selectedProdId);

  const currentAvailableStock = useMemo(() => {
    if (!selectedProduct) return 0;
    if (selectedProduct.variants && selectedProduct.variants.length > 0) {
      const v = selectedProduct.variants.find(it => (it.size || '') === selectedSize && (it.color || '') === selectedColor);
      return v ? (v.stock ?? v.quantity ?? 0) : 0;
    }
    return selectedProduct.stock || 0;
  }, [selectedProduct, selectedSize, selectedColor]);

  const handleProductChange = (prodId) => {
    setSelectedProdId(prodId);
    setError('');
    const prod = products.find(p => p._id === prodId);
    if (prod) {
      setUnitPrice(prod.costPrice || prod.price || 0);
      if (prod.variants && prod.variants.length > 0) {
        setSelectedSize(prod.variants[0].size || '');
        setSelectedColor(prod.variants[0].color || '');
      } else {
        setSelectedSize('');
        setSelectedColor('');
      }
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      setError('الرجاء اختيار المنتج المراد إرجاعه');
      return;
    }
    const numQty = Number(qty);
    if (numQty <= 0) {
      setError('الكمية يجب أن تكون 1 على الأقل');
      return;
    }
    if (currentAvailableStock > 0 && numQty > currentAvailableStock) {
      setError(`الكمية المدخلة (${numQty}) تتجاوز المخزون المتاح بالمحل (${currentAvailableStock} قطعة)`);
      return;
    }
    if (unitPrice < 0) {
      setError('سعر القطعة غير صالح');
      return;
    }

    setItems(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        productId: selectedProduct._id,
        name: selectedProduct.name,
        size: selectedSize,
        color: selectedColor,
        quantity: numQty,
        unitPrice: Number(unitPrice),
        reason: (reason || 'تالف / عيب مصنعي').trim()
      }
    ]);
    setError('');
    setSelectedProdId('');
    setSelectedSize('');
    setSelectedColor('');
    setQty(1);
    setUnitPrice(0);
  };

  const handleRemoveItem = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const totalReturnAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      setError('الرجاء إضافة صنف واحد على الأقل للمرتجع');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post(`/suppliers/${supplierId}/return-products`, {
        refundMethod,
        description: notes || 'مرتجع بضاعة للمورد',
        items: items.map(it => ({
          productId: it.productId,
          name: it.name,
          size: it.size,
          color: it.color,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          reason: it.reason
        }))
      });
      onSave();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'حدث خطأ أثناء تسجيل المرتجع');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">مرتجع بضاعة إلى المورد</h3>
            <p className="text-xs text-amber-100">{supplierName || 'حساب المورد'}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/20 hover:bg-white/30 p-2 text-white transition text-xs">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          <div className="bg-[#F7F0EC] p-3.5 rounded-2xl border border-burgundy/10">
            <label className="block text-xs font-bold text-burgundy mb-2">طريقة تسوية قيمة المرتجع:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRefundMethod('DeductFromBalance')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${refundMethod === 'DeductFromBalance' ? 'bg-burgundy text-white border-burgundy shadow-sm' : 'bg-white text-burgundy/70 border-burgundy/20 hover:bg-burgundy/5'}`}
              >
                خصم من رصيد المورد (دائن)
              </button>
              <button
                type="button"
                onClick={() => setRefundMethod('CashToSafe')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${refundMethod === 'CashToSafe' ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm' : 'bg-white text-emerald-800/70 border-emerald-600/20 hover:bg-emerald-50'}`}
              >
                استرداد كاش لخزنة المحل
              </button>
            </div>
            <p className="text-[10px] text-burgundy/50 mt-2">
              {refundMethod === 'DeductFromBalance'
                ? '• سيتم إنقاص رصيد المورد (تقليل الدين المستحق له) وسحب القطع من المخزن فوراً.'
                : '• سيتم توريد المبلغ كاش لخزينة المحل، وتقييد المرتجع وسحب القطع من المخزن.'}
            </p>
          </div>

          <div className="border border-burgundy/15 rounded-2xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-burgundy">إضافة صنف مرتجع للمورد</h4>
              {selectedProduct && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${currentAvailableStock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                  المتاح بالمخزن: {currentAvailableStock} قطعة
                </span>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-burgundy/60 mb-1">اختر المنتج:</label>
              <select
                value={selectedProdId}
                onChange={e => handleProductChange(e.target.value)}
                className="w-full rounded-xl border border-burgundy/25 bg-white p-2.5 text-xs text-burgundy outline-none focus:border-burgundy"
                disabled={loadingProducts}
              >
                <option value="">{loadingProducts ? 'جاري تحميل منتجات المورد...' : '-- اختر منتج مسجل للمورد --'}</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.sku ? `(${p.sku})` : ''} - مخزون: {p.stock || 0} قطعة
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-bold text-burgundy/60 mb-1">المقاس / اللون</label>
                      <select
                        value={`${selectedSize}|${selectedColor}`}
                        onChange={e => {
                          const [s, c] = e.target.value.split('|');
                          setSelectedSize(s);
                          setSelectedColor(c);
                        }}
                        className="w-full rounded-xl border border-burgundy/25 bg-white p-2 text-xs text-burgundy outline-none"
                      >
                        {selectedProduct.variants.map((v, i) => (
                          <option key={i} value={`${v.size || ''}|${v.color || ''}`}>
                            {v.size || 'بدون مقاس'} {v.color ? `(${v.color})` : ''} - متوفر: {v.stock ?? v.quantity ?? 0}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={selectedProduct.variants && selectedProduct.variants.length > 0 ? '' : 'col-span-2'}>
                    <label className="block text-[10px] font-bold text-burgundy/60 mb-1">سبب المرتجع</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="تالف / عيب مصنعي"
                      className="w-full rounded-xl border border-burgundy/25 bg-white p-2 text-xs text-burgundy outline-none"
                    />
                  </div>
                </div>

                {/* Quick reason chips */}
                <div>
                  <p className="text-[10px] font-semibold text-burgundy/50 mb-1">أسباب شائعة سريعة:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_RETURN_REASONS.map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReason(r)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition font-medium ${reason === r ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-burgundy/60 mb-1">الكمية المرتجعة</label>
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full rounded-xl border border-burgundy/25 bg-white p-2 text-xs text-burgundy outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-burgundy/60 mb-1">سعر التكلفة للقطعة (ج.م)</label>
                    <input
                      type="number"
                      min="0"
                      value={unitPrice}
                      onChange={e => setUnitPrice(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-burgundy/25 bg-white p-2 text-xs text-burgundy outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  ＋ إضافة هذا المنتج إلى قائمة المرتجع
                </button>
              </>
            )}
          </div>

          {items.length > 0 ? (
            <div className="border border-burgundy/10 rounded-2xl overflow-hidden bg-white">
              <table className="w-full text-xs text-right text-burgundy">
                <thead className="bg-[#F7F0EC] font-bold">
                  <tr>
                    <th className="p-2.5">المنتج</th>
                    <th className="p-2.5 text-center">الكمية</th>
                    <th className="p-2.5 text-center">سعر القطعة</th>
                    <th className="p-2.5 text-center">الإجمالي</th>
                    <th className="p-2.5 text-center w-8">×</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-burgundy/5">
                  {items.map(it => (
                    <tr key={it.id}>
                      <td className="p-2.5">
                        <p className="font-semibold">{it.name}</p>
                        <p className="text-[10px] text-burgundy/50">{[it.size, it.color].filter(Boolean).join(' • ')}</p>
                        <p className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">سبب: {it.reason}</p>
                      </td>
                      <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                      <td className="p-2.5 text-center">{it.unitPrice.toLocaleString('en-US')} ج.م</td>
                      <td className="p-2.5 text-center font-bold text-amber-800">{(it.quantity * it.unitPrice).toLocaleString('en-US')} ج.م</td>
                      <td className="p-2.5 text-center">
                        <button type="button" onClick={() => handleRemoveItem(it.id)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-3 bg-amber-50 border-t border-amber-200 flex justify-between items-center text-xs font-bold text-amber-900">
                <span>إجمالي قيمة المرتجع ({items.reduce((s, i) => s + i.quantity, 0)} قطعة):</span>
                <span className="text-base font-extrabold text-amber-800">{totalReturnAmount.toLocaleString('en-US')} ج.م</span>
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-burgundy/40 py-2">لم تقم بإضافة أي أصناف للمرتجع بعد</p>
          )}

          <div>
            <label className="block text-[11px] font-bold text-burgundy/60 mb-1">ملاحظات إضافية:</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: مرتجع شحنة ملابس معيبة لشهر سبتمبر..."
              className="w-full rounded-xl border border-burgundy/25 bg-white p-2.5 text-xs text-burgundy outline-none focus:border-burgundy"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="flex-1 rounded-full bg-amber-600 hover:bg-amber-700 py-3 text-sm font-bold text-white transition disabled:opacity-60 shadow-md"
            >
              {submitting ? 'جاري تسجيل المرتجع...' : `تأكيد إرجاع البضاعة (${totalReturnAmount.toLocaleString('en-US')} ج.م)`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-burgundy/20 px-6 py-3 text-sm font-medium text-burgundy hover:bg-burgundy/10 transition"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Supplier Detail Modal ─────────────────────────────────────────────────────
const CAT_AR_SUP = { Blazer: 'بليزر', Blouse: 'بلوزة', Chemise: 'شميز', Skirt: 'جيبة', Dress: 'فستان', Pantalon: 'بنطلون', 'T-shirt': 'تيشيرت', Bag: 'شنطة', Cardigan: 'كاردن', Suit: 'سوت', Tonic: 'تونيك', Takem: 'طقم' };
const EGP_S = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;


function EditTransactionModal({ transaction, supplierId, onClose, onSave }) {
  const [form, setForm] = useState({
    amount: transaction.amount || '',
    type: transaction.type || 'purchase',
    paymentSource: transaction.paymentSource || 'PersonalPocket',
    reference: transaction.reference || '',
    description: transaction.description || '',
    date: transaction.date ? new Date(transaction.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return alert('الرجاء إدخال مبلغ صحيح أكبر من صفر');
    setLoading(true);
    try {
      const targetSupId = supplierId || transaction.supplier?._id || transaction.supplier;
      if (targetSupId) {
        await api.put(`/suppliers/${targetSupId}/transactions/${transaction._id}`, form);
      } else {
        await api.put(`/suppliers/transactions/${transaction._id}`, form);
      }
      onSave();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'فشل تعديل الفاتورة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose} dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-burgundy/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <h4 className="font-bold text-burgundy text-base">تعديل فاتورة / حركة مورد</h4>
          </div>
          <button onClick={onClose} className="text-burgundy/40 hover:text-burgundy font-bold text-lg cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-burgundy mb-1">نوع المعاملة</label>
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-xl border border-burgundy/20 px-3 py-2 text-xs font-bold text-burgundy outline-none focus:border-burgundy"
            >
              <option value="purchase">🛒 فاتورة مشتريات بضاعة (مديونية على المحل)</option>
              <option value="payment">💵 سداد دفعة للمورد (سداد كاش)</option>
              <option value="return">↩️ مرتجع بضاعة للمورد (تخفيض الدين)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-burgundy mb-1">المبلغ (ج.م) *</label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              className="w-full rounded-xl border border-burgundy/20 px-3 py-2 text-sm font-bold text-burgundy outline-none focus:border-burgundy"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-burgundy mb-1">جهة الصرف / الدفع</label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-bold transition ${form.paymentSource === 'StoreSafe' ? 'border-burgundy bg-burgundy/5 text-burgundy' : 'border-burgundy/15 text-burgundy/60'}`}>
                <input
                  type="radio"
                  name="editPaymentSource"
                  checked={form.paymentSource === 'StoreSafe'}
                  onChange={() => setForm({ ...form, paymentSource: 'StoreSafe' })}
                  className="accent-burgundy"
                />
                <span>🏦 الخزينة (تعديل الصرف)</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-bold transition ${form.paymentSource === 'PersonalPocket' ? 'border-burgundy bg-burgundy/5 text-burgundy' : 'border-burgundy/15 text-burgundy/60'}`}>
                <input
                  type="radio"
                  name="editPaymentSource"
                  checked={form.paymentSource === 'PersonalPocket'}
                  onChange={() => setForm({ ...form, paymentSource: 'PersonalPocket' })}
                  className="accent-burgundy"
                />
                <span>👤 جيب شخصي / آجل</span>
              </label>
            </div>
            <p className="text-[10px] text-burgundy/50 mt-1">
              {form.paymentSource === 'StoreSafe' ? '💡 سيتم تحديث حركة المصروف في الخزينة فوراً بنفس المبلغ.' : '💡 اختيار (شخصي) لن يخصم أي أموال من درج الخزينة.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-burgundy mb-1">رقم الفاتورة / الوصل</label>
              <input
                type="text"
                value={form.reference}
                onChange={e => setForm({ ...form, reference: e.target.value })}
                placeholder="مثال: INV-102"
                className="w-full rounded-xl border border-burgundy/20 px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-burgundy mb-1">تاريخ الفاتورة</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-xl border border-burgundy/20 px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-burgundy mb-1">بيان وملاحظات الفاتورة</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="وصف البضاعة أو طريقة السداد..."
              className="w-full rounded-xl border border-burgundy/20 px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-burgundy/20 text-burgundy text-xs font-bold hover:bg-burgundy/5 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-burgundy text-white text-xs font-bold hover:bg-[#650018] transition shadow-md cursor-pointer disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SupplierDetailModal({ supplierId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addTx, setAddTx] = useState(false);
  const [addReturn, setAddReturn] = useState(false);
  const [deleteTxId, setDeleteTxId] = useState(null);
  const [editingTx, setEditingTx] = useState(null);
  const [cleaningDupes, setCleaningDupes] = useState(false);
  const [activeTab, setActiveTab] = useState('account'); // 'account' | 'returns' | 'products' | 'po'
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [poItems, setPoItems] = useState([]);
  const [poForm, setPoForm] = useState({ name: '', size: '', qty: 1 });

  const load = () => {
    setLoading(true);
    api.get(`/suppliers/${supplierId}/transactions`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadProducts = () => {
    setProductsLoading(true);
    api.get(`/suppliers/${supplierId}/products`)
      .then(r => setProducts(r.data || []))
      .catch(console.error)
      .finally(() => setProductsLoading(false));
  };

  useEffect(() => { load(); loadProducts(); }, [supplierId]);

  const supplierProducts = products;

  const returnTxs = useMemo(() => {
    return (data?.transactions || []).filter(t => t.type === 'return');
  }, [data?.transactions]);

  const totalReturnPieces = useMemo(() => {
    return returnTxs.reduce((sum, tx) => {
      if (Array.isArray(tx.items) && tx.items.length > 0) {
        return sum + tx.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      }
      return sum;
    }, 0);
  }, [returnTxs]);

  const totalReturnMoney = useMemo(() => {
    return returnTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [returnTxs]);

  
  const handleCleanDuplicates = async () => {
    if (!window.confirm('هل تريد فحص وتنظيف أي فواتير مسجلة مرتين بالخطأ لنفس المورد؟ سيتم حذف المكرر وتعديل الخزينة فوراً.')) return;
    setCleaningDupes(true);
    try {
      const res = await api.post(`/suppliers/${supplierId}/clean-duplicates`);
      alert(res.data.message || 'تم تنظيف التكرار بنجاح');
      load();
      loadProducts();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'فشل تنظيف الفواتير المكررة');
    } finally {
      setCleaningDupes(false);
    }
  };

  const handleDeleteTx = async () => {
    await api.delete(`/suppliers/${supplierId}/transactions/${deleteTxId}`);
    setDeleteTxId(null);
    load();
    loadProducts();
  };

  const handleAddPoItem = () => {
    if (!poForm.name.trim() || poForm.qty <= 0) return;
    setPoItems([...poItems, { ...poForm, id: Date.now() }]);
    setPoForm({ name: '', size: '', qty: 1 });
  };

  const handleRemovePoItem = (id) => {
    setPoItems(poItems.filter(item => item.id !== id));
  };

  const handlePrintPO = () => {
    if (poItems.length === 0) return alert('الرجاء إضافة أصناف أولاً');
    const printDiv = document.createElement('div');
    printDiv.id = 'po-print-root';
    const itemsHTML = poItems.map((item, idx) => `
      <tr style="border-bottom:1px solid #ddd">
        <td style="padding:10px;text-align:center">${idx + 1}</td>
        <td style="padding:10px">${item.name}</td>
        <td style="padding:10px;text-align:center">${item.size || '—'}</td>
        <td style="padding:10px;text-align:center;font-weight:bold">${item.qty} قطعة</td>
      </tr>
    `).join('');

    printDiv.innerHTML = `
      <div style="direction:rtl;text-align:right;font-family:Cairo,sans-serif;padding:40px;color:#000;line-height:1.5">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #7C0A12;padding-bottom:20px;margin-bottom:30px">
          <div>
            <h1 style="color:#7C0A12;margin:0;font-size:28px">أمر توريد بضاعة</h1>
            <p style="margin:5px 0 0;font-size:14px;color:#666">تاريخ الطلب: ${new Date().toLocaleDateString('ar-EG-u-nu-latn')}</p>
          </div>
          <div style="text-align:left">
            <h2 style="margin:0;font-size:22px;color:#333">ModaPella</h2>
            <p style="margin:5px 0 0;font-size:12px;color:#666">إدارة المشتريات والمخازن</p>
          </div>
        </div>

        <div style="background:#f9f9f9;padding:15px;border-radius:8px;margin-bottom:30px;font-size:14px">
          <p style="margin:4px 0"><strong>إلى المورد الكريم:</strong> ${data?.supplier?.name}</p>
          ${data?.supplier?.phone ? `<p style="margin:4px 0"><strong>الهاتف:</strong> ${data.supplier.phone}</p>` : ''}
          ${data?.supplier?.address ? `<p style="margin:4px 0"><strong>العنوان:</strong> ${data.supplier.address}</p>` : ''}
        </div>

        <p style="font-size:15px;margin-bottom:15px">يرجى توفير وتوريد البضائع المدرجة أدناه بأقرب وقت ممكن بالكميات الموضحة:</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:40px;font-size:14px">
          <thead>
            <tr style="background:#7C0A12;color:#fff">
              <th style="padding:10px;border:1px solid #7C0A12;width:60px">#</th>
              <th style="padding:10px;border:1px solid #7C0A12;text-align:right">المنتج / الصنف</th>
              <th style="padding:10px;border:1px solid #7C0A12;width:100px">المقاس</th>
              <th style="padding:10px;border:1px solid #7C0A12;width:120px">الكمية المطلوبة</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div style="display:flex;justify-content:space-between;margin-top:60px;font-size:14px">
          <div>
            <p>توقيع مسؤول المشتريات:</p>
            <p style="margin-top:30px">___________________</p>
          </div>
          <div style="text-align:left">
            <p>توقيع المورد:</p>
            <p style="margin-top:30px">___________________</p>
          </div>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #po-print-root, #po-print-root * { visibility: visible; }
        #po-print-root { position: absolute; left: 0; top: 0; width: 100%; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
    document.head.removeChild(style);
  };

  const printPaymentReceipt = (tx, supplier) => {
    const printDiv = document.createElement('div');
    printDiv.id = 'receipt-print-root';
    printDiv.innerHTML = `
      <div style="direction:rtl;text-align:right;font-family:Cairo,sans-serif;padding:32px;border:2px solid #7C0A1220;border-radius:24px;max-width:420px;margin:40px auto;background:#fff;box-shadow:0 10px 15px -3px rgba(0,0,0,0.05)">
        <h1 style="color:#7C0A12;text-align:center;margin:0;font-size:26px;font-weight:bold">ModaPella</h1>
        <p style="text-align:center;color:#888;font-size:12px;margin:4px 0 24px;letter-spacing:1px">إيصال سداد دفعة مورد</p>
        
        <div style="border-bottom:1px dashed #e0c9c9;padding-bottom:16px;margin-bottom:16px;font-size:13px;line-height:2">
          <p style="margin:4px 0"><strong>اسم المورد:</strong> ${supplier.name}</p>
          ${supplier.phone ? `<p style="margin:4px 0"><strong>الهاتف:</strong> ${supplier.phone}</p>` : ''}
          <p style="margin:4px 0"><strong>تاريخ السداد:</strong> ${new Date(tx.date || tx.createdAt).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          ${tx.reference ? `<p style="margin:4px 0"><strong>رقم المرجع/الفاتورة:</strong> ${tx.reference}</p>` : ''}
        </div>
        
        <div style="text-align:center;background:#f7f0ec;padding:20px;border-radius:16px;margin-bottom:20px;border:1px solid #7C0A1208">
          <p style="margin:0;font-size:14px;color:#7C0A12;font-weight:bold">المبلغ المسدد</p>
          <p style="margin:8px 0 0;font-size:28px;font-weight:extrabold;color:#10b981">${Number(tx.amount).toLocaleString('en-US')} ج.م</p>
        </div>
        
        ${tx.description ? `<p style="font-size:13px;color:#555;margin:8px 0;background:#fafafa;padding:10px 12px;border-radius:8px"><strong>ملاحظات:</strong> ${tx.description}</p>` : ''}
        
        <div style="border-top:1px dashed #e0c9c9;padding-top:16px;margin-top:24px;text-align:center;font-size:11px;color:#b58f96;font-weight:500">
          شكراً لكم | تم السداد والتوثيق عبر ModaPella
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #receipt-print-root, #receipt-print-root * { visibility: visible; }
        #receipt-print-root { position: absolute; left: 0; top: 0; width: 100%; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
    document.head.removeChild(style);
  };

  const printReturnReceipt = (tx, supplier) => {
    const printDiv = document.createElement('div');
    printDiv.id = 'return-receipt-print-root';
    
    const itemsRows = (tx.items || []).map((it, idx) => `
      <tr style="border-bottom:1px solid #eee">
        <td style="padding:10px;text-align:center">${idx + 1}</td>
        <td style="padding:10px"><strong>${it.name || 'صنف'}</strong></td>
        <td style="padding:10px;text-align:center">${[it.size, it.color].filter(Boolean).join(' • ') || '—'}</td>
        <td style="padding:10px;text-align:center;font-weight:bold;color:#b45309">${it.quantity}</td>
        <td style="padding:10px;text-align:center">${Number(it.unitPrice || 0).toLocaleString('en-US')} ج.م</td>
        <td style="padding:10px;text-align:center;font-weight:bold">${Number((it.quantity || 0) * (it.unitPrice || 0)).toLocaleString('en-US')} ج.م</td>
        <td style="padding:10px;text-align:center;background:#fffbeb;color:#92400e;font-size:12px;font-weight:bold">${it.reason || 'تالف / عيب مصنعي'}</td>
      </tr>
    `).join('');

    const totalQty = (tx.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);

    printDiv.innerHTML = `
      <div style="direction:rtl;text-align:right;font-family:Cairo,sans-serif;padding:36px;border:2px solid #b4530930;border-radius:24px;max-width:700px;margin:30px auto;background:#fff;box-shadow:0 10px 15px -3px rgba(0,0,0,0.05)">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #b45309;padding-bottom:14px;margin-bottom:20px">
          <div>
            <h1 style="color:#7C0A12;margin:0;font-size:26px;font-weight:bold">ModaPella</h1>
            <p style="color:#b45309;font-size:13px;margin:3px 0 0;font-weight:bold">إشعار مرتجع بضاعة إلى المورد</p>
          </div>
          <div style="text-align:left;font-size:12px;color:#555">
            <p style="margin:2px 0"><strong>التاريخ:</strong> ${new Date(tx.date || tx.createdAt).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            ${tx.reference ? `<p style="margin:2px 0"><strong>رقم المرجع:</strong> ${tx.reference}</p>` : ''}
          </div>
        </div>

        <div style="background:#fef3c7;padding:12px 16px;border-radius:12px;margin-bottom:20px;font-size:13px;line-height:1.8;border:1px solid #fde68a">
          <p style="margin:2px 0"><strong>السيد المورد المحترم:</strong> ${supplier?.name || ''}</p>
          ${supplier?.phone ? `<p style="margin:2px 0"><strong>الهاتف:</strong> ${supplier.phone}</p>` : ''}
          <p style="margin:2px 0"><strong>طريقة التسوية:</strong> ${tx.paymentSource === 'StoreSafe' ? 'استرداد نقدي كاش لخزينة المحل' : 'خصم من رصيد المورد (تخفيض المديونية المستحقة)'}</p>
          ${tx.description ? `<p style="margin:2px 0"><strong>البيان / الملاحظات:</strong> ${tx.description}</p>` : ''}
        </div>

        ${tx.items && tx.items.length > 0 ? `
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px">
            <thead>
              <tr style="background:#b45309;color:#fff">
                <th style="padding:10px;border:1px solid #b45309;width:35px">#</th>
                <th style="padding:10px;border:1px solid #b45309;text-align:right">اسم الصنف</th>
                <th style="padding:10px;border:1px solid #b45309;width:90px">المقاس / اللون</th>
                <th style="padding:10px;border:1px solid #b45309;width:60px">الكمية</th>
                <th style="padding:10px;border:1px solid #b45309;width:80px">سعر القطعة</th>
                <th style="padding:10px;border:1px solid #b45309;width:90px">الإجمالي</th>
                <th style="padding:10px;border:1px solid #b45309;width:120px">سبب الإرجاع</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
        ` : ''}

        <div style="background:#f7f0ec;padding:16px 20px;border-radius:14px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center">
          <div>
            ${totalQty > 0 ? `<p style="margin:0;font-size:13px;color:#7C0A12">إجمالي عدد القطع المرتجعة: <strong>${totalQty} قطعة</strong></p>` : ''}
          </div>
          <div style="text-align:left">
            <span style="font-size:13px;color:#7C0A12;margin-left:8px">إجمالي قيمة المرتجع:</span>
            <span style="font-size:22px;font-weight:extrabold;color:#b45309">${Number(tx.amount).toLocaleString('en-US')} ج.م</span>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:13px">
          <div>
            <p>توقيع إدارة المحل:</p>
            <p style="margin-top:25px">___________________</p>
          </div>
          <div style="text-align:left">
            <p>توقيع المستلم (المورد / المندوب):</p>
            <p style="margin-top:25px">___________________</p>
          </div>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #return-receipt-print-root, #return-receipt-print-root * { visibility: visible; }
        #return-receipt-print-root { position: absolute; left: 0; top: 0; width: 100%; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
    document.head.removeChild(style);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-burgundy text-white px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-xs opacity-70 tracking-widest uppercase">حساب مورد</p>
            <h3 className="text-xl font-bold mt-0.5">{data?.supplier?.name || '...'}</h3>
            {data?.supplier?.phone && <p className="text-xs opacity-60 mt-0.5">{data.supplier.phone}</p>}
          </div>
          <div className="flex gap-2">
            {(activeTab === 'account' || activeTab === 'returns') && (
              <>
                <button
                  onClick={() => setAddReturn(true)}
                  className="rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <span>↩</span>
                  <span>مرتجع للمورد</span>
                </button>
                <button onClick={() => setAddTx(true)} className="rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-xs font-bold transition">
                  + تعامل جديد
                </button>
              </>
            )}
            {activeTab === 'po' && (
              <button
                onClick={handlePrintPO}
                disabled={poItems.length === 0}
                className="rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-xs font-bold transition disabled:opacity-50"
              >
                طباعة أمر التوريد
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-burgundy/10 bg-[#F7F0EC]">
          {[
            { id: 'account', label: ' كشف الحساب' },
            { id: 'returns', label: ` سجل المرتجعات${returnTxs.length > 0 ? ` (${returnTxs.length})` : ''}` },
            { id: 'products', label: ` المنتجات${supplierProducts.length > 0 ? ` (${supplierProducts.length})` : ''}` },
            { id: 'po', label: ' أمر توريد' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-xs font-bold transition border-b-2 ${activeTab === tab.id ? 'border-burgundy text-burgundy bg-white/50' : 'border-transparent text-burgundy/40 hover:text-burgundy/70'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Balance summary — only visible on account tab */}
        {!loading && data && activeTab === 'account' && (
          <div className="grid grid-cols-4 border-b border-burgundy/10 bg-white">
            {[
              { label: 'إجمالي المشتريات', value: EGP_S(data.totalPurchased), cls: 'text-red-600' },
              { label: 'إجمالي المدفوع', value: EGP_S(data.totalPaid), cls: 'text-emerald-700' },
              { label: 'إجمالي المرتجعات', value: EGP_S(data.totalReturned || 0), cls: 'text-amber-700' },
              { label: 'الرصيد المتبقي (الدين)', value: EGP_S(data.balance), cls: data.balance > 0 ? 'text-red-600 font-extrabold' : 'text-emerald-700 font-extrabold' },
            ].map(s => (
              <div key={s.label} className="p-3 text-center border-l border-burgundy/10 last:border-0">
                <p className="text-[11px] text-burgundy/50">{s.label}</p>
                <p className={`text-base font-bold mt-1 ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Account Tab ── */}
          {activeTab === 'account' && (
            <div className="p-5">
              {loading ? (
                <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
              ) : data?.transactions?.length === 0 ? (
                <p className="text-center text-sm text-burgundy/40 py-12">لا توجد تعاملات بعد</p>
              ) : (
                <div className="space-y-2">
                  {data?.transactions?.map(tx => (
                    <div key={tx._id} className={`flex items-center justify-between rounded-2xl px-4 py-3 border ${tx.type === 'purchase' ? 'bg-red-50/70 border-red-100' : tx.type === 'return' ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-100'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tx.type === 'purchase' ? 'bg-red-100 text-red-700' : tx.type === 'return' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                            {tx.type === 'purchase' ? ' مشتريات' : tx.type === 'return' ? ' مرتجع لمورد' : ' دفعة'}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tx.paymentSource === 'StoreSafe' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {tx.paymentSource === 'StoreSafe' ? ' الخزينة' : ' شخصي'}
                          </span>
                          {tx.reference && <span className="font-mono text-xs text-burgundy/50 bg-white px-2 py-0.5 rounded-lg border border-burgundy/10">{tx.reference}</span>}
                          {tx.type === 'payment' && (
                            <button
                              onClick={() => printPaymentReceipt(tx, data.supplier)}
                              className="text-[10px] bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 font-bold px-2 py-0.5 rounded-lg transition"
                              title="طباعة إيصال سداد"
                            >
                              طباعة إيصال
                            </button>
                          )}
                          {tx.type === 'return' && (
                            <button
                              onClick={() => printReturnReceipt(tx, data.supplier)}
                              className="text-[10px] bg-amber-600/15 hover:bg-amber-600/25 text-amber-900 font-bold px-2 py-0.5 rounded-lg transition flex items-center gap-1"
                              title="طباعة إشعار مرتجع"
                            >
                              <span>🖨️</span>
                              <span>طباعة إشعار</span>
                            </button>
                          )}
                        </div>
                        {tx.description && <p className="text-xs text-burgundy/70 mt-1 truncate font-medium">{tx.description}</p>}
                        {tx.items && tx.items.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {tx.items.map((it, idx) => (
                              <span key={idx} className="text-[10px] bg-white border border-amber-300 text-amber-900 px-2 py-0.5 rounded-lg shadow-2xs">
                                <strong>{it.name}</strong> ({it.quantity} قطعة {it.size ? `• ${it.size}` : ''} {it.color ? `• ${it.color}` : ''})
                                {it.reason && <span className="mr-1 text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded">سبب: {it.reason}</span>}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-burgundy/40 mt-1">{new Date(tx.date || tx.createdAt).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="flex items-center gap-2 mr-3">
                        <p className={`font-bold text-sm ${tx.type === 'purchase' ? 'text-red-600' : tx.type === 'return' ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {tx.type === 'purchase' ? '+' : '-'} {EGP_S(tx.amount)}
                        </p>
                        <button onClick={() => setEditingTx(tx)} title="تعديل الفاتورة والمبلغ" className="text-burgundy/40 hover:text-burgundy transition text-sm cursor-pointer p-1">✏️</button>
<button onClick={() => setDeleteTxId(tx._id)} title="حذف التعامل ومصروف الخزينة" className="text-burgundy/30 hover:text-red-500 transition text-sm cursor-pointer p-1">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Returns Tab (سجل مرتجعات المورد) ── */}
          {activeTab === 'returns' && (
            <div className="p-5 space-y-4">
              {/* Return stats cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 text-center">
                  <p className="text-[11px] font-bold text-amber-800/70">إجمالي قيمة المرتجعات</p>
                  <p className="text-lg font-extrabold text-amber-800 mt-0.5">{EGP_S(totalReturnMoney)}</p>
                </div>
                <div className="bg-orange-50/80 border border-orange-200/80 rounded-2xl p-3.5 text-center">
                  <p className="text-[11px] font-bold text-orange-800/70">إجمالي القطع المرتجعة</p>
                  <p className="text-lg font-extrabold text-orange-800 mt-0.5">{totalReturnPieces} قطعة</p>
                </div>
                <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-3.5 text-center">
                  <p className="text-[11px] font-bold text-rose-800/70">عدد أذون الإرجاع</p>
                  <p className="text-lg font-extrabold text-rose-800 mt-0.5">{returnTxs.length} إذن</p>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
                </div>
              ) : returnTxs.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-3xl bg-[#F7F0EC]/60 border border-burgundy/10 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl mx-auto font-bold">↩</div>
                  <h4 className="text-sm font-bold text-burgundy">لا توجد مرتجعات مسجلة لهذا المورد حتى الآن</h4>
                  <p className="text-xs text-burgundy/50 max-w-sm mx-auto leading-relaxed">
                    عند إرجاع بضاعة تالفة أو معيبة أو استرجاع كميات للمورد، ستظهر هنا جميع تفاصيل الإرجاع بالتاريخ والكمية والأسعار وأسباب الإرجاع مع إمكانية طباعة إشعار رسمي.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAddReturn(true)}
                    className="rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 transition shadow-sm"
                  >
                    + تسجيل أول مرتجع لهذا المورد
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {returnTxs.map(tx => (
                    <div key={tx._id} className="rounded-2xl border border-amber-200 bg-white overflow-hidden shadow-xs">
                      {/* Header */}
                      <div className="bg-amber-50/80 border-b border-amber-100 p-3.5 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-amber-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            إذن مرتجع بضاعة
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tx.paymentSource === 'StoreSafe' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {tx.paymentSource === 'StoreSafe' ? 'استرداد كاش لخزنة المحل' : 'خصم من رصيد المورد (تخفيض الدين)'}
                          </span>
                          <span className="text-[11px] text-burgundy/70 font-semibold">
                            {new Date(tx.date || tx.createdAt).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {tx.reference && (
                            <span className="font-mono text-xs bg-white text-burgundy/70 border border-amber-200 px-2 py-0.5 rounded">
                              {tx.reference}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-amber-700">
                            {EGP_S(tx.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => printReturnReceipt(tx, data.supplier)}
                            className="text-xs bg-amber-600 text-white hover:bg-amber-700 px-3 py-1 rounded-xl font-bold transition flex items-center gap-1 shadow-2xs"
                            title="طباعة إشعار مرتجع رسمي للمورد"
                          >
                            <span>🖨️</span>
                            <span>طباعة إشعار</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTxId(tx._id)}
                            className="text-burgundy/30 hover:text-red-600 p-1 transition"
                            title="حذف المرتجع وإعادة القطع للمخزون"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Description banner if present */}
                      {tx.description && (
                        <div className="px-4 py-2 bg-[#F7F0EC]/50 border-b border-burgundy/5 text-xs text-burgundy/70 font-medium">
                          <strong>البيان / الملاحظات:</strong> {tx.description}
                        </div>
                      )}

                      {/* Items Table */}
                      {tx.items && tx.items.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-right text-burgundy">
                            <thead className="bg-[#FAF6F3] font-bold text-burgundy/70 border-b border-burgundy/5">
                              <tr>
                                <th className="p-2.5 text-center w-10">#</th>
                                <th className="p-2.5">اسم الصنف</th>
                                <th className="p-2.5 text-center">المقاس / اللون</th>
                                <th className="p-2.5 text-center">الكمية</th>
                                <th className="p-2.5 text-center">سعر القطعة</th>
                                <th className="p-2.5 text-center">الإجمالي</th>
                                <th className="p-2.5">سبب الإرجاع</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-burgundy/5">
                              {tx.items.map((it, idx) => (
                                <tr key={idx} className="hover:bg-amber-50/30 transition">
                                  <td className="p-2.5 text-center text-burgundy/40">{idx + 1}</td>
                                  <td className="p-2.5">
                                    <div className="flex items-center gap-2">
                                      {it.product?.images?.[0] ? (
                                        <img src={it.product.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover" />
                                      ) : null}
                                      <div>
                                        <p className="font-bold">{it.name}</p>
                                        {it.product?.sku && <p className="text-[10px] font-mono text-burgundy/40">{it.product.sku}</p>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <span className="font-semibold text-burgundy/70">
                                      {[it.size, it.color].filter(Boolean).join(' • ') || '—'}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center font-extrabold text-amber-800">
                                    {it.quantity} قطعة
                                  </td>
                                  <td className="p-2.5 text-center">
                                    {Number(it.unitPrice || 0).toLocaleString('en-US')} ج.م
                                  </td>
                                  <td className="p-2.5 text-center font-bold text-amber-900">
                                    {(Number(it.quantity || 0) * Number(it.unitPrice || 0)).toLocaleString('en-US')} ج.م
                                  </td>
                                  <td className="p-2.5">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      ⚠️ {it.reason || 'تالف / عيب مصنعي'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-3 text-xs text-burgundy/60 bg-white">
                          مرتجع مالي مباشر تم خصمه من الحساب دون تحديد أصناف.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Products Tab ── */}
          {activeTab === 'products' && (
            <div className="p-5">
              {!productsLoading && supplierProducts.length > 0 && (
                <div className="flex items-center justify-between mb-4 text-xs font-bold text-burgundy/80 bg-white shadow-sm p-4 rounded-2xl border border-burgundy/10">
                  <span>إجمالي الموديلات: <span className="text-burgundy text-sm">{supplierProducts.length}</span></span>
                  <span>إجمالي القطع المتوفرة: <span className="text-emerald-700 text-sm">{supplierProducts.reduce((s, p) => s + (p.stock || 0), 0)}</span> قطعة</span>
                </div>
              )}

              {productsLoading ? (
                <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
              ) : supplierProducts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">📦</p>
                  <p className="text-sm font-semibold text-burgundy/40">لا توجد منتجات مسجلة لهذا المورد بعد</p>
                  <p className="text-xs text-burgundy/30 mt-1">عند إضافة منتج واختيار هذا المورد، سيظهر هنا تلقائياً</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {supplierProducts.map(p => {
                    const stockCls = p.stock === 0 ? 'bg-red-100 text-red-600' : p.stock <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
                    return (
                      <div key={p._id} className="flex items-center gap-3 rounded-2xl border border-burgundy/8 bg-[#F7F0EC]/50 px-4 py-3 hover:bg-[#F7F0EC] transition">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="h-12 w-12 flex-shrink-0 rounded-xl object-cover shadow-sm" />
                        ) : (
                          <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-burgundy/8 flex items-center justify-center text-xl">🏷️</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{p.name}</p>
                          <div className="flex flex-wrap gap-1.5 mt-0.5 items-center">
                            {p.sku && <span className="font-mono text-[10px] bg-white border border-burgundy/10 px-1.5 py-0.5 rounded text-burgundy">{p.sku}</span>}
                            <span className="text-[10px] bg-burgundy/8 text-burgundy px-1.5 py-0.5 rounded-full font-medium">{CAT_AR_SUP[p.category] || p.category}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${stockCls}`}>{p.stock} ق</span>
                          <span className="text-xs font-bold text-burgundy">{EGP_S(p.price)}</span>
                          {p.costPrice > 0 && <span className="text-[10px] text-burgundy/40">تكلفة: {EGP_S(p.costPrice)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── PO Tab ── */}
          {activeTab === 'po' && (
            <div className="p-5 space-y-4">
              <h4 className="font-bold text-sm text-burgundy"> صياغة أمر توريد بضاعة</h4>
              <div className="bg-burgundy/3 p-4 rounded-2xl border border-burgundy/5 space-y-3">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-burgundy/60">اسم المنتج / الصنف</label>
                    <input
                      type="text"
                      value={poForm.name}
                      onChange={e => setPoForm({ ...poForm, name: e.target.value })}
                      placeholder="مثال: بلوزة شيفون"
                      className="w-full rounded-xl border border-burgundy/25 bg-white px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-burgundy/60">المقاس</label>
                    <input
                      type="text"
                      value={poForm.size}
                      onChange={e => setPoForm({ ...poForm, size: e.target.value })}
                      placeholder="S, M, L, XL..."
                      className="w-full rounded-xl border border-burgundy/25 bg-white px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-burgundy/60">الكمية المطلوبة</label>
                    <input
                      type="number"
                      min="1"
                      value={poForm.qty}
                      onChange={e => setPoForm({ ...poForm, qty: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-full rounded-xl border border-burgundy/25 bg-white px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddPoItem}
                  className="w-full rounded-xl bg-burgundy/10 hover:bg-burgundy/20 py-2 text-xs font-bold text-burgundy transition"
                >
                  ＋ إضافة صنف لأمر التوريد
                </button>
              </div>

              {poItems.length === 0 ? (
                <p className="text-center text-xs text-burgundy/40 py-8">الرجاء إضافة أصناف لبناء أمر التوريد</p>
              ) : (
                <div className="border border-burgundy/10 rounded-2xl bg-white overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-right text-burgundy">
                    <thead className="bg-[#F7F0EC] font-bold">
                      <tr>
                        <th className="p-3 text-center w-12">#</th>
                        <th className="p-3">اسم الصنف</th>
                        <th className="p-3 text-center">المقاس</th>
                        <th className="p-3 text-center">الكمية</th>
                        <th className="p-3 text-center w-12">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-burgundy/5">
                      {poItems.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="p-3 text-center">{idx + 1}</td>
                          <td className="p-3 font-semibold">{item.name}</td>
                          <td className="p-3 text-center">{item.size || '—'}</td>
                          <td className="p-3 text-center font-bold">{item.qty} قطعة</td>
                          <td className="p-3 text-center">
                            <button type="button" onClick={() => handleRemovePoItem(item.id)} className="text-red-500 hover:underline">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-[#F7F0EC] border-t border-burgundy/10 flex gap-3">
          <button onClick={onClose} className="rounded-xl border border-burgundy/20 px-6 py-2.5 text-sm font-medium text-burgundy hover:bg-burgundy/10 transition">إغلاق</button>
        </div>
      </div>

      {addTx && <AddTransactionModal supplierId={supplierId} onClose={() => setAddTx(false)} onSave={load} />}
      {addReturn && (
        <SupplierReturnModal
          supplierId={supplierId}
          supplierName={data?.supplier?.name}
          onClose={() => setAddReturn(false)}
          onSave={() => {
            load();
            loadProducts();
          }}
        />
      )}
      {editingTx && (
 <EditTransactionModal
 transaction={editingTx}
 supplierId={supplierId}
 onClose={() => setEditingTx(null)}
 onSave={() => { load(); loadProducts(); }}
 />
 )}
 <ConfirmModal isOpen={!!deleteTxId} title="حذف الفاتورة" message="هل أنت متأكد من حذف هذه الفاتورة؟ سيتم أيضاً حذف حركة الصرف المرتبطة بها من الخزينة وتعديل رصيد المورد تلقائياً." onConfirm={handleDeleteTx} onCancel={() => setDeleteTxId(null)} />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

function AdminSuppliers() {
  const navigate = useNavigate();
  const [activeMainTab, setActiveMainTab] = useState('suppliers'); // 'suppliers' | 'all-transactions'
  const [suppliers, setSuppliers] = useState([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  // All transactions state
  const [allTxs, setAllTxs] = useState([]);
  const [allLoading, setAllLoading] = useState(false);
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [txSupplierFilter, setTxSupplierFilter] = useState('all');
  const [deleteTx, setDeleteTx] = useState(null);
  const [editingTx, setEditingTx] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = async () => {
    setLoading(true);
    try { 
      const [rSup, rInv] = await Promise.all([
        api.get('/suppliers'),
        api.get('/cashier/inventory')
      ]);
      setSuppliers(rSup.data);
      const unassigned = rInv.data.filter(p => !p.supplier || p.supplier.trim() === '').length;
      setUnassignedCount(unassigned);
    }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadAllTransactions = async (searchOverride, typeOverride, supplierOverride) => {
    setAllLoading(true);
    try {
      const qSearch = searchOverride !== undefined ? searchOverride : txSearch;
      const qType = typeOverride !== undefined ? typeOverride : txTypeFilter;
      const qSup = supplierOverride !== undefined ? supplierOverride : txSupplierFilter;

      const params = new URLSearchParams();
      if (qSearch && qSearch.trim()) params.append('search', qSearch.trim());
      if (qType && qType !== 'all') params.append('type', qType);
      if (qSup && qSup !== 'all') params.append('supplierId', qSup);

      const res = await api.get(`/suppliers/all-transactions?${params.toString()}`);
      setAllTxs(res.data?.transactions || []);
    } catch (err) {
      console.error('Failed to load all transactions:', err);
    } finally {
      setAllLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (form) => {
    if (form._id) { await api.put(`/suppliers/${form._id}`, form); showToast('تم تحديث المورد بنجاح'); }
    else { await api.post('/suppliers', form); showToast('تم إضافة المورد بنجاح'); }
    await load();
  };

  const handleDelete = async () => {
    await api.delete(`/suppliers/${deleteId}`);
    showToast('تم حذف المورد بنجاح');
    setDeleteId(null);
    await load();
  };

  const handleDeleteTransaction = async () => {
    if (!deleteTx) return;
    try {
      await api.delete(`/suppliers/transactions/${deleteTx._id}`);
      showToast('تم حذف الفاتورة وتحديث الحسابات والمصروفات بالخزينة بنجاح');
      setDeleteTx(null);
      await loadAllTransactions();
      await load();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'تعذر حذف العملية');
    }
  };

  const totalDebt = suppliers.reduce((s, sup) => s + (sup.balance || 0), 0);

  // Filtered transactions metrics
  const totalFilteredPurchased = allTxs.filter(t => t.type === 'purchase').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalFilteredPaid = allTxs.filter(t => t.type === 'payment').reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-xl animate-fade-in flex items-center gap-2">
          <span>✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40 font-semibold">الإدارة والمشتريات</p>
          <h2 className="text-2xl font-bold mt-1">حسابات وفواتير الموردين</h2>
          <p className="text-sm text-burgundy/50 mt-0.5">تتبع الموردين، كشوفات الحسابات، وفحص وتعديل وحذف الفواتير والمعاملات</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModal({})}
            className="rounded-full bg-burgundy px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-burgundy/20 transition hover:bg-[#650018] flex items-center gap-1.5"
          >
            <span>+</span>
            <span>إضافة مورد جديد</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-burgundy/10 gap-3">
        <button
          type="button"
          onClick={() => setActiveMainTab('suppliers')}
          className={`flex items-center gap-2 pb-3.5 px-4 font-bold text-sm transition border-b-2 ${
            activeMainTab === 'suppliers'
              ? 'border-burgundy text-burgundy'
              : 'border-transparent text-burgundy/40 hover:text-burgundy'
          }`}
        >
          <span>🏢</span>
          <span>بطاقات الموردين ({suppliers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMainTab('all-transactions');
            if (allTxs.length === 0) loadAllTransactions();
          }}
          className={`flex items-center gap-2 pb-3.5 px-4 font-bold text-sm transition border-b-2 ${
            activeMainTab === 'all-transactions'
              ? 'border-burgundy text-burgundy'
              : 'border-transparent text-burgundy/40 hover:text-burgundy'
          }`}
        >
          <span>📋</span>
          <span>سجل وبحث جميع الفواتير والمعاملات</span>
          <span className="rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5">
            تعديل وحذف
          </span>
        </button>
      </div>

      {/* ─── TAB 1: SUPPLIERS LIST ─── */}
      {activeMainTab === 'suppliers' && (
        <div className="space-y-6">
          {/* Context Banner */}
          <div className="flex items-center justify-between gap-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 text-amber-800">
              <span className="text-sm font-bold shrink-0">حسابات الموردين:</span>
              <p className="text-xs">هذه الصفحة لإدارة بيانات الموردين وتسجيل المشتريات والسدادات. لكشف الحساب التفصيلي والرصيد التراكمي، اضغط كشف الحساب.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/statements?tab=suppliers')}
              className="shrink-0 text-xs font-bold text-amber-700 border border-amber-300 bg-white hover:bg-amber-50 px-3 py-1.5 rounded-xl transition"
            >
              كشف حساب الموردين
            </button>
          </div>

          {unassignedCount > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 p-4 rounded-2xl">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-amber-800">تنبيه: {unassignedCount} منتج بدون مورد</p>
                <p className="text-xs text-amber-700/70 mt-0.5">يوجد منتجات غير مسجل لها مورد. يمكنك الدخول لشاشة "جرد المخزون" وفلترتها لمعرفتها.</p>
              </div>
            </div>
          )}

          {/* Summary cards */}
          {suppliers.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-[1.75rem] bg-burgundy p-5 text-white shadow-lg shadow-burgundy/15">
                <p className="text-xs opacity-70">إجمالي الديون للموردين</p>
                <p className="text-2xl font-extrabold mt-2">{EGP(totalDebt)}</p>
              </div>
              <div className="rounded-[1.75rem] border border-burgundy/10 bg-white p-5 shadow-sm">
                <p className="text-xs text-burgundy/60">عدد الموردين</p>
                <p className="text-2xl font-extrabold mt-2 text-burgundy">{suppliers.length}</p>
              </div>
              <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-xs text-emerald-700/70">موردين بدون دين</p>
                <p className="text-2xl font-extrabold mt-2 text-emerald-700">{suppliers.filter(s => s.balance <= 0).length}</p>
              </div>
            </div>
          )}

          {/* Suppliers Table */}
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="rounded-[2rem] border border-burgundy/10 bg-white py-20 text-center">
              <p className="text-5xl mb-3">🏢</p>
              <p className="text-lg font-semibold text-burgundy/40">لا يوجد موردون بعد</p>
              <p className="text-sm text-burgundy/30 mt-1">أضف مورديك لتتبع تعاملاتك معهم</p>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
              <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 bg-[#F7F0EC] px-6 py-3 text-xs font-bold uppercase tracking-wide text-burgundy/50 border-b border-burgundy/8">
                <span>المورد</span><span>الهاتف</span><span>إجمالي المشتريات</span><span>إجمالي المدفوع</span><span>الرصيد المتبقي</span><span>الإجراءات</span>
              </div>
              <div className="divide-y divide-burgundy/6">
                {suppliers.map(sup => (
                  <div key={sup._id} className="grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] items-center gap-4 px-6 py-4 transition hover:bg-burgundy/3">
                    <div>
                      <p className="font-semibold text-sm">{sup.name}</p>
                      {sup.address && <p className="text-xs text-burgundy/40 mt-0.5">{sup.address}</p>}
                      <p className="text-xs text-emerald-700 font-bold mt-1">📦 {sup.totalPieces || 0} قطعة / {sup.productCount || 0} منتج</p>
                    </div>
                    <p className="text-sm text-burgundy/60 font-mono">{sup.phone || '—'}</p>
                    <p className="text-sm font-bold text-red-600">{EGP(sup.totalPurchased)}</p>
                    <p className="text-sm font-bold text-emerald-700">{EGP(sup.totalPaid)}</p>
                    <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${sup.balance > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {EGP(sup.balance)}
                    </span>
                    <div className="flex gap-1.5">
                      <button onClick={() => setDetail(sup._id)} className="rounded-xl border border-burgundy/20 px-3 py-1.5 text-xs font-medium text-burgundy transition hover:bg-burgundy hover:text-white">التفاصيل</button>
                      <button onClick={() => setModal(sup)} className="rounded-xl border border-burgundy/20 px-3 py-1.5 text-xs font-medium text-burgundy transition hover:bg-burgundy hover:text-white">تعديل</button>
                      <button onClick={() => setDeleteId(sup._id)} className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500 hover:text-white">حذف</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: ALL TRANSACTIONS (سجل وبحث جميع الفواتير والمعاملات) ─── */}
      {activeMainTab === 'all-transactions' && (
        <div className="space-y-5">
          {/* Information & instructions banner */}
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-2xl shrink-0 mt-0.5">💡</span>
            <div className="space-y-1 text-xs text-amber-900 leading-relaxed">
              <p className="font-bold text-sm">البحث الشامل وإدارة الفواتير وحذف العمليات الخاطئة أو المكررة:</p>
              <p>
                إذا تمت إضافة صنف إلى مورد/مكتب بالخطأ ثم تم تغييره لمورد آخر واحتسب مرتين، أو تم تسجيل فاتورة مكررة، يمكنك البحث هنا باسم المنتج أو المورد أو رقم الفاتورة والضغط على زر <strong>[حذف 🗑️]</strong> لإلغاء الفاتورة الخاطئة فوراً وسيتم تحديث رصيد المورد وحذف أي مصروف مرتبط بها بالخزينة تلقائياً.
              </p>
            </div>
          </div>

          {/* Search & Filters Bar */}
          <div className="bg-white rounded-2xl border border-burgundy/10 p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={txSearch}
                onChange={e => setTxSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') loadAllTransactions(); }}
                placeholder="ابحث باسم المنتج، كود الصنف، رقم الفاتورة/المرجع، أو اسم المورد..."
                className="w-full rounded-xl border border-burgundy/20 bg-[#F7F0EC]/50 pr-10 pl-4 py-2.5 text-xs font-bold text-burgundy outline-none transition focus:border-burgundy focus:bg-white"
              />
              <span className="absolute right-3.5 top-2.5 text-burgundy/40 text-sm">🔍</span>
            </div>

            {/* Transaction Type Filter */}
            <div className="w-full md:w-48 shrink-0">
              <select
                value={txTypeFilter}
                onChange={e => {
                  setTxTypeFilter(e.target.value);
                  loadAllTransactions(txSearch, e.target.value, txSupplierFilter);
                }}
                className="w-full rounded-xl border border-burgundy/20 bg-white px-3 py-2.5 text-xs font-bold text-burgundy outline-none focus:border-burgundy"
              >
                <option value="all">كل أنواع المعاملات</option>
                <option value="purchase">🛒 فواتير مشتريات (مديونية)</option>
                <option value="payment">💵 سدادات ودفعات كاش</option>
                <option value="return">↩️ مرتجعات للمورد</option>
              </select>
            </div>

            {/* Supplier Filter */}
            <div className="w-full md:w-48 shrink-0">
              <select
                value={txSupplierFilter}
                onChange={e => {
                  setTxSupplierFilter(e.target.value);
                  loadAllTransactions(txSearch, txTypeFilter, e.target.value);
                }}
                className="w-full rounded-xl border border-burgundy/20 bg-white px-3 py-2.5 text-xs font-bold text-burgundy outline-none focus:border-burgundy"
              >
                <option value="all">كل الموردين ({suppliers.length})</option>
                {suppliers.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Action Search Button */}
            <button
              type="button"
              onClick={() => loadAllTransactions()}
              className="w-full md:w-auto shrink-0 rounded-xl bg-burgundy px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#650018] transition flex items-center justify-center gap-1.5"
            >
              <span>تحديث وفحص</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-3 border border-burgundy/10 shadow-xs">
              <p className="text-[11px] text-burgundy/60 font-semibold">عدد المعاملات المسجلة</p>
              <p className="text-lg font-extrabold text-burgundy mt-0.5">{allTxs.length} معاملة</p>
            </div>
            <div className="bg-red-50/70 rounded-2xl p-3 border border-red-200/60 shadow-xs">
              <p className="text-[11px] text-red-700/70 font-semibold">إجمالي فواتير الشراء المعروضة</p>
              <p className="text-lg font-extrabold text-red-700 mt-0.5">{EGP(totalFilteredPurchased)}</p>
            </div>
            <div className="bg-emerald-50/70 rounded-2xl p-3 border border-emerald-200/60 shadow-xs col-span-2 sm:col-span-1">
              <p className="text-[11px] text-emerald-700/70 font-semibold">إجمالي المدفوعات المسددة</p>
              <p className="text-lg font-extrabold text-emerald-700 mt-0.5">{EGP(totalFilteredPaid)}</p>
            </div>
          </div>

          {/* Transactions List */}
          {allLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
            </div>
          ) : allTxs.length === 0 ? (
            <div className="rounded-[2rem] border border-burgundy/10 bg-white py-16 text-center space-y-2">
              <p className="text-4xl">📋</p>
              <p className="text-base font-bold text-burgundy/50">لا توجد فواتير أو معاملات مطابقة لمعايير البحث</p>
              <p className="text-xs text-burgundy/30">جرب البحث بكلمات أخرى أو تغيير الفلتر لعرض جميع المعاملات</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {allTxs.map(tx => {
                const supName = tx.supplier?.name || 'مورد غير محدد';
                const isPurchase = tx.type === 'purchase';
                const isReturn = tx.type === 'return';
                const isPayment = tx.type === 'payment';

                return (
                  <div
                    key={tx._id}
                    className={`rounded-2xl p-4 border transition flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs ${
                      isPurchase
                        ? 'bg-red-50/50 border-red-100 hover:border-red-200'
                        : isReturn
                        ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                        : 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-200'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Supplier Badge */}
                        <span className="rounded-lg bg-burgundy/10 text-burgundy font-bold text-xs px-2.5 py-1 border border-burgundy/15 flex items-center gap-1">
                          <span>🏢</span>
                          <span>{supName}</span>
                        </span>

                        {/* Type Badge */}
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                          isPurchase
                            ? 'bg-red-100 text-red-700'
                            : isReturn
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isPurchase ? '🛒 فاتورة مشتريات' : isReturn ? '↩️ مرتجع للمورد' : '💵 سداد دفعة'}
                        </span>

                        {/* Payment Source */}
                        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                          tx.paymentSource === 'StoreSafe'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {tx.paymentSource === 'StoreSafe' ? '🏦 خزينة المحل' : '👤 جيب شخصي'}
                        </span>

                        {/* Invoice Reference */}
                        {tx.reference && (
                          <span className="font-mono text-xs bg-white text-burgundy/70 px-2 py-0.5 rounded-lg border border-burgundy/10">
                            فاتورة #{tx.reference}
                          </span>
                        )}

                        {/* Date */}
                        <span className="text-[11px] text-burgundy/40">
                          {new Date(tx.date || tx.createdAt).toLocaleDateString('ar-EG-u-nu-latn', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      {/* Description */}
                      {tx.description && (
                        <p className="text-xs font-semibold text-burgundy/80 leading-relaxed">
                          {tx.description}
                        </p>
                      )}

                      {/* Linked Items / Products */}
                      {tx.items && tx.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {tx.items.map((it, idx) => (
                            <span key={idx} className="text-[11px] bg-white border border-amber-300 text-amber-900 px-2.5 py-1 rounded-xl shadow-2xs font-medium flex items-center gap-1">
                              <span>👕</span>
                              <strong>{it.name || it.product?.name || 'صنف'}</strong>
                              <span>({it.quantity} قطعة {it.unitPrice ? `× ${it.unitPrice} ج.م` : ''} {it.size ? `• ${it.size}` : ''} {it.color ? `• ${it.color}` : ''})</span>
                              {it.reason && <span className="bg-amber-100 text-amber-800 font-bold px-1 rounded text-[9px]">سبب: {it.reason}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-burgundy/5">
                      <div className="text-left">
                        <span className="block text-[10px] text-burgundy/40 font-semibold">المبلغ</span>
                        <p className={`text-base font-extrabold ${
                          isPurchase ? 'text-red-600' : isReturn ? 'text-amber-700' : 'text-emerald-700'
                        }`}>
                          {isPurchase ? '+' : '-'} {EGP(tx.amount)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingTx(tx)}
                          title="تعديل الفاتورة والمبلغ"
                          className="rounded-xl border border-burgundy/20 bg-white hover:bg-burgundy hover:text-white px-3 py-1.5 text-xs font-bold text-burgundy transition shadow-2xs flex items-center gap-1"
                        >
                          <span>✏️</span>
                          <span>تعديل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTx(tx)}
                          title="حذف الفاتورة وتعديل الخزينة ورصيد المورد"
                          className="rounded-xl border border-red-200 bg-white hover:bg-red-600 hover:text-white px-3 py-1.5 text-xs font-bold text-red-600 transition shadow-2xs flex items-center gap-1"
                        >
                          <span>🗑️</span>
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {modal !== null && (
        <SupplierModal
          supplier={modal?._id ? modal : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {detail && (
        <SupplierDetailModal
          supplierId={detail}
          onClose={() => {
            setDetail(null);
            load();
            if (activeMainTab === 'all-transactions') loadAllTransactions();
          }}
        />
      )}

      {editingTx && (
        <EditTransactionModal
          transaction={editingTx}
          supplierId={editingTx.supplier?._id || editingTx.supplier}
          onClose={() => setEditingTx(null)}
          onSave={() => {
            loadAllTransactions();
            load();
            showToast('تم تعديل الفاتورة بنجاح وتحديث الحسابات');
          }}
        />
      )}

      {/* Delete Supplier Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="حذف المورد"
        message="هل أنت متأكد من حذف هذا المورد وجميع تعاملاته؟"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Delete Transaction Modal */}
      <ConfirmModal
        isOpen={!!deleteTx}
        title="حذف الفاتورة / المعاملة"
        message={`هل أنت متأكد من حذف هذه المعاملة بقيمة ${EGP(deleteTx?.amount || 0)} للمورد (${deleteTx?.supplier?.name || 'مورد'})؟ سيتم خصمها من رصيد المورد وحذف أي مصروف مرتبط بها من الخزينة تلقائياً.`}
        onConfirm={handleDeleteTransaction}
        onCancel={() => setDeleteTx(null)}
      />
    </div>
  );
}

export default AdminSuppliers;
