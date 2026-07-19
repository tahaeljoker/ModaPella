import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import CartContext from '../context/CartContext';
import api from '../services/api';
import { cleanProductName } from '../utils/discount';

function PaymentPage() {
  const { cart, clearCart, total } = useContext(CartContext);
  const [form, setForm] = useState({ fullName: '', phone: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [error, setError] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً، يرجى اختيار صورة أصغر من 2 ميجابايت.');
        return;
      }
      setScreenshotPreview(URL.createObjectURL(file));

      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentScreenshot(reader.result); // Base64 string
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (cart.length === 0) {
      setError('سلة المشتريات فارغة!');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const orderItems = cart.map(item => ({
        product: item._id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        price: item.price,
        size: item.selectedSize || '',
        color: item.selectedColor || ''
      }));

      const res = await api.post('/orders/public-checkout', {
        customerName: form.fullName,
        customerPhone: form.phone,
        items: orderItems,
        paymentMethod: 'Instapay',
        notes: form.notes,
        paymentScreenshot
      });

      if (res.data.success) {
        setOrderResult(res.data.order);
        clearCart();
      } else {
        setError('فشل إرسال الطلب، برجاء المحاولة مرة أخرى.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء إتمام الطلب، تأكد من توفر الكميات.');
    } finally {
      setLoading(false);
    }
  };

  if (orderResult) {
    const shortId = orderResult._id?.toString().slice(-6).toUpperCase();
    return (
      <section className="py-8 max-w-2xl mx-auto text-burgundy text-center" dir="rtl">
        <div className="rounded-[2.5rem] border border-burgundy/15 bg-white p-8 sm:p-12 shadow-soft space-y-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-4xl">✓</div>
          <h2 className="text-3xl font-extrabold text-emerald-700">تم تسجيل طلبك بنجاح!</h2>
          <p className="text-sm text-burgundy/80 leading-relaxed">
            شكراً لطلبك من **ModaPella** ✨. رقم طلبك هو <strong className="font-mono bg-burgundy/5 px-2 py-1 rounded">#{shortId}</strong>.
          </p>

          <div className="bg-beige/10 border border-burgundy/10 rounded-2xl p-6 text-right space-y-3">
            <h3 className="font-bold border-b border-burgundy/10 pb-2">خطوات إتمام الدفع عبر Instapay:</h3>
            <p className="text-xs text-burgundy/70 leading-relaxed">
              1. افتح تطبيق **Instapay** على هاتفك.
              <br />
              2. قم بتحويل المبلغ الإجمالي وهو **{Number(orderResult.totalAmount).toLocaleString('en-US')} ج.م** إلى عنوان الدفع الخاص بنا.
              <br />
              3. أضف رقم الطلب <strong className="font-mono">#{shortId}</strong> في وصف التحويل للتعرف على دفعتك بسرعة.
              <br />
              4. سيقوم فريق العمل بمراجعة التحويل وتأكيد الطلب وشحنه فوراً!
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <Link to="/shop" className="rounded-full bg-burgundy px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#650018]">مواصلة التسوق</Link>
            <Link to="/" className="rounded-full border border-burgundy px-6 py-3 text-sm font-medium transition hover:bg-burgundy/10">الرئيسية</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 sm:space-y-8 py-4 sm:py-8 text-burgundy" dir="rtl">
      <div className="rounded-2xl sm:rounded-3xl border border-burgundy/15 bg-white p-4 sm:p-8 shadow-soft">
        <h2 className="text-xl sm:text-3xl font-bold">إتمام الطلب والدفع</h2>
        <p className="mt-1.5 sm:mt-3 text-xs sm:text-sm text-burgundy/75">
          برجاء ملء البيانات التالية لإرسال طلبك. وسيلة الدفع الأساسية هي التحويل عبر **Instapay**.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-start">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 rounded-2xl sm:rounded-3xl border border-burgundy/15 bg-white p-4 sm:p-8 shadow-soft">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-xs sm:text-sm rounded-xl font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-burgundy/80">الاسم الكامل</label>
            <input
              className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-beige/20 bg-beige/10 px-4 py-2.5 sm:py-3 text-sm text-burgundy outline-none focus:border-burgundy"
              name="fullName"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="مثال: أسماء أحمد"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-burgundy/80">رقم الهاتف (الواتساب)</label>
            <input
              type="tel"
              className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-beige/20 bg-beige/10 px-4 py-2.5 sm:py-3 text-sm text-burgundy outline-none focus:border-burgundy text-right"
              name="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="مثال: 01012345678"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-burgundy/80">عنوان التوصيل أو أي ملاحظات إضافية</label>
            <textarea
              className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-beige/20 bg-beige/10 px-4 py-2.5 sm:py-3 text-sm text-burgundy outline-none focus:border-burgundy min-h-[80px]"
              name="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="مثال: القاهرة، حي المعادي، شارع 9، عمارة 15، شقة 3"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-burgundy/80 flex items-center gap-1.5">
              🖼️ صورة إثبات التحويل (Instapay Screenshot)
              <span className="text-[10px] font-normal text-burgundy/45">(اختياري لتسريع تأكيد الطلب)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-beige/20 bg-beige/10 px-4 py-2 text-sm text-burgundy outline-none focus:border-burgundy file:ml-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-burgundy/10 file:text-burgundy hover:file:bg-burgundy/20 cursor-pointer"
            />
            {screenshotPreview && (
              <div className="mt-3 relative w-32 h-32 rounded-xl overflow-hidden border border-burgundy/10">
                <img src={screenshotPreview} alt="Screenshot Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setScreenshotPreview('');
                    setPaymentScreenshot('');
                  }}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || cart.length === 0}
            className="w-full rounded-xl sm:rounded-3xl bg-burgundy px-5 py-2.5 sm:py-3 font-bold text-sm sm:text-base text-white transition hover:bg-[#650018] disabled:opacity-50"
          >
            {loading ? 'جاري تسجيل الطلب...' : `تأكيد الطلب ودفع ${Number(total).toLocaleString('en-US')} ج.م`}
          </button>
        </form>

        <div className="rounded-2xl sm:rounded-3xl border border-burgundy/15 bg-beige/10 p-5 sm:p-8 shadow-soft space-y-4">
          <h3 className="text-lg sm:text-2xl font-bold">ملخص طلبك</h3>
          <div className="divide-y divide-burgundy/10 max-h-[220px] overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.cartId} className="py-2.5 flex justify-between text-xs sm:text-sm">
                <div>
                  <span className="font-semibold block">{cleanProductName(item.name)}</span>
                  <span className="text-[10px] text-burgundy/50">
                    {item.selectedSize ? `مقاس: ${item.selectedSize}` : ''} {item.selectedColor ? `· لون: ${item.selectedColor}` : ''} · عدد: {item.quantity}
                  </span>
                </div>
                <span className="font-bold self-center">{Number(item.price * item.quantity).toLocaleString('en-US')} ج.م</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-burgundy/10 flex justify-between items-center text-sm sm:text-base font-bold">
            <span>الإجمالي المستحق</span>
            <span className="text-lg text-burgundy">{Number(total).toLocaleString('en-US')} ج.م</span>
          </div>

          <div className="p-3 bg-white/60 border border-burgundy/5 rounded-xl text-[11px] text-burgundy/70 space-y-1.5">
            <p className="font-bold text-burgundy text-xs">💬 معلومات الدفع والتوصيل:</p>
            <p>• سيتم حجز المنتجات مؤقتاً لمدة 24 ساعة لحين استلام التحويل.</p>
            <p>• الشحن يستغرق من يومين إلى 4 أيام عمل بعد تأكيد الدفع.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PaymentPage;
