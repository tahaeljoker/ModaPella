import { useState } from 'react';
import { cleanProductName, isDiscountActive } from '../utils/discount';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const PRESET_MESSAGES = [
  { id: 1, label: 'إيه رأيك عليا؟', text: 'إيه رأيك في الموديل ده عليا؟ لايق عليا ولا إيه؟' },
  { id: 2, label: 'شوفي ليكي', text: 'شوفي الموديل ده قمر وحسيته معمول عشانك بالظبط!' },
  { id: 3, label: 'نطلب سوا', text: 'يلا نطلب سوا من ModaPella ونقسم مصاريف الشحن سوا!' },
  { id: 4, label: 'لقيت الستايل', text: 'أخيراً لقيت الستايل اللي كنا بندور عليه بقالنا فترة!' },
];

export default function ShareOutfitModal({ isOpen, onClose, product }) {
  const [selectedMessage, setSelectedMessage] = useState(PRESET_MESSAGES[0].text);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !product) return null;

  const hasDiscount = isDiscountActive(product);
  const currentPrice = hasDiscount ? product.discountPrice : product.price;
  const productUrl = `${window.location.origin}/product/${product._id}?ref=share_friend`;

  const getFullShareText = () => {
    return `${selectedMessage}\n\nالموديل: *${cleanProductName(product.name)}*\nالسعر: *${EGP(currentPrice)}*${hasDiscount ? ` (خصم ${Math.round((1 - product.discountPrice / product.price) * 100)}%)` : ''}\nرابط المعاينة والتفاصيل:\n${productUrl}`;
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(getFullShareText());
    const waUrl = `https://api.whatsapp.com/send?text=${text}`;
    window.open(waUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: cleanProductName(product.name),
          text: getFullShareText(),
          url: productUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getFullShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[#FAF7F2] border border-amber-400/30 shadow-2xl overflow-hidden z-10 my-auto">
        {/* Luxury Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#2A050E] via-[#450917] to-[#2A050E] text-white flex items-center justify-between border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            
            <div>
              <h2 className="text-sm sm:text-base font-black text-amber-200">
                شاركي الإطلالة مع صديقتكِ
              </h2>
              <p className="text-[10px] sm:text-xs text-white/70">
                أرسلي الموديل لصديقتكِ أو أختكِ وخذي رأيها بضغطة واحدة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Postcard Preview Card */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-burgundy/15 p-3.5 shadow-sm space-y-3">
            <div className="flex gap-3 items-center">
              {/* Product Thumbnail */}
              <div className="relative h-24 w-20 sm:h-28 sm:w-24 rounded-xl overflow-hidden shrink-0 border border-amber-400/30 bg-beige/10">
                <img
                  src={product.images?.[0] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80'}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
                {hasDiscount && (
                  <span className="absolute top-1 right-1 rounded-md bg-red-600 px-1 py-0.5 text-[8px] font-black text-white">
                    خصم {Math.round((1 - product.discountPrice / product.price) * 100)}%
                  </span>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
                  {product.category || 'أزياء راقية'}
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-burgundy line-clamp-1">
                  {cleanProductName(product.name)}
                </h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm sm:text-base font-black text-burgundy">
                    {EGP(currentPrice)}
                  </span>
                  {hasDiscount && (
                    <span className="text-[10px] text-red-500 line-through">
                      {EGP(product.price)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                  <span>✓</span>
                  <span>متوفر للشحن لجميع المحافظات</span>
                </div>
              </div>
            </div>

            {/* Custom Message Card Preview */}
            <div className="rounded-xl bg-[#FAF6F0] border border-amber-500/20 p-2.5 text-xs text-burgundy/90 leading-relaxed font-medium">
              <span className="text-amber-600 text-xs font-bold block mb-1">
                نص الرسالة المرفقة:
              </span>
              <p className="italic">"{selectedMessage}"</p>
            </div>
          </div>

          {/* Quick Message Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-burgundy flex items-center justify-between">
              <span>اختاري عبارة مناسبة للإرسال:</span>
              <span className="text-[10px] text-burgundy/50">اضغطي لتغيير النص</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_MESSAGES.map((msg) => (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => setSelectedMessage(msg.text)}
                  className={`rounded-xl px-2.5 py-2 text-[11px] font-bold text-right transition border ${
                    selectedMessage === msg.text
                      ? 'bg-amber-100 border-amber-500 text-burgundy shadow-xs ring-1 ring-amber-400'
                      : 'bg-white hover:bg-beige/30 border-burgundy/10 text-burgundy/80'
                  }`}
                >
                  {msg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Message Editor */}
          <div className="space-y-1">
            <textarea
              rows={2}
              value={selectedMessage}
              onChange={(e) => setSelectedMessage(e.target.value)}
              placeholder="اكتبي رسالة مخصصة لصديقتكِ..."
              className="w-full rounded-xl border border-burgundy/15 bg-white p-2.5 text-xs text-burgundy placeholder-burgundy/40 focus:border-burgundy focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:opacity-95 text-white py-3 px-4 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20 active:scale-[0.98] transition"
            >
              <span>مشاركة سريعة عبر واتساب</span>
            </button>

            {/* Grid for Native Share & Copy Link */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="rounded-xl bg-burgundy hover:bg-[#650018] text-white py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition"
              >
                <span>تطبيقات أخرى (إنستغرام / ماسنجر)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className={`rounded-xl py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 border transition active:scale-[0.98] ${
                  copied
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-white hover:bg-beige/20 border-burgundy/20 text-burgundy'
                }`}
              >
                <span className="text-xs font-bold">{copied ? '✓' : 'نسخ'}</span>
                <span>{copied ? 'تم النسخ بنجاح!' : 'نسخ رابط الإطلالة'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-white border-t border-burgundy/10 text-center text-[10px] text-burgundy/60">
          ModaPella | أزياء راقية - التوصيل لجميع محافظات مصر
        </div>
      </div>
    </div>
  );
}
