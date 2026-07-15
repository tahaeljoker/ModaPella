import { useState } from 'react';
import api from '../../services/api';
import { isDiscountActive, getEffectivePrice } from '../../utils/discount';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

function EmployeePriceCheck() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setResults([]);
    setSelected(null);
    try {
      const { data } = await api.get(`/products?search=${encodeURIComponent(query.trim())}&limit=20`);
      const list = Array.isArray(data) ? data : data.products || [];
      setResults(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full rounded-2xl border border-burgundy/20 bg-white px-4 py-3 text-sm text-burgundy outline-none transition focus:border-burgundy focus:shadow-sm';

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">الموظف</p>
        <h2 className="text-2xl font-bold mt-0.5">🔎 استعلام الأسعار</h2>
        <p className="text-sm text-burgundy/50 mt-1">ابحث عن أي منتج بالاسم أو الباركود لمعرفة سعره وتفاصيله</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="اكتب اسم المنتج أو الباركود (SKU)..."
          className={inputCls}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-burgundy px-6 py-3 text-sm font-bold text-white transition hover:bg-[#650018] disabled:opacity-60 whitespace-nowrap"
        >
          {loading ? '...' : 'بحث'}
        </button>
      </form>

      {/* Results */}
      {loading && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white py-16 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-lg font-semibold text-burgundy/40">لا توجد نتائج</p>
          <p className="text-sm text-burgundy/30 mt-1">جرّب كلمة بحث مختلفة</p>
        </div>
      )}

      {!loading && results.length > 0 && !selected && (
        <div className="space-y-3">
          <p className="text-xs text-burgundy/50">{results.length} منتج</p>
          {results.map(p => {
            const active = isDiscountActive(p);
            const effPrice = getEffectivePrice(p);
            return (
              <button
                key={p._id}
                onClick={() => setSelected(p)}
                className="w-full text-right rounded-[1.5rem] border border-burgundy/10 bg-white px-5 py-4 shadow-sm transition hover:border-burgundy/30 hover:shadow-md flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-burgundy truncate">{p.name}</p>
                  <p className="text-xs text-burgundy/50 mt-0.5">{p.sku || 'بدون باركود'} · {p.category}</p>
                </div>
                <div className="text-left shrink-0">
                  {active && (
                    <p className="text-xs line-through text-burgundy/40">{EGP(p.price)}</p>
                  )}
                  <p className={`font-bold ${active ? 'text-red-600' : 'text-burgundy'}`}>{EGP(effPrice)}</p>
                  {active && (
                    <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                      خصم {Math.round((1 - effPrice / p.price) * 100)}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Product Detail Card */}
      {selected && (
        <div className="space-y-4">
          <button onClick={() => setSelected(null)} className="text-sm text-burgundy/60 hover:text-burgundy flex items-center gap-1">
            ← العودة للنتائج
          </button>

          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm space-y-5">
            {/* Name & Badges */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-burgundy/40 uppercase tracking-widest">{selected.category}</p>
                <h3 className="text-2xl font-bold text-burgundy mt-1">{selected.name}</h3>
                {selected.sku && <p className="text-xs font-mono bg-burgundy/5 text-burgundy px-2 py-0.5 rounded mt-1 w-fit">{selected.sku}</p>}
              </div>
              {isDiscountActive(selected) && (
                <span className="shrink-0 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow">
                  خصم {Math.round((1 - getEffectivePrice(selected) / selected.price) * 100)}%
                </span>
              )}
            </div>

            {/* Pricing */}
            <div className="rounded-2xl bg-burgundy/5 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-burgundy/40">التسعير</p>
              <div className="flex items-end gap-3">
                <p className={`text-3xl font-extrabold ${isDiscountActive(selected) ? 'text-red-600' : 'text-burgundy'}`}>
                  {EGP(getEffectivePrice(selected))}
                </p>
                {isDiscountActive(selected) && (
                  <p className="text-lg text-burgundy/40 line-through mb-0.5">{EGP(selected.price)}</p>
                )}
              </div>
              {isDiscountActive(selected) && (
                <p className="text-xs text-red-600/80">
                  العرض ساري حتى {new Date(selected.discountEndDate).toLocaleDateString('ar-EG-u-nu-latn')}
                </p>
              )}
            </div>

            {/* Stock */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-burgundy/40 mb-2">المخزون</p>
              {selected.variants && selected.variants.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selected.variants.map((v, i) => (
                    <div key={i} className={`rounded-xl px-3 py-2 text-xs font-semibold text-center border ${v.stock > 0 ? 'border-burgundy/15 bg-burgundy/5 text-burgundy' : 'border-red-100 bg-red-50 text-red-400'}`}>
                      <p>{v.size} – {v.color}</p>
                      <p className="font-bold mt-0.5">{v.stock} قطعة</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-bold text-burgundy">
                  {selected.stock} قطعة متاحة
                </p>
              )}
            </div>

            {/* Description */}
            {selected.description && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-burgundy/40 mb-1">الوصف</p>
                <p className="text-sm text-burgundy/70 leading-relaxed">{selected.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeePriceCheck;
