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
      {/* Editorial Luxury Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#38010c] via-[#520213] to-[#260108] text-white p-6 sm:p-10 shadow-[0_12px_40px_rgba(56,1,12,0.25)]">
        {/* Subtle Ambient Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] sm:text-xs font-bold text-amber-200">
            <span>MODAPELLA ATELIER ✦ استوديو الموديل والتنسيقات</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-snug">
            شاهدي التنسيق على الموديل بالحركة الحقيقية وتسوقي اللوك كاملاً
          </h1>

          <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-2xl">
            جلسات تصوير وفيديوهات ريلز حية توضح تناسق كل قطعة مع مقاساتها وخامتها على أرض الواقع. انقري على أي قطعة لمعاينة تفاصيلها، أو اطلبي الطقم المتكامل بخصم خاص فوري!
          </p>

          {/* Quick Luxury Counters */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/90">
              {looks.length} إطلالة منسقة
            </span>
            {videoCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/90">
                {videoCount} فيديو ريلز
              </span>
            )}
            {photoCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/90">
                {photoCount} جلسة تصوير
              </span>
            )}
            <Link
              to="/outfitter"
              className="px-3.5 py-1 rounded-full bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/30 text-amber-200 font-bold transition flex items-center gap-1.5"
            >
              <span>جربي غرفة تنسيق المانيكان أيضاً ←</span>
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
