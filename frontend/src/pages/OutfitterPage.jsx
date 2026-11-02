import { useState } from 'react';
import { Link } from 'react-router-dom';
import OutfitterCanvas from '../components/OutfitterCanvas';

export default function OutfitterPage() {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="space-y-10 py-6 sm:py-10 pb-28 sm:pb-12 text-burgundy">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-burgundy via-[#680017] to-[#45000E] text-white p-6 sm:p-12 shadow-soft">
        {/* Decorative background circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-300">
            <span>✨</span>
            <span>غرفة تنسيق وتبديل الملابس التفاعلية</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            نسّقي إطلالتكِ كاملة وشوفيها على المانيكان قبل الشراء!
          </h1>

          <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl">
            اختاري القطعة العلوية والسفلية وبدّلي بين الألوان بنقرة واحدة بدون انتظار rendering ثقيل. اجمعي الطقم معاً واحصلي على خصم خاص 15% فوري يضاف لسلتكِ مباشرة!
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href="#studio-canvas"
              className="px-6 py-3 rounded-full bg-white text-burgundy font-black text-sm hover:bg-beige transition shadow-md active:scale-95 flex items-center gap-2"
            >
              <span>ابدأي التنسيق الآن</span>
              <span>↓</span>
            </a>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm transition active:scale-95"
            >
              {showGuide ? 'إخفاء دليل التصوير والأبعاد' : '📐 دليل رفع الصور المفرغة والأبعاد'}
            </button>
          </div>
        </div>
      </div>

      {/* Guide Section for Transparent PNG Uploads & Guidelines */}
      {showGuide && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-burgundy/15 shadow-soft space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-burgundy/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📐</span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-burgundy">
                  دليل مواصفات وتجهيز صور الملابس المفرغة (2D Layered Compositing)
                </h3>
                <p className="text-xs text-burgundy/60">
                  اتبعي هذه المعايير لتجهيز صور الملابس الجديدة لتتطابق بدقة ميليمترية على المانيكان
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="text-xs font-bold text-burgundy/60 hover:text-burgundy"
            >
              إغلاق ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-4 rounded-2xl bg-beige/30 border border-burgundy/10 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-burgundy/10 flex items-center justify-center font-black text-burgundy text-sm">
                1
              </div>
              <h4 className="text-sm font-black text-burgundy">الأبعاد ونسبة العرض (2:3)</h4>
              <p className="text-xs text-burgundy/70 leading-relaxed">
                يجب أن تكون جميع الصور بنفس الأبعاد بالضبط:
                <br />
                <strong className="text-burgundy">800 × 1200 بكسل</strong> أو <strong className="text-burgundy">1000 × 1500 بكسل</strong>.
                حجم اللوحة الموحد يضمن عدم تحرك الملابس عند التبديل.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-beige/30 border border-burgundy/10 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-burgundy/10 flex items-center justify-center font-black text-burgundy text-sm">
                2
              </div>
              <h4 className="text-sm font-black text-burgundy">تفريغ الخلفية (Transparent PNG)</h4>
              <p className="text-xs text-burgundy/70 leading-relaxed">
                يتم تصدير الصور بصيغة <strong className="text-burgundy">PNG-24 مع شفافية (Alpha Channel)</strong> أو <strong className="text-burgundy">WebP Transparent</strong> بدون أي خلفية بيضاء لكي تظهر الطبقات السفلية من تحتها بنعومة.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-beige/30 border border-burgundy/10 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-burgundy/10 flex items-center justify-center font-black text-burgundy text-sm">
                3
              </div>
              <h4 className="text-sm font-black text-burgundy">تطابق موضع التصوير</h4>
              <p className="text-xs text-burgundy/70 leading-relaxed">
                تصوير القطع على نفس المانيكان وفي نفس زاوية الكاميرا، أو وضع القطعة المفرغة في موضعها المناسب داخل لوحة الـ 800×1200 بحيث تكون البلوزة في النصف العلوي والبنطلون في النصف السفلي.
              </p>
            </div>
          </div>

          {/* Upload paths guide */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
            <span className="font-bold block">📁 أين يتم وضع ملفات الصور على السيرفر؟</span>
            <p className="leading-relaxed">
              • للصور الثابتة الافتراضية: يتم وضعها مباشرة في مجلد المشروع <code className="bg-amber-100 px-2 py-0.5 rounded font-mono">frontend/public/outfitter/</code>.
              <br />
              • أو من خلال لوحة تحكم الإدارة عبر رفع صور المنتجات، وسيتم توليد رابط تلقائي مثل <code className="bg-amber-100 px-2 py-0.5 rounded font-mono">/uploads/outfitter/...</code>.
              <br />
              • يمكنكِ أيضاً تجربة أي صورة فوراً من جهازكِ بالضغط على زر <strong className="font-black">"🧪 تجربة الصور"</strong> بأعلى غرفة التنسيق!
            </p>
          </div>
        </div>
      )}

      {/* Outfitter Canvas Component */}
      <div id="studio-canvas" className="scroll-mt-24">
        <OutfitterCanvas />
      </div>

      {/* Three Value Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className="p-6 rounded-3xl bg-white border border-burgundy/10 shadow-soft flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-2xl flex-shrink-0">
            ⚡
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-burgundy">تبديل ألوان فوري بدون انتظار</h4>
            <p className="text-xs text-burgundy/70 leading-relaxed">
              تقنية الطبقات الشفافة 2D Layer Compositing تتيح لكِ معاينة فورية بدون أي تأخير أو استهلاك إنترنت زائد.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-burgundy/10 shadow-soft flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl flex-shrink-0">
            🎁
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-burgundy">خصم 15% فوري على الطقم</h4>
            <p className="text-xs text-burgundy/70 leading-relaxed">
              عند شراء قطعة علوية وسفلية معاً، يتم تطبيق خصم 15% تلقائياً في سلة الشراء بنقرة واحدة.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-burgundy/10 shadow-soft flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-burgundy/10 flex items-center justify-center text-2xl flex-shrink-0">
            🛡️
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-burgundy">معاينة عند الاستلام</h4>
            <p className="text-xs text-burgundy/70 leading-relaxed">
              شحن سريع لجميع أنحاء مصر مع إمكانية فتح الشحنة والتأكد من مطابقة الخامات والمقاسات قبل الدفع.
            </p>
          </div>
        </div>
      </div>

      {/* Need Help Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-beige/40 border border-burgundy/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
        <div>
          <h4 className="text-base font-black text-burgundy">
            محتارة في تنسيق الألوان أو اختيار المقاس المناسب؟
          </h4>
          <p className="text-xs text-burgundy/70 mt-1">
            فريق ستايلست مودة بيلا متاح على واتساب لمساعدتكِ في اختيار اللوك الأنسب لشكل قوامكِ ولون بشرتكِ!
          </p>
        </div>

        <a
          href="https://wa.me/201090048832?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D9%85%D8%AD%D8%AA%D8%A7%D8%AC%D8%A9%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D9%81%D9%8A%20%D8%AA%D9%86%D8%B3%D9%8A%D9%82%20%D8%A5%D8%B7%D9%84%D8%A7%D9%84%D8%A9%20%D9%85%D9%86%20%D8%BA%D8%B1%D9%81%D8%A9%20%D8%A7%D9%84%D8%AA%D9%86%D8%B3%D9%8A%D9%82"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm transition shadow flex items-center gap-2 whitespace-nowrap active:scale-95"
        >
          <span>💬</span>
          <span>تحدثي مع الستايلست على واتساب</span>
        </a>
      </div>
    </div>
  );
}
