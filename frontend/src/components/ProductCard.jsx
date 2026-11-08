import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LazyImage from './LazyImage';
import { isDiscountActive, cleanProductName } from '../utils/discount';
import CompareContext from '../context/CompareContext';
import { getColorHex } from '../utils/colorSwatches';
import { resolveImageUrl } from '../utils/imageUrl';

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
  const { addToCompare, isComparing, compareEnabled } = useContext(CompareContext);
  const isItemComparing = isComparing(product?._id);
  const [selectedColor, setSelectedColor] = useState(null);

  // Exact colors defined for this product by the admin
  const colors = Array.isArray(product?.colors) && product.colors.length > 0
    ? product.colors.map(c => String(c).trim()).filter(Boolean)
    : [];

  // Find assigned real photo for selected color
  const getColorPhoto = (colorName) => {
    if (!colorName) return null;
    if (Array.isArray(product?.colorImages)) {
      const match = product.colorImages.find(
        ci => ci.color && ci.color.trim().toLowerCase() === colorName.trim().toLowerCase() && ci.image
      );
      if (match) return match.image;
    }
    return null;
  };

  const rawDefault = product?.images?.[0] || fallbackImages[product?.category] || fallbackImages.Blouse;
  const defaultImage = resolveImageUrl(rawDefault);
  const colorPhoto = selectedColor ? resolveImageUrl(getColorPhoto(selectedColor)) : null;
  const currentImage = colorPhoto || defaultImage;

  // Secondary flip image (when hovering on card)
  const secondaryImage = !selectedColor && product?.images && product.images.length > 1
    ? resolveImageUrl(product.images[1])
    : (!selectedColor && product?.mannequinImage ? resolveImageUrl(product.mannequinImage) : null);

  const handleCardClick = () => {
    try {
      const key = `mp_scroll_${window.location.pathname}${window.location.search}`;
      sessionStorage.setItem(key, String(window.scrollY));
    } catch (e) {}
    navigate(`/product/${product._id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group stagger-item flex h-full cursor-pointer flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-burgundy/10 bg-white p-2 sm:p-2.5 shadow-[0_2px_12px_rgba(75,15,26,0.03)] hover:shadow-[0_14px_30px_rgba(75,15,26,0.09)] hover:-translate-y-1 transition-all duration-300 ease-out select-none"
    >
      {/* Framed Image Box */}
      <div className="relative overflow-hidden aspect-[3/4] max-h-[220px] sm:max-h-[290px] rounded-xl sm:rounded-2xl bg-[#FAF7F5] flex items-center justify-center">
        {/* Compare Button */}
        {compareEnabled !== false && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addToCompare(product);
            }}
            className={`absolute top-2 right-2 h-7 w-7 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm backdrop-blur-sm z-20 ${
              isItemComparing
                ? 'bg-amber-400 text-burgundy font-black scale-105 ring-2 ring-amber-300 shadow-amber-900/30'
                : 'bg-white/90 text-burgundy/80 hover:bg-white hover:text-burgundy hover:scale-105'
            }`}
            title={isItemComparing ? 'إزالة من المقارنة' : 'مقارنة هذا الموديل'}
          >
            <span className="text-xs">{isItemComparing ? '✓' : 'مقارنة'}</span>
          </button>
        )}

        {/* Primary Product Image */}
        <img
          key={currentImage}
          src={currentImage}
          alt={cleanProductName(product)}
          className={`w-full h-full object-contain p-2 transition-all duration-500 ease-out ${
            secondaryImage ? 'group-hover:opacity-0 group-hover:scale-95' : 'group-hover:scale-105'
          }`}
          loading="lazy"
        />

        {/* Secondary Flip Image (Shows smoothly on hover) */}
        {secondaryImage && (
          <img
            src={secondaryImage}
            alt={`${cleanProductName(product)} - صورة إضافية`}
            className="absolute inset-0 w-full h-full object-contain p-2 transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 group-hover:scale-105 pointer-events-none"
            loading="lazy"
          />
        )}

        {/* Selected Color Badge */}
        {selectedColor && (
          <div className="absolute top-2 left-2 z-20 bg-burgundy/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 backdrop-blur-xs animate-fadeIn">
            <span className="w-1.5 h-1.5 rounded-full border border-white" style={{ backgroundColor: getColorHex(selectedColor) }} />
            <span>{selectedColor}</span>
          </div>
        )}

        {/* Discount Badge */}
        {isDiscountActive(product) && (
          <div className="absolute left-2 top-2 rounded-full bg-burgundy text-white px-2 py-0.5 text-[9px] font-bold shadow-xs z-10 tracking-wide">
            خصم {Math.round((1 - product.discountPrice / product.price) * 100)}%
          </div>
        )}

        {/* Multiple Photos Pill */}
        {product?.images && product.images.length > 1 && (
          <div className="absolute left-2 bottom-2 rounded-full bg-white/90 border border-burgundy/10 px-2 py-0.5 text-[8px] font-bold text-burgundy/70 shadow-xs flex items-center gap-1 z-10 transition-opacity duration-200 group-hover:opacity-0">
            <span>📷 {product.images.length}</span>
          </div>
        )}

        {/* Stock Status Badge */}
        {product.stock === 0 ? (
          <div className="absolute right-2 bottom-2 rounded-full bg-stone-900/90 text-white px-2 py-0.5 text-[8px] font-bold shadow-xs z-10">
            نفذت الكمية
          </div>
        ) : product.stock <= 5 ? (
          <div className="absolute right-2 bottom-2 rounded-full bg-amber-600 text-white px-2 py-0.5 text-[8px] font-bold shadow-xs z-10">
            <span>متبقي {product.stock} فقط</span>
          </div>
        ) : null}
      </div>

      {/* Card Info */}
      <div className="flex flex-col justify-between pt-2 px-1 text-burgundy space-y-1.5">
        <div>
          {/* Category & Color Circles */}
          <div className="flex items-center justify-between gap-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-burgundy/50">
              {product.category}
            </p>

            {colors.length > 0 && (
              <div className="flex items-center gap-1 py-0.5">
                {colors.slice(0, 4).map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => handleColorClick(e, c)}
                    className={`w-3 h-3 rounded-full border transition-all duration-200 hover:scale-125 cursor-pointer shadow-2xs ${
                      selectedColor === c ? 'scale-125 ring-2 ring-burgundy border-white shadow-xs' : 'border-black/20'
                    }`}
                    style={{ backgroundColor: getColorHex(c) }}
                    title={`عرض ${c}`}
                  />
                ))}
                {colors.length > 4 && (
                  <span className="text-[8px] text-burgundy/40 font-bold">+{colors.length - 4}</span>
                )}
              </div>
            )}
          </div>

          <h3 className="text-xs sm:text-sm font-bold text-burgundy/90 line-clamp-1 leading-snug mt-0.5">
            {cleanProductName(product)}
          </h3>
        </div>

        {/* Price Section */}
        <div className="flex items-baseline justify-between pt-1 border-t border-burgundy/5">
          <div className="flex items-baseline gap-1.5">
            {isDiscountActive(product) ? (
              <>
                <span className="text-sm sm:text-base font-extrabold text-burgundy">{EGP(product.discountPrice)}</span>
                <span className="text-[10px] text-red-500/80 line-through">{EGP(product.price)}</span>
              </>
            ) : (
              <span className="text-sm sm:text-base font-extrabold text-burgundy">{EGP(product.price)}</span>
            )}
          </div>
          <span className="text-[10px] font-bold text-burgundy/40 group-hover:text-burgundy transition-colors">
            عرض ←
          </span>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
