import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import CartContext from '../context/CartContext';
import { isDiscountActive, cleanProductName } from '../utils/discount';
import { resolveImageUrl } from '../utils/imageUrl';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

export default function FavoritesDrawer({ isOpen, onClose }) {
  const { favorites, toggleFavorite } = useFavorites();
  const { addItem } = useContext(CartContext);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleAddToCart = (product) => {
    const hasDiscount = isDiscountActive(product);
    const cartItem = {
      ...product,
      price: hasDiscount ? product.discountPrice : product.price,
      originalPrice: product.price,
      isDiscountActive: hasDiscount,
      selectedSize: product.sizes?.[0] || 'One Size',
      selectedColor: product.colors?.[0] || 'اللون المعروض',
      cartId: `${product._id}_default`
    };
    addItem(cartItem, 1);
  };

  const handleAddAllToCart = () => {
    favorites.forEach((product) => {
      if ((product.stock ?? 1) > 0) {
        handleAddToCart(product);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-burgundy/40 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
        <div className="pointer-events-auto w-screen max-w-md transform bg-[#FAF7F2] shadow-2xl transition-all duration-300 flex flex-col h-full animate-slideLeft">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-burgundy/10 bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <svg className="w-4 h-4 fill-rose-600 stroke-rose-600" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <h2 className="text-base sm:text-lg font-black text-burgundy">
                قائمة المفضلة
              </h2>
              {favorites.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
                  {favorites.length}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#FAF7F5] hover:bg-burgundy/10 text-burgundy/60 hover:text-burgundy flex items-center justify-center transition border border-burgundy/10 text-sm font-bold cursor-pointer"
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>

          {/* List of items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {favorites.length === 0 ? (
              <div className="text-center py-20 px-4 space-y-4">
                <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center mx-auto border border-rose-100">
                  <svg className="w-9 h-9 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-burgundy">قائمة المفضلة فارغة حالياً</h3>
                  <p className="text-xs text-burgundy/60 max-w-xs mx-auto leading-relaxed">
                    اضغطي على رمز القلب في أي قطعة تعجبكِ أثناء التصفح لتجديها محفوظة هنا في أي وقت.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/shop');
                  }}
                  className="px-6 py-2.5 rounded-full bg-burgundy hover:bg-[#680017] text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  تصفحي أحدث الموديلات
                </button>
              </div>
            ) : (
              favorites.map((product) => {
                const img = product.images?.[0] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80';
                const hasDiscount = isDiscountActive(product);
                const isOutOfStock = product.stock === 0;

                return (
                  <div
                    key={product._id}
                    className="bg-white rounded-2xl p-3 border border-burgundy/10 shadow-2xs flex items-center gap-3 transition hover:shadow-xs"
                  >
                    {/* Image */}
                    <Link
                      to={`/product/${product._id}`}
                      onClick={onClose}
                      className="w-18 h-20 rounded-xl bg-[#FAF7F5] overflow-hidden shrink-0 border border-burgundy/5 flex items-center justify-center p-1"
                    >
                      <img
                        src={resolveImageUrl(img)}
                        alt={cleanProductName(product)}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-burgundy/50">
                          {product.category || 'أزياء'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(product)}
                          className="text-burgundy/40 hover:text-rose-600 transition p-1"
                          title="إزالة من المفضلة"
                          aria-label="إزالة من المفضلة"
                        >
                          <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <Link
                        to={`/product/${product._id}`}
                        onClick={onClose}
                        className="text-xs font-bold text-burgundy hover:underline block truncate"
                      >
                        {cleanProductName(product)}
                      </Link>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-black text-burgundy">
                            {hasDiscount ? EGP(product.discountPrice) : EGP(product.price)}
                          </span>
                          {hasDiscount && (
                            <span className="text-[10px] text-red-500 line-through">
                              {EGP(product.price)}
                            </span>
                          )}
                        </div>

                        {/* Add to Cart button */}
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => handleAddToCart(product)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                            isOutOfStock
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-burgundy hover:bg-[#680017] text-white shadow-2xs active:scale-95'
                          }`}
                        >
                          <span>{isOutOfStock ? 'نفد' : 'أضف للسلة'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action */}
          {favorites.length > 0 && (
            <div className="p-4 bg-white border-t border-burgundy/10 space-y-2 shrink-0">
              <button
                type="button"
                onClick={handleAddAllToCart}
                className="w-full py-3 rounded-2xl bg-burgundy hover:bg-[#680017] text-white font-extrabold text-xs sm:text-sm shadow-md transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <span>إضافة كل المتوفر إلى السلة</span>
                <span className="text-white/70">({favorites.filter(p => (p.stock ?? 1) > 0).length} قطعة)</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-center text-xs font-semibold text-burgundy/60 hover:text-burgundy transition"
              >
                متابعة التسوق
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

