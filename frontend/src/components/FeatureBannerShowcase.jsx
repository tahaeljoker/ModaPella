import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function FeatureBannerShowcase({
  tag = 'MODAPELLA ATELIER ✦ إطلالات الموسم الحصرية',
  title = 'أناقة تليق بتفاصيل يومكِ — من صالة العرض لباب بيتكِ',
  description = 'كل قطعة نختارها لكِ بعناية تجمع بين دفء الخامات الفاخرة والقصات التي تبرز أنوثتكِ ورقيّكِ. استمتعي بتجربة تسوق متكاملة تمنحكِ حرية المعاينة قبل الاستلام مع شحن مباشر وسريع لكافة مدن ومحافظات مصر.',
  primaryCtaLabel = 'اكتشفي التشكيلة الجديدة الآن',
  primaryCtaLink = '/shop',
  secondaryCtaLabel = 'استشارة تنسيق عبر واتساب',
  secondaryCtaLink = 'https://wa.me/201090048832?text=أهلاً%20ModaPella،%20أريد%20استشارة%20لتنسيق%20طقم%20مناسب',
  imageSrc = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85'
}) {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el); // once: true
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FAF7F2] via-white to-[#F6EFEA] border border-burgundy/15 p-6 sm:p-10 lg:p-12 shadow-soft transition-all duration-1000 ease-out select-none ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
      }`}
      dir="rtl"
    >
      {/* Subtle luxury ambient glow in background */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-burgundy/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid gap-8 lg:grid-cols-12 items-center">
        
        {/* Poster / Brand Image Side (5 cols on lg) */}
        <div
          className={`lg:col-span-5 relative group overflow-hidden rounded-2xl sm:rounded-3xl shadow-md border border-burgundy/10 aspect-[4/5] max-h-[480px] bg-beige/20 transition-all duration-1000 ease-out ${
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-y-8 lg:-translate-x-8'
          }`}
          style={{ transitionDelay: isVisible ? '150ms' : '0ms' }}
        >
          <img
            src={imageSrc}
            alt="ModaPella Fashion Showcase"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />

          {/* Floating Luxury Atelier Pill on Image */}
          <div className="absolute bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-4 bg-white/90 backdrop-blur-md border border-burgundy/10 rounded-2xl p-3 shadow-lg flex items-center justify-between gap-2">
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
          <div
            className={`transition-all duration-700 ease-out ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: isVisible ? '250ms' : '0ms' }}
          >
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-burgundy/5 border border-burgundy/15 text-burgundy text-xs font-black tracking-wide">
              <span>{tag}</span>
            </span>
          </div>

          {/* Main Headline */}
          <h2
            className={`text-2xl sm:text-3xl lg:text-4xl font-black text-burgundy leading-snug sm:leading-tight transition-all duration-700 ease-out ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: isVisible ? '380ms' : '0ms' }}
          >
            {title}
          </h2>

          {/* Description Story */}
          <p
            className={`text-sm sm:text-base text-burgundy/75 leading-relaxed sm:leading-loose max-w-2xl transition-all duration-700 ease-out ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: isVisible ? '500ms' : '0ms' }}
          >
            {description}
          </p>

          {/* Three Key Brand Guarantees (Clean SVG vector icons, Zero emojis) */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 transition-all duration-700 ease-out ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: isVisible ? '620ms' : '0ms' }}
          >
            {/* Feature 1 */}
            <div className="bg-white/80 rounded-2xl p-3 border border-burgundy/10 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-burgundy/10 text-burgundy flex items-center justify-center">
                <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h4 className="text-xs font-bold text-burgundy">معاينة قبل الدفع</h4>
              <p className="text-[10px] text-burgundy/60 leading-normal">تأكدي من المقاس والخامة على عينك</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/80 rounded-2xl p-3 border border-burgundy/10 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-burgundy/10 text-burgundy flex items-center justify-center">
                <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75a1.125 1.125 0 00-1.125-1.125H3.375A1.125 1.125 0 002.25 3.75v10.5m12-6.75h4.125c.621 0 1.125.504 1.125 1.125v4.5" />
                </svg>
              </div>
              <h4 className="text-xs font-bold text-burgundy">شحن لكل المحافظات</h4>
              <p className="text-[10px] text-burgundy/60 leading-normal">توصيل آمن وسريع لباب منزلكِ</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/80 rounded-2xl p-3 border border-burgundy/10 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-burgundy/10 text-burgundy flex items-center justify-center">
                <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </div>
              <h4 className="text-xs font-bold text-burgundy">استبدال سهل ومرن</h4>
              <p className="text-[10px] text-burgundy/60 leading-normal">حقكِ محفوظ دائماً وبكل ثقة</p>
            </div>
          </div>

          {/* Action CTA Buttons */}
          <div
            className={`flex flex-wrap items-center gap-3 pt-2 transition-all duration-700 ease-out ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: isVisible ? '750ms' : '0ms' }}
          >
            <Link
              to={primaryCtaLink}
              className="px-7 py-3.5 rounded-full bg-burgundy hover:bg-[#650018] text-white font-extrabold text-xs sm:text-sm transition-all duration-200 shadow-md shadow-burgundy/25 hover:shadow-lg active:scale-95 flex items-center gap-2"
            >
              <span>{primaryCtaLabel}</span>
              <span className="text-base leading-none">←</span>
            </Link>

            {secondaryCtaLink && (
              <a
                href={secondaryCtaLink}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3.5 rounded-full border border-burgundy/20 bg-white/80 hover:bg-white text-burgundy font-bold text-xs sm:text-sm transition active:scale-95 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-emerald-600 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>{secondaryCtaLabel}</span>
              </a>
            )}
          </div>

        </div>

      </div>
    </section>
  );
}

