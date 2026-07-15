import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { isDiscountActive, getEffectivePrice } from '../../utils/discount';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

// Debounce helper for live search
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function EmployeePriceCheck() {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('emp_price_history') || '[]'); } catch { return []; }
  });
  const inputRef = useRef(null);
  const scanBuffer = useRef('');
  const scanTimer  = useRef(null);

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  const debouncedQuery = useDebounce(query, 400);

  // Live search as user types (debounced)
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      doSearch(debouncedQuery.trim());
    } else if (debouncedQuery.trim() === '') {
      setResults([]);
      setSearched(false);
    }
  }, [debouncedQuery]);

  const doSearch = useCallback(async (q) => {
    setLoading(true);
    setSearched(true);
    setSelected(null);
    try {
      const { data } = await api.get(`/products?search=${encodeURIComponent(q)}&limit=20`);
      const list = Array.isArray(data) ? data : data.products || [];
      setResults(list);
      // If exactly one result, auto-select it
      if (list.length === 1) setSelected(list[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Barcode scanner detection: barcodes come in very fast (<50ms per char)
  // We accumulate chars and submit when Enter pressed OR after 200ms of silence
  useEffect(() => {
    const handleGlobalKey = (e) => {
      // Ignore if user is typing in ANY input field, textarea or select
      const activeEl = document.activeElement;
      if (
        activeEl && 
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')
      ) {
        return;
      }
      
      if (e.key === 'Enter') {
        if (scanBuffer.current.length > 2) {
          const scanned = scanBuffer.current.trim();
          setQuery(scanned);
          doSearch(scanned);
          inputRef.current?.focus();
        }
        scanBuffer.current = '';
        clearTimeout(scanTimer.current);
      } else if (e.key.length === 1) {
        scanBuffer.current += e.key;
        clearTimeout(scanTimer.current);
        scanTimer.current = setTimeout(() => {
          scanBuffer.current = '';
        }, 150);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [doSearch]);

  const handleSelectProduct = (p) => {
    setSelected(p);
    // Save to history (last 5)
    const newHistory = [{ _id: p._id, name: p.name, sku: p.sku }, ...history.filter(h => h._id !== p._id)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('emp_price_history', JSON.stringify(newHistory));
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    setSelected(null);
    inputRef.current?.focus();
  };

  const inputCls = 'w-full rounded-2xl border border-burgundy/20 bg-white px-4 py-3 text-sm text-burgundy outline-none transition focus:border-burgundy focus:shadow-sm';

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">الموظف</p>
        <h2 className="text-2xl font-bold mt-0.5">🔎 استعلام الأسعار</h2>
        <p className="text-sm text-burgundy/50 mt-1">ابحث أو امسح الباركود مباشرة في أي وقت</p>
      </div>

      {/* Search Box */}
      <div className="relative flex gap-2">
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="rounded-2xl border border-burgundy/20 bg-white px-4 text-lg hover:bg-burgundy/5 transition"
          title="مسح بالكاميرا"
        >
          📷
        </button>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && query.trim() && doSearch(query.trim())}
            placeholder="🔍 اكتب الاسم أو امسح الباركود..."
            className={inputCls + ' pl-10'}
            autoComplete="off"
            spellCheck="false"
          />
          {loading && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-burgundy/20 border-t-burgundy" />
          )}
        </div>
        {query && (
          <button onClick={handleClear} className="rounded-2xl bg-burgundy/10 px-4 text-xs font-bold text-burgundy hover:bg-burgundy/20 transition">
            مسح ✕
          </button>
        )}
      </div>

      {/* Quick History */}
      {!searched && history.length > 0 && (
        <div>
          <p className="text-xs text-burgundy/40 uppercase tracking-widest mb-2">آخر عمليات البحث</p>
          <div className="flex flex-wrap gap-2">
            {history.map(h => (
              <button
                key={h._id}
                onClick={() => { setQuery(h.name); doSearch(h.name); }}
                className="rounded-full border border-burgundy/15 bg-white px-3 py-1.5 text-xs font-semibold text-burgundy hover:bg-burgundy hover:text-white transition"
              >
                {h.name} {h.sku && <span className="font-mono opacity-60">· {h.sku}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && searched && results.length === 0 && (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white py-16 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-lg font-semibold text-burgundy/40">لا توجد نتائج لـ "{query}"</p>
          <p className="text-sm text-burgundy/30 mt-1">جرّب كلمة بحث أو باركود مختلف</p>
        </div>
      )}

      {!loading && results.length > 1 && !selected && (
        <div className="space-y-2">
          <p className="text-xs text-burgundy/50">{results.length} منتج — اضغط على المنتج لعرض التفاصيل</p>
          {results.map(p => {
            const active   = isDiscountActive(p);
            const effPrice = getEffectivePrice(p);
            const totalStock = p.variants?.length > 0
                  ? p.variants.reduce((s, v) => s + v.stock, 0)
                  : (p.stock ?? 0);
            return (
              <button
                key={p._id}
                onClick={() => handleSelectProduct(p)}
                className="w-full text-right rounded-[1.5rem] border border-burgundy/10 bg-white px-5 py-4 shadow-sm transition hover:border-burgundy/30 hover:shadow-md flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-burgundy truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {p.sku && <span className="text-[10px] font-mono bg-burgundy/5 text-burgundy px-1.5 rounded">{p.sku}</span>}
                    <span className="text-xs text-burgundy/50">{p.category}</span>
                    <span className={`text-xs font-semibold ${totalStock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {totalStock > 0 ? `${totalStock} قطعة` : 'نفذ'}
                    </span>
                  </div>
                </div>
                <div className="text-left shrink-0">
                  {active && <p className="text-xs line-through text-burgundy/40">{EGP(p.price)}</p>}
                  <p className={`font-bold ${active ? 'text-red-600' : 'text-burgundy'}`}>{EGP(effPrice)}</p>
                  {active && (
                    <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                      -{Math.round((1 - effPrice / p.price) * 100)}%
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
          {results.length > 1 && (
            <button onClick={() => setSelected(null)} className="text-sm text-burgundy/60 hover:text-burgundy flex items-center gap-1">
              ← العودة للنتائج
            </button>
          )}

          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm space-y-5">
            {/* Name & Discount Badge */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-burgundy/40 uppercase tracking-widest">{selected.category}</p>
                <h3 className="text-2xl font-bold text-burgundy mt-1">{selected.name}</h3>
                {selected.sku && (
                  <p className="text-xs font-mono bg-burgundy/5 text-burgundy px-2 py-0.5 rounded mt-1 w-fit">{selected.sku}</p>
                )}
              </div>
              {isDiscountActive(selected) && (
                <div className="text-center shrink-0">
                  <span className="rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white shadow animate-pulse">
                    خصم {Math.round((1 - getEffectivePrice(selected) / selected.price) * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Big Price Display */}
            <div className="rounded-2xl bg-gradient-to-br from-burgundy/5 to-burgundy/10 p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-burgundy/40 mb-1">سعر البيع</p>
                <div className="flex items-end gap-3">
                  <p className={`text-4xl font-extrabold ${isDiscountActive(selected) ? 'text-red-600' : 'text-burgundy'}`}>
                    {EGP(getEffectivePrice(selected))}
                  </p>
                  {isDiscountActive(selected) && (
                    <p className="text-xl text-burgundy/40 line-through mb-1">{EGP(selected.price)}</p>
                  )}
                </div>
                {isDiscountActive(selected) && (
                  <p className="text-xs text-red-500 mt-1">
                    ⏰ العرض حتى {new Date(selected.discountEndDate).toLocaleDateString('ar-EG-u-nu-latn')}
                  </p>
                )}
              </div>
              <div className="text-5xl opacity-10">💰</div>
            </div>

            {/* Stock */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-burgundy/40 mb-2">المخزون المتاح</p>
              {selected.variants && selected.variants.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selected.variants.map((v, i) => (
                    <div key={i} className={`rounded-xl px-3 py-2.5 text-xs font-semibold text-center border ${v.stock > 0 ? 'border-burgundy/15 bg-burgundy/5 text-burgundy' : 'border-red-100 bg-red-50 text-red-400'}`}>
                      <p className="font-bold">{v.size}{v.size && v.color ? ' – ' : ''}{v.color}</p>
                      <p className={`mt-0.5 ${v.stock === 0 ? 'text-red-500' : ''}`}>
                        {v.stock > 0 ? `${v.stock} قطعة` : 'نفذ'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`rounded-2xl px-4 py-3 text-center font-bold ${(selected.stock || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {(selected.stock || 0) > 0 ? `${selected.stock} قطعة متاحة` : 'نفذ المخزون'}
                </div>
              )}
            </div>

            {/* Description */}
            {selected.description && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-burgundy/40 mb-1">الوصف</p>
                <p className="text-sm text-burgundy/70 leading-relaxed">{selected.description}</p>
              </div>
            )}

            {/* Search Again */}
            <button
              onClick={handleClear}
              className="w-full rounded-2xl border border-burgundy/15 py-2.5 text-sm font-semibold text-burgundy/60 hover:bg-burgundy/5 transition"
            >
              🔎 بحث عن منتج آخر
            </button>
          </div>
        </div>
      )}
      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(code) => {
          setQuery(code);
          doSearch(code);
        }}
      />
    </div>
  );
}

export default EmployeePriceCheck;
