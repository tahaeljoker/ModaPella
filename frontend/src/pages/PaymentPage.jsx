import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import CartContext from '../context/CartContext';
import api from '../services/api';
import { cleanProductName } from '../utils/discount';

function PaymentPage() {
 const { cart, clearCart, total } = useContext(CartContext);
 const [form, setForm] = useState({ fullName: '', phone: '', notes: '' });
 const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'Cash' (COD) or 'Instapay'
 const [loading, setLoading] = useState(false);
 const [orderResult, setOrderResult] = useState(null);
 const [error, setError] = useState('');
 const [paymentScreenshot, setPaymentScreenshot] = useState('');
 const [screenshotPreview, setScreenshotPreview] = useState('');

 // Coupon state
 const [couponInput, setCouponInput] = useState('');
 const [appliedCoupon, setAppliedCoupon] = useState(null);
 const [couponLoading, setCouponLoading] = useState(false);
 const [couponError, setCouponError] = useState('');

 const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
 const finalTotal = Math.max(0, total - discountAmount);

 const handleApplyCoupon = async () => {
  if (!couponInput.trim()) return;
  setCouponLoading(true);
  setCouponError('');
  try {
   const res = await api.post('/coupons/validate', {
    code: couponInput.trim(),
    orderTotal: total
   });
   if (res.data && res.data.valid) {
    setAppliedCoupon(res.data);
    setCouponError('');
   }
  } catch (err) {
   setAppliedCoupon(null);
   setCouponError(err.response?.data?.message || 'كود الخصم غير صحيح');
  } finally {
   setCouponLoading(false);
  }
 };

 const handleRemoveCoupon = () => {
  setAppliedCoupon(null);
  setCouponInput('');
  setCouponError('');
 };

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
 paymentMethod: paymentMethod === 'Cash' ? 'Cash' : 'Instapay',
 notes: form.notes,
 paymentScreenshot: paymentMethod === 'Instapay' ? paymentScreenshot : '',
 couponCode: appliedCoupon ? appliedCoupon.code : ''
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
 <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-4xl"></div>
 <h2 className="text-3xl font-extrabold text-emerald-700">تم تسجيل طلبك بنجاح!</h2>
 <p className="text-sm text-burgundy/80 leading-relaxed">
 شكراً لطلبك من **ModaPella** . رقم طلبك هو <strong className="font-mono bg-burgundy/5 px-2 py-1 rounded">#{shortId}</strong>.
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
 <label className="block text-xs sm:text-sm font-semibold text-burgundy/80 mb-2">طريقة الدفع</label>
 <div className="grid grid-cols-2 gap-3">
 <button
 type="button"
 onClick={() => setPaymentMethod('Cash')}
 className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition ${
 paymentMethod === 'Cash'
 ? 'border-burgundy bg-burgundy/10 text-burgundy'
 : 'border-burgundy/20 bg-white text-burgundy/60 hover:border-burgundy/40'
 }`}
 >
 <span>💵</span> الدفع عند الاستلام
 </button>
 <button
 type="button"
 onClick={() => setPaymentMethod('Instapay')}
 className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition ${
 paymentMethod === 'Instapay'
 ? 'border-burgundy bg-burgundy/10 text-burgundy'
 : 'border-burgundy/20 bg-white text-burgundy/60 hover:border-burgundy/40'
 }`}
 >
 <span>⚡</span> تحويل Instapay
 </button>
 </div>
 </div>

 {paymentMethod === 'Instapay' && (
 <div className="p-3.5 bg-burgundy/5 border border-burgundy/15 rounded-xl space-y-3">
 <div className="text-xs text-burgundy/80 space-y-1">
 <p className="font-bold text-burgundy">بيانات التحويل عبر Instapay:</p>
 <p>عنوان الدفع: <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-burgundy/15 select-all">modapella@instapay</span></p>
 </div>
 <div>
 <label className="block text-xs font-semibold text-burgundy/80 flex items-center gap-1.5">
 صورة إثبات التحويل (Instapay Screenshot)
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
 ×
 </button>
 </div>
 )}
 </div>
 </div>
 )}

 <button
 type="submit"
 disabled={loading || cart.length === 0}
 className="w-full rounded-xl sm:rounded-3xl bg-burgundy px-5 py-2.5 sm:py-3 font-bold text-sm sm:text-base text-white transition hover:bg-[#650018] disabled:opacity-50"
 >
 {loading ? 'جاري تسجيل الطلب...' : `تأكيد الطلب ودفع ${Number(finalTotal).toLocaleString('en-US')} ج.م`}
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

 {/* Coupon Section */}
 <div className="pt-3 border-t border-burgundy/10">
 <label className="block text-xs font-bold text-burgundy/80 mb-1.5">كوبون الخصم 🎟️</label>
 {appliedCoupon ? (
 <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs">
 <div className="flex items-center gap-1.5">
 <span className="text-emerald-700 font-bold">تم تطبيق الكوبون:</span>
 <span className="bg-emerald-600 text-white font-mono px-2 py-0.5 rounded font-bold">{appliedCoupon.code}</span>
 <span className="text-emerald-700 font-semibold">(-{Number(appliedCoupon.discountAmount).toLocaleString('en-US')} ج.م)</span>
 </div>
 <button
 type="button"
 onClick={handleRemoveCoupon}
 className="text-red-500 hover:text-red-700 font-bold px-2 py-0.5 text-sm"
 title="إلغاء الكوبون"
 >
 ✕
 </button>
 </div>
 ) : (
 <div>
 <div className="flex gap-2">
 <input
 type="text"
 value={couponInput}
 onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
 placeholder="أدخل كود الخصم (مثل: SAVE10)"
 className="flex-1 rounded-xl border border-burgundy/20 bg-white px-3 py-2 text-xs font-mono uppercase text-burgundy outline-none focus:border-burgundy"
 />
 <button
 type="button"
 onClick={handleApplyCoupon}
 disabled={couponLoading || !couponInput.trim()}
 className="bg-burgundy text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#650018] transition disabled:opacity-50"
 >
 {couponLoading ? '...' : 'تطبيق'}
 </button>
 </div>
 {couponError && (
 <p className="mt-1 text-[11px] text-red-600 font-medium">{couponError}</p>
 )}
 </div>
 )}
 </div>

 {/* Totals Breakdown */}
 <div className="pt-3 border-t border-burgundy/10 space-y-1.5 text-xs sm:text-sm">
 <div className="flex justify-between items-center text-burgundy/75">
 <span>إجمالي المنتجات</span>
 <span>{Number(total).toLocaleString('en-US')} ج.م</span>
 </div>
 {discountAmount > 0 && (
 <div className="flex justify-between items-center text-emerald-700 font-semibold">
 <span>خصم الكوبون ({appliedCoupon?.code})</span>
 <span>-{Number(discountAmount).toLocaleString('en-US')} ج.م</span>
 </div>
 )}
 <div className="pt-2 border-t border-burgundy/10 flex justify-between items-center text-base sm:text-lg font-bold text-burgundy">
 <span>الإجمالي المستحق</span>
 <span className="text-xl text-burgundy">{Number(finalTotal).toLocaleString('en-US')} ج.م</span>
 </div>
 </div>

 <div className="p-3 bg-white/60 border border-burgundy/5 rounded-xl text-[11px] text-burgundy/70 space-y-1.5">
 <p className="font-bold text-burgundy text-xs"> معلومات الدفع والتوصيل:</p>
 <p>• الشحن يستغرق من يومين إلى 4 أيام عمل.</p>
 {paymentMethod === 'Cash' ? (
 <p>• الدفع نقداً عند استلام الشحنة ومعاينتها.</p>
 ) : (
 <p>• يرجى إتمام تحويل Instapay لتأكيد شحن الطلب فوراً.</p>
 )}
 </div>
 </div>
 </div>
 </section>
 );
}

export default PaymentPage;
