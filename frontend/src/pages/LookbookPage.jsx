import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ShopTheLookCard from '../components/ShopTheLookCard';

export default function LookbookPage() {
  const [looks, setLooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [mediaFilter, setMediaFilter] = useState('all'); // 'all' | 'video' | 'image'

  useEffect(() => {
    // Note: window.scrollTo(0, 0) removed so browser/hardware back preserves scroll location
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
    <div className="space-y-6 sm:space-y-8 py-4 sm:py-8 pb-28 sm:pb-16 text-burgundy" dir="rtl">
      {/* Editorial Fashion Studio Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-burgundy/15 bg-gradient-to-l from-white via-[#FAF7F5] to-white p-6 sm:p-8 lg:p-10 shadow-xs">
        {/* Subtle Fashion Watermark Accent */}
        <div className="absolute -top-10 -left-10 text-[90px] font-black text-burgundy/[0.03] select-none pointer-events-none tracking-widest">
          MODAPELLA
        </div>

        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr] items-center">
          <div className="space-y-3.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-burgundy/5 text-burgundy text-[11px] sm:text-xs font-bold border border-burgundy/10">
              <span className="w-1.5 h-1.5 rounded-full bg-burgundy" />
              <span>MODAPELLA ATELIER ✦ استوديو الموديل والتنسيقات</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-burgundy tracking-tight leading-snug">
              إطلالات وتنسيقات الموديل الحقيقية
            </h1>

            <p className="text-xs sm:text-sm text-burgundy/70 leading-relaxed max-w-xl">
              شاهدي كل طقم وتناسق ألوانه على الطبيعة بالفيديو عالي الدقة وجلسات التصوير الحية للتعرف على تفاصيل القصة والخامة قبل الطلب. اضغطي على أي قطعة لمعرفة تفاصيلها ومقاساتها، واحصلي على خصم خاص فوري عند طلب اللوك كاملاً.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="px-3 py-1 rounded-full bg-[#FAF7F5] border border-burgundy/10 text-burgundy/80 font-bold">
                فيديوهات وريلز حيّة
              </span>
              <span className="px-3 py-1 rounded-full bg-[#FAF7F5] border border-burgundy/10 text-burgundy/80 font-bold">
                تنسيقات متناسقة بالكامل
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                خصم فوري للطقم الكامل
              </span>
            </div>
          </div>

          {/* Left Side: Stats & Outfitter Action */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
            <div className="grid grid-cols-3 gap-2 bg-[#FAF7F5] border border-burgundy/10 rounded-2xl p-3.5 text-center">
              <div>
                <span className="block text-base sm:text-lg font-black text-burgundy">{looks.length}</span>
                <span className="text-[10px] text-burgundy/60 font-semibold">إطلالة منسقة</span>
              </div>
              <div className="border-r border-burgundy/10 pr-2">
                <span className="block text-base sm:text-lg font-black text-burgundy">{videoCount}</span>
                <span className="text-[10px] text-burgundy/60 font-semibold">ريلز فيديو</span>
              </div>
              <div className="border-r border-burgundy/10 pr-2">
                <span className="block text-base sm:text-lg font-black text-burgundy">{photoCount}</span>
                <span className="text-[10px] text-burgundy/60 font-semibold">فوتوسيشن</span>
              </div>
            </div>

            <Link
              to="/outfitter"
              className="px-4 py-3 rounded-2xl bg-burgundy hover:bg-[#680017] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs group"
            >
              <span>تجربة غرفة تنسيق المانيكان أيضاً</span>
              <span className="group-hover:translate-x-0.5 transition">←</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Calm & Compact Filter Bar */}
      <div className="space-y-2.5 bg-white p-3 rounded-2xl border border-burgundy/10 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-burgundy/5 pb-2.5">
          {/* Media Type Tabs */}
          <div className="flex items-center gap-1 bg-[#FAF7F5] p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setMediaFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
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
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
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
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                mediaFilter === 'image'
                  ? 'bg-burgundy text-white shadow-xs'
                  : 'text-burgundy/70 hover:text-burgundy'
              }`}
            >
              <span>صور ({photoCount})</span>
            </button>
          </div>

          <span className="text-[11px] font-semibold text-burgundy/50">
            معروض {filteredLooks.length} إطلالة
          </span>
        </div>

        {/* Category Horizontal Swipeable Pills */}
        {categories.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar select-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
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

      {/* Looks List */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-96 w-full bg-burgundy/5 animate-pulse rounded-3xl" />
          ))}
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
