const tickerItems = [
  { icon: '✦', text: 'شحن سريع لجميع محافظات مصر' },
  { icon: '✦', text: 'أحدث صيحات الأزياء النسائية العصرية' },
  { icon: '✦', text: 'خامات وتقفيل تركي ومصري عالي الجودة' },
  { icon: '✦', text: 'معاينة قبل الاستلام واستبدال خلال 14 يوماً' },
  { icon: '✦', text: 'الدفع عند الاستلام أو كاش عبر Instapay' },
  { icon: '✦', text: 'كود خصم حصري للطلبات أونلاين' },
  { icon: '✦', text: 'تغليف أنيق يليق بكل قطعة تطلبيها' },
];

export default function MarqueeTicker() {
  return (
    <div className="relative overflow-hidden py-3 bg-gradient-to-r from-burgundy via-[#800020] to-[#550015] text-white shadow-soft rounded-2xl sm:rounded-3xl border border-white/10 select-none">
      {/* Soft gradient edge fade */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-24 bg-gradient-to-r from-burgundy to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-24 bg-gradient-to-l from-burgundy to-transparent z-10" />

      {/* Marquee Content track */}
      <div className="animate-marquee-rtl flex items-center">
        {/* Set 1 */}
        <div className="flex items-center gap-6 sm:gap-10 shrink-0 pr-6 sm:pr-10">
          {tickerItems.map((item, index) => (
            <div key={`item-1-${index}`} className="flex items-center gap-2.5 whitespace-nowrap text-xs sm:text-sm font-semibold tracking-wide">
              <span className="text-sm sm:text-base">{item.icon}</span>
              <span className="text-white/95">{item.text}</span>
              <span className="text-amber-300/60 text-xs mr-3">✦</span>
            </div>
          ))}
        </div>

        {/* Set 2 (Duplicate for continuous seamless loop) */}
        <div className="flex items-center gap-6 sm:gap-10 shrink-0 pr-6 sm:pr-10" aria-hidden="true">
          {tickerItems.map((item, index) => (
            <div key={`item-2-${index}`} className="flex items-center gap-2.5 whitespace-nowrap text-xs sm:text-sm font-semibold tracking-wide">
              <span className="text-sm sm:text-base">{item.icon}</span>
              <span className="text-white/95">{item.text}</span>
              <span className="text-amber-300/60 text-xs mr-3">✦</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
