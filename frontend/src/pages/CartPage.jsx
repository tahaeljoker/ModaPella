import { useContext } from 'react';
import { Link } from 'react-router-dom';
import CartContext from '../context/CartContext';

function CartPage() {
  const { cart, removeItem, updateQuantity, clearCart, total } = useContext(CartContext);

  return (
    <section className="space-y-6 sm:space-y-10 py-4 sm:py-10 text-burgundy">
      <div className="rounded-2xl sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-4 sm:p-10 shadow-soft">
        <h1 className="text-2xl sm:text-4xl font-extrabold">سلة التسوق</h1>
        <p className="mt-1.5 sm:mt-4 text-xs sm:text-sm text-burgundy/70">راجع مشترياتك وأكمل الطلب أو عد إلى المتجر لإضافة المزيد.</p>
      </div>

      {cart.length === 0 ? (
        <div className="rounded-2xl sm:rounded-[2.5rem] border border-burgundy/10 bg-beige/20 p-6 sm:p-10 text-center shadow-soft">
          <p className="text-lg sm:text-xl font-bold">السلة فارغة</p>
          <p className="mt-1.5 sm:mt-3 text-xs sm:text-sm text-burgundy/70">أضف منتجًا واحدًا على الأقل لتتمكن من المتابعة.</p>
          <Link to="/shop" className="mt-4 sm:mt-6 inline-flex rounded-xl sm:rounded-full bg-burgundy px-6 py-2.5 sm:py-3 text-sm font-semibold text-white transition hover:bg-[#650018]">اذهب إلى المتجر</Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.8fr_0.9fr] items-start">
          <div className="space-y-4 sm:space-y-6">
            {cart.map((item) => (
              <div key={item.cartId} className="rounded-xl sm:rounded-[2rem] border border-burgundy/10 bg-white p-3 sm:p-5 shadow-soft flex gap-3 sm:gap-5 items-start sm:items-center">
                <div className="aspect-square h-20 w-20 sm:h-32 sm:w-32 overflow-hidden rounded-lg sm:rounded-[1.5rem] flex-shrink-0">
                  <img src={item.images?.[0] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80'} alt={item.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-sm sm:text-xl font-bold text-burgundy truncate">{item.name}</h2>
                      <p className="text-[10px] sm:text-sm text-burgundy/75 mt-0.5">{item.category}</p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-[9px] text-burgundy/50 sm:block hidden">السعر للقطعة</p>
                      {item.isDiscountActive ? (
                        <div className="flex flex-col items-end">
                          <p className="text-sm sm:text-xl font-bold text-burgundy">{Number(item.price).toLocaleString('en-US')} ج.م</p>
                          <p className="text-xs text-red-500 line-through">{Number(item.originalPrice).toLocaleString('en-US')} ج.م</p>
                        </div>
                      ) : (
                        <p className="text-sm sm:text-xl font-bold text-burgundy">{Number(item.price).toLocaleString('en-US')} ج.م</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-burgundy/70">
                    <span>المقاس: <span className="font-semibold text-burgundy">{item.selectedSize || 'غير محدد'}</span></span>
                    <span>اللون: <span className="font-semibold text-burgundy">{item.selectedColor || 'غير محدد'}</span></span>
                  </div>
                  <div className="mt-3.5 flex items-center justify-between gap-3 pt-3 border-t border-burgundy/5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-burgundy/70">الكمية:</label>
                      <select
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.cartId, Number(e.target.value))}
                        className="rounded-lg border border-burgundy/20 bg-beige/10 px-2 py-1 text-xs text-burgundy font-bold outline-none"
                      >
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((qty) => (
                          <option key={qty} value={qty}>{qty}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.cartId)}
                      className="rounded-lg border border-red-500/20 text-red-600 px-3 py-1 text-xs font-semibold hover:bg-red-50 transition"
                    >
                      إزالة
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="rounded-xl sm:rounded-[2rem] border border-burgundy/10 bg-beige/10 p-5 sm:p-8 shadow-soft">
            <h2 className="text-lg sm:text-2xl font-bold">ملخص الطلب</h2>
            <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 text-xs sm:text-sm text-burgundy/80">
              <div className="flex justify-between">
                <span>عدد القطع</span>
                <span className="font-semibold">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-burgundy/5">
                <span>الإجمالي</span>
                <span className="text-lg font-extrabold text-burgundy">{Number(total).toLocaleString('en-US')} ج.م</span>
              </div>
            </div>
            <Link to="/payment" className="mt-6 sm:mt-8 w-full rounded-xl sm:rounded-3xl bg-burgundy px-6 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-white transition hover:bg-[#650018] flex items-center justify-center">تابع الدفع</Link>
            <button
              type="button"
              onClick={clearCart}
              className="mt-2.5 w-full rounded-xl sm:rounded-3xl border border-burgundy px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-burgundy transition hover:bg-burgundy/5"
            >
              مسح السلة
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}

export default CartPage;
