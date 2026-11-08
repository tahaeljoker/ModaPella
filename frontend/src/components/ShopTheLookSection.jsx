import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ShopTheLookCard from './ShopTheLookCard';

export default function ShopTheLookSection() {
  const [looks, setLooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('الكل');

  useEffect(() => {
    api.get('/looks')
      .then((res) => {
        setLooks(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load looks:', err);
        setLooks([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-8 space-y-4">
        <div className="h-8 w-48 bg-burgundy/10 animate-pulse rounded-full" />
        <div className="h-96 w-full bg-burgundy/5 animate-pulse rounded-3xl" />
      </div>
    );
  }

  // If no looks published yet, do not render or show a subtle stylish placeholder
  if (!looks || looks.length === 0) {
    return null;
  }

  // Extract unique categories
  const categories = ['الكل', ...new Set(looks.map((l) => l.category).filter(Boolean))];
  const filteredLooks = selectedCategory === 'الكل'
    ? looks
    : looks.filter((l) => l.category === selectedCategory);

  return (
    <section className="space-y-6 sm:space-y-8 py-4 sm:py-6" dir="rtl">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-burgundy/10 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-burgundy/10 text-burgundy text-xs font-black">
            <span>Shop The Look — ستايل وإطلالات الموديلز</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-burgundy">
            شاهدي اللبس على الموديل واطلبي الإطلالة كاملة
          </h2>
          <p className="text-xs sm:text-sm text-burgundy/70 max-w-xl">
            فيديوهات وصور حقيقية للموديلز بأحدث تنسيقات ملابس مودة بيلا. اضغطي على القطع لمعاينتها، واحصلي على خصم خاص فوري عند طلب الطقم كاملاً.
          </p>
        </div>

        <Link
          to="/lookbook"
          className="flex-shrink-0 inline-flex items-center gap-2 rounded-full border border-burgundy px-5 py-2.5 text-xs sm:text-sm font-bold text-burgundy hover:bg-burgundy hover:text-white transition shadow-xs"
        >
          <span>تصفحي جميع الإطلالات</span>
          <span>←</span>
        </Link>
      </div>

      {/* Category Filter Chips */}
      {categories.length > 2 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
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

      {/* Looks Grid / Stack */}
      <div className="space-y-8 sm:space-y-10">
        {filteredLooks.slice(0, 3).map((look) => (
          <ShopTheLookCard key={look._id} look={look} />
        ))}
      </div>

      {filteredLooks.length > 3 && (
        <div className="text-center pt-2">
          <Link
            to="/lookbook"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-burgundy text-white font-black text-sm hover:bg-[#680017] transition shadow-lg active:scale-95"
          >
            <span>شوفي باقي إطلالات الموديلز ({filteredLooks.length - 3} إطلالات إضافية)</span>
            <span>←</span>
          </Link>
        </div>
      )}
    </section>
  );
}

