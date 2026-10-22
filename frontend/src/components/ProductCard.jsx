import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LazyImage from './LazyImage';
import { isDiscountActive, cleanProductName } from '../utils/discount';
import CompareContext from '../context/CompareContext';
import { extractProductColors, getColorHex } from '../utils/colorSwatches';

const fallbackImages = {
  Blouse: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
  Chemise: 'https://images.unsplash.com/photo-1520975915070-3d4fa8f300fd?auto=format&fit=crop&w=900&q=80',
  Skirt: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
  Dress: 'https://images.unsplash.com/photo-1521335629791-ce4aec67dd83?auto=format&fit=crop&w=900&q=80',
  Pantalon: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
  'T-shirt': 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
  Portefeuille: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80'
};

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

function ProductCard({ product }) {
  const navigate = useNavigate();
  const { addToCompare, isComparing } = useContext(CompareContext);
  const isItemComparing = isComparing(product?._id);
  const image = product?.images?.[0] || fallbackImages[product?.category] || fallbackImages.Blouse;
  const [activeColor, setActiveColor] = useState(null);

  const rawColors = extractProductColors(product);
  const colors = rawColors.length > 0 ? rawColors : ['بورجندي', 'كحلي', 'بيج', 'زيتي'];

  const handleColorClick = (e, colorName) => {
    e.stopPropagation();
    setActiveColor(prev => prev === colorName ? null : colorName);
  };

  return (
    <div
      onClick={() => navigate(`/product/${product._id}`)}
      className="reveal-on-scroll group stagger-item interactive-card flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl sm:rounded-[1.75rem] border border-burgundy/10 bg-white shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className="relative overflow-hidden aspect-[4/3] sheen-wrapper bg-[#FBF7F4]">
        {/* Compare Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            addToCompare(product);
          }}
          className={`absolute top-2 sm:top-4 right-2 sm:right-4 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-md backdrop-blur-sm z-20 ${
            isItemComparing
              ? 'bg-amber-400 text-burgundy font-black scale-105 ring-2 ring-amber-300 shadow-amber-900/30'
              : 'bg-white/90 text-burgundy/80 hover:bg-white hover:text-burgundy hover:scale-105'
          }`}
          title={isItemComparing ? 'إزالة من المقارنة' : 'مقارنة هذا الموديل'}
        >
          <span className="text-xs sm:text-sm">{isItemComparing ? '✓' : 'مقارنة'}</span>
        </button>

        {/* Base Image */}
        <LazyImage
          src={image}
          alt={cleanProductName(product)}
          className={`w-full h-full transition-all duration-700 ease-out group-hover:scale-105 ${
            product.images?.[1] && !activeColor ? 'group-hover:opacity-0' : ''
          }`}
        />

        {product.images?.[1] && !activeColor && (
          <img
            src={product.images[1]}
            alt={`${cleanProductName(product)} - 2`}
            className="absolute inset-0 w-full h-full object-cover opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {/* 🎨 Digital Color Recolor Layer (Instant preview on card) */}
        {activeColor && (
          <>
            <div
              className="absolute inset-0 pointer-events-none transition-all duration-300 z-10"
              style={{
                backgroundColor: getColorHex(activeColor),
                mixBlendMode: 'color',
                opacity: 0.85
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none transition-all duration-300 z-10"
              style={{
                backgroundColor: getColorHex(activeColor),
                mixBlendMode: 'multiply',
                opacity: 0.16
              }}
            />
            {/* Color Badge */}
            <div className="absolute top-2 left-2 z-20 bg-burgundy/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 backdrop-blur-xs animate-fadeIn">
              <span className="w-1.5 h-1.5 rounded-full border border-white" style={{ backgroundColor: getColorHex(activeColor) }} />
              <span>{activeColor} ✨</span>
            </div>
          </>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-burgundy/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-90" />
        <div className="absolute left-2 sm:left-4 top-2 sm:top-4 rounded-full border border-white/60 bg-white/90 px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-medium tracking-[0.15em] text-burgundy shadow-sm">
          عرض التفاصيل
        </div>

        {isDiscountActive(product) && (
          <div className="absolute left-2 sm:left-4 top-9 sm:top-12 rounded-full bg-red-600 px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-sm z-10">
            خصم {Math.round((1 - product.discountPrice / product.price) * 100)}%
          </div>
        )}

        {product.stock === 0 ? (
          <div className="absolute right-2 sm:right-4 bottom-2 sm:bottom-4 rounded-full bg-red-600 text-white px-2.5 sm:px-3 py-0.5 text-[9px] sm:text-[10px] font-bold shadow-sm z-10">
            نفذت الكمية
          </div>
        ) : product.stock <= 5 ? (
          <div className="absolute right-2 sm:right-4 bottom-2 sm:bottom-4 rounded-full bg-amber-500 text-white px-2.5 sm:px-3 py-0.5 text-[9px] sm:text-[10px] font-bold shadow-md flex items-center gap-1 pulse-glow z-10">
            <span>متبقي {product.stock} قطع فقط</span>
          </div>
        ) : product.stock <= 10 ? (
          <div className="absolute right-2 sm:right-4 bottom-2 sm:bottom-4 rounded-full bg-burgundy/90 text-white px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold shadow-sm flex items-center gap-1 z-10">
            <span className="text-[9px] font-bold">طلب متزايد</span>
          </div>
        ) : (
          <div className="absolute right-2 sm:right-4 bottom-2 sm:bottom-4 rounded-full bg-white/95 px-2.5 sm:px-3 py-0.5 text-[9px] sm:text-[10px] font-semibold text-burgundy shadow-sm z-10">
            متوفر
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="flex flex-col justify-between p-3 sm:p-4 text-burgundy space-y-2">
        <div>
          {/* Category & Clickable Color Swatches */}
          <div className="flex items-center justify-between gap-1.5">
            <p className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-[0.2em] text-burgundy/50">
              {product.category}
            </p>

            {/* Clickable Color Circles */}
            <div className="flex items-center gap-1.5 py-0.5">
              {colors.slice(0, 5).map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => handleColorClick(e, c)}
                  className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 hover:scale-125 cursor-pointer shadow-xs ${
                    activeColor === c ? 'scale-125 ring-2 ring-burgundy border-white shadow-sm' : 'border-black/20'
                  }`}
                  style={{ backgroundColor: getColorHex(c) }}
                  title={`معاينة لون ${c} على القطعة`}
                />
              ))}
              {colors.length > 5 && (
                <span className="text-[8px] text-burgundy/50 font-mono font-bold">+{colors.length - 5}</span>
              )}
            </div>
          </div>

          <h3 className="text-xs sm:text-sm font-semibold mt-1 text-burgundy/90 line-clamp-1">
            {cleanProductName(product)}
          </h3>
        </div>

        <div className="flex items-baseline gap-2 pt-1 border-t border-burgundy/5">
          {isDiscountActive(product) ? (
            <>
              <span className="text-sm font-bold text-burgundy">{EGP(product.discountPrice)}</span>
              <span className="text-[10px] text-red-500 line-through">{EGP(product.price)}</span>
            </>
          ) : (
            <span className="text-sm font-bold text-burgundy">{EGP(product.price)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
