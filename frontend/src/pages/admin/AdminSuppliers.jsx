import { useEffect, useState } from 'react';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;
const DATE = (d) => new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

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
    } catch (err) { alert(err.response?.data?.message || 'فشل الإضافة'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-[2rem] bg-[#F7F0EC] p-7 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="mb-5 text-xl font-bold text-burgundy">تسجيل تعامل</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'purchase', label: '📦 مشتريات آجل', hint: 'يزيد الدين', cls: 'border-red-400 bg-red-50', textCls: 'text-red-500' },
              { id: 'payment', label: '💸 سداد دفعة', hint: 'يقلل الدين', cls: 'border-emerald-400 bg-emerald-50', textCls: 'text-emerald-600' },
              { id: 'cash_purchase', label: '💵 شراء نقدي فوري', hint: 'شراء كاش فوري', cls: 'border-blue-400 bg-blue-50', textCls: 'text-blue-600' }
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
                { id: 'PersonalPocket', label: '👤 جيب شخصي / آجل', hint: 'لا يؤثر على الخزينة' },
                { id: 'StoreSafe', label: '💵 درج كاش المحل', hint: 'يخصم من الخزينة' }
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

// ─── Supplier Detail Modal ─────────────────────────────────────────────────────
function SupplierDetailModal({ supplierId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addTx, setAddTx] = useState(false);
  const [deleteTxId, setDeleteTxId] = useState(null);
  
  const [isGeneratingPO, setIsGeneratingPO] = useState(false);
  const [poItems, setPoItems] = useState([]);
  const [poForm, setPoForm] = useState({ name: '', size: '', qty: 1 });

  const load = () => {
    setLoading(true);
    api.get(`/suppliers/${supplierId}/transactions`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [supplierId]);

  const handleDeleteTx = async () => {
    await api.delete(`/suppliers/${supplierId}/transactions/${deleteTxId}`);
    setDeleteTxId(null);
    load();
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
            <p style="margin:5px 0 0;font-size:14px;color:#666">تاريخ الطلب: ${new Date().toLocaleDateString('ar-EG')}</p>
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
          <p style="margin:4px 0"><strong>تاريخ السداد:</strong> ${new Date(tx.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          ${tx.reference ? `<p style="margin:4px 0"><strong>رقم المرجع/الفاتورة:</strong> ${tx.reference}</p>` : ''}
        </div>
        
        <div style="text-align:center;background:#f7f0ec;padding:20px;border-radius:16px;margin-bottom:20px;border:1px solid #7C0A1208">
          <p style="margin:0;font-size:14px;color:#7C0A12;font-weight:bold">المبلغ المسدد</p>
          <p style="margin:8px 0 0;font-size:28px;font-weight:extrabold;color:#10b981">${Number(tx.amount).toLocaleString('ar-EG')} ج.م</p>
        </div>
        
        ${tx.description ? `<p style="font-size:13px;color:#555;margin:8px 0;background:#fafafa;padding:10px 12px;border-radius:8px"><strong>ملاحظات:</strong> ${tx.description}</p>` : ''}
        
        <div style="border-top:1px dashed #e0c9c9;padding-top:16px;margin-top:24px;text-align:center;font-size:11px;color:#b58f96;font-weight:500">
          شكراً لكم | تم السداد والتوثيق عبر ModaPella 🎀
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-burgundy text-white px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-xs opacity-70 tracking-widest uppercase">حساب مورد</p>
            <h3 className="text-xl font-bold mt-0.5">{data?.supplier?.name || '...'}</h3>
            {data?.supplier?.phone && <p className="text-xs opacity-60 mt-0.5">{data.supplier.phone}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsGeneratingPO(!isGeneratingPO)}
              className="rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-xs font-bold transition"
            >
              {isGeneratingPO ? '📂 عرض كشف الحساب' : '📝 أمر توريد'}
            </button>
            {!isGeneratingPO && (
              <button onClick={() => setAddTx(true)} className="rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-bold transition">
                + تعامل جديد
              </button>
            )}
          </div>
        </div>

        {/* Balance summary */}
        {!loading && data && !isGeneratingPO && (
          <div className="grid grid-cols-3 border-b border-burgundy/10">
            {[
              { label: 'إجمالي المشتريات', value: EGP(data.totalPurchased), cls: 'text-red-600' },
              { label: 'إجمالي المدفوع', value: EGP(data.totalPaid), cls: 'text-emerald-700' },
              { label: 'الرصيد المتبقي (الدين)', value: EGP(data.balance), cls: data.balance > 0 ? 'text-red-600 font-extrabold' : 'text-emerald-700 font-extrabold' },
            ].map(s => (
              <div key={s.label} className="p-4 text-center border-l border-burgundy/10 last:border-0">
                <p className="text-xs text-burgundy/50">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* PO Generator UI or Transactions UI */}
        {isGeneratingPO ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <h4 className="font-bold text-sm text-burgundy">📦 صياغة أمر توريد بضاعة</h4>
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

            {/* Selected items table */}
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
                          <button
                            type="button"
                            onClick={() => handleRemovePoItem(item.id)}
                            className="text-red-500 hover:underline"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Transactions List */
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
            ) : data?.transactions?.length === 0 ? (
              <p className="text-center text-sm text-burgundy/40 py-12">لا توجد تعاملات بعد</p>
            ) : (
              <div className="space-y-2">
                {data?.transactions?.map(tx => (
                  <div key={tx._id} className={`flex items-center justify-between rounded-2xl px-4 py-3 border ${tx.type === 'purchase' ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tx.type === 'purchase' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {tx.type === 'purchase' ? '📦 مشتريات' : '💸 دفعة'}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tx.paymentSource === 'StoreSafe' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {tx.paymentSource === 'StoreSafe' ? '💵 الخزينة' : '👤 شخصي'}
                        </span>
                        {tx.reference && <span className="font-mono text-xs text-burgundy/50 bg-white px-2 py-0.5 rounded-lg">{tx.reference}</span>}
                        {tx.type === 'payment' && (
                          <button
                            onClick={() => printPaymentReceipt(tx, data.supplier)}
                            className="text-[10px] bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 font-bold px-2 py-0.5 rounded-lg transition"
                            title="طباعة إيصال سداد"
                          >
                            🖨️ طباعة إيصال
                          </button>
                        )}
                      </div>
                      {tx.description && <p className="text-xs text-burgundy/60 mt-1 truncate">{tx.description}</p>}
                      <p className="text-[10px] text-burgundy/40 mt-0.5">{DATE(tx.date)}</p>
                    </div>
                    <div className="flex items-center gap-2 mr-3">
                      <p className={`font-bold text-sm ${tx.type === 'purchase' ? 'text-red-600' : 'text-emerald-700'}`}>
                        {tx.type === 'purchase' ? '+' : '-'} {EGP(tx.amount)}
                      </p>
                      <button onClick={() => setDeleteTxId(tx._id)} className="text-burgundy/20 hover:text-red-500 transition text-sm">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-4 bg-[#F7F0EC] border-t border-burgundy/10 flex gap-3">
          {isGeneratingPO && (
            <button
              onClick={handlePrintPO}
              disabled={poItems.length === 0}
              className="flex-1 rounded-xl bg-burgundy text-white py-2.5 text-sm font-bold transition hover:bg-[#650018] disabled:opacity-50"
            >
              🖨️ طباعة أمر التوريد (PDF)
            </button>
          )}
          <button onClick={onClose} className="rounded-xl border border-burgundy/20 px-6 py-2.5 text-sm font-medium text-burgundy hover:bg-burgundy/10 transition">إغلاق</button>
        </div>
      </div>

      {addTx && <AddTransactionModal supplierId={supplierId} onClose={() => setAddTx(false)} onSave={load} />}
      <ConfirmModal isOpen={!!deleteTxId} title="حذف التعامل" message="هل أنت متأكد من حذف هذا التعامل؟" onConfirm={handleDeleteTx} onCancel={() => setDeleteTxId(null)} />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/suppliers'); setSuppliers(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (form._id) { await api.put(`/suppliers/${form._id}`, form); showToast('✅ تم تحديث المورد'); }
    else { await api.post('/suppliers', form); showToast('✅ تم إضافة المورد'); }
    await load();
  };

  const handleDelete = async () => {
    await api.delete(`/suppliers/${deleteId}`);
    showToast('✅ تم الحذف'); setDeleteId(null); await load();
  };

  const totalDebt = suppliers.reduce((s, sup) => s + (sup.balance || 0), 0);

  return (
    <div className="space-y-6 text-burgundy">
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">الإدارة</p>
          <h2 className="text-2xl font-bold">🏭 حسابات الموردين</h2>
          <p className="text-sm text-burgundy/50 mt-0.5">تتبع تعاملاتك مع الموردين والرصيد المستحق</p>
        </div>
        <button onClick={() => setModal({})} className="rounded-full bg-burgundy px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-burgundy/20 transition hover:bg-[#650018]">
          + إضافة مورد
        </button>
      </div>

      {/* Summary card */}
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
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
      ) : suppliers.length === 0 ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white py-20 text-center">
          <p className="text-5xl mb-3">🏭</p>
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
                  {sup.address && <p className="text-xs text-burgundy/40 mt-0.5">📍 {sup.address}</p>}
                </div>
                <p className="text-sm text-burgundy/60 font-mono">{sup.phone || '—'}</p>
                <p className="text-sm font-bold text-red-600">{EGP(sup.totalPurchased)}</p>
                <p className="text-sm font-bold text-emerald-700">{EGP(sup.totalPaid)}</p>
                <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${sup.balance > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {sup.balance > 0 ? '🔴 ' : '✅ '}{EGP(sup.balance)}
                </span>
                <div className="flex gap-1.5">
                  <button onClick={() => setDetail(sup._id)} className="rounded-xl border border-burgundy/20 px-3 py-1.5 text-xs font-medium text-burgundy transition hover:bg-burgundy hover:text-white">📋 التفاصيل</button>
                  <button onClick={() => setModal(sup)} className="rounded-xl border border-burgundy/20 px-3 py-1.5 text-xs font-medium text-burgundy transition hover:bg-burgundy hover:text-white">تعديل</button>
                  <button onClick={() => setDeleteId(sup._id)} className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500 hover:text-white">حذف</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal !== null && <SupplierModal supplier={modal?._id ? modal : null} onClose={() => setModal(null)} onSave={handleSave} />}
      {detail && <SupplierDetailModal supplierId={detail} onClose={() => { setDetail(null); load(); }} />}
      <ConfirmModal isOpen={!!deleteId} title="حذف المورد" message="هل أنت متأكد من حذف هذا المورد وجميع تعاملاته؟" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

export default AdminSuppliers;
