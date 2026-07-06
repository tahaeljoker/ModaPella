import { useEffect, useState } from 'react';
import api from '../../services/api';

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;
const CAT_AR = {
  Blouse: 'بلوزة', Chemise: 'قميص', Skirt: 'تنورة',
  Dress: 'فستان', Pantalon: 'بنطلون', 'T-shirt': 'تيشيرت', Portefeuille: 'محفظة',
};
const CATS = ['الكل', ...Object.keys(CAT_AR)];

function AdminInventory() {
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState('الكل');
  const [filterStock, setFilterStock] = useState('all'); // all | low | out
  const [adjusting, setAdjusting]   = useState(null);   // product id
  const [adjValue, setAdjValue]     = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [adjNote, setAdjNote]       = useState('');
  const [toast, setToast]           = useState({ msg: '', type: 'success' });
  const [expanded, setExpanded]     = useState(null); // expanded product id

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cashier/inventory');
      setProducts(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInventory(); }, []);

  const startAdjusting = (p) => {
    setAdjusting(p._id);
    setAdjValue('');
    setAdjNote('');
    if (p.variants?.length > 0) {
      setSelectedVariant(`${p.variants[0].size}|${p.variants[0].color}`);
    } else {
      setSelectedVariant('');
    }
  };

  const handleAdjust = async (productId) => {
    if (!adjValue || isNaN(Number(adjValue))) return;
    try {
      const p = products.find(x => x._id === productId);
      const payload = { adjustment: Number(adjValue) };
      if (p?.variants?.length > 0 && selectedVariant) {
        const [size, color] = selectedVariant.split('|');
        payload.size = size;
        payload.color = color;
      }
      await api.patch(`/pos/storage/${productId}`, payload);
      showToast('✅ تم تحديث المخزون بنجاح');
      setAdjusting(null);
      setAdjValue('');
      setSelectedVariant('');
      setAdjNote('');
      await loadInventory();
    } catch (e) {
      showToast('❌ حدث خطأ أثناء التحديث', 'error');
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalItems   = products.reduce((s, p) => s + p.stock, 0);
  const totalValue   = products.reduce((s, p) => s + p.stock * p.price, 0);
  const lowCount     = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const outCount     = products.filter(p => p.stock === 0).length;

  // ── Filters ────────────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
      (CAT_AR[p.category] || '').includes(search);
    const matchCat = filterCat === 'الكل' || p.category === filterCat;
    const matchStock =
      filterStock === 'all' ? true :
      filterStock === 'low' ? (p.stock > 0 && p.stock <= 5) :
      filterStock === 'out' ? p.stock === 0 : true;
    return matchSearch && matchCat && matchStock;
  });

  // ── Stock badge ────────────────────────────────────────────────────────────
  const stockBadge = (stock) => {
    if (stock === 0) return 'bg-red-100 text-red-600';
    if (stock <= 5)  return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  return (
    <div className="space-y-6 text-burgundy">
      {/* Toast */}
      {toast.msg && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-xl transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">الإدارة</p>
          <h2 className="text-2xl font-bold">إدارة المخزون</h2>
        </div>
        <button
          onClick={loadInventory}
          className="flex items-center gap-2 rounded-2xl border border-burgundy/20 px-4 py-2 text-sm font-medium text-burgundy transition hover:bg-burgundy hover:text-white"
        >
          🔄 تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'إجمالي القطع', value: `${totalItems.toLocaleString()} قطعة`, icon: '📦', color: 'text-burgundy', bg: 'bg-white' },
          { label: 'قيمة المخزون', value: EGP(totalValue), icon: '💰', color: 'text-burgundy', bg: 'bg-white' },
          { label: 'مخزون منخفض', value: `${lowCount} منتج`, icon: '⚠️', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', warn: true },
          { label: 'نفد المخزون', value: `${outCount} منتج`, icon: '❌', color: 'text-red-600', bg: 'bg-red-50 border-red-200', warn: outCount > 0 },
        ].map(s => (
          <div key={s.label} className={`rounded-[1.5rem] border p-5 ${s.bg} border-burgundy/10`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{s.icon}</span>
              <p className={`text-xs font-semibold ${s.warn ? s.color : 'text-burgundy/50'}`}>{s.label}</p>
            </div>
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 بحث بالاسم أو الكود (SKU)..."
          className="flex-1 min-w-[200px] rounded-2xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy focus:shadow-md"
        />
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none"
        >
          {CATS.map(c => <option key={c} value={c}>{c === 'الكل' ? 'كل الفئات' : CAT_AR[c] || c}</option>)}
        </select>
        <div className="flex rounded-2xl border border-burgundy/20 bg-white overflow-hidden">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'low', label: '⚠️ منخفض' },
            { id: 'out', label: '❌ نفد' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStock(f.id)}
              className={`px-4 py-2.5 text-xs font-semibold transition ${filterStock === f.id ? 'bg-burgundy text-white' : 'text-burgundy/60 hover:bg-burgundy/8'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white py-16 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm text-burgundy/40">لا توجد منتجات مطابقة</p>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
          {/* Table Head */}
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_140px] gap-4 px-5 py-3 border-b border-burgundy/8 bg-[#F7F0EC]">
            <p className="text-xs font-bold text-burgundy/50 uppercase tracking-wider">المنتج</p>
            <p className="text-xs font-bold text-burgundy/50 uppercase tracking-wider">الفئة</p>
            <p className="text-xs font-bold text-burgundy/50 uppercase tracking-wider">السعر</p>
            <p className="text-xs font-bold text-burgundy/50 uppercase tracking-wider">المخزون</p>
            <p className="text-xs font-bold text-burgundy/50 uppercase tracking-wider">الإجراء</p>
          </div>

          <div className="divide-y divide-burgundy/6">
            {filtered.map(p => (
              <div key={p._id}>
                {/* Main Row */}
                <div className="grid sm:grid-cols-[2fr_1fr_1fr_1fr_140px] gap-4 px-5 py-4 items-center hover:bg-[#F7F0EC]/40 transition">
                  {/* Product info */}
                  <div className="flex items-center gap-3 min-w-0">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} className="h-12 w-12 flex-shrink-0 rounded-xl object-cover shadow-sm" />
                    ) : (
                      <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-burgundy/10 flex items-center justify-center text-xl">👗</div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      {p.sku && <p className="text-xs text-burgundy/40 font-mono">{p.sku}</p>}
                      {p.supplier && <p className="text-xs text-burgundy/40">🏭 {p.supplier}</p>}
                    </div>
                  </div>

                  {/* Category */}
                  <span className="hidden sm:inline-block text-xs bg-burgundy/8 text-burgundy px-2.5 py-1 rounded-full font-medium w-fit">
                    {CAT_AR[p.category] || p.category}
                  </span>

                  {/* Price */}
                  <p className="hidden sm:block text-sm font-bold text-burgundy">{EGP(p.price)}</p>

                  {/* Stock */}
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${stockBadge(p.stock)}`}>
                      {p.stock} قطعة
                    </span>
                    {p.variants?.length > 0 && (
                      <button
                        onClick={() => setExpanded(expanded === p._id ? null : p._id)}
                        className="text-xs text-burgundy/40 hover:text-burgundy transition"
                        title="عرض التفاصيل"
                      >
                        {expanded === p._id ? '▲' : '▼'}
                      </button>
                    )}
                  </div>

                  {/* Action */}
                  <div>
                    {adjusting === p._id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {p.variants?.length > 0 && (
                          <select
                            value={selectedVariant}
                            onChange={e => setSelectedVariant(e.target.value)}
                            className="rounded-xl border border-burgundy/20 bg-white px-2 py-1 text-xs text-burgundy outline-none"
                          >
                            {p.variants.map((v, i) => (
                              <option key={i} value={`${v.size}|${v.color}`}>
                                {v.size} · {v.color} ({v.stock})
                              </option>
                            ))}
                          </select>
                        )}
                        <input
                          type="number"
                          value={adjValue}
                          onChange={e => setAdjValue(e.target.value)}
                          placeholder="+10 أو -3"
                          className="w-24 rounded-xl border border-burgundy px-2.5 py-1 text-sm text-burgundy outline-none"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleAdjust(p._id); if (e.key === 'Escape') setAdjusting(null); }}
                        />
                        <button onClick={() => handleAdjust(p._id)}
                          className="rounded-xl bg-burgundy px-3 py-1 text-xs font-bold text-white hover:bg-[#650018] transition">
                          ✓
                        </button>
                        <button onClick={() => { setAdjusting(null); setAdjValue(''); }}
                          className="rounded-xl border border-burgundy/20 px-2 py-1 text-xs text-burgundy hover:bg-burgundy/8 transition">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startAdjusting(p)}
                        className="rounded-xl border border-burgundy/20 px-4 py-1.5 text-xs font-semibold text-burgundy transition hover:bg-burgundy hover:text-white"
                      >
                        تعديل المخزون
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded: variants breakdown */}
                {expanded === p._id && p.variants?.length > 0 && (
                  <div className="bg-[#F7F0EC]/60 px-6 py-4 border-t border-burgundy/8">
                    <p className="text-xs font-semibold text-burgundy/50 uppercase tracking-wider mb-3">تفاصيل الأحجام والألوان</p>
                    <div className="flex flex-wrap gap-2">
                      {p.variants.map((v, i) => (
                        <div key={i} className={`rounded-2xl border px-4 py-2 text-center text-xs font-medium ${v.stock === 0 ? 'border-red-200 bg-red-50 text-red-600' : v.stock <= 5 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-burgundy/15 bg-white text-burgundy'}`}>
                          <p className="font-bold">{v.size} · {v.color}</p>
                          <p className="mt-0.5 text-lg font-extrabold">{v.stock}</p>
                          <p className="text-[10px] opacity-60">قطعة</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminInventory;
