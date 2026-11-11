import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import ShopTheLookCard from '../components/ShopTheLookCard';

// Sample demonstration look (concept preview before admin uploads live looks)
const DEMO_PREVIEW_LOOK = {
  _id: 'demo_look_editorial_01',
  title: 'إطلالة كلاسيك خريفية متكاملة',
  description: 'طقم متناسق بعناية من كولكشن 2026 يجمع بين البليزر الصوف الراقي، والبلوزة الحريرية الناعمة، والبنطلون الوايد ليج التركي. يمكنكِ طلب أي قطعة منفردة أو طلب الطقم كاملاً بخصم فوري.',
  category: 'كلاسيك فورمال',
  mediaType: 'image',
  mediaUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
  bundleDiscountPercent: 15,
  items: [
    {
      product: {
        _id: 'demo_prod_1',
        name: 'بليزر فورمال صوف كلاسيك مبطن',
        price: 850,
        category: 'بليزر',
        images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=80'],
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['أسود', 'كحلي', 'بيج']
      },
      tagRole: 'jacket',
      tagLabel: 'بليزر صوف تركي',
      positionX: 48,
      positionY: 28
    },
    {
      product: {
        _id: 'demo_prod_2',
        name: 'بلوزة حرير ناعمة بأزرار لؤلؤ',
        price: 450,
        category: 'بلوزة',
        images: ['https://images.unsplash.com/photo-1564257631407-4deb129f042b?auto=format&fit=crop&w=600&q=80'],
        sizes: ['Free Size'],
        colors: ['أوف وايت', 'وردي فاتح']
      },
      tagRole: 'top',
      tagLabel: 'بلوزة حرير ناعمة',
      positionX: 58,
      positionY: 44
    },
    {
      product: {
        _id: 'demo_prod_3',
        name: 'بنطلون وايد ليج كريب تركي',
        price: 550,
        category: 'بنطلون',
        images: ['https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80'],
        sizes: ['38', '40', '42', '44'],
        colors: ['أسود', 'جملي']
      },
      tagRole: 'bottom',
      tagLabel: 'بنطلون وايد ليج',
      positionX: 42,
      positionY: 72
    }
  ]
};

export default function LookbookPage() {
  const [looks, setLooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [mediaFilter, setMediaFilter] = useState('all'); // 'all' | 'video' | 'image'

  useEffect(() => {
    api.get('/looks')
      .then((res) => {
        setLooks(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load lookbook:', err);
        setLooks([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    return ['الكل', ...new Set(looks.map((l) => l.category).filter(Boolean))];
  }, [looks]);

  const filteredLooks = useMemo(() => {
    return looks.filter((l) => {
      const matchCat = selectedCategory === 'الكل' || l.category === selectedCategory;
      const matchMedia =
        mediaFilter === 'all' ||
        (mediaFilter === 'video' && l.mediaType === 'video') ||
        (mediaFilter === 'image' && l.mediaType === 'image');
      return matchCat && matchMedia;
    });
  }, [looks, selectedCategory, mediaFilter]);

  const videoCount = useMemo(() => looks.filter((l) => l.mediaType === 'video').length, [looks]);
  const photoCount = useMemo(() => looks.filter((l) => l.mediaType === 'image').length, [looks]);

  return (
    <div className="space-y-6 sm:space-y-10 py-4 sm:py-8 pb-28 sm:pb-16 text-burgundy" dir="rtl">
      
      {/* ── Editorial Fashion Studio Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-burgundy/15 bg-gradient-to-l from-white via-[#FAF7F5] to-white p-6 sm:p-8 lg:p-10 shadow-xs">
        {/* Luxury Background Watermark */}
        <div className="absolute -top-6 sm:-top-10 -left-6 sm:-left-10 text-[85px] sm:text-[130px] lg:text-[170px] font-black text-burgundy/[0.08] select-none pointer-events-none tracking-[0.18em] leading-none uppercase">
          MODAPELLA
        </div>

        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr] items-center">
          <div className="space-y-3.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-burgundy/5 text-burgundy text-xs font-bold border border-burgundy/10">
              <span className="w-2 h-2 rounded-full bg-[#7c0a12] animate-pulse" />
              <span>MODAPELLA ATELIER - استوديو الموديل والتنسيقات التفاعلية</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-burgundy tracking-tight leading-snug">
              إطلالات وتنسيقات الموديل الحقيقية
            </h1>

            <p className="text-xs sm:text-sm text-burgundy/75 leading-relaxed max-w-xl">
              شاهدي كل إطلالة وتناسق ألوانها على الطبيعة بجلسات التصوير الحية والفيديوهات عالية الدقة. اضغطي على الدوائر المتوهجة فوق أي قطعة لمعرفة تفاصيلها ومقاساتها، واحصلي على خصم خاص فوري عند طلب اللوك كاملاً.
            </p>

            {/* Feature Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="px-3 py-1 rounded-full bg-white border border-burgundy/10 text-burgundy/80 font-bold shadow-2xs">
                نقاط لمس تفاعلية
              </span>
              <span className="px-3 py-1 rounded-full bg-white border border-burgundy/10 text-burgundy/80 font-bold shadow-2xs">
                فيديوهات وريلز حية
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                خصم فوري للطقم بالكامل
              </span>
            </div>
          </div>

          {/* Right Side: Quick Stats Summary */}
          <div className="flex flex-col gap-3 justify-center">
            <div className="grid grid-cols-3 gap-2 bg-white/80 border border-burgundy/10 rounded-2xl p-4 text-center shadow-2xs">
              <div>
                <span className="block text-lg sm:text-xl font-black text-burgundy">{looks.length > 0 ? looks.length : 1}</span>
                <span className="text-[10px] sm:text-xs text-burgundy/60 font-bold">إطلالة منسقة</span>
              </div>
              <div className="border-r border-burgundy/10 pr-2">
                <span className="block text-lg sm:text-xl font-black text-burgundy">{videoCount}</span>
                <span className="text-[10px] sm:text-xs text-burgundy/60 font-bold">ريلز فيديو</span>
              </div>
              <div className="border-r border-burgundy/10 pr-2">
                <span className="block text-lg sm:text-xl font-black text-burgundy">{looks.length > 0 ? photoCount : 1}</span>
                <span className="text-[10px] sm:text-xs text-burgundy/60 font-bold">فوتوسيشن</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Category Bar ── */}
      {looks.length > 0 && (
        <div className="space-y-2.5 bg-white p-3.5 rounded-2xl border border-burgundy/10 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-burgundy/5 pb-2.5">
            {/* Media Type Tabs */}
            <div className="flex items-center gap-1.5 bg-[#FAF7F5] p-1 rounded-xl text-xs border border-burgundy/10">
              <button
                type="button"
                onClick={() => setMediaFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  mediaFilter === 'all'
                    ? 'bg-burgundy text-white shadow-xs'
                    : 'text-burgundy/70 hover:text-burgundy'
                }`}
              >
                الكل ({looks.length})
              </button>
              <button
                type="button"
                onClick={() => setMediaFilter('video')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                  mediaFilter === 'video'
                    ? 'bg-burgundy text-white shadow-xs'
                    : 'text-burgundy/70 hover:text-burgundy'
                }`}
              >
                <span>فيديوهات ({videoCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaFilter('image')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                  mediaFilter === 'image'
                    ? 'bg-burgundy text-white shadow-xs'
                    : 'text-burgundy/70 hover:text-burgundy'
                }`}
              >
                <span>صور ({photoCount})</span>
              </button>
            </div>

            <span className="text-xs font-bold text-burgundy/60">
              معروض {filteredLooks.length} إطلالة
            </span>
          </div>

          {/* Category Horizontal Pills */}
          {categories.length > 2 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar select-none">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-burgundy text-white shadow-xs scale-[1.02]'
                        : 'bg-[#FAF7F5] border border-burgundy/10 text-burgundy/70 hover:border-burgundy/30'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Looks Stream ── */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-96 w-full bg-burgundy/5 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : looks.length === 0 ? (
        /* Empty Database State: Shows Live Interactive Atelier Sample + Note */
        <div className="space-y-6">
          <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-4 text-center">
            <span className="text-xs sm:text-sm font-bold text-amber-900 block">
              معاينة حية تفاعلية: هذا النموذج يوضح كيف ستظهر إطلالات وفيديوهات الموديل بعد رفعها من لوحة التحكم
            </span>
          </div>
          <ShopTheLookCard look={DEMO_PREVIEW_LOOK} />
        </div>
      ) : filteredLooks.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-white border border-burgundy/10 shadow-soft space-y-4">
          <h3 className="text-xl font-black text-burgundy">لا توجد إطلالات مطابقة لهذا الفلتر حالياً</h3>
          <p className="text-xs sm:text-sm text-burgundy/60 max-w-md mx-auto">
            فريق مودة بيلا يجهز جلسات تصوير وفيديوهات جديدة قادمة قريباً جداً!
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('الكل');
              setMediaFilter('all');
            }}
            className="inline-block px-6 py-2.5 rounded-full bg-burgundy text-white text-xs sm:text-sm font-bold shadow hover:bg-[#680017] transition cursor-pointer"
          >
            إعادة ضبط الفلتر
          </button>
        </div>
      ) : (
        <div className="space-y-8 sm:space-y-12">
          {filteredLooks.map((look) => (
            <ShopTheLookCard key={look._id} look={look} />
          ))}
        </div>
      )}
    </div>
  );
}
