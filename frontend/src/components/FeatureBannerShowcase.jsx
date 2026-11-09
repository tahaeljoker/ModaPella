import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { resolveImageUrl } from '../utils/imageUrl';

const defaultHeroImages = [
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=85',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1800&q=85',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=85'
];

export default function FeatureBannerShowcase({ siteConfig = {} }) {
  const images = (siteConfig.heroImages?.length ? siteConfig.heroImages : defaultHeroImages).filter(Boolean);
  const slideCount = images.length || 1;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const containerRef = useRef(null);

  const speedMs = Math.max(3, Number(siteConfig.heroAutoplaySpeed || 5)) * 1000;

  // ── Auto-crossfade background images ──
  useEffect(() => {
    if (slideCount <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % slideCount);
    }, speedMs);
    return () => clearInterval(timer);
  }, [slideCount, speedMs]);

  // ── High-performance Scroll-driven Animation Loop ──
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // Track how much the hero has been scrolled past
            const scrolled = Math.max(0, -rect.top);
            setScrollY(scrolled);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const tag = siteConfig.heroBadge || 'ModaPella ✦ كولكشن الموسم الجديد';
  const title = siteConfig.heroTitle || 'أناقة ناعمة تدوم، وبساطة تليق بكِ';
  const description =
    siteConfig.heroSubtitle ||
    'كل قطعة في كولكشن مودة بيلا بنختارها بخامات ناعمة ومريحة وتفصيل مظبوط بدون تنازلات. اطلبي اللي يعجبك أونلاين وتعايني وتقيسي مع المندوب قبل ما تدفعي مليم، أو شرفينا في صالة العرض ببني مزار.';

  const primaryCtaLabel = siteConfig.heroCtaLabel || 'تسوقي الكولكشن الجديد';
  const primaryCtaLink = siteConfig.heroCtaLink || '/shop';
  const secondaryCtaLabel = siteConfig.secondaryCtaLabel || 'تنسيق طقم عبر واتساب';
  const whatsappNum = siteConfig.whatsappNumber || '201090048832';
  const secondaryCtaLink =
    siteConfig.secondaryCtaLink ||
    `https://wa.me/${whatsappNum}?text=أهلاً%20ModaPella،%20عايزة%20استشارة%20لتنسيق%20طقم%20مناسب`;

  const isExternalSecondary =
    secondaryCtaLink.startsWith('http://') ||
    secondaryCtaLink.startsWith('https://') ||
    secondaryCtaLink.startsWith('wa.me');

  // Parallax calculations (bounded to prevent over-scroll glitches)
  const clampedScroll = Math.min(scrollY, 550);
  const parallaxOffset = clampedScroll * 0.38; // Background image drifts down slower than scroll
  const contentFadeOpacity = Math.max(0, 1 - clampedScroll / 320); // Content fades out smoothly
  const contentAscend = clampedScroll * 0.22; // Content drifts upwards gently
  const indicatorOpacity = Math.max(0, 1 - clampedScroll / 35); // Scroll cue vanishes immediately

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden rounded-[2.2rem] sm:rounded-[3rem] bg-stone-950 text-white min-h-[560px] sm:min-h-[620px] lg:min-h-[660px] flex flex-col justify-between p-5 sm:p-10 lg:p-14 border border-stone-800/80 shadow-2xl select-none"
      dir="rtl"
    >
      {/* ── 1. CINEMATIC BACKGROUND WITH PARALLAX & KEN-BURNS ZOOM ── */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none will-change-transform"
        style={{
          transform: `translate3d(0, ${parallaxOffset}px, 0)`,
        }}
      >
        {images.map((imgUrl, idx) => {
          const isActive = idx === currentIdx;
          return (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1400 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img
                src={resolveImageUrl(imgUrl)}
                alt={`ModaPella Editorial ${idx + 1}`}
                className={`w-full h-full object-cover object-center animate-ken-burns transition-transform duration-1000 ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
            </div>
          );
        })}

        {/* Cinematic Mist Gradient Overlays (Ensures text readability in all conditions) */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/45 to-stone-950/30 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-transparent to-stone-950/40 z-10 hidden sm:block" />
        <div className="absolute inset-0 bg-radial from-transparent via-transparent to-stone-950/70 z-10" />
      </div>

      {/* ── 2. TOP EYEBROW & STORE LOCATION BAR ── */}
      <div
        className="relative z-20 flex items-center justify-between gap-3 will-change-transform transition-transform duration-200"
        style={{
          transform: `translate3d(0, -${contentAscend * 0.5}px, 0)`,
          opacity: contentFadeOpacity,
        }}
      >
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm text-stone-200 tracking-wide font-medium shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>{tag}</span>
        </span>

        <div className="hidden sm:flex items-center gap-2 text-xs text-stone-300 font-light bg-stone-900/50 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-white/10">
          <span>بني مزار — المنيا</span>
          <span className="text-amber-400 font-medium">✦ معاينة مجانية قبل الدفع</span>
        </div>
      </div>

      {/* ── 3. MAIN HERO CONTENT (NARRATIVE + CTAs) WITH SCROLL ASCEND & FADE ── */}
      <div
        className="relative z-20 max-w-2xl space-y-4 sm:space-y-6 text-right my-auto py-8 sm:py-12 will-change-transform transition-all duration-150 ease-out"
        style={{
          transform: `translate3d(0, -${contentAscend}px, 0)`,
          opacity: contentFadeOpacity,
        }}
      >
        <div className="space-y-2">
          <span className="inline-block text-amber-200/90 text-xs sm:text-sm font-semibold tracking-wide">
            فخامة هادئة وتفاصيل تليق بيومك
          </span>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight sm:leading-[1.18] tracking-tight">
            {title}
          </h1>
        </div>

        <p className="text-stone-200 text-xs sm:text-base leading-relaxed sm:leading-loose font-normal max-w-xl text-stone-200/90">
          {description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            to={primaryCtaLink}
            className="px-7 sm:px-9 py-3.5 sm:py-4 rounded-full bg-white text-stone-950 font-black text-xs sm:text-sm shadow-xl hover:bg-stone-100 hover:scale-102 active:scale-95 transition-all duration-300 flex items-center gap-2 group cursor-pointer"
          >
            <span>{primaryCtaLabel}</span>
            <span className="text-base group-hover:-translate-x-1 transition-transform">←</span>
          </Link>

          {isExternalSecondary ? (
            <a
              href={secondaryCtaLink}
              target="_blank"
              rel="noreferrer"
              className="px-6 sm:px-7 py-3.5 sm:py-4 rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-white hover:bg-white/20 font-bold text-xs sm:text-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-emerald-400 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span>{secondaryCtaLabel}</span>
            </a>
          ) : (
            <Link
              to={secondaryCtaLink}
              className="px-6 sm:px-7 py-3.5 sm:py-4 rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-white hover:bg-white/20 font-bold text-xs sm:text-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>{secondaryCtaLabel}</span>
            </Link>
          )}
        </div>

        {/* Slide Indicator Dots (If multiple hero photos exist) */}
        {slideCount > 1 && (
          <div className="flex items-center gap-2 pt-2">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIdx(i)}
                className={`h-1.5 rounded-full transition-all duration-400 cursor-pointer ${
                  i === currentIdx ? 'w-7 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`انتقال للشريحة ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 4. SMOOTH SCROLL PROMPT CUE (VANISHES ON SCROLL) ── */}
      <div
        className="relative z-20 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-300 pb-2"
        style={{ opacity: indicatorOpacity }}
      >
        <span className="text-[10px] sm:text-xs text-stone-300 font-light mb-1.5 tracking-wider">
          اسحبي للأسفل لاستكشاف الكولكشن
        </span>
        <div className="w-5 h-8 rounded-full border-2 border-white/30 flex items-start justify-center p-1 animate-scroll-bounce">
          <div className="w-1.5 h-2 rounded-full bg-white" />
        </div>
      </div>

      {/* ── 5. BOTTOM INFINITE MARQUEE TICKER ── */}
      <div className="relative z-20 overflow-hidden border-t border-white/15 pt-3 sm:pt-4 -mx-5 sm:-mx-10 lg:-mx-14 px-5">
        <div className="animate-marquee whitespace-nowrap text-[11px] sm:text-xs text-stone-300 flex items-center gap-6 sm:gap-8 font-medium">
          <span className="flex items-center gap-2">✦ معاينة وقياس مع المندوب قبل دفع أي جنيه</span>
          <span className="flex items-center gap-2">✦ شحن مباشر لباب بيتك بجميع مراكز المنيا وكافة المحافظات</span>
          <span className="flex items-center gap-2">✦ خامات ناعمة ومريحة وتفصيل مظبوط</span>
          <span className="flex items-center gap-2">✦ تبديل فوري للمقاس بكل مرونة</span>
          <span className="flex items-center gap-2">✦ صالة عرض مودة بيلا: بني مزار - المنيا</span>
          {/* Loop duplicates */}
          <span className="flex items-center gap-2">✦ معاينة وقياس مع المندوب قبل دفع أي جنيه</span>
          <span className="flex items-center gap-2">✦ شحن مباشر لباب بيتك بجميع مراكز المنيا وكافة المحافظات</span>
          <span className="flex items-center gap-2">✦ خامات ناعمة ومريحة وتفصيل مظبوط</span>
          <span className="flex items-center gap-2">✦ تبديل فوري للمقاس بكل مرونة</span>
          <span className="flex items-center gap-2">✦ صالة عرض مودة بيلا: بني مزار - المنيا</span>
        </div>
      </div>
    </section>
  );
}
