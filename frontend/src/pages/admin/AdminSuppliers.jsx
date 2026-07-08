import { useEffect, useState } from 'react';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;
const DATE = (d) => new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

// ─── Supplier Form Modal ───────────────────────────────────────────────────────
function SupplierModal({ supplier, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '', ...supplier });
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
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">البريد الإلكتروني</label>
              <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inp} placeholder="supplier@example.com" dir="ltr" />
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
  const [form, setForm] = useState({ type: 'purchase', amount: '', description: '', reference: '', date: new Date().toISOString().split('T')[0] });
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
          <div className="grid grid-cols-2 gap-3">
            {[{ id: 'purchase', label: '📦 مشتريات من المورد', hint: 'يزيد الدين' }, { id: 'payment', label: '💸 دفعة للمورد', hint: 'يقلل الدين' }].map(t => (
              <button key={t.id} type="button" onClick={() => setForm(p => ({ ...p, type: t.id }))}
                className={`rounded-2xl border-2 p-3 text-right transition ${form.type === t.id ? (t.id === 'purchase' ? 'border-red-400 bg-red-50' : 'border-emerald-400 bg-emerald-50') : 'border-burgundy/15 bg-white hover:border-burgundy/30'}`}>
                <p className="font-bold text-sm text-burgundy">{t.label}</p>
                <p className={`text-xs mt-0.5 ${t.id === 'purchase' ? 'text-red-500' : 'text-emerald-600'}`}>{t.hint}</p>
              </button>
            ))}
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
          <button onClick={() => setAddTx(true)} className="rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-bold transition">+ تعامل جديد</button>
        </div>

        {/* Balance summary */}
        {!loading && data && (
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

        {/* Transactions */}
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
                      {tx.reference && <span className="font-mono text-xs text-burgundy/50 bg-white px-2 py-0.5 rounded-lg">{tx.reference}</span>}
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

        <div className="p-4 bg-[#F7F0EC] border-t border-burgundy/10">
          <button onClick={onClose} className="w-full rounded-xl border border-burgundy/20 py-2.5 text-sm font-medium text-burgundy hover:bg-burgundy/10 transition">إغلاق</button>
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
