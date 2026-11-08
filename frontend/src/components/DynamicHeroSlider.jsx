import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { resolveImageUrl } from '../utils/imageUrl';

const defaultHeroImages = [
  'https://i.postimg.cc/NFz9t4fC/Elegant-fashion-website-hero-banner-women-s-clothing-rack-background-soft-burgundy-overlay-modern.jpg',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1600&q=85'
];

export default function DynamicHeroSlider({ siteConfig = {} }) {
  const rawImages = siteConfig.heroImages?.length ? siteConfig.heroImages : defaultHeroImages;
  const images = rawImages.filter(Boolean);
  const slideCount = images.length || 1;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef(null);

  const speedMs = Math.max(3, Number(siteConfig.heroAutoplaySpeed || 5)) * 1000;

  // Auto-play interval
  useEffect(() => {
    if (slideCount <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slideCount);
    }, speedMs);

    return () => clearInterval(timer);
  }, [slideCount, isPaused, speedMs]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slideCount) % slideCount);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slideCount);
  };

  // Touch Swipe for mobile
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    // diff > 40: swiped left -> next in RTL
    if (diff > 40) {
      handleNext();
    } else if (diff < -40) {
      handlePrev();
    }
    touchStartXRef.current = null;
  };

  return (
    <div
      className="relative overflow-hidden rounded-[2.5rem] border border-burgundy/10 bg-burgundy shadow-soft select-none group"
      dir="rtl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Aspect Ratio Box */}
      <div className="relative aspect-[16/10] sm:aspect-[16/7] md:aspect-[21/9] min-h-[420px] max-h-[640px] w-full overflow-hidden">
        
        {/* Slides list */}
        {images.map((imgUrl, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={resolveImageUrl(imgUrl)}
                alt={`ModaPella Fashion Slide ${idx + 1}`}
                className={`h-full w-full object-cover object-center transition-transform duration-7000 ease-out ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
              {/* Luxury Cinematic Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-burgundy via-burgundy/50 to-black/25" />
              <div className="absolute inset-0 bg-gradient-to-r from-burgundy/70 via-transparent to-transparent hidden sm:block" />
            </div>
          );
        })}

        {/* Hero Narrative Overlay Content */}
        <div className="relative z-20 flex h-full flex-col justify-end p-6 sm:p-10 lg:p-14">
          <div className="max-w-2xl space-y-3 sm:space-y-4">
            
            {/* Top Floating Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-white backdrop-blur-md border border-white/20 shadow-sm">
              <span>{siteConfig.heroBadge || 'MODAPELLA ATELIER ✦ إطلالات الموسم الحصرية'}</span>
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-md">
              {siteConfig.heroTitle || 'أزياء تليق بكِ'}
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-base text-white/90 max-w-xl leading-relaxed sm:leading-loose drop-shadow">
              {siteConfig.heroSubtitle || 'تصفحي أحدث الموديلات النسائية واطلبي بسهولة، أو زوري محلنا مباشرة في بني مزار.'}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={siteConfig.heroCtaLink || '/shop'}
                className="rounded-full bg-white px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm font-black text-burgundy shadow-lg transition duration-300 hover:bg-beige hover:shadow-xl active:scale-95"
              >
                {siteConfig.heroCtaLabel || 'تسوقي الآن'}
              </Link>
              <Link
                to={siteConfig.secondaryCtaLink || '/collections'}
                className="rounded-full border border-white/70 bg-white/10 backdrop-blur-sm px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white transition duration-300 hover:bg-white/20 hover:border-white active:scale-95"
              >
                {siteConfig.secondaryCtaLabel || 'شاهدي المجموعات'}
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop Prev / Next Buttons */}
        {slideCount > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Slide"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md border border-white/30 transition duration-300 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-burgundy shadow-lg"
            >
              <svg className="w-5 h-5 stroke-current fill-none rotate-180" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Slide"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md border border-white/30 transition duration-300 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-burgundy shadow-lg"
            >
              <svg className="w-5 h-5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          </>
        )}

        {/* Slide Indicators Dots */}
        {slideCount > 1 && (
          <div className="absolute bottom-4 left-6 sm:left-10 z-30 flex items-center gap-2">
            {images.map((_, dotIdx) => {
              const isDotActive = dotIdx === currentIndex;
              return (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => setCurrentIndex(dotIdx)}
                  aria-label={`Go to slide ${dotIdx + 1}`}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    isDotActive ? 'w-8 bg-white shadow' : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
