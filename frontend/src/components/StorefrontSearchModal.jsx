import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { filterAndRankProducts } from '../utils/arabicSearch';
import { cleanProductName } from '../utils/discount';
import { resolveImageUrl } from '../utils/imageUrl';

const POPULAR_SEARCH_TAGS = [
  'جاكيت',
  'فستان',
  'بلوزة',
  'عباية',
  'طقم',
  'بليزر',
  'بنطلون',
  'سواريه',
  'جينز',
  'شميز'
];

export default function StorefrontSearchModal({ isOpen, onClose, products = [] }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Focus input whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Perform smart search
  const { results, suggestedCorrection } = useMemo(() => {
    if (!query.trim()) {
      return { results: [], suggestedCorrection: null };
    }
    return filterAndRankProducts(products, query);
  }, [products, query]);

  const handleSelectProduct = (product) => {
    onClose();
    try {
      const key = `mp_scroll_${window.location.pathname}${window.location.search}`;
      sessionStorage.setItem(key, String(window.scrollY));
    } catch (e) {}
    navigate(`/product/${product._id}`);
  };

  const handleViewAllInShop = () => {
    onClose();
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-start bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-burgundy/15 overflow-hidden my-auto sm:my-8 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Search Box */}
        <div className="relative border-b border-burgundy/10 p-4 sm:p-5 bg-gradient-to-r from-[#FAF7F5] to-white">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl text-burgundy/60">🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحثي عن فستان، جاكيت، بلوزة، كولكشن..."
              className="flex-1 bg-transparent text-base sm:text-lg font-bold text-burgundy placeholder:text-burgundy/40 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="h-8 w-8 rounded-full bg-burgundy/10 hover:bg-burgundy/20 text-burgundy flex items-center justify-center text-xs font-bold transition cursor-pointer"
                title="مسح البحث"
              >
                ✕
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-full bg-burgundy/5 hover:bg-burgundy/10 text-xs font-bold text-burgundy transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>

          {/* Typo Correction Suggestion Pill */}
          {suggestedCorrection && suggestedCorrection !== query.trim() && (
            <div className="mt-3 flex items-center gap-2 text-xs text-burgundy/80 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl">
              <span>💡 هل تقصدين:</span>
              <button
                type="button"
                onClick={() => setQuery(suggestedCorrection)}
                className="font-black text-burgundy underline hover:text-[#680017] cursor-pointer"
              >
                {suggestedCorrection}
              </button>
            </div>
          )}

          {/* Quick Popular Search Tags */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
            <span className="text-[10px] font-bold text-burgundy/50 shrink-0">الأكثر بحثاً:</span>
            {POPULAR_SEARCH_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(tag)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
                  query === tag
                    ? 'bg-burgundy text-white'
                    : 'bg-white border border-burgundy/15 text-burgundy/70 hover:border-burgundy hover:text-burgundy'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Search Results Area */}
        <div className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto p-3 sm:p-5 space-y-2">
          {query.trim() === '' ? (
            <div className="py-12 text-center text-burgundy/50 space-y-2">
              <span className="text-4xl block">✨</span>
              <p className="text-sm font-bold">اكتبي ما تبحثين عنه أو اختاري من الكلمات المقترحة بالأعلى</p>
              <p className="text-xs text-burgundy/40">البحث ذكي ومرن ويتعرف على الموديلات حتى مع اختلاف طريقة الكتابة!</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-burgundy/60 space-y-3">
              <span className="text-4xl block">👗</span>
              <h3 className="text-base font-bold text-burgundy">لم نجد نتائج مطابقة لـ "{query}"</h3>
              <p className="text-xs text-burgundy/60 max-w-sm mx-auto">
                جربي البحث بكلمة عامة مثل "جاكيت" أو "فستان" أو تصفحي كامل المعروضات.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/shop');
                }}
                className="inline-block px-5 py-2 rounded-full bg-burgundy text-white text-xs font-bold shadow hover:bg-[#680017] transition cursor-pointer"
              >
                تصفحي جميع الملابس
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-burgundy/60 px-2 pb-1 border-b border-burgundy/5">
                <span>النتائج المقترحة ({results.length} موديل):</span>
                <button
                  type="button"
                  onClick={handleViewAllInShop}
                  className="text-burgundy hover:underline text-[11px] font-black cursor-pointer"
                >
                  عرض الكل في صفحة الملابس ←
                </button>
              </div>

              {results.slice(0, 10).map((prod) => {
                const img = resolveImageUrl(prod.images?.[0] || prod.mannequinImage);
                const hasDiscount = prod.discountPrice > 0 && prod.discountPrice < prod.price;

                return (
                  <div
                    key={prod._id}
                    onClick={() => handleSelectProduct(prod)}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-2xl hover:bg-[#FAF7F5] transition cursor-pointer border border-transparent hover:border-burgundy/10 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#FAF7F5] border border-burgundy/10 group-hover:scale-105 transition">
                        <img
                          src={img || '/placeholder.png'}
                          alt={prod.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold text-burgundy/50 truncate">
                          {prod.category || 'أزياء'}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-burgundy truncate group-hover:text-[#680017]">
                          {cleanProductName(prod)}
                        </h4>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-xs sm:text-sm font-black text-burgundy">
                            {hasDiscount ? prod.discountPrice : prod.price} ج.م
                          </span>
                          {hasDiscount && (
                            <span className="text-[10px] text-burgundy/40 line-through">
                              {prod.price} ج.م
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasDiscount && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-black">
                          خصم
                        </span>
                      )}
                      <span className="text-xs text-burgundy/40 group-hover:text-burgundy group-hover:translate-x-0.5 transition font-bold">
                        ←
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="p-3 bg-[#FAF7F5] border-t border-burgundy/10 flex items-center justify-between text-xs">
            <span className="text-burgundy/60 font-semibold">
              وجدنا {results.length} موديل متعلق ببحثكِ
            </span>
            <button
              type="button"
              onClick={handleViewAllInShop}
              className="px-4 py-2 rounded-xl bg-burgundy text-white font-bold hover:bg-[#680017] transition shadow-xs cursor-pointer"
            >
              عرض جميع النتائج ({results.length}) ←
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
