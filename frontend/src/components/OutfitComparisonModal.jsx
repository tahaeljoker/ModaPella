import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CompareContext from '../context/CompareContext';
import { cleanProductName, isDiscountActive } from '../utils/discount';
import QuickOrderModal from './QuickOrderModal';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

export default function OutfitComparisonModal({ whatsappNumber = '201090048832' }) {
  const { compareItems, removeFromCompare, clearCompare, isCompareOpen, setIsCompareOpen } = useContext(CompareContext);
  const navigate = useNavigate();

  const [quickOrderProduct, setQuickOrderProduct] = useState(null);

  if (!isCompareOpen) return null;

  const item1 = compareItems[0] || null;
  const item2 = compareItems[1] || null;

  const handleOpenProduct = (productId) => {
    setIsCompareOpen(false);
    navigate(`/product/${productId}`);
  };

  return (
    <>
      <div
        dir="rtl"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={() => setIsCompareOpen(false)}
        />

        {/* Modal Dialog */}
        <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl bg-[#FAF7F2] border border-amber-500/30 shadow-2xl overflow-hidden z-10 animate-fade-in my-auto">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[#2B0610] via-[#4A0A1C] to-[#2B0610] text-white flex items-center justify-between border-b border-amber-500/20 shrink-0">
            <div className="flex items-center gap-2.5">
              
              <div>
                <h2 className="text-sm sm:text-lg font-black text-amber-200 tracking-wide">
                  مقارنة الإطلالات الفاخرة
                </h2>
                <p className="text-[10px] sm:text-xs text-white/70">
                  قارني التفاصيل والأسعار جنباً إلى جنب لاختيار الإطلالة الأجمل لكِ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {compareItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearCompare}
                  className="hidden sm:inline-flex text-[11px] font-semibold text-white/60 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition"
                >
                  مسح المقارنة
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCompareOpen(false)}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-sm font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body: Comparison Grid */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4">
            {compareItems.length === 0 ? (
              <div className="py-16 text-center space-y-3 text-burgundy/60">
                
                <p className="font-bold text-base text-burgundy">لم تختاري أي قطع للمقارنة بعد</p>
                <p className="text-xs">اضغطي على زر المقارنة على أي قطعة في المتجر لإضافتها هنا</p>
                <button
                  onClick={() => setIsCompareOpen(false)}
                  className="rounded-full bg-burgundy px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-[#650018] mt-2 transition"
                >
                  تصفح المتجر
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-6 items-stretch">
                {/* Column 1 */}
                <CompareProductCard
                  product={item1}
                  onRemove={() => removeFromCompare(item1._id)}
                  onView={() => handleOpenProduct(item1._id)}
                  onQuickOrder={() => setQuickOrderProduct(item1)}
                />

                {/* Column 2 */}
                {item2 ? (
                  <CompareProductCard
                    product={item2}
                    onRemove={() => removeFromCompare(item2._id)}
                    onView={() => handleOpenProduct(item2._id)}
                    onQuickOrder={() => setQuickOrderProduct(item2)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border-2 border-dashed border-burgundy/20 bg-white/50 p-4 sm:p-8 text-center text-burgundy/60 space-y-3 min-h-[300px]">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-burgundy/5 flex items-center justify-center text-2xl text-burgundy/40">
                      +
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-burgundy">
                      اختاري قطعة ثانية للمقارنة
                    </p>
                    <p className="text-[10px] sm:text-xs text-burgundy/60 max-w-[180px]">
                      تصفحي المنتجات واضغطي على علامة المقارنة في أي موديل
                    </p>
                    <button
                      onClick={() => setIsCompareOpen(false)}
                      className="rounded-xl border border-burgundy/30 bg-white px-4 py-2 text-[11px] sm:text-xs font-bold text-burgundy hover:bg-burgundy/5 transition"
                    >
                      تصفح المنتجات
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="px-4 py-2.5 bg-white border-t border-burgundy/10 text-center text-[10px] sm:text-xs text-burgundy/60 flex items-center justify-between shrink-0">
            <span>معاينة قبل الاستلام وشحن سريع لجميع المحافظات</span>
            {compareItems.length > 0 && (
              <button
                type="button"
                onClick={clearCompare}
                className="sm:hidden text-[10px] font-bold text-red-600 underline"
              >
                مسح
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Order Modal within Comparison */}
      {quickOrderProduct && (
        <QuickOrderModal
          isOpen={true}
          onClose={() => setQuickOrderProduct(null)}
          product={quickOrderProduct}
          initialSize={quickOrderProduct.sizes?.[0] || ''}
          initialColor={quickOrderProduct.colors?.[0] || ''}
          initialQty={1}
          whatsappNumber={whatsappNumber}
        />
      )}
    </>
  );
}

function CompareProductCard({ product, onRemove, onView, onQuickOrder }) {
  if (!product) return null;

  const hasDiscount = isDiscountActive(product);
  const currentPrice = hasDiscount ? product.discountPrice : product.price;

  return (
    <div className="flex flex-col h-full rounded-2xl sm:rounded-3xl bg-white border border-burgundy/10 shadow-sm overflow-hidden transition hover:shadow-md">
      {/* Product Image & Badges */}
      <div className="relative aspect-[4/3] sm:aspect-[4/3] bg-beige/10 overflow-hidden group">
        <img
          src={product.images?.[0] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80'}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Remove Button */}
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center text-xs transition z-10"
          title="إزالة هذه القطعة"
        >
          ✕
        </button>

        {/* Category Badge */}
        <span className="absolute bottom-2 right-2 rounded-full bg-white/90 backdrop-blur-sm px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-burgundy shadow-sm">
          {product.category || 'أزياء'}
        </span>

        {/* Discount Badge */}
        {hasDiscount && (
          <span className="absolute top-2 left-2 rounded-full bg-red-600 px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-white shadow">
            خصم {Math.round((1 - product.discountPrice / product.price) * 100)}%
          </span>
        )}
      </div>

      {/* Details Container */}
      <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {/* Title */}
          <h3 className="text-xs sm:text-sm font-bold text-burgundy line-clamp-2 leading-tight">
            {cleanProductName(product.name)}
          </h3>

          {/* Price */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base font-black text-burgundy">
              {EGP(currentPrice)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] sm:text-xs text-red-500 line-through">
                {EGP(product.price)}
              </span>
            )}
          </div>

          {/* Stock Availability */}
          <div className="pt-1 border-t border-burgundy/5 text-[10px] sm:text-xs">
            {product.stock === 0 ? (
              <span className="text-red-600 font-bold">✕ نفذت الكمية</span>
            ) : product.stock <= 5 ? (
              <span className="text-amber-600 font-bold">متبقي {product.stock} فقط</span>
            ) : (
              <span className="text-emerald-700 font-bold">✓ متوفر للشحن الفوري</span>
            )}
          </div>

          {/* Available Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] sm:text-[10px] text-burgundy/60 font-semibold block">المقاسات:</span>
              <div className="flex flex-wrap gap-1">
                {product.sizes.map((s) => (
                  <span
                    key={s}
                    className="rounded-md bg-beige/20 border border-burgundy/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-burgundy"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Available Colors */}
          {product.colors && product.colors.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] sm:text-[10px] text-burgundy/60 font-semibold block">الألوان:</span>
              <div className="flex flex-wrap gap-1 items-center">
                {product.colors.map((c) => (
                  <span
                    key={c}
                    className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border border-black/20 shadow-xs"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-1.5 border-t border-burgundy/10">
          <button
            type="button"
            onClick={onQuickOrder}
            disabled={product.stock === 0}
            className="w-full rounded-xl bg-burgundy hover:bg-[#650018] text-white py-2 sm:py-2.5 text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 shadow-sm active:scale-95 transition disabled:bg-gray-300"
          >
            <span>طلب سريع</span>
            
          </button>

          <button
            type="button"
            onClick={onView}
            className="w-full rounded-xl bg-beige/20 hover:bg-burgundy/5 text-burgundy py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold border border-burgundy/15 transition"
          >
            عرض التفاصيل
          </button>
        </div>
      </div>
    </div>
  );
}
