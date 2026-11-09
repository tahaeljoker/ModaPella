import React, { useEffect } from 'react';
import { resolveImageUrl } from '../utils/imageUrl';

export default function CartToast({ toast, onClose, onOpenCart }) {
  useEffect(() => {
    if (!toast?.show) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast?.show, onClose]);

  if (!toast?.show || !toast?.item) return null;

  const { item } = toast;
  const image = resolveImageUrl(item.image || item.images?.[0]) || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80';

  return (
    <div
      dir="rtl"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[94%] sm:w-auto sm:min-w-[380px] max-w-lg rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-md border border-emerald-500/25 p-3.5 sm:p-4 shadow-[0_12px_36px_rgba(75,15,26,0.18)] transition-all animate-bounce-in text-burgundy"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Thumbnail & Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-beige/20 border border-burgundy/10 shrink-0">
            <img src={image} alt={item.name} className="w-full h-full object-cover" />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-tl-md flex items-center justify-center text-white text-[9px] font-bold">
              ✓
            </span>
          </div>

          <div className="min-w-0 flex-1 text-right">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                تمت الإضافة للسلة ✓
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-burgundy truncate mt-0.5">{item.name}</h4>
            <p className="text-[10px] sm:text-xs text-burgundy/60 font-medium">
              {item.selectedSize ? `مقاس: ${item.selectedSize}` : ''}
              {item.selectedSize && item.selectedColor ? ' · ' : ''}
              {item.selectedColor ? `لون: ${item.selectedColor}` : ''}
              {` · ${Number(item.price || 0).toLocaleString('en-US')} ج.م`}
            </p>
          </div>
        </div>

        {/* Action Button & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCart();
            }}
            className="px-3.5 py-2 rounded-xl bg-burgundy hover:bg-[#650018] text-white text-xs font-extrabold shadow-sm active:scale-95 transition cursor-pointer whitespace-nowrap"
          >
            عرض السلة ←
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-burgundy/40 hover:text-burgundy text-sm transition cursor-pointer"
            aria-label="إغلاق التنبيه"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

