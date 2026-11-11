import { Link } from 'react-router-dom';

const steps = [
  {
    num: '٠١',
    stepLabel: 'الخطوة الأولى',
    title: 'اختاري قطعتكِ المفضلة',
    desc: 'تصفحي أحدث الموديلات المتوفرة في صالة العرض بمقاساتها وألوانها الحقيقية، واختاري المقاس واللون الأنسب لذوقك.',
    badge: 'تحديث مستمر للموديلات',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
    icon: (
      <svg className="w-4 h-4 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    )
  },
  {
    num: '٠٢',
    stepLabel: 'الخطوة الثانية',
    title: 'أكدي طلبكِ في ثوانٍ',
    desc: 'أضيفي بياناتك وعنوانك في خطوة واحدة ميسرة، بدون الحاجة لدفع مسبق أو كارت بنكي — الدفع متاح عند الاستلام.',
    badge: 'بدون دفع مسبق أو تعقيد',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80',
    icon: (
      <svg className="w-4 h-4 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    num: '٠٣',
    stepLabel: 'الخطوة الثالثة',
    title: 'قيسي وعايني براحتك قبل الدفع',
    desc: 'سواء اخترتي الشحن السريع لباب بيتك أو الاستلام من صالة العرض في بني مزار، ليكي كامل حرية المعاينة والتأكد من الخامة والمقاس قبل ما تدفعي مليم.',
    badge: 'معاينة تامة واستبدال مرن',
    image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&q=80',
    icon: (
      <svg className="w-4 h-4 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    )
  }
];

export default function OrderStepsVisualCards() {
  return (
    <section className="rounded-[2.5rem] border border-burgundy/10 bg-gradient-to-b from-white via-[#FAF7F2] to-white p-6 sm:p-10 lg:p-12 shadow-soft space-y-8 select-none" dir="rtl">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-burgundy/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-burgundy">
          تجربة تسوق سهلة ومضمونة
          <span className="w-1.5 h-1.5 rounded-full bg-burgundy animate-pulse" />
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-burgundy leading-snug">
          إزاي تطلبي بسهولة؟
        </h2>
        <p className="text-xs sm:text-sm text-burgundy/70 leading-relaxed">
          ثلاث خطوات بسيطة ومباشرة من لحظة اختياركِ لحد ما تعايني وتستلمي قطعتكِ على عينكِ
        </p>
      </div>

      {/* Visual Story Cards Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.num}
            className="group relative flex flex-col overflow-hidden rounded-3xl border border-burgundy/10 bg-white shadow-soft transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl hover:border-burgundy/25"
          >
            {/* Top Visual Imagery */}
            <div className="relative aspect-[16/11] w-full overflow-hidden bg-burgundy/5">
              <img
                src={step.image}
                alt={step.title}
                className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-burgundy/70 via-transparent to-transparent" />

              {/* Floating Step Number Pill */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-sm px-3 py-1 shadow-md border border-burgundy/10">
                <span className="w-2 h-2 rounded-full bg-burgundy" />
                <span className="text-[11px] font-black text-burgundy">{step.stepLabel}</span>
              </div>

              {/* Step Big Number Overlay Bottom Left */}
              <span className="absolute bottom-2 left-3 font-serif text-3xl font-black text-white/90 drop-shadow">
                {step.num}
              </span>
            </div>

            {/* Card Content Body */}
            <div className="flex flex-1 flex-col justify-between p-5 sm:p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-burgundy/10 text-burgundy shrink-0">
                    {step.icon}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-burgundy">
                    {step.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-burgundy/75 leading-relaxed">
                  {step.desc}
                </p>
              </div>

              {/* Bottom Guarantee Capsule */}
              <div className="pt-2 border-t border-burgundy/10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-burgundy/5 px-3 py-1 text-[11px] font-bold text-burgundy border border-burgundy/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {step.badge}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="pt-4 text-center">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 rounded-full bg-burgundy px-8 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg transition duration-300 hover:bg-[#680017] hover:shadow-xl active:scale-95"
        >
          <span>تصفحي المتجر واطلبي الآن</span>
          <svg className="w-4 h-4 stroke-current fill-none rotate-180" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </section>
  );
}

