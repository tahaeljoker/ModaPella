import { useContext, useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import CartContext from '../context/CartContext';
import CompareContext from '../context/CompareContext';
import LazyImage from '../components/LazyImage';
import ProductCard from '../components/ProductCard';
import sampleProducts from '../data/sampleProducts';
import { isDiscountActive, cleanProductName } from '../utils/discount';
import QuickOrderModal from '../components/QuickOrderModal';
import ShareOutfitModal from '../components/ShareOutfitModal';
import MannequinComparisonSlider from '../components/MannequinComparisonSlider';
import { getColorHex, registerCustomColors } from '../utils/colorSwatches';
import { resolveImageUrl } from '../utils/imageUrl';

const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=80';

export function getArabicCategoryName(category, name = '') {
  const cat = String(category || '').trim().toLowerCase();
  const text = `${cat} ${name}`.toLowerCase();

  if (text.includes('جاكيت') || text.includes('معطف') || text.includes('jacket') || text.includes('coat')) return 'جاكيت';
  if (text.includes('بليزر') || text.includes('blazer')) return 'بليزر';
  if (text.includes('بلوز') || text.includes('blouse') || text.includes('top')) return 'بلوزة';
  if (text.includes('شميز') || text.includes('قميص') || text.includes('chemise') || text.includes('shirt')) return 'شميز';
  if (text.includes('فستان') || text.includes('دريس') || text.includes('dress')) return 'فستان';
  if (text.includes('كارد') || text.includes('cardigan')) return 'كاردجان';
  if (text.includes('بنطلون') || text.includes('سروال') || text.includes('pants') || text.includes('trousers') || text.includes('jeans') || text.includes('وايد ليج') || text.includes('وايد ليد')) return 'بنطلون';
  if (text.includes('جيبة') || text.includes('تنورة') || text.includes('skirt')) return 'جيبة (تنورة)';
  if (text.includes('عباية') || text.includes('عباءة') || text.includes('abaya')) return 'عباية';
  if (text.includes('شنطة') || text.includes('حقيبة') || text.includes('bag')) return 'شنطة (حقيبة)';
  if (text.includes('طقم') || text.includes('بدلة') || text.includes('set') || text.includes('suit')) return 'طقم كامل';

  if (category && /[\u0600-\u06FF]/.test(category)) return category;
  return category || 'أزياء نسائية أنيقة';
}

/* ─────────────────────────────────────────────────────────────
   Presentational Sub-Components (Clean Architecture & DRY UI)
───────────────────────────────────────────────────────────── */

function ProductBreadcrumbs({ onBack }) {
  return (
    <div className="flex items-center justify-between border-b border-burgundy/10 pb-4 mb-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-full border border-burgundy/15 bg-white px-4 py-2 text-xs sm:text-sm font-bold text-burgundy transition-all hover:bg-burgundy hover:text-white shadow-2xs active:scale-95 cursor-pointer"
        aria-label="الرجوع إلى الصفحة السابقة"
      >
        <span className="text-base leading-none">→</span>
        <span>الرجوع</span>
      </button>
      <Link to="/shop" className="text-xs sm:text-sm text-burgundy/60 hover:text-burgundy underline transition-colors">
        تصفح كل التشكيلة
      </Link>
    </div>
  );
}

function ProductGallery({
  product,
  activeImageIdx,
  setActiveImageIdx,
  displayedImage,
  fitMode,
  setFitMode,
  onZoom,
  siteConfig,
  onImageChange
}) {
  const hasMultipleImages = Boolean(product.images && product.images.length > 1);
  const showMannequin = Boolean(product.mannequinImage && siteConfig?.features?.mannequinComparison !== false);

  return (
    <div className="flex flex-col gap-4 w-full max-w-full min-w-0 overflow-hidden">
      {showMannequin ? (
        <MannequinComparisonSlider
          flatImage={
            product.images && product.images.length > 0
              ? resolveImageUrl(product.images[activeImageIdx])
              : FALLBACK_PRODUCT_IMAGE
          }
          mannequinImage={resolveImageUrl(product.mannequinImage)}
          productName={cleanProductName(product)}
          aspectRatio="aspect-[3/4] sm:aspect-[4/5] max-h-[380px] sm:max-h-[580px]"
          onImageClick={onZoom}
        />
      ) : (
        <div className="relative overflow-hidden rounded-3xl bg-[#FAF7F5] aspect-[3/4] sm:aspect-[4/5] max-h-[380px] sm:max-h-[580px] group border border-burgundy/10 shadow-inner flex items-center justify-center select-none w-full max-w-full min-w-0">
          {/* Floating Glassmorphism Toolbar */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-burgundy text-xs font-bold shadow-xs border border-burgundy/10 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title={fitMode === 'contain' ? 'ملء الإطار' : 'إظهار القطعة بالكامل'}
              aria-label={fitMode === 'contain' ? 'ملء الإطار' : 'إظهار القطعة بالكامل'}
            >
              <span>{fitMode === 'contain' ? 'ملء الإطار' : 'إظهار كامل'}</span>
            </button>

            <button
              type="button"
              onClick={onZoom}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-burgundy text-xs font-bold shadow-xs border border-burgundy/10 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="تكبير الصورة"
              aria-label="تكبير الصورة"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
              <span>تكبير</span>
            </button>
          </div>

          <div
            onClick={onZoom}
            className="w-full h-full min-w-0 min-h-0 max-w-full max-h-full cursor-zoom-in transition-all duration-300 hover:scale-[1.01] flex items-center justify-center p-3"
          >
            <LazyImage
              src={displayedImage}
              alt={cleanProductName(product)}
              className="w-full h-full min-w-0 min-h-0 max-w-full max-h-full"
              fit={fitMode}
            />
          </div>

          {/* Navigation Arrows */}
          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageChange(activeImageIdx === 0 ? product.images.length - 1 : activeImageIdx - 1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 border border-burgundy/15 text-burgundy shadow-md transition hover:bg-white hover:scale-105 active:scale-95 z-20 cursor-pointer"
                aria-label="الصورة التالية"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageChange(activeImageIdx === product.images.length - 1 ? 0 : activeImageIdx + 1);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 border border-burgundy/15 text-burgundy shadow-md transition hover:bg-white hover:scale-105 active:scale-95 z-20 cursor-pointer"
                aria-label="الصورة السابقة"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </>
          )}

          {/* Dots Indicator */}
          {hasMultipleImages && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-burgundy/60 px-3 py-1.5 rounded-full backdrop-blur-xs">
              {product.images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageChange(idx);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeImageIdx === idx ? 'w-5 bg-white' : 'w-2 bg-white/60 hover:bg-white'
                  }`}
                  aria-label={`الانتقال إلى صورة ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Thumbnails Track */}
      {(hasMultipleImages || Boolean(product.mannequinImage)) && (
        <div className="flex gap-2.5 overflow-x-auto py-1 shrink-0 select-none scrollbar-thin">
          {product.images?.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onImageChange(idx)}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-[#FAF7F5] border-2 transition-all p-1 flex items-center justify-center cursor-pointer shrink-0 ${
                activeImageIdx === idx
                  ? 'border-burgundy shadow-sm ring-2 ring-burgundy/20 scale-95'
                  : 'border-transparent opacity-75 hover:opacity-100 hover:scale-95'
              }`}
              aria-label={`عرض الصورة ${idx + 1}`}
            >
              <img src={resolveImageUrl(img)} alt={`مصغرة ${idx + 1}`} className="w-full h-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductPricingStock({ product, isDiscount }) {
  const discountPercent = isDiscount ? Math.round((1 - product.discountPrice / product.price) * 100) : 0;

  return (
    <div className="rounded-2xl border border-burgundy/10 bg-white p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Price Block */}
      <div>
        <p className="text-xs font-bold text-burgundy/60 mb-1">السعر الحالي</p>
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span className="text-2xl sm:text-3xl font-black text-burgundy">
            {Number(isDiscount ? product.discountPrice : product.price).toLocaleString('en-US')} ج.م
          </span>
          {isDiscount && (
            <>
              <span className="text-sm font-semibold text-red-500/80 line-through">
                {Number(product.price).toLocaleString('en-US')} ج.م
              </span>
              <span className="text-[11px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                خصم {discountPercent}%
              </span>
            </>
          )}
        </div>
      </div>

      {/* Stock Status Badge */}
      <div className="sm:text-left border-t sm:border-t-0 pt-3 sm:pt-0 border-burgundy/10">
        <p className="text-xs font-bold text-burgundy/60 mb-1 sm:text-left">حالة التوفر</p>
        {product.stock === 0 ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
            <span>●</span>
            <span>نفد من المخزن</span>
          </span>
        ) : product.stock <= 5 ? (
          <div className="flex flex-col sm:items-end">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
              <span>●</span>
              <span>متبقي {product.stock} قطع فقط</span>
            </span>
            <span className="text-[10px] text-amber-700/80 font-medium mt-0.5">متبقي قطع معدودة بالمحل - احجزي مقاسكِ قبل النفاذ</span>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span>متوفر بالمحل وجاهز للشحن الفوري لباب بيتكِ</span>
          </span>
        )}
      </div>
    </div>
  );
}

function ProductSizeSelector({
  sizes,
  selectedSize,
  onSelectSize,
  isSizeOutOfStock,
  sizeError,
  sizeSectionRef
}) {
  if (!sizes || sizes.length === 0) return null;

  return (
    <div
      ref={sizeSectionRef}
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-300 ${
        sizeError ? 'border-red-400 bg-red-50/50 ring-2 ring-red-200' : 'border-burgundy/10 bg-[#FAF7F5]'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-burgundy flex items-center gap-2">
          <span>اختاري المقاس:</span>
          {selectedSize && (
            <span className="text-xs font-black text-burgundy bg-white px-2.5 py-0.5 rounded-lg border border-burgundy/15">
              {selectedSize}
            </span>
          )}
        </h3>
        {sizeError && (
          <span className="text-xs font-bold text-red-600 animate-pulse">
            يرجى اختيار المقاس أولاً
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5">
        {sizes.map((s) => {
          const isSelected = selectedSize === s;
          const isOutOfStock = isSizeOutOfStock(s);

          return (
            <button
              key={s}
              type="button"
              disabled={isOutOfStock}
              onClick={() => onSelectSize(s)}
              className={`min-w-[3.25rem] min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer ${
                isOutOfStock
                  ? 'border border-gray-200 bg-gray-100 text-gray-400 line-through cursor-not-allowed opacity-50'
                  : isSelected
                  ? 'border-2 border-burgundy bg-burgundy text-white shadow-md ring-2 ring-burgundy/25 scale-105 active:scale-95'
                  : 'border border-burgundy/20 bg-white text-burgundy hover:border-burgundy hover:bg-burgundy/5 active:scale-95'
              }`}
              title={isOutOfStock ? `${s} (نفد من المخزون)` : `اختيار مقاس ${s}`}
              aria-label={`اختيار مقاس ${s}`}
            >
              <span>{s}</span>
              {isSelected && <span className="text-[10px]">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProductColorSelector({ colors, selectedColor, onSelectColor }) {
  if (!colors || colors.length === 0) return null;

  return (
    <div className="rounded-2xl border border-burgundy/10 bg-[#FAF7F5] p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-burgundy">
          الألوان المتاحة ({colors.length}):
        </h3>
        {selectedColor && (
          <span className="text-xs font-bold text-burgundy bg-white px-2.5 py-1 rounded-xl border border-burgundy/15 flex items-center gap-1.5 shadow-2xs">
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/20"
              style={{ backgroundColor: getColorHex(selectedColor) }}
            />
            <span>اللون المختار: {selectedColor}</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center pt-1">
        {colors.map((c) => {
          const isSelected = selectedColor === c;
          const hex = getColorHex(c);

          return (
            <div key={c} className="relative group">
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-burgundy px-2 py-0.5 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-30">
                {c}
              </span>

              <button
                type="button"
                onClick={() => onSelectColor(c)}
                className={`relative w-11 h-11 rounded-full transition-all duration-200 p-0.5 flex items-center justify-center cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-offset-2 ring-burgundy scale-110 shadow-md'
                    : 'opacity-85 hover:opacity-100 hover:scale-105 border border-burgundy/20'
                }`}
                aria-label={`اختيار لون ${c}`}
                title={c}
              >
                <span
                  className="w-full h-full rounded-full border border-black/15 shadow-inner"
                  style={{ backgroundColor: hex }}
                />
                {isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow">
                    ✓
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductQuantitySelector({ quantity, setQuantity, stock }) {
  return (
    <div className="rounded-2xl border border-burgundy/10 bg-[#FAF7F5] p-4 sm:p-5">
      <h3 className="text-sm font-bold text-burgundy mb-3">الكمية المطلوبة</h3>
      <div className="flex items-center gap-3">
        <div className="flex items-center border border-burgundy/20 bg-white rounded-xl overflow-hidden shadow-2xs">
          <button
            type="button"
            disabled={quantity <= 1 || stock === 0}
            onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
            className="w-11 h-11 flex items-center justify-center text-lg font-bold text-burgundy hover:bg-burgundy/10 disabled:opacity-30 transition cursor-pointer active:scale-95"
            aria-label="تقليل الكمية"
          >
            −
          </button>
          <span className="w-12 text-center font-extrabold text-sm text-burgundy">
            {stock === 0 ? 0 : quantity}
          </span>
          <button
            type="button"
            disabled={quantity >= stock || stock === 0}
            onClick={() => setQuantity((prev) => Math.min(stock, prev + 1))}
            className="w-11 h-11 flex items-center justify-center text-lg font-bold text-burgundy hover:bg-burgundy/10 disabled:opacity-30 transition cursor-pointer active:scale-95"
            aria-label="زيادة الكمية"
          >
            +
          </button>
        </div>
        <span className="text-xs text-burgundy/70 font-medium">
          {stock === 0
            ? 'القطعة غير متوفرة حالياً'
            : stock <= 5
            ? `أقصى كمية متاحة: ${stock} قطع`
            : 'متوفر بالمحل وجاهز للشحن الفوري لباب بيتكِ'}
        </span>
      </div>
    </div>
  );
}

function ProductActionButtons({
  product,
  onQuickOrder,
  onAddToCart,
  added,
  mainActionRef,
  isItemComparing,
  onToggleCompare,
  compareEnabled,
  shareEnabled,
  onOpenShare
}) {
  const isOutOfStock = product.stock === 0;

  return (
    <div className="space-y-3 pt-2">
      {/* Primary Actions (Observed by IntersectionObserver) */}
      <div ref={mainActionRef} className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onQuickOrder}
          disabled={isOutOfStock}
          className={`flex-1 rounded-2xl min-h-[48px] px-6 py-3.5 text-sm sm:text-base font-extrabold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-burgundy/20 cursor-pointer ${
            isOutOfStock
              ? 'bg-gray-400 cursor-not-allowed shadow-none'
              : 'bg-burgundy hover:bg-[#650018] active:scale-[0.98]'
          }`}
          aria-label="اطلبي بنقرة واحدة والدفع بعد المعاينة"
        >
          <span>اطلبي بنقرة واحدة (الدفع بعد المعاينة)</span>
        </button>

        <button
          type="button"
          onClick={onAddToCart}
          disabled={isOutOfStock}
          className={`rounded-2xl min-h-[48px] px-6 py-3.5 text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-2 border-2 cursor-pointer ${
            isOutOfStock
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : added
              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
              : 'border-burgundy/30 bg-white text-burgundy hover:bg-burgundy/5 active:scale-[0.98]'
          }`}
          aria-label="أضيفي لإطلالتكِ اليوم"
        >
          <span>{isOutOfStock ? 'غير متوفر' : added ? 'انضمت لسلتكِ بنجاح' : 'أضيفي لإطلالتكِ اليوم'}</span>
        </button>
      </div>

      {/* Trust Reassurance Microcopy */}
      <p className="text-[11px] text-center text-burgundy/60 font-semibold pt-0.5">
        معاينة وقياس متاح مع المندوب قبل الدفع - استبدال واسترجاع سهل وسريع
      </p>

      {/* Secondary Actions: Comparison & Share */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {compareEnabled && (
          <button
            type="button"
            onClick={onToggleCompare}
            className={`rounded-xl py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border transition cursor-pointer active:scale-95 ${
              isItemComparing
                ? 'bg-amber-50 border-amber-400 text-burgundy font-black shadow-xs'
                : 'bg-white hover:bg-[#FAF7F5] border-burgundy/15 text-burgundy/80 hover:text-burgundy'
            }`}
            aria-label={isItemComparing ? 'إزالة من المقارنة' : 'مقارنة الموديل'}
          >
            <span className="truncate">{isItemComparing ? '✓ في المقارنة' : 'مقارنة الموديل'}</span>
          </button>
        )}

        {shareEnabled && (
          <button
            type="button"
            onClick={onOpenShare}
            className="rounded-xl py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border border-amber-500/30 bg-gradient-to-r from-amber-50 via-white to-amber-50 hover:from-amber-100 hover:to-amber-100 text-burgundy transition shadow-2xs active:scale-95 cursor-pointer"
            aria-label="مشاركة اللوك مع الأصدقاء"
          >
            <span>شاركي اللوك مع صديقتكِ</span>
          </button>
        )}
      </div>
    </div>
  );
}

function ProductSpecs({ categoryName, sizes, colors }) {
  return (
    <div className="rounded-2xl border border-burgundy/10 bg-[#FAF7F5] p-5 sm:p-6 text-burgundy/80">
      <h2 className="text-sm font-bold text-burgundy">معلومات المنتج</h2>
      <ul className="mt-3.5 space-y-2.5 text-xs sm:text-sm leading-6">
        <li className="flex items-center gap-2">
          <span className="font-semibold text-burgundy/70">النوع (الصنف):</span>
          <span className="font-bold text-burgundy bg-white px-2.5 py-0.5 rounded-lg border border-burgundy/15">
            {categoryName}
          </span>
        </li>
        <li>
          <span className="font-semibold text-burgundy/70">المقاسات:</span>{' '}
          <span>{sizes?.join('، ') || 'غير محدد'}</span>
        </li>
        <li>
          <span className="font-semibold text-burgundy/70">الألوان:</span>{' '}
          <span>{colors?.join('، ') || 'متعدد'}</span>
        </li>
      </ul>
    </div>
  );
}

function ProductLightboxModal({
  isOpen,
  onClose,
  displayedImage,
  images,
  activeImageIdx,
  setActiveImageIdx,
  productName
}) {
  if (!isOpen) return null;

  const hasMultipleImages = Boolean(images && images.length > 1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="معاينة الصورة بالحجم الكامل"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3 sm:p-6 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white text-lg transition z-50 font-bold border border-white/20 cursor-pointer"
        aria-label="إغلاق المعاينة"
      >
        ✕
      </button>

      <div
        className="relative max-w-full max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={displayedImage}
          alt={productName}
          className="max-w-[95vw] max-h-[88vh] rounded-2xl object-contain shadow-2xl"
        />

        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={() => setActiveImageIdx(activeImageIdx === 0 ? images.length - 1 : activeImageIdx - 1)}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white shadow-md transition z-50 border border-white/20 cursor-pointer"
              aria-label="الصورة السابقة"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setActiveImageIdx(activeImageIdx === images.length - 1 ? 0 : activeImageIdx + 1)}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white shadow-md transition z-50 border border-white/20 cursor-pointer"
              aria-label="الصورة التالية"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ProductStickyBar({
  isVisible,
  displayedImage,
  productName,
  price,
  discountPrice,
  isDiscount,
  selectedSize,
  stock,
  added,
  onAddToCart
}) {
  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-burgundy/15 px-4 py-2.5 shadow-[0_-6px_25px_rgba(0,0,0,0.12)] flex items-center justify-between gap-3 md:hidden transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
    >
      {/* Product Thumbnail & Details */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <img
          src={displayedImage}
          alt={productName}
          className="w-12 h-12 rounded-xl object-contain bg-[#FAF7F5] border border-burgundy/10 p-1 shrink-0"
        />
        <div className="min-w-0 flex-1 text-right">
          <h4 className="text-xs font-bold text-burgundy truncate">{productName}</h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs sm:text-sm font-black text-burgundy whitespace-nowrap">
              {Number(isDiscount ? discountPrice : price).toLocaleString('en-US')} ج.م
            </span>
            {selectedSize && (
              <span className="text-[10px] bg-burgundy/10 text-burgundy px-1.5 py-0.5 rounded-md font-bold truncate">
                مقاس: {selectedSize}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={onAddToCart}
        disabled={stock === 0}
        className="h-11 px-4 rounded-xl bg-burgundy hover:bg-[#650018] text-white text-xs font-black shadow-md shadow-burgundy/25 transition-transform active:scale-95 disabled:bg-gray-400 shrink-0 flex items-center gap-1.5 cursor-pointer"
        aria-label="أضيفي لإطلالتكِ اليوم"
      >
        <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
        <span>{stock === 0 ? 'غير متوفر' : added ? 'انضمت لسلتكِ' : 'أضيفي لإطلالتكِ'}</span>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Container Component (State & Logic Preserved 100%)
───────────────────────────────────────────────────────────── */

function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useContext(CartContext);
  const { addToCompare, isComparing } = useContext(CompareContext);
  const [product, setProduct] = useState(null);
  const isItemComparing = isComparing(product?._id);
  const [error, setError] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [sizeError, setSizeError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [colorOverride, setColorOverride] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('201090048832');
  const [fitMode, setFitMode] = useState('contain');
  const [siteConfig, setSiteConfig] = useState(null);

  // Sticky Mobile Bar via IntersectionObserver
  const [showStickyBar, setShowStickyBar] = useState(false);
  const mainActionRef = useRef(null);
  const sizeSectionRef = useRef(null);

  useEffect(() => {
    api.get('/admin/site-config')
      .then((res) => {
        if (res.data) setSiteConfig(res.data);
        if (res.data?.whatsappNumber) setWhatsappNumber(res.data.whatsappNumber);
        if (res.data?.customColors) registerCustomColors(res.data.customColors);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.get(`/products/${id}?context=storefront`)
      .then((response) => setProduct(response.data))
      .catch(() => {
        const sample = sampleProducts.find((item) => item._id === id);
        if (sample) {
          setProduct(sample);
        } else {
          setError('تعذر تحميل المنتج');
        }
      });
  }, [id]);

  useEffect(() => {
    if (product) {
      if (product.sizes?.length === 1) {
        setSelectedSize(product.sizes[0]);
      } else {
        setSelectedSize('');
      }
      setSelectedColor(product.colors?.[0] || '');
      setQuantity(product.stock > 0 ? 1 : 0);
      setActiveImageIdx(0);
      setColorOverride(null);
      setSizeError(false);

      api.get(`/products?category=${product.category}&excludeId=${product._id}&limit=4`)
        .then((res) => setSimilarProducts(res.data))
        .catch((err) => console.error('Error loading similar products:', err));
    }
  }, [product]);

  useEffect(() => {
    const target = mainActionRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const rect = target.getBoundingClientRect();
        setShowStickyBar(!entry.isIntersecting && rect.top < 0);
      },
      {
        threshold: 0.1
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [product]);

  if (error) {
    return (
      <section className="py-10 text-burgundy" dir="rtl">
        <div className="rounded-3xl border border-burgundy/10 bg-white p-10 shadow-soft">{error}</div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="py-10 text-burgundy" dir="rtl">
        <div className="rounded-3xl border border-burgundy/10 bg-white p-10 shadow-soft">جاري التحميل...</div>
      </section>
    );
  }

  const isSizeOutOfStock = (sizeName) => {
    if (product.stock === 0) return true;
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      const sizeVariants = product.variants.filter(
        (v) => v.size && v.size.trim().toLowerCase() === sizeName.trim().toLowerCase()
      );
      if (sizeVariants.length > 0) {
        return sizeVariants.every((v) => (v.stock || 0) <= 0);
      }
    }
    return false;
  };

  const getColorPhoto = (colorName) => {
    if (!colorName) return null;
    if (Array.isArray(product?.colorImages)) {
      const match = product.colorImages.find(
        (ci) => ci.color && ci.color.trim().toLowerCase() === colorName.trim().toLowerCase() && ci.image
      );
      if (match) return match.image;
    }
    return null;
  };

  const handleSelectColor = (colorName) => {
    setSelectedColor(colorName);
    const photo = getColorPhoto(colorName);
    if (photo) {
      const photoIdx = product.images?.findIndex(
        (img) => img === photo || resolveImageUrl(img) === resolveImageUrl(photo)
      );
      if (photoIdx !== -1 && photoIdx !== undefined) {
        setActiveImageIdx(photoIdx);
        setColorOverride(null);
      } else {
        setColorOverride(photo);
      }
    } else {
      setColorOverride(null);
    }
  };

  const handleSelectSize = (sizeName) => {
    if (isSizeOutOfStock(sizeName)) return;
    setSelectedSize(sizeName);
    setSizeError(false);
  };

  const rawDefault =
    product?.images && product.images.length > 0
      ? product.images[activeImageIdx] || product.images[0]
      : FALLBACK_PRODUCT_IMAGE;

  const defaultImage = resolveImageUrl(rawDefault);
  const displayedImage = colorOverride ? resolveImageUrl(colorOverride) : defaultImage;

  const validateSizeSelection = () => {
    if (product?.sizes && product.sizes.length > 0 && !selectedSize) {
      setSizeError(true);
      sizeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!validateSizeSelection()) return;

    const activeDiscount = isDiscountActive(product);
    const cartItem = {
      ...product,
      price: activeDiscount ? product.discountPrice : product.price,
      originalPrice: product.price,
      isDiscountActive: activeDiscount,
      selectedSize: selectedSize || (product.sizes?.[0] || 'Free Size'),
      selectedColor: selectedColor || (product.colors?.[0] || 'افتراضي'),
      cartId: `${product._id}_${selectedSize || 'default'}_${selectedColor || 'default'}`
    };

    addItem(cartItem, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleOpenQuickOrder = () => {
    if (!validateSizeSelection()) return;
    setIsQuickOrderOpen(true);
  };

  const handleBackNavigation = () => {
    if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      const fallback = sessionStorage.getItem('mp_last_storefront_path') || '/shop';
      navigate(fallback, { state: { restoreScroll: true } });
    }
  };

  const categoryName = getArabicCategoryName(product.category, product.name);
  const productName = cleanProductName(product);
  const isDiscount = isDiscountActive(product);

  return (
    <section className="space-y-8 sm:space-y-12 py-4 sm:py-8 pb-28 sm:pb-12 text-burgundy w-full max-w-full overflow-hidden" dir="rtl">
      {/* Main Product Card Container */}
      <div className="rounded-3xl border border-burgundy/10 bg-white p-4 sm:p-8 lg:p-10 shadow-soft overflow-hidden w-full max-w-full">
        {/* Navigation Breadcrumb */}
        <ProductBreadcrumbs onBack={handleBackNavigation} />

        {/* 2-Column Product Grid */}
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] w-full max-w-full min-w-0 items-start">
          {/* Column 1: Image Gallery */}
          <ProductGallery
            product={product}
            activeImageIdx={activeImageIdx}
            setActiveImageIdx={setActiveImageIdx}
            displayedImage={displayedImage}
            fitMode={fitMode}
            setFitMode={setFitMode}
            onZoom={() => setIsLightboxOpen(true)}
            siteConfig={siteConfig}
            onImageChange={(idx) => {
              setActiveImageIdx(idx);
              setColorOverride(null);
            }}
          />

          {/* Column 2: Product Info & Configuration Flow */}
          <div className="space-y-5 sm:space-y-6">
            <div>
              <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-burgundy/60 mb-1">
                {categoryName}
              </p>
              <h1 className="text-xl sm:text-3xl font-extrabold text-burgundy">{productName}</h1>
            </div>

            {Boolean(product.description && product.description.trim() && !product.description.includes('وصف مميز للمنتج')) && (
              <p className="text-sm sm:text-base leading-relaxed text-burgundy/75">{product.description}</p>
            )}

            {/* Pricing & Stock Status */}
            <ProductPricingStock product={product} isDiscount={isDiscount} />

            {/* Size Selector */}
            <ProductSizeSelector
              sizes={product.sizes}
              selectedSize={selectedSize}
              onSelectSize={handleSelectSize}
              isSizeOutOfStock={isSizeOutOfStock}
              sizeError={sizeError}
              sizeSectionRef={sizeSectionRef}
            />

            {/* Color Selector */}
            <ProductColorSelector
              colors={product.colors}
              selectedColor={selectedColor}
              onSelectColor={handleSelectColor}
            />

            {/* Quantity Selector */}
            <ProductQuantitySelector
              quantity={quantity}
              setQuantity={setQuantity}
              stock={product.stock}
            />

            {/* Action Buttons (Observed by IntersectionObserver) */}
            <ProductActionButtons
              product={product}
              onQuickOrder={handleOpenQuickOrder}
              onAddToCart={handleAddToCart}
              added={added}
              mainActionRef={mainActionRef}
              isItemComparing={isItemComparing}
              onToggleCompare={() => addToCompare(product)}
              compareEnabled={siteConfig?.features?.productComparison !== false}
              shareEnabled={siteConfig?.features?.shareOutfit !== false}
              onOpenShare={() => setIsShareModalOpen(true)}
            />

            {/* Product Metadata Specifications */}
            <ProductSpecs
              categoryName={categoryName}
              sizes={product.sizes}
              colors={product.colors}
            />
          </div>
        </div>
      </div>

      {/* Similar Products Section */}
      <div className="rounded-3xl border border-burgundy/10 bg-white p-5 sm:p-8 shadow-soft">
        <h3 className="text-xl sm:text-2xl font-bold text-burgundy">منتجات مشابهة قد تعجبكِ</h3>
        <div className="mt-5 grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          {similarProducts.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-burgundy/40">لا توجد منتجات مشابهة حالياً</p>
          ) : (
            similarProducts.map((p) => <ProductCard key={p._id} product={p} />)
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      <ProductLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        displayedImage={displayedImage}
        images={product.images}
        activeImageIdx={activeImageIdx}
        setActiveImageIdx={setActiveImageIdx}
        productName={productName}
      />

      {/* Sticky Bottom Action Bar for Mobile (< 768px) */}
      <ProductStickyBar
        isVisible={showStickyBar}
        displayedImage={displayedImage}
        productName={productName}
        price={product.price}
        discountPrice={product.discountPrice}
        isDiscount={isDiscount}
        selectedSize={selectedSize}
        stock={product.stock}
        added={added}
        onAddToCart={handleAddToCart}
      />

      {/* Quick Order Modal */}
      <QuickOrderModal
        isOpen={isQuickOrderOpen}
        onClose={() => setIsQuickOrderOpen(false)}
        product={product}
        initialSize={selectedSize}
        initialColor={selectedColor}
        initialQty={quantity}
        whatsappNumber={whatsappNumber}
      />

      {/* Share Outfit Modal */}
      <ShareOutfitModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        product={product}
      />
    </section>
  );
}

export default ProductDetailsPage;
