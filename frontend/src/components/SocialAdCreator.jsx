import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { cleanProductName, isDiscountActive } from '../utils/discount';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const HEADLINES = [
  'كوليكشن جديد وحصري 2026',
  'خصم حصري لفترة محدودة',
  'شحن مجاني اليوم فقط لجميع المحافظات',
  'الأكثر طلباً ومبيعاً هذا الأسبوع',
  'أناقة ملكية وخامة قطنية باردة',
];

const THEMES = [
  { id: 'onyx', name: 'أسود ملكي وذهبي (Couture Onyx)', bg: 'from-[#140206] via-[#2D0610] to-[#140206]', text: 'text-amber-200', border: 'border-amber-400/40', badge: 'bg-amber-400 text-burgundy' },
  { id: 'burgundy', name: 'عنابي فاخر (Royal Burgundy)', bg: 'from-[#4B0012] via-[#6B031C] to-[#360009]', text: 'text-white', border: 'border-white/30', badge: 'bg-white text-burgundy' },
  { id: 'ivory', name: 'عاجي ناعم (Ivory Minimalist)', bg: 'from-[#FAF7F2] via-[#FFFDF9] to-[#F2EDE4]', text: 'text-burgundy', border: 'border-burgundy/20', badge: 'bg-burgundy text-white' },
];

export default function SocialAdCreator() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [format, setFormat] = useState('story'); // 'story' (9:16) or 'post' (1:1)
  const [themeId, setThemeId] = useState('onyx');
  const [headline, setHeadline] = useState(HEADLINES[0]);
  const [customBadge, setCustomBadge] = useState('كود خصم: MODA10');
  const [showPromo, setShowPromo] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const previewRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    api.get('/products?limit=50')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data.products || [];
        setProducts(list);
        if (list.length > 0) setSelectedProductId(list[0]._id);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const selectedProduct = products.find((p) => p._id === selectedProductId) || products[0];
  const activeTheme = THEMES.find((t) => t.id === themeId) || THEMES[0];

  const hasDiscount = selectedProduct ? isDiscountActive(selectedProduct) : false;
  const currentPrice = selectedProduct ? (hasDiscount ? selectedProduct.discountPrice : selectedProduct.price) : 0;

  const handleDownload = () => {
    if (!selectedProduct) return;
    setDownloading(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = format === 'story' ? 1080 : 1080;
    const height = format === 'story' ? 1920 : 1080;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Draw Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    if (themeId === 'onyx') {
      grad.addColorStop(0, '#160207');
      grad.addColorStop(0.5, '#2B0610');
      grad.addColorStop(1, '#0F0104');
    } else if (themeId === 'burgundy') {
      grad.addColorStop(0, '#4B0012');
      grad.addColorStop(0.5, '#6B031C');
      grad.addColorStop(1, '#360009');
    } else {
      grad.addColorStop(0, '#FAF7F2');
      grad.addColorStop(0.5, '#FFFDF9');
      grad.addColorStop(1, '#F2EDE4');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Load Image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = selectedProduct.images?.[0] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80';

    img.onload = () => {
      // Draw product image in center frame
      const imgMargin = format === 'story' ? 100 : 80;
      const imgTop = format === 'story' ? 320 : 180;
      const imgW = width - imgMargin * 2;
      const imgH = format === 'story' ? 960 : 540;

      // Rounded rectangle clip
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(imgMargin, imgTop, imgW, imgH, 40);
      ctx.clip();
      ctx.drawImage(img, imgMargin, imgTop, imgW, imgH);
      ctx.restore();

      // Border around image
      ctx.strokeStyle = themeId === 'ivory' ? 'rgba(90, 0, 21, 0.2)' : 'rgba(251, 191, 36, 0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(imgMargin, imgTop, imgW, imgH, 40);
      ctx.stroke();

      // Header Brand
      ctx.font = 'bold 50px Cairo, sans-serif';
      ctx.fillStyle = themeId === 'ivory' ? '#5A0015' : '#FCD34D';
      ctx.textAlign = 'center';
      ctx.fillText('MODAPELLA', width / 2, format === 'story' ? 140 : 90);

      ctx.font = '24px Cairo, sans-serif';
      ctx.fillStyle = themeId === 'ivory' ? 'rgba(90,0,21,0.6)' : 'rgba(255,255,255,0.7)';
      ctx.fillText('HAUTE COUTURE & ELEGANCE', width / 2, format === 'story' ? 185 : 125);

      // Headline Tag
      ctx.fillStyle = themeId === 'ivory' ? '#5A0015' : '#F59E0B';
      ctx.beginPath();
      const badgeY = format === 'story' ? 240 : 145;
      ctx.roundRect(width / 2 - 280, badgeY - 32, 560, 48, 24);
      ctx.fill();

      ctx.font = 'bold 24px Cairo, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(headline, width / 2, badgeY);

      // Product Title
      ctx.font = 'bold 55px Cairo, sans-serif';
      ctx.fillStyle = themeId === 'ivory' ? '#3B000E' : '#ffffff';
      ctx.fillText(cleanProductName(selectedProduct.name), width / 2, format === 'story' ? 1360 : 780);

      // Price Tag
      ctx.font = 'bold 65px Cairo, sans-serif';
      ctx.fillStyle = themeId === 'ivory' ? '#5A0015' : '#FBBF24';
      ctx.fillText(EGP(currentPrice), width / 2, format === 'story' ? 1450 : 860);

      // Promo Code Badge
      if (showPromo && customBadge) {
        ctx.fillStyle = themeId === 'ivory' ? 'rgba(90,0,21,0.08)' : 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        const promoY = format === 'story' ? 1540 : 925;
        ctx.roundRect(width / 2 - 220, promoY - 32, 440, 56, 28);
        ctx.fill();

        ctx.strokeStyle = themeId === 'ivory' ? '#5A0015' : '#FBBF24';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 26px Cairo, sans-serif';
        ctx.fillStyle = themeId === 'ivory' ? '#5A0015' : '#FCD34D';
        ctx.fillText(`${customBadge}`, width / 2, promoY + 6);
      }

      // Bottom CTA Banner
      const ctaY = format === 'story' ? 1720 : 990;
      ctx.fillStyle = themeId === 'ivory' ? '#5A0015' : '#F59E0B';
      ctx.beginPath();
      ctx.roundRect(140, ctaY, width - 280, 80, 40);
      ctx.fill();

      ctx.font = 'bold 32px Cairo, sans-serif';
      ctx.fillStyle = themeId === 'ivory' ? '#ffffff' : '#2A050E';
      ctx.fillText('اطلبي الآن من الرابط في البايو', width / 2, ctaY + 52);

      // Trigger download
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `modapella-${format}-${cleanProductName(selectedProduct.name)}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Canvas export error:', err);
      } finally {
        setDownloading(false);
      }
    };

    img.onerror = () => {
      alert('تعذر تحميل صورة المنتج لإنشاء التصميم، تأكد من الاتصال بالإنترنت.');
      setDownloading(false);
    };
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Top Header ── */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-gradient-to-r from-[#24030B] via-[#480718] to-[#24030B] text-white p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-400/30">
            أداة تصميم المحتوى الإعلاني التلقائي
          </span>
          <h3 className="text-2xl font-black mt-2 text-white">
            مولد بوسترات وستوريز السوشيال ميديا (Auto Story & Ad Creator)
          </h3>
          <p className="text-xs text-white/80 mt-1">
            صمم وحمّل ستوريز إنستغرام وتيك توك لأي فستان أو موديل بجودة عالية بضغطة زر واحدة دون الحاجة لمصمم!
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading || !selectedProduct}
          className="rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-burgundy font-black text-sm px-6 py-3.5 shadow-lg active:scale-95 transition flex items-center gap-2 disabled:opacity-50"
        >
          <span>{downloading ? 'جاري التوليد...' : 'تحميل البوستر عالي الدقة (PNG)'}</span>
        </button>
      </div>

      {/* ── Hidden Canvas for rendering ── */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Editor Controls & Live Preview Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
        {/* Controls Card */}
        <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm space-y-5">
          {/* Select Product */}
          <div>
            <label className="text-xs font-bold text-burgundy block mb-1.5">اختاري الموديل المراد إعلانه:</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-xl border border-burgundy/20 bg-white p-3 text-xs font-bold text-burgundy outline-none focus:border-burgundy"
            >
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {cleanProductName(p.name)} - {p.category} ({EGP(p.price)})
                </option>
              ))}
            </select>
          </div>

          {/* Format Selector */}
          <div>
            <label className="text-xs font-bold text-burgundy block mb-1.5">مقاس التصميم:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('story')}
                className={`rounded-xl p-3 text-xs font-black border transition flex items-center justify-center gap-2 ${
                  format === 'story'
                    ? 'bg-burgundy text-white border-burgundy shadow-sm'
                    : 'bg-white hover:bg-beige/20 text-burgundy border-burgundy/20'
                }`}
              >
                <span>ستوري / ريلز (9:16)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('post')}
                className={`rounded-xl p-3 text-xs font-black border transition flex items-center justify-center gap-2 ${
                  format === 'post'
                    ? 'bg-burgundy text-white border-burgundy shadow-sm'
                    : 'bg-white hover:bg-beige/20 text-burgundy border-burgundy/20'
                }`}
              >
                <span>بوست مربع (1:1)</span>
              </button>
            </div>
          </div>

          {/* Theme Selector */}
          <div>
            <label className="text-xs font-bold text-burgundy block mb-1.5">الثيم اللوني الملكي:</label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setThemeId(t.id)}
                  className={`rounded-xl p-2.5 text-[11px] font-bold border transition text-center ${
                    themeId === t.id
                      ? 'bg-amber-100 border-amber-500 text-burgundy ring-2 ring-amber-400'
                      : 'bg-white hover:bg-beige/20 border-burgundy/15 text-burgundy/70'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Headline Selector */}
          <div>
            <label className="text-xs font-bold text-burgundy block mb-1.5">الشارة الترويجية (العنوان الرئيسي):</label>
            <select
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full rounded-xl border border-burgundy/20 bg-white p-3 text-xs font-bold text-burgundy outline-none focus:border-burgundy"
            >
              {HEADLINES.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* Promo Code Badge */}
          <div className="space-y-2 pt-2 border-t border-burgundy/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-burgundy">عرض كود خصم في البوستر:</label>
              <input
                type="checkbox"
                checked={showPromo}
                onChange={(e) => setShowPromo(e.target.checked)}
                className="h-4 w-4 accent-burgundy"
              />
            </div>
            {showPromo && (
              <input
                type="text"
                value={customBadge}
                onChange={(e) => setCustomBadge(e.target.value)}
                placeholder="مثال: كود خصم: MODA10"
                className="w-full rounded-xl border border-burgundy/20 bg-white px-3 py-2 text-xs font-bold text-burgundy outline-none"
              />
            )}
          </div>
        </div>

        {/* Live Visual Preview Container */}
        <div className="flex flex-col items-center">
          <p className="text-xs font-bold text-burgundy/60 mb-2">معاينة البوستر الحية:</p>
          <div
            ref={previewRef}
            className={`relative overflow-hidden rounded-3xl border-2 shadow-2xl transition-all duration-300 bg-gradient-to-b ${activeTheme.bg} ${activeTheme.border} ${
              format === 'story' ? 'w-[320px] h-[568px]' : 'w-[320px] h-[320px]'
            } flex flex-col justify-between p-5 text-center`}
          >
            {/* Top Brand */}
            <div>
              <p className={`text-base font-black tracking-widest ${activeTheme.text}`}>
                MODAPELLA
              </p>
              <p className="text-[8px] uppercase tracking-widest opacity-60">
                HAUTE COUTURE
              </p>
              <div className="mt-2 inline-block">
                <span className={`text-[9px] font-bold px-3 py-0.5 rounded-full shadow-xs ${activeTheme.badge}`}>
                  {headline}
                </span>
              </div>
            </div>

            {/* Middle Image Card */}
            <div className="relative my-auto rounded-2xl overflow-hidden border border-white/20 aspect-[4/3] bg-black/20 shadow-lg">
              <img
                src={selectedProduct?.images?.[0] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80'}
                alt="Product Preview"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Bottom Details & CTA */}
            <div className="space-y-1.5">
              <h4 className={`text-xs font-black truncate ${activeTheme.text}`}>
                {cleanProductName(selectedProduct?.name || '')}
              </h4>
              <p className="text-base font-black text-amber-400">
                {EGP(currentPrice)}
              </p>

              {showPromo && customBadge && (
                <div className="inline-block rounded-lg bg-white/10 px-2 py-0.5 border border-amber-300/40 text-[9px] font-bold text-amber-300">
                  {customBadge}
                </div>
              )}

              <div className="pt-1">
                <div className="rounded-xl bg-amber-500 text-burgundy font-black text-[10px] py-1.5 shadow">
                  اطلبي الآن من الرابط في البايو
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
