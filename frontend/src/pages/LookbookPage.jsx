import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ShopTheLookCard from '../components/ShopTheLookCard';

export default function LookbookPage() {
  const [looks, setLooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('الكل');

  useEffect(() => {
    window.scrollTo(0, 0);
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

  const categories = ['الكل', ...new Set(looks.map((l) => l.category).filter(Boolean))];
  const filteredLooks = selectedCategory === 'الكل'
    ? looks
    : looks.filter((l) => l.category === selectedCategory);

  return (
    <div className="space-y-10 py-6 sm:py-10 pb-28 sm:pb-16 text-burgundy" dir="rtl">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-burgundy via-[#680017] to-[#3a000c] text-white p-6 sm:p-12 shadow-soft">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-300">
            <span>👗</span>
            <span>كتالوج إطلالات وتنسيقات الموديلز الحقيقية</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            تنسيقات وإطلالات ModaPella — تسوقي اللوك كامل
          </h1>

          <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl">
            شوفي كل طقم ولون وهو ملبوس على الموديل بالفيديو والصور الحقيقية قبل ما تطلبي. اضغطي على أي قطعة لمعرفة تفاصيلها ومقاساتها، واحصلي على خصم خاص فوري عند طلب الإطلالة كاملة!
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/outfitter"
              className="px-5 py-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2"
            >
              <span>جربي غرفة تنسيق المانيكان أيضاً ✨</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-burgundy/10 pb-4">
          <span className="text-xs font-bold text-burgundy/60 pl-2">التصنيف:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-burgundy text-white shadow-md shadow-burgundy/20'
                  : 'bg-white border border-burgundy/15 text-burgundy/70 hover:border-burgundy hover:text-burgundy'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-96 w-full bg-burgundy/5 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : filteredLooks.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-white border border-burgundy/10 shadow-soft space-y-4">
          <div className="text-5xl">👗</div>
          <h3 className="text-xl font-black text-burgundy">لا توجد إطلالات متاحة حالياً في هذا التصنيف</h3>
          <p className="text-xs sm:text-sm text-burgundy/60 max-w-md mx-auto">
            فريق مودة بيلا يجهز جلسات تصوير وفيديوهات جديدة قادمة قريباً جداً!
          </p>
          <Link
            to="/shop"
            className="inline-block px-6 py-3 rounded-full bg-burgundy text-white text-xs sm:text-sm font-bold shadow hover:bg-[#680017] transition"
          >
            تصفحي جميع المنتجات
          </Link>
        </div>
      ) : (
        <div className="space-y-10 sm:space-y-12">
          {filteredLooks.map((look) => (
            <ShopTheLookCard key={look._id} look={look} />
          ))}
        </div>
      )}
    </div>
  );
}
