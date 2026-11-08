import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveImageUrl } from '../utils/imageUrl';

const defaultHeroImages = [
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85',
  'https://i.postimg.cc/NFz9t4fC/Elegant-fashion-website-hero-banner-women-s-clothing-rack-background-soft-burgundy-overlay-modern.jpg'
];

export default function FeatureBannerShowcase({ siteConfig = {} }) {
  const images = (siteConfig.heroImages?.length ? siteConfig.heroImages : defaultHeroImages).filter(Boolean);
  const slideCount = images.length || 1;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const speedMs = Math.max(3, Number(siteConfig.heroAutoplaySpeed || 4.5)) * 1000;

  // Auto-play interval for the side hero images
  useEffect(() => {
    if (slideCount <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % slideCount);
    }, speedMs);

    return () => clearInterval(timer);
  }, [slideCount, isPaused, speedMs]);

  const tag = siteConfig.heroBadge || 'ModaPella ✦ كولكشن الموسم الجديد';
  const title = siteConfig.heroTitle || 'أشيك استايلات الموسم.. تليق بيكي وبجمال تفاصيلك';
  const description =
    siteConfig.heroSubtitle ||
    'كل قطعة في كولكشن مودة بيلا بنختارها على الفرازة، خامات ناعمة ومريحة وتفصيل مظبوط بدون تنازلات. اطلبي اللي يعجبك أونلاين وتعايني وتقيسي مع المندوب قبل ما تدفعي مليم، أو شرفينا في صالة العرض ببني مزار.';

  const primaryCtaLabel = siteConfig.heroCtaLabel || 'تصفحي أحدث الموديلات';
  const primaryCtaLink = siteConfig.heroCtaLink || '/shop';
  const secondaryCtaLabel = siteConfig.secondaryCtaLabel || 'استشيرينا على واتساب';
  const whatsappNum = siteConfig.whatsappNumber || '201090048832';
  const secondaryCtaLink =
    siteConfig.secondaryCtaLink ||
    `https://wa.me/${whatsappNum}?text=أهلاً%20ModaPella،%20عايزة%20استشارة%20لتنسيق%20طقم%20مناسب`;

  const isExternalSecondary =
    secondaryCtaLink.startsWith('http://') ||
    secondaryCtaLink.startsWith('https://') ||
    secondaryCtaLink.startsWith('wa.me');

  return (
    <section
      className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#FAF7F2] via-white to-[#F5EFEB] border border-burgundy/15 p-6 sm:p-10 lg:p-12 shadow-soft select-none"
      dir="rtl"
    >
      {/* Warm Ambient Glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-burgundy/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid gap-8 lg:grid-cols-12 items-center">
        {/* Dynamic Image Side (5 cols on lg) */}
        <div
          className="lg:col-span-5 relative group overflow-hidden rounded-3xl shadow-md border border-burgundy/10 aspect-[4/5] max-h-[500px] bg-beige/20"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Animated Image Slides */}
          {images.map((imgUrl, idx) => {
            const isActive = idx === currentIdx;
            return (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <img
                  src={resolveImageUrl(imgUrl)}
                  alt={`ModaPella Collection ${idx + 1}`}
                  className={`w-full h-full object-cover object-top transition-transform duration-7000 ease-out ${
                    isActive ? 'scale-105' : 'scale-100'
                  }`}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              </div>
            );
          })}

          {/* Slide Indicator Dots at top left */}
          {slideCount > 1 && (
            <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-xs px-2.5 py-1.5 rounded-full border border-white/20">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIdx(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentIdx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Floating Luxury Atelier Pill on Image */}
          <div className="absolute bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-4 bg-white/95 backdrop-blur-md border border-burgundy/10 rounded-2xl p-3 shadow-lg flex items-center justify-between gap-2 z-20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="text-right">
                <span className="text-[11px] font-black text-burgundy block">تشكيلة الشتاء والكاجوال</span>
                <span className="text-[9px] text-burgundy/60 font-medium">أقمشة مختارة بعناية للموسم الحالي</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-burgundy/80 bg-burgundy/5 px-2.5 py-1 rounded-full shrink-0">
              أزياء حصرية
            </span>
          </div>
        </div>

        {/* Narrative & Action Content Side (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6 text-right">
          {/* Eyebrow / Tag */}
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-burgundy/5 border border-burgundy/15 text-burgundy text-xs font-black tracking-wide">
              <span>{tag}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-burgundy animate-pulse" />
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-burgundy leading-snug sm:leading-tight">
            {title}
          </h1>

          {/* Human Description Story */}
          <p className="text-sm sm:text-base text-burgundy/75 leading-relaxed sm:leading-loose max-w-2xl">
            {description}
          </p>

          {/* Three Key Brand Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Feature 1 */}
            <div className="bg-white/90 rounded-2xl p-3.5 border border-burgundy/10 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-burgundy/10 text-burgundy flex items-center justify-center">
                <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h4 className="text-xs font-bold text-burgundy">معاينة وقِياس قبل الدفع</h4>
              <p className="text-[10px] text-burgundy/60 leading-normal">عايني براحتك وقيسي مع المندوب قبل ما تدفعي جنيه</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/90 rounded-2xl p-3.5 border border-burgundy/10 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-burgundy/10 text-burgundy flex items-center justify-center">
                <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75a1.125 1.125 0 00-1.125-1.125H3.375A1.125 1.125 0 002.25 3.75v10.5m12-6.75h4.125c.621 0 1.125.504 1.125 1.125v4.5" />
                </svg>
              </div>
              <h4 className="text-xs font-bold text-burgundy">شحن سريع لحد باب بيتك</h4>
              <p className="text-[10px] text-burgundy/60 leading-normal">توصيل فوري ومباشر لجميع المحافظات</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/90 rounded-2xl p-3.5 border border-burgundy/10 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-burgundy/10 text-burgundy flex items-center justify-center">
                <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </div>
              <h4 className="text-xs font-bold text-burgundy">استبدال فوري بكل مرونة</h4>
              <p className="text-[10px] text-burgundy/60 leading-normal">المقاس مظبطش؟ بنبدلهولك في نفس اليوم</p>
            </div>
          </div>

          {/* Action CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to={primaryCtaLink}
              className="px-8 py-3.5 rounded-full bg-burgundy hover:bg-[#650018] text-white font-extrabold text-xs sm:text-sm transition-all duration-200 shadow-md shadow-burgundy/25 hover:shadow-lg active:scale-95 flex items-center gap-2"
            >
              <span>{primaryCtaLabel}</span>
              <span className="text-base leading-none">←</span>
            </Link>

            {isExternalSecondary ? (
              <a
                href={secondaryCtaLink}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3.5 rounded-full border border-burgundy/20 bg-white/80 hover:bg-white text-burgundy font-bold text-xs sm:text-sm transition active:scale-95 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-emerald-600 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>{secondaryCtaLabel}</span>
              </a>
            ) : (
              <Link
                to={secondaryCtaLink}
                className="px-6 py-3.5 rounded-full border border-burgundy/20 bg-white/80 hover:bg-white text-burgundy font-bold text-xs sm:text-sm transition active:scale-95 flex items-center gap-2"
              >
                <span>{secondaryCtaLabel}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
