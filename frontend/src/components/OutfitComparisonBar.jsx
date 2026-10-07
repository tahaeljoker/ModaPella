import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import CompareContext from '../context/CompareContext';
import { cleanProductName } from '../utils/discount';

export default function OutfitComparisonBar() {
  const { compareItems, clearCompare, setIsCompareOpen, isCompareOpen } = useContext(CompareContext);
  const location = useLocation();

  if (compareItems.length === 0 || isCompareOpen) return null;

  // Elevate higher on mobile product page to avoid sticky bottom bar
  const isProductPage = location.pathname.startsWith('/product/');

  return (
    <div
      dir="rtl"
      className={`fixed z-40 transition-all duration-500 ease-out left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md ${
        isProductPage ? 'bottom-20 sm:bottom-6' : 'bottom-4 sm:bottom-6'
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2A050E] via-[#3E0A16] to-[#1F040A] p-3 sm:p-4 text-white shadow-2xl border border-amber-400/30 backdrop-blur-md">
        {/* Subtle Luxury Ambient Glow */}
        <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-amber-500/15 blur-2xl" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          {/* Thumbnails & Count */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex -space-x-3 rtl:space-x-reverse shrink-0">
              {compareItems.map((item, idx) => (
                <div
                  key={item._id}
                  className="relative h-11 w-11 rounded-xl overflow-hidden border-2 border-amber-400/40 bg-black/40 shadow"
                >
                  <img
                    src={item.images?.[0] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=300&q=80'}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 bg-burgundy/90 text-amber-300 text-[8px] font-bold px-1 rounded-tl">
                    #{idx + 1}
                  </span>
                </div>
              ))}
              {compareItems.length === 1 && (
                <div className="h-11 w-11 rounded-xl border-2 border-dashed border-amber-400/40 bg-white/5 flex items-center justify-center text-amber-300/80 text-xs font-bold animate-pulse">
                  +1
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400 text-xs">⚖️</span>
                <span className="text-xs font-black tracking-wide text-amber-200">
                  {compareItems.length === 1 ? 'مقارنة الإطلالات (1/2)' : 'جاهز للمقارنة! (2/2)'}
                </span>
              </div>
              <p className="text-[11px] text-white/70 truncate mt-0.5 max-w-[160px] sm:max-w-[200px]">
                {compareItems.length === 1
                  ? 'اضغطي على قطعة تانية لمقارنتها'
                  : `${cleanProductName(compareItems[0]?.name)} ⟷ ${cleanProductName(compareItems[1]?.name)}`}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsCompareOpen(true)}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-burgundy font-black text-xs px-3.5 py-2.5 shadow-md shadow-amber-900/40 active:scale-95 transition flex items-center gap-1"
            >
              <span>{compareItems.length === 1 ? 'فتح' : 'قارني الآن'}</span>
              <span>✨</span>
            </button>
            <button
              type="button"
              onClick={clearCompare}
              className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center text-xs transition"
              title="إلغاء المقارنة"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
