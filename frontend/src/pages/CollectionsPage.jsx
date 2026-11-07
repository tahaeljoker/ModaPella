import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

const categoryLabels = {
  All: 'كل الفئات',
  Blazer: 'بليزر',
  Blouse: 'بلوزة',
  Chemise: 'قميص',
  Skirt: 'تنورة',
  Dress: 'فستان',
  Pantalon: 'بنطال',
  'T-shirt': 'تيشيرت',
  Portefeuille: 'محفظة',
  Jacket: 'جاكيت',
  Coat: 'معطف / كوت',
  Abaya: 'عباية'
};

const categoryIcons = {
  All: '✨',
  Dress: '👗',
  Jacket: '🧥',
  Blazer: '👔',
  Blouse: '👚',
  Chemise: '👔',
  Skirt: '💃',
  Pantalon: '👖',
  'T-shirt': '👕',
  Portefeuille: '👛',
  Abaya: '🧕'
};

const sampleProducts = [
  { _id: 'sample-p1', name: 'Classic Pantalon', category: 'بنطال', price: 45.0, stock: 12, images: ['https://images.unsplash.com/photo-1520975915070-3d4fa8f300fd?auto=format&fit=crop&w=900&q=80'], sizes: ['S', 'M', 'L'], colors: ['#000', '#7C0A12'] },
  { _id: 'sample-b1', name: 'Soft Blouse', category: 'بلوزة', price: 29.0, stock: 8, images: ['https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80'], sizes: ['XS', 'S', 'M'], colors: ['#fff', '#f3e8e6'] },
  { _id: 'sample-d1', name: 'Elegant Dress', category: 'فستان', price: 69.0, stock: 5, images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80'], sizes: ['S', 'M', 'L'], colors: ['#8A0303', '#0A183D'] },
  { _id: 'sample-t1', name: 'Casual T-shirt', category: 'تيشيرت', price: 22.0, stock: 14, images: ['https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80'], sizes: ['M', 'L'], colors: ['#fff', '#222'] }
];

function CollectionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'price-asc' | 'price-desc' | 'discount'
  const [siteConfig, setSiteConfig] = useState(null);

  useEffect(() => {
    api.get('/products?context=storefront')
      .then((response) => {
        const active = (response.data || []).filter(p => (p.stock ?? 0) > 0);
        setProducts(active);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));

    api.get('/admin/site-config')
      .then((response) => setSiteConfig(response.data))
      .catch(console.error);
  }, []);

  const mergedCategoryLabels = useMemo(() => {
    const map = { ...categoryLabels };
    if (siteConfig?.categories) {
      siteConfig.categories.forEach(c => {
        map[c.key] = c.nameAr;
      });
    }
    return map;
  }, [siteConfig]);

  // All categories present in products or config
  const categories = useMemo(() => {
    const rawCategories = Array.from(new Set(products.map((product) => product.category))).filter(Boolean);
    const fromConfig = siteConfig?.categories?.map(c => c.key) || [];
    const set = new Set(['All', ...fromConfig, ...rawCategories]);
    return Array.from(set);
  }, [products, siteConfig]);

  // Counts per category
  const categoryCounts = useMemo(() => {
    const counts = { All: products.length };
    products.forEach(p => {
      const cat = p.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category filter
    if (activeCategory !== 'All') {
      result = result.filter(p => p.category === activeCategory);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(p => {
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const onlineNameMatch = (p.onlineName || '').toLowerCase().includes(q);
        const catMatch = (mergedCategoryLabels[p.category] || p.category || '').toLowerCase().includes(q);
        const descMatch = (p.description || '').toLowerCase().includes(q);
        const colorMatch = Array.isArray(p.colors) && p.colors.some(c => c.toLowerCase().includes(q));
        return nameMatch || onlineNameMatch || catMatch || descMatch || colorMatch;
      });
    }

    // Sort
    if (sortBy === 'price-asc') {
      result.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
    } else if (sortBy === 'discount') {
      result.sort((a, b) => {
        const hasA = a.discountPrice > 0 && a.discountPrice < a.price;
        const hasB = b.discountPrice > 0 && b.discountPrice < b.price;
        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;
        return 0;
      });
    } else {
      // Newest (default by createdAt or id)
      result.reverse();
    }

    return result;
  }, [products, activeCategory, searchQuery, sortBy, mergedCategoryLabels]);

  const visibleProducts = products.length ? filteredProducts : sampleProducts;

  const handleSelectCategory = (cat) => {
    setActiveCategory(cat);
    if (cat === 'All') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', cat);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleResetFilters = () => {
    setActiveCategory('All');
    setSearchQuery('');
    setSortBy('newest');
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = activeCategory !== 'All' || searchQuery.trim() !== '' || sortBy !== 'newest';

  return (
    <section className="space-y-10 py-6 sm:py-10 text-burgundy" dir="rtl">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-6 sm:p-10 shadow-soft">
        <div className="hero-blob" />
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-burgundy/10 px-4 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-widest text-burgundy">
              <span>أزياء وموضة ModaPella</span>
              <span className="w-1.5 h-1.5 rounded-full bg-burgundy animate-pulse" />
            </span>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight text-burgundy">
              تشكيلة الملابس العصرية بأسلوب أنيق وراقي
            </h1>
            <p className="max-w-2xl text-sm sm:text-base leading-7 text-burgundy/75">
              تصفحي جميع الموديلات المتاحة داخل المحل والشحن الفوري، مع إمكانية الفلترة السريعة حسب ذوقك واختيار المقاس واللون المفضل.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#products-section"
                className="inline-flex items-center justify-center rounded-full bg-burgundy px-7 py-3 text-sm font-bold text-white transition hover:bg-[#650018] shadow-md shadow-burgundy/20"
              >
                تصفح التشكيلة الآن ↓
              </a>
              <Link
                to="/cart"
                className="inline-flex items-center justify-center rounded-full border border-burgundy/30 bg-[#FAF7F5] px-6 py-3 text-sm font-bold text-burgundy transition hover:bg-burgundy/10"
              >
                عرض السلة
              </Link>
            </div>
          </div>

          <div className="hero-image-frame overflow-hidden rounded-[2rem] shadow-xl aspect-[12/7] max-h-[24rem]">
            <img
              src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80"
              alt="ModaPella Fashion"
              className="h-full w-full object-cover animate-hero-img"
            />
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━ MODERN CATEGORY FILTER SECTION ━━━━━━━━━━━━ */}
      <div id="products-section" className="rounded-[2rem] sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-5 sm:p-8 shadow-soft space-y-6">
        {/* Title and Search / Sort Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-burgundy/10 pb-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-burgundy flex items-center gap-2">
              <span>تصفية واختيار الموديلات</span>
              <span className="text-xs bg-burgundy/10 text-burgundy px-3 py-1 rounded-full font-bold">
                {filteredProducts.length} قطعة متاحة
              </span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-burgundy/60">
              اختاري الفئة المناسبة أو ابحثي عن قطعتك المفضلة مباشرة
            </p>
          </div>

          {/* Search + Sort Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحثي بالاسم، اللون، أو الخامة..."
                className="w-full rounded-2xl border border-burgundy/20 bg-[#FAF7F5] px-4 py-2.5 text-xs sm:text-sm text-burgundy outline-none focus:border-burgundy focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-burgundy/50 hover:text-burgundy"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-2xl border border-burgundy/20 bg-[#FAF7F5] px-3.5 py-2.5 text-xs sm:text-sm font-bold text-burgundy outline-none focus:border-burgundy cursor-pointer"
            >
              <option value="newest">الأحدث وصولاً</option>
              <option value="price-asc">السعر: من الأقل للأعلى</option>
              <option value="price-desc">السعر: من الأعلى للأقل</option>
              <option value="discount">العروض والتخفيضات فقط 🔥</option>
            </select>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-2xl border border-burgundy/20 bg-burgundy/5 px-3 py-2 text-xs font-bold text-burgundy hover:bg-burgundy hover:text-white transition cursor-pointer"
                title="إعادة ضبط كل الفلاتر"
              >
                مسح الفلتر ↺
              </button>
            )}
          </div>
        </div>

        {/* ── Visual Filter Selection ── */}
        <div className="space-y-3">
          {/* Mobile Quick Dropdown */}
          <div className="block sm:hidden">
            <label className="block text-xs font-bold text-burgundy/70 mb-1">اختاري الفئة مباشرة:</label>
            <select
              value={activeCategory}
              onChange={(e) => handleSelectCategory(e.target.value)}
              className="w-full rounded-2xl border-2 border-burgundy/20 bg-[#FAF7F5] px-4 py-3 text-sm font-bold text-burgundy outline-none focus:border-burgundy"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {categoryIcons[category] || '👗'} {mergedCategoryLabels[category] || category} ({categoryCounts[category] || 0} قطعة)
                </option>
              ))}
            </select>
          </div>

          {/* Desktop & Tablet Elegant Segmented Grid */}
          <div className="hidden sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {categories.map((category) => {
              const isSelected = activeCategory === category;
              const count = categoryCounts[category] || 0;
              const icon = categoryIcons[category] || '👗';
              const label = mergedCategoryLabels[category] || category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleSelectCategory(category)}
                  className={`group relative flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition-all duration-200 text-center cursor-pointer select-none ${
                    isSelected
                      ? 'border-burgundy bg-burgundy text-white shadow-md shadow-burgundy/20 scale-[1.02]'
                      : 'border-burgundy/10 bg-[#FAF7F5]/70 hover:bg-white hover:border-burgundy/30 text-burgundy hover:shadow-xs'
                  }`}
                >
                  <span className="text-xl sm:text-2xl mb-1 group-hover:scale-110 transition-transform">
                    {icon}
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold leading-tight">
                    {label}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 transition ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-burgundy/5 text-burgundy/60 group-hover:bg-burgundy/10'
                  }`}>
                    {count} قطعة
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Filter Summary Badge */}
        {activeCategory !== 'All' && (
          <div className="flex items-center justify-between bg-burgundy/5 rounded-2xl px-4 py-2.5 text-xs text-burgundy">
            <span className="font-bold flex items-center gap-1.5">
              <span>الفئة المعروضة حالياً:</span>
              <span className="bg-white px-2.5 py-0.5 rounded-full font-extrabold border border-burgundy/15">
                {categoryIcons[activeCategory] || '👗'} {mergedCategoryLabels[activeCategory] || activeCategory}
              </span>
            </span>
            <button
              type="button"
              onClick={() => handleSelectCategory('All')}
              className="text-xs font-extrabold underline hover:text-[#650018] cursor-pointer"
            >
              عرض كل المنتجات ({products.length})
            </button>
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━ PRODUCTS GRID ━━━━━━━━━━━━ */}
      {loading ? (
        <div className="rounded-[2.5rem] border border-burgundy/10 bg-white p-12 text-center text-burgundy space-y-3">
          <div className="w-8 h-8 mx-auto animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
          <p className="text-sm font-bold">جاري تحميل تشكيلة المتجر...</p>
        </div>
      ) : visibleProducts.length > 0 ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 stagger-container">
            {visibleProducts.map((product) => (
              <div className="stagger-item" key={product._id}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[2.5rem] border border-dashed border-burgundy/20 bg-white p-12 text-center text-burgundy space-y-4 shadow-soft">
          <span className="text-4xl block">🔍</span>
          <h3 className="text-xl font-bold">لا توجد قطع مطابقة لاختيارك حالياً</h3>
          <p className="text-sm text-burgundy/70 max-w-md mx-auto">
            {searchQuery
              ? `لم نجد نتائج بحث عن "${searchQuery}". جربي كلمة بحث أخرى أو إعادة ضبط الفلتر.`
              : `لا توجد منتجات متوفرة حالياً في قسم (${mergedCategoryLabels[activeCategory] || activeCategory}).`}
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded-full bg-burgundy text-white px-6 py-2.5 text-xs font-bold shadow hover:bg-[#650018] transition cursor-pointer"
          >
            عرض كل التشكيلة المتاحة
          </button>
        </div>
      )}
    </section>
  );
}

export default CollectionsPage;
