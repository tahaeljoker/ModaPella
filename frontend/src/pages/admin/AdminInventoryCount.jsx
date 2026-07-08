import { useEffect, useState } from 'react';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;
const DATE = (d) => new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

// ─── Active Count Session ──────────────────────────────────────────────────────
function CountSession({ count: initialCount, onFinish }) {
  const [count, setCount] = useState(initialCount);
  const [items, setItems] = useState(initialCount.items.map(i => ({ ...i, _counted: i.countedStock ?? '' })));
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyConfirm, setApplyConfirm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all | counted | uncounted | diff

  const updateCounted = (id, val) => {
    setItems(prev => prev.map(i => i._id === id ? { ...i, _counted: val } : i));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = items.map(i => ({ _id: i._id, countedStock: i._counted === '' ? null : Number(i._counted) }));
      const r = await api.put(`/inventory/counts/${count._id}`, { items: payload });
      setCount(r.data);
      alert('✅ تم حفظ الجرد كمسودة');
    } catch (e) { alert('فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await api.post(`/inventory/counts/${count._id}/apply`);
      onFinish();
    } catch (e) { alert(e.response?.data?.message || 'فشل التطبيق'); }
    finally { setApplying(false); setApplyConfirm(false); }
  };

  const filtered = items.filter(i => {
    const ms = !search || i.productName.toLowerCase().includes(search.toLowerCase()) ||
               (i.size && i.size.toLowerCase().includes(search.toLowerCase())) ||
               (i.color && i.color.toLowerCase().includes(search.toLowerCase()));
    const counted = i._counted !== '';
    const diff = counted && Number(i._counted) !== i.systemStock;
    if (filterStatus === 'counted') return ms && counted;
    if (filterStatus === 'uncounted') return ms && !counted;
    if (filterStatus === 'diff') return ms && diff;
    return ms;
  });

  const countedCount = items.filter(i => i._counted !== '').length;
  const diffCount = items.filter(i => i._counted !== '' && Number(i._counted) !== i.systemStock).length;
  const totalVariance = items.reduce((s, i) => {
    if (i._counted === '') return s;
    return s + (Number(i._counted) - i.systemStock);
  }, 0);

  return (
    <div className="space-y-5">
      {/* Session Header */}
      <div className="rounded-[2rem] bg-burgundy text-white p-6 shadow-lg shadow-burgundy/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs opacity-70 uppercase tracking-widest">جلسة جرد نشطة</p>
            <h3 className="text-xl font-bold mt-1">{count.label}</h3>
            <p className="text-xs opacity-60 mt-0.5">{DATE(count.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-70">{countedCount} / {items.length} تم عدّها</p>
            <p className={`text-lg font-extrabold mt-1 ${diffCount > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
              {diffCount > 0 ? `⚠️ ${diffCount} فرق` : '✅ لا فروقات'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-white/20 hover:bg-white/30 py-2 text-sm font-bold transition disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : '💾 حفظ مسودة'}
          </button>
          <button onClick={() => setApplyConfirm(true)} className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2 text-sm font-bold transition">
            ✅ تطبيق الجرد على المخزون
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="w-full bg-burgundy/10 rounded-full h-2.5">
        <div className="bg-burgundy h-2.5 rounded-full transition-all duration-500" style={{ width: `${(countedCount / items.length) * 100}%` }} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 بحث بالاسم، المقاس، اللون..."
          className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2 text-sm text-burgundy outline-none focus:border-burgundy min-w-[200px]" />
        <div className="flex rounded-2xl border border-burgundy/20 bg-white overflow-hidden">
          {[{ id: 'all', l: 'الكل' }, { id: 'uncounted', l: '⬜ لم تُعدّ' }, { id: 'counted', l: '✅ تم العد' }, { id: 'diff', l: '⚠️ فيها فرق' }].map(f => (
            <button key={f.id} onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-2 text-xs font-semibold transition ${filterStatus === f.id ? 'bg-burgundy text-white' : 'text-burgundy/60 hover:bg-burgundy/8'}`}>{f.l}</button>
          ))}
        </div>
        <span className="text-xs text-burgundy/40">{filtered.length} صنف</span>
        {totalVariance !== 0 && (
          <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${totalVariance > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            إجمالي الفرق: {totalVariance > 0 ? '+' : ''}{totalVariance} قطعة
          </span>
        )}
      </div>

      {/* Items Table */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 bg-[#F7F0EC] px-5 py-3 text-xs font-bold uppercase tracking-wide text-burgundy/50 border-b border-burgundy/8">
          <span>المنتج</span><span>المقاس</span><span>اللون</span><span>في النظام</span><span>العد الفعلي</span><span>الفرق</span>
        </div>
        <div className="divide-y divide-burgundy/6">
          {filtered.map(item => {
            const counted = item._counted !== '' ? Number(item._counted) : null;
            const variance = counted !== null ? counted - item.systemStock : null;
            const rowClass = variance === null ? '' : variance === 0 ? 'bg-emerald-50/30' : variance > 0 ? 'bg-blue-50/30' : 'bg-red-50/30';
            return (
              <div key={item._id} className={`grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center gap-3 px-5 py-3 transition hover:bg-burgundy/3 ${rowClass}`}>
                <p className="font-semibold text-sm text-burgundy">{item.productName}</p>
                <p className="text-sm text-burgundy/60">{item.size || '—'}</p>
                <p className="text-sm text-burgundy/60">{item.color || '—'}</p>
                <span className="rounded-full bg-burgundy/8 px-3 py-1 text-sm font-bold text-burgundy w-fit">{item.systemStock}</span>
                <input
                  type="number"
                  min="0"
                  value={item._counted}
                  onChange={e => updateCounted(item._id, e.target.value)}
                  placeholder="أدخل..."
                  className="w-24 rounded-xl border border-burgundy/20 bg-white px-3 py-1.5 text-center text-sm font-bold text-burgundy outline-none focus:border-burgundy focus:shadow-sm"
                />
                <span className={`text-sm font-bold w-fit px-3 py-1 rounded-full ${
                  variance === null ? 'text-burgundy/30' :
                  variance === 0 ? 'bg-emerald-100 text-emerald-700' :
                  variance > 0 ? 'bg-blue-100 text-blue-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {variance === null ? '—' : variance > 0 ? `+${variance}` : variance}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmModal
        isOpen={applyConfirm}
        title="تأكيد تطبيق الجرد"
        message="سيتم تحديث مخزون كل المنتجات بالكميات المُدخلة. هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد؟"
        confirmText="نعم، تطبيق الجرد"
        onConfirm={handleApply}
        onCancel={() => setApplyConfirm(false)}
      />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
function AdminInventoryCount() {
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [toast, setToast] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadCounts = async () => {
    setLoading(true);
    try { const r = await api.get('/inventory/counts'); setCounts(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCounts(); }, []);

  const handleCreate = async () => {
    try {
      const r = await api.post('/inventory/count/new', { label: label || `جرد ${new Date().toLocaleDateString('ar-EG')}` });
      setActiveCount(r.data);
      setCreating(false);
      setLabel('');
      showToast('✅ تم إنشاء جلسة الجرد');
    } catch (e) { alert('فشل الإنشاء'); }
  };

  const handleOpenCount = async (count) => {
    if (count.status === 'applied') return alert('هذا الجرد مطبّق بالفعل ولا يمكن تعديله.');
    // reload full count
    const r = await api.get(`/inventory/counts/${count._id}`);
    setActiveCount(r.data);
  };

  const handleDeleteCount = async () => {
    await api.delete(`/inventory/counts/${deleteId}`);
    showToast('✅ تم حذف الجرد'); setDeleteId(null); await loadCounts();
  };

  if (activeCount) {
    return <CountSession count={activeCount} onFinish={() => { setActiveCount(null); loadCounts(); }} />;
  }

  return (
    <div className="space-y-6 text-burgundy">
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">الإدارة</p>
          <h2 className="text-2xl font-bold">📦 الجرد</h2>
          <p className="text-sm text-burgundy/50 mt-0.5">قارن المخزون الفعلي بالمخزون في النظام</p>
        </div>
        <button onClick={() => setCreating(true)} className="rounded-full bg-burgundy px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-burgundy/20 transition hover:bg-[#650018]">
          + جرد جديد
        </button>
      </div>

      {/* Create new count */}
      {creating && (
        <div className="rounded-[2rem] border border-burgundy/15 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-burgundy mb-4">إنشاء جلسة جرد جديدة</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={`جرد ${new Date().toLocaleDateString('ar-EG')}`}
              className="flex-1 rounded-xl border border-burgundy/20 bg-[#F7F0EC] px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy"
            />
            <button onClick={handleCreate} className="rounded-xl bg-burgundy px-5 py-2.5 text-sm font-bold text-white hover:bg-[#650018] transition">إنشاء</button>
            <button onClick={() => setCreating(false)} className="rounded-xl border border-burgundy/20 px-4 py-2.5 text-sm text-burgundy hover:bg-burgundy/8 transition">إلغاء</button>
          </div>
          <p className="text-xs text-burgundy/40 mt-2">سيتم جلب جميع المنتجات مع مخزونها الحالي تلقائياً</p>
        </div>
      )}

      {/* Previous counts */}
      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
      ) : counts.length === 0 ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white py-20 text-center">
          <p className="text-5xl mb-3">📦</p>
          <p className="text-lg font-semibold text-burgundy/40">لم يتم إجراء أي جرد بعد</p>
          <p className="text-sm text-burgundy/30 mt-1">أنشئ جلسة جرد جديدة للبدء</p>
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-burgundy/60 mb-3">سجل الجردات السابقة</h3>
          <div className="space-y-3">
            {counts.map(count => {
              const totalItems = count.items?.length || 0;
              const countedItems = count.items?.filter(i => i.countedStock !== null).length || 0;
              const diffItems = count.items?.filter(i => i.countedStock !== null && i.countedStock !== i.systemStock).length || 0;
              return (
                <div key={count._id} className="rounded-[1.5rem] border border-burgundy/10 bg-white px-5 py-4 shadow-sm flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-burgundy">{count.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${count.status === 'applied' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {count.status === 'applied' ? '✅ مطبّق' : '📝 مسودة'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-burgundy/50">
                      <span>{DATE(count.createdAt)}</span>
                      <span>{countedItems}/{totalItems} عُدّت</span>
                      {diffItems > 0 && <span className="text-amber-600">⚠️ {diffItems} فرق</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {count.status !== 'applied' && (
                      <button onClick={() => handleOpenCount(count)} className="rounded-xl bg-burgundy px-4 py-2 text-xs font-bold text-white hover:bg-[#650018] transition">فتح الجرد</button>
                    )}
                    {count.status !== 'applied' && (
                      <button onClick={() => setDeleteId(count._id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500 hover:text-white transition">حذف</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmModal isOpen={!!deleteId} title="حذف الجرد" message="هل أنت متأكد من حذف جلسة الجرد؟" onConfirm={handleDeleteCount} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

export default AdminInventoryCount;
