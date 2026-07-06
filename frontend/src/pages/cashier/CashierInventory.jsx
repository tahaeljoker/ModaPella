import { useEffect, useState } from 'react';
import api from '../../services/api';

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;
const CAT_AR = { Blouse: 'بلوزة', Chemise: 'قميص', Skirt: 'تنورة', Dress: 'فستان', Pantalon: 'بنطال', 'T-shirt': 'تيشيرت', Portefeuille: 'محفظة' };

function CashierInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adjusting, setAdjusting] = useState(null); // product id
  const [adjValue, setAdjValue] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(''); // "size|color" or ""
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadInventory = async () => {
    try {
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
    if (p.variants && p.variants.length > 0) {
      const first = p.variants[0];
      setSelectedVariant(`${first.size}|${first.color}`);
    } else {
      setSelectedVariant('');
    }
  };

  const handleAdjust = async (productId) => {
    if (!adjValue || isNaN(Number(adjValue))) return;
    try {
      const p = products.find((x) => x._id === productId);
      const payload = { adjustment: Number(adjValue) };
      if (p && p.variants && p.variants.length > 0 && selectedVariant) {
        const [size, color] = selectedVariant.split('|');
        payload.size = size;
        payload.color = color;
      }
      await api.patch(`/pos/storage/${productId}`, payload);
      showToast('تم تحديث المخزون ✓');
      setAdjusting(null);
      setAdjValue('');
      setSelectedVariant('');
      await loadInventory();
    } catch (e) {
      showToast('حدث خطأ أثناء التحديث');
    }
  };

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (CAT_AR[p.category] || '').includes(search)
  );

  const totalItems = products.reduce((s, p) => s + p.stock, 0);
  const totalValue = products.reduce((s, p) => s + p.stock * p.price, 0);
  const lowStockCount = products.filter((p) => p.stock <= 5).length;

  return (
    <div className="space-y-6 text-burgundy">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-burgundy/50">كاشير</p>
        <h2 className="text-2xl font-bold">المخزن</h2>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'إجمالي الكميات', value: `${totalItems} قطعة` },
          { label: 'قيمة المخزون', value: EGP(totalValue) },
          { label: 'منتجات منخفضة', value: lowStockCount, warn: lowStockCount > 0 },
        ].map((s) => (
          <div key={s.label} className={`rounded-[1.5rem] border p-4 ${s.warn ? 'border-amber-300 bg-amber-50' : 'border-burgundy/10 bg-white'}`}>
            <p className={`text-xs font-medium ${s.warn ? 'text-amber-700' : 'text-burgundy/60'}`}>{s.label}</p>
            <p className={`mt-2 text-2xl font-bold ${s.warn ? 'text-amber-800' : 'text-burgundy'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="بحث بالاسم أو الفئة..."
        className="w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy"
      />

      {/* Product list */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
        </div>
      ) : (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-burgundy/8">
            {filtered.map((p) => (
              <div key={p._id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {p.images?.[0] && (
                      <img src={p.images[0]} alt={p.name} className="h-12 w-12 flex-shrink-0 rounded-xl object-cover" />
                    )}
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-burgundy/50">{CAT_AR[p.category] || p.category} · {EGP(p.price)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${p.stock === 0 ? 'bg-red-100 text-red-600' : p.stock <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {p.stock} قطعة
                    </span>
                    {adjusting === p._id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {p.variants && p.variants.length > 0 && (
                          <select
                            value={selectedVariant}
                            onChange={(e) => setSelectedVariant(e.target.value)}
                            className="rounded-xl border border-burgundy/20 bg-white px-3 py-1.5 text-xs font-bold text-burgundy outline-none"
                          >
                            {p.variants.map((v, i) => (
                              <option key={i} value={`${v.size}|${v.color}`}>
                                {v.size && `مقاس: ${v.size}`} {v.color && ` · ${v.color}`} (مخزون: {v.stock})
                              </option>
                            ))}
                          </select>
                        )}
                        <input
                          type="number"
                          value={adjValue}
                          onChange={(e) => setAdjValue(e.target.value)}
                          placeholder="مثال: +10 أو -3"
                          className="w-28 rounded-xl border border-burgundy px-3 py-1.5 text-sm text-burgundy outline-none"
                          autoFocus
                        />
                        <button type="button" onClick={() => handleAdjust(p._id)}
                          className="rounded-xl bg-burgundy px-3 py-1.5 text-xs font-bold text-white">تأكيد</button>
                        <button type="button" onClick={() => { setAdjusting(null); setAdjValue(''); setSelectedVariant(''); }}
                          className="rounded-xl border border-burgundy/20 px-3 py-1.5 text-xs text-burgundy">إلغاء</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => startAdjusting(p)}
                        className="rounded-xl border border-burgundy/20 px-4 py-1.5 text-xs font-semibold text-burgundy transition hover:bg-burgundy hover:text-white">
                        تعديل
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="py-12 text-center text-sm text-burgundy/40">لا توجد منتجات</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CashierInventory;
