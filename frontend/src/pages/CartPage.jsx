import { useContext } from 'react';
import { Link } from 'react-router-dom';
import CartContext from '../context/CartContext';

function CartPage() {
  const { cart, removeItem, updateQuantity, clearCart, total } = useContext(CartContext);

  return (
    <section className="space-y-10 py-10 text-burgundy">
      <div className="rounded-[2.5rem] border border-burgundy/10 bg-white p-10 shadow-soft">
        <h1 className="text-4xl font-semibold">سلة التسوق</h1>
        <p className="mt-4 text-sm text-burgundy/75">راجع مشترياتك وأكمل الطلب أو عد إلى المتجر لإضافة المزيد.</p>
      </div>

      {cart.length === 0 ? (
        <div className="rounded-[2.5rem] border border-burgundy/10 bg-beige/20 p-10 text-center shadow-soft">
          <p className="text-xl font-semibold">السلة فارغة</p>
          <p className="mt-3 text-sm text-burgundy/75">أضف منتجًا واحدًا على الأقل لتتمكن من المتابعة.</p>
          <Link to="/shop" className="mt-6 inline-flex rounded-full bg-burgundy px-6 py-3 text-white transition hover:bg-[#650018]">اذهب إلى المتجر</Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.8fr_0.9fr]">
          <div className="space-y-6">
            {cart.map((item) => (
              <div key={item.cartId} className="rounded-[2rem] border border-burgundy/10 bg-white p-5 shadow-soft sm:flex sm:items-center sm:gap-5">
                <div className="aspect-square h-32 w-full overflow-hidden rounded-[1.5rem] sm:h-32 sm:w-32">
                  <img src={item.images?.[0] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80'} alt={item.name} className="h-full w-full object-cover" />
                </div>
                <div className="mt-4 sm:mt-0 sm:flex-1">
                  <h2 className="text-xl font-semibold text-burgundy">{item.name}</h2>
                  <p className="mt-2 text-sm text-burgundy/75">{item.category}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-burgundy/80">
                    <span>المقاس: {item.selectedSize || 'غير محدد'}</span>
                    <span>اللون: {item.selectedColor || 'غير محدد'}</span>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-burgundy/80">الكمية:</label>
                      <select
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.cartId, Number(e.target.value))}
                        className="rounded-2xl border border-burgundy/20 bg-beige/10 px-3 py-2 text-burgundy"
                      >
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((qty) => (
                          <option key={qty} value={qty}>{qty}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.cartId)}
                      className="rounded-full border border-burgundy px-4 py-2 text-sm text-burgundy transition hover:bg-burgundy/5"
                    >
                      إزالة
                    </button>
                  </div>
                </div>
                <div className="mt-4 text-right sm:mt-0">
                  <p className="text-sm text-burgundy/70">السعر لكل قطعة</p>
                  <p className="mt-2 text-xl font-semibold text-burgundy">${item.price.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>

          <aside className="rounded-[2rem] border border-burgundy/10 bg-beige/10 p-8 shadow-soft">
            <h2 className="text-2xl font-semibold">ملخص الطلب</h2>
            <div className="mt-6 space-y-4 text-sm text-burgundy/80">
              <div className="flex justify-between">
                <span>عدد القطع</span>
                <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>الإجمالي</span>
                <span className="font-semibold text-burgundy">${total.toFixed(2)}</span>
              </div>
            </div>
            <button type="button" className="mt-8 w-full rounded-3xl bg-burgundy px-6 py-3 text-white transition hover:bg-[#650018]">تابع الدفع</button>
            <button
              type="button"
              onClick={clearCart}
              className="mt-3 w-full rounded-3xl border border-burgundy px-6 py-3 text-burgundy transition hover:bg-burgundy/5"
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
