import { useState, useEffect } from 'react';
import api from '../services/api';
import { cleanProductName, isDiscountActive } from '../utils/discount';
import { getTrafficSource } from '../utils/trafficTracker';

const EGYPT_GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'القليوبية',
  'الشرقية',
  'الدقهلية',
  'الغربية',
  'المنوفية',
  'البحيرة',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'مطروح',
  'الوادي الجديد',
  'شمال سيناء',
  'جنوب سيناء'
];

export default function QuickOrderModal({
  isOpen,
  onClose,
  product,
  initialSize = '',
  initialColor = '',
  initialQty = 1,
  whatsappNumber = '201090048832'
}) {
  const [size, setSize] = useState(initialSize);
  const [color, setColor] = useState(initialColor);
  const [qty, setQty] = useState(initialQty);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('القاهرة');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'Cash' (COD) or 'Instapay'
  const [notes, setNotes] = useState('');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [orderResult, setOrderResult] = useState(null);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen && product) {
      setSize(initialSize || product.sizes?.[0] || '');
      setColor(initialColor || product.colors?.[0] || '');
      setQty(Math.max(1, Math.min(initialQty || 1, product.stock || 1)));
      setErrorMsg('');
      setOrderResult(null);
      setCouponInput('');
      setAppliedCoupon(null);
      setCouponError('');
    }
  }, [isOpen, product, initialSize, initialColor, initialQty]);

  // Prevent background scrolling when open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const hasDiscount = isDiscountActive(product);
  const unitPrice = hasDiscount ? product.discountPrice : product.price;
  const totalPrice = unitPrice * qty;
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalPrice = Math.max(0, totalPrice - discountAmount);
  const mainImage = product.images?.[0] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80';

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await api.post('/coupons/validate', {
        code: couponInput.trim(),
        orderTotal: totalPrice
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    if (!fullName.trim()) {
      setErrorMsg('يرجى إدخال اسم المستلم بالكامل');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('يرجى إدخال رقم هاتف صحيح مكوّن من 11 رقماً (مثال: 01012345678)');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('يرجى إدخال العنوان بالتفصيل لضمان سرعة التوصيل');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerName: fullName.trim(),
        customerPhone: cleanPhone,
        governorate,
        shippingAddress: address.trim(),
        notes: notes.trim(),
        paymentMethod: paymentMethod === 'Cash' ? 'Cash' : 'Instapay',
        couponCode: appliedCoupon ? appliedCoupon.code : '',
        trafficSource: getTrafficSource(),
        items: [
          {
            product: product._id,
            name: product.name,
            category: product.category,
            quantity: qty,
            price: unitPrice,
            size: size || '',
            color: color || ''
          }
        ]
      };

      const res = await api.post('/orders/public-checkout', payload);
      if (res.data && res.data.order) {
        setOrderResult(res.data.order);
      } else {
        throw new Error('لم يتم إنشاء الطلب، يرجى المحاولة لاحقاً');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'حدث خطأ أثناء تسجيل الطلب، يرجى المحاولة مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  // WhatsApp follow-up link
  const getWhatsAppLink = (order) => {
    const shortId = order._id?.toString().slice(-6).toUpperCase();
    const cleanStorePhone = (whatsappNumber || '201090048832').replace(/[^0-9]/g, '');
    const targetPhone = cleanStorePhone.startsWith('0') ? '2' + cleanStorePhone : cleanStorePhone;

    const message = `أهلاً ModaPella\n` +
      `أنا أكّدت طلبي السريع من الموقع الآن:\n\n` +
      `*رقم الطلب:* #${shortId}\n` +
      `*المنتج:* ${cleanProductName(product.name)}\n` +
      `${size ? `*المقاس:* ${size}\n` : ''}` +
      `${color ? `*اللون:* ${color}\n` : ''}` +
      `*الكمية:* ${qty}\n` +
      `${appliedCoupon ? `*كود الخصم:* ${appliedCoupon.code} (خصم ${discountAmount} ج.م)\n` : ''}` +
      `*المبلغ النهائي:* ${Number(finalPrice).toLocaleString('en-US')} ج.م\n` +
      `*العنوان:* ${governorate} - ${address}\n` +
      `*طريقة الدفع:* ${paymentMethod === 'Cash' ? 'الدفع عند الاستلام' : 'تحويل Instapay'}\n\n` +
      `أرجو تأكيد الشحن في أقرب وقت. شكراً لكم!`;

    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-lg bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col transition-all duration-300 transform animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Mobile Pull Indicator */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-burgundy/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-burgundy/10 bg-[#FAF5F2]">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-burgundy text-white text-xs font-bold shadow-sm">
              ✦
            </span>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-burgundy">طلب سريع بنقرة واحدة</h3>
              <p className="text-[11px] text-burgundy/60">بدون تسجيل حساب • شحن وتوصيل فوري</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-burgundy/50 hover:text-burgundy hover:bg-burgundy/10 transition text-lg font-bold"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1 scrollbar-thin">
          {orderResult ? (
            /* Success View */
            <div className="py-6 text-center space-y-4 animate-scale-up">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
                ✓
              </div>
              <div>
                <h4 className="text-xl font-extrabold text-emerald-800">تم تسجيل طلبك بنجاح!</h4>
                <p className="text-xs text-burgundy/70 mt-1">
                  شكراً لتسوقك من <strong className="text-burgundy font-bold">ModaPella</strong>
                </p>
              </div>

              <div className="bg-[#FAF5F2] border border-burgundy/10 rounded-2xl p-4 text-sm space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-burgundy/60">رقم الطلب</span>
                  <span className="font-mono font-bold text-burgundy text-sm bg-white px-2 py-0.5 rounded border border-burgundy/10">
                    #{orderResult._id?.toString().slice(-6).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-burgundy/60">المستلم</span>
                  <span className="font-semibold text-burgundy">{fullName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-burgundy/60">العنوان</span>
                  <span className="font-semibold text-burgundy">{governorate} - {address}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between items-center text-xs text-emerald-700 font-bold">
                    <span>خصم الكوبون ({appliedCoupon.code})</span>
                    <span>-{Number(discountAmount).toLocaleString('en-US')} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs border-t border-burgundy/10 pt-2 font-bold">
                  <span className="text-burgundy">المبلغ المطلوب تحصيله</span>
                  <span className="text-base text-burgundy">{Number(finalPrice).toLocaleString('en-US')} ج.م</span>
                </div>
                <div className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg p-2 text-center font-medium mt-1">
                  {paymentMethod === 'Cash' 
                    ? 'الدفع عند الاستلام مع إمكانية معاينة القطعة قبل الدفع' 
                    : 'تحويل عبر Instapay، سنتواصل معكِ لتأكيد إشعار الدفع'}
                </div>
              </div>

              {/* WhatsApp Action Button */}
              <div className="space-y-2 pt-2">
                <a
                  href={getWhatsAppLink(orderResult)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition active:scale-[0.98]"
                >
                  
                  <span>تأكيد ومتابعة الطلب عبر واتساب</span>
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-2xl border border-burgundy/20 text-burgundy text-xs font-semibold hover:bg-burgundy/5 transition"
                >
                  متابعة التسوق
                </button>
              </div>
            </div>
          ) : (
            /* Order Form View */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Product Mini Summary Card */}
              <div className="flex items-center gap-3.5 bg-[#FAF5F2] p-3 rounded-2xl border border-burgundy/10">
                <img 
                  src={mainImage} 
                  alt={product.name} 
                  className="w-16 h-16 rounded-xl object-cover border border-burgundy/10 shrink-0" 
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-burgundy truncate">
                    {cleanProductName(product.name)}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-extrabold text-sm text-burgundy">
                      {Number(unitPrice).toLocaleString('en-US')} ج.م
                    </span>
                    {hasDiscount && (
                      <span className="text-xs text-red-500 line-through">
                        {Number(product.price).toLocaleString('en-US')} ج.م
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-burgundy/60 mt-0.5 truncate">
                    {size && <span>مقاس: {size}</span>}
                    {size && color && <span> • </span>}
                    {color && <span>لون: {color}</span>}
                  </p>
                </div>

                {/* Stepper Quantity */}
                <div className="flex items-center border border-burgundy/20 rounded-xl bg-white overflow-hidden shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-7 h-7 flex items-center justify-center text-sm font-bold text-burgundy hover:bg-burgundy/10 active:bg-burgundy/20"
                  >
                    -
                  </button>
                  <span className="w-7 text-center text-xs font-bold text-burgundy">{qty}</span>
                  <button 
                    type="button" 
                    onClick={() => setQty(q => Math.min(product.stock || 10, q + 1))}
                    className="w-7 h-7 flex items-center justify-center text-sm font-bold text-burgundy hover:bg-burgundy/10 active:bg-burgundy/20"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Quick Variant Switcher inside Modal */}
              {(product.sizes?.length > 0 || product.colors?.length > 0) && (
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-white rounded-xl border border-burgundy/10 text-xs">
                  {product.sizes?.length > 0 && (
                    <div>
                      <span className="font-semibold text-burgundy/70 block mb-1">المقاس:</span>
                      <div className="flex flex-wrap gap-1">
                        {product.sizes.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSize(s)}
                            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                              size === s 
                                ? 'bg-burgundy text-white' 
                                : 'bg-[#FAF5F2] text-burgundy/80 hover:bg-burgundy/10'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.colors?.length > 0 && (
                    <div>
                      <span className="font-semibold text-burgundy/70 block mb-1">اللون:</span>
                      <div className="flex flex-wrap gap-1">
                        {product.colors.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              color === c 
                                ? 'bg-burgundy text-white' 
                                : 'bg-[#FAF5F2] text-burgundy/80 hover:bg-burgundy/10'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                            <span>{c}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Fields */}
              <div className="space-y-3">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-burgundy mb-1">
                    الاسم بالكامل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: ياسمين أحمد"
                    className="w-full h-11 px-3.5 rounded-xl border border-burgundy/20 bg-white text-xs sm:text-sm text-burgundy outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy transition"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-burgundy mb-1">
                    رقم الهاتف / الواتساب <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full h-11 px-3.5 rounded-xl border border-burgundy/20 bg-white text-xs sm:text-sm text-burgundy outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy transition text-right"
                  />
                </div>

                {/* Governorate & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-burgundy mb-1">
                      المحافظة <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-burgundy/20 bg-white text-xs sm:text-sm text-burgundy outline-none focus:border-burgundy transition cursor-pointer"
                    >
                      {EGYPT_GOVERNORATES.map((gov) => (
                        <option key={gov} value={gov}>{gov}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-burgundy mb-1">
                      العنوان بالتفصيل <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="المنطقة، الشارع، رقم العمارة"
                      className="w-full h-11 px-3.5 rounded-xl border border-burgundy/20 bg-white text-xs sm:text-sm text-burgundy outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy transition"
                    />
                  </div>
                </div>

                {/* Payment Method Cards */}
                <div>
                  <label className="block text-xs font-bold text-burgundy mb-1.5">
                    طريقة الدفع <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label 
                      className={`flex flex-col p-2.5 rounded-xl border cursor-pointer transition select-none ${
                        paymentMethod === 'Cash' 
                          ? 'border-burgundy bg-burgundy/5 ring-1 ring-burgundy' 
                          : 'border-burgundy/15 bg-white hover:bg-burgundy/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-burgundy">عند الاستلام</span>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="Cash"
                          checked={paymentMethod === 'Cash'}
                          onChange={() => setPaymentMethod('Cash')}
                          className="accent-burgundy"
                        />
                      </div>
                      <span className="text-[10px] text-burgundy/60 mt-1">الدفع نقداً بعد المعاينة</span>
                    </label>

                    <label 
                      className={`flex flex-col p-2.5 rounded-xl border cursor-pointer transition select-none ${
                        paymentMethod === 'Instapay' 
                          ? 'border-burgundy bg-burgundy/5 ring-1 ring-burgundy' 
                          : 'border-burgundy/15 bg-white hover:bg-burgundy/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-burgundy">انستا باي</span>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="Instapay"
                          checked={paymentMethod === 'Instapay'}
                          onChange={() => setPaymentMethod('Instapay')}
                          className="accent-burgundy"
                        />
                      </div>
                      <span className="text-[10px] text-burgundy/60 mt-1">تحويل فوري وسريع</span>
                    </label>
                  </div>
                </div>

                {/* Notes (Optional) */}
                <div>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ملاحظات للشحن (اختياري، مثلاً: الاتصال قبل الوصول)"
                    className="w-full h-9 px-3 rounded-xl border border-burgundy/15 bg-white text-xs text-burgundy/80 outline-none focus:border-burgundy transition"
                  />
                </div>

                {/* Promo Code Box */}
                <div className="p-3 rounded-2xl bg-[#FAF5F2] border border-burgundy/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-burgundy flex items-center gap-1.5">
                      
                      <span>هل لديكِ كود خصم؟</span>
                    </span>
                    {appliedCoupon && (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-[11px] text-red-600 hover:underline font-bold"
                      >
                        إلغاء الكود ✕
                      </button>
                    )}
                  </div>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                      <div className="flex items-center gap-1.5">
                        <span>✓ تم تفعيل كود</span>
                        <span className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                          {appliedCoupon.code}
                        </span>
                      </div>
                      <span className="text-emerald-700 font-extrabold text-sm">
                        -{Number(appliedCoupon.discountAmount).toLocaleString('en-US')} ج.م
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          if (couponError) setCouponError('');
                        }}
                        placeholder="أدخلي الكود هنا (مثال: MODA10)"
                        className="flex-1 h-10 px-3 rounded-xl border border-burgundy/20 bg-white text-xs font-mono uppercase text-burgundy outline-none focus:border-burgundy transition"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        className="h-10 px-4 rounded-xl bg-burgundy hover:bg-[#650018] text-white text-xs font-bold transition disabled:opacity-50 active:scale-95 flex items-center justify-center shrink-0"
                      >
                        {couponLoading ? '...' : 'تطبيق'}
                      </button>
                    </div>
                  )}

                  {couponError && (
                    <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                      
                      <span>{couponError}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Order Total & Trust Badges */}
              <div className="border-t border-dashed border-burgundy/15 pt-3 space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs text-burgundy/70">
                    <span>قيمة المنتجات:</span>
                    <span>{Number(totalPrice).toLocaleString('en-US')} ج.م</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs font-bold text-emerald-600">
                      <span>خصم الكوبون ({appliedCoupon?.code}):</span>
                      <span>-{Number(discountAmount).toLocaleString('en-US')} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm font-extrabold text-burgundy pt-1.5 border-t border-burgundy/10">
                    <span>المبلغ النهائي المطلوب:</span>
                    <span className="text-base text-burgundy">
                      {Number(finalPrice).toLocaleString('en-US')} ج.م
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 text-[10px] text-burgundy/60 py-1.5 bg-[#FAF5F2] rounded-xl">
                  <span>معاينة القطعة قبل الاستلام</span>
                  <span>•</span>
                  <span>استبدال خلال 14 يوماً</span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || product.stock === 0}
                  className="w-full h-12 rounded-2xl bg-burgundy hover:bg-[#650018] text-white font-bold text-sm sm:text-base transition shadow-lg shadow-burgundy/20 flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>جاري تأكيد طلبك...</span>
                    </div>
                  ) : (
                    <>
                      <span>تأكيد الطلب الآن</span>
                      
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
