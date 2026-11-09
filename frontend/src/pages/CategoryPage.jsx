import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import { cleanProductName } from '../utils/discount';

const CAT_SLUG_MAP = {
  blouse: ['Blouse', 'بلوزة'],
  'بلوزة': ['Blouse', 'بلوزة'],
  chemise: ['Chemise', 'شميز', 'قميص'],
  'شميز': ['Chemise', 'شميز', 'قميص'],
  'قميص': ['Chemise', 'شميز', 'قميص'],
  dress: ['Dress', 'فستان'],
  'فستان': ['Dress', 'فستان'],
  skirt: ['Skirt', 'جيبة', 'تنورة'],
  'جيبة': ['Skirt', 'جيبة', 'تنورة'],
  'تنورة': ['Skirt', 'جيبة', 'تنورة'],
  pantalon: ['Pantalon', 'بنطلون', 'بنطال'],
  'بنطلون': ['Pantalon', 'بنطلون', 'بنطال'],
  'بنطال': ['Pantalon', 'بنطلون', 'بنطال'],
  bag: ['Bag', 'شنطة', 'محفظة', 'Portefeuille'],
  'شنطة': ['Bag', 'شنطة', 'محفظة', 'Portefeuille'],
  cardigan: ['Cardigan', 'كاردن', 'كارديجان'],
  'كاردن': ['Cardigan', 'كاردن', 'كارديجان'],
  'كارديجان': ['Cardigan', 'كاردن', 'كارديجان'],
  blazer: ['Blazer', 'بليزر'],
  'بليزر': ['Blazer', 'بليزر'],
  jacket: ['Jacket', 'جاكيت'],
  'جاكيت': ['Jacket', 'جاكيت'],
  suit: ['Suit', 'سوت'],
  'سوت': ['Suit', 'سوت'],
  tonic: ['Tonic', 'تونيك'],
  'تونيك': ['Tonic', 'تونيك'],
  takem: ['Takem', 'طقم'],
  'طقم': ['Takem', 'طقم']
};

const CATEGORY_NAMES_AR = {
  Blazer: 'بليزر',
  Blouse: 'بلوزة',
  Chemise: 'شميز',
  Skirt: 'جيبة',
  Dress: 'فستان',
  Pantalon: 'بنطلون',
  'T-shirt': 'تيشيرت',
  Bag: 'شنطة',
  Cardigan: 'كاردن',
  Suit: 'سوت',
  Tonic: 'تونيك',
  Takem: 'طقم',
  Jacket: 'جاكيت'
};

function CategoryPage() {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  const rawSlug = decodeURIComponent(slug || '').trim();
  const lowerSlug = rawSlug.toLowerCase();
  const displayTitle = CATEGORY_NAMES_AR[rawSlug] || rawSlug;

  useEffect(() => {
    const acceptedCats = CAT_SLUG_MAP[lowerSlug] || [rawSlug];
    setLoading(true);

    api.get('/products?context=storefront')
      .then((res) => {
        const filtered = (res.data || []).filter((p) => {
          if ((p.stock ?? 0) <= 0) return false;
          if (!p.category) return false;
          return acceptedCats.some(c => c.toLowerCase() === p.category.toLowerCase()) || p.category.toLowerCase() === lowerSlug;
        });
        setProducts(filtered);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slug]);

  // Extract available sizes & colors from actual products in this category
  const availableSizes = Array.from(new Set(products.flatMap(p => p.sizes || []).filter(Boolean)));
  const availableColors = Array.from(new Set(products.flatMap(p => p.colors || []).filter(Boolean)));

  const filteredByOptions = products.filter((p) => {
    if (!selectedSize && !selectedColor) return true;
    let ok = true;
    if (selectedSize) ok = ok && p.sizes && p.sizes.includes(selectedSize);
    if (selectedColor) ok = ok && p.colors && p.colors.includes(selectedColor);
    return ok;
  });

  return (
    <section className="space-y-6 sm:space-y-8 py-6 sm:py-10 text-burgundy" dir="rtl">
      {/* Category Header */}
      <div className="rounded-[2rem] sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-6 sm:p-10 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-burgundy/50 font-bold block mb-1">فئة الملابس</span>
          <h1 className="text-2xl sm:text-4xl font-black text-burgundy">{displayTitle}</h1>
          <p className="mt-1 text-xs sm:text-sm text-burgundy/70">
            تصفحي تشكيلة {displayTitle} المتوفرة بالمحل والشحن الفوري لجميع المحافظات.
          </p>
        </div>
        <Link
          to="/shop"
          className="text-xs font-bold px-4 py-2 rounded-full border border-burgundy/20 hover:bg-burgundy hover:text-white transition whitespace-nowrap"
        >
          ← كل التشكيلة
        </Link>
      </div>

      {/* Filter Row if options exist */}
      {(availableSizes.length > 0 || availableColors.length > 0) && (
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-burgundy/10 shadow-xs">
          {availableSizes.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-burgundy">المقاس:</label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="rounded-xl border border-burgundy/20 bg-white px-3 py-1.5 text-xs text-burgundy outline-none cursor-pointer focus:border-burgundy"
              >
                <option value="">كل المقاسات ({availableSizes.length})</option>
                {availableSizes.map(sz => (
                  <option key={sz} value={sz}>{sz}</option>
                ))}
              </select>
            </div>
          )}

          {availableColors.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-burgundy">اللون:</label>
              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="rounded-xl border border-burgundy/20 bg-white px-3 py-1.5 text-xs text-burgundy outline-none cursor-pointer focus:border-burgundy"
              >
                <option value="">كل الألوان ({availableColors.length})</option>
                {availableColors.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {(selectedSize || selectedColor) && (
            <button
              type="button"
              onClick={() => { setSelectedSize(''); setSelectedColor(''); }}
              className="text-xs text-rose-600 hover:underline mr-auto font-bold cursor-pointer"
            >
              إلغاء التصفية ✕
            </button>
          )}
        </div>
      )}

      {/* Products Grid / Skeleton */}
      {loading ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <ProductCardSkeleton key={idx} />
          ))}
        </div>
      ) : filteredByOptions.length > 0 ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 stagger-container">
          {filteredByOptions.map((p) => (
            <div className="stagger-item" key={p._id}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[2.5rem] border border-dashed border-burgundy/20 bg-white p-12 text-center text-burgundy space-y-4 shadow-soft">
          <span className="text-4xl block">🛍️</span>
          <h3 className="text-xl font-bold">لا توجد قطع مطابقة لاختيارك حالياً</h3>
          <p className="text-sm text-burgundy/70 max-w-md mx-auto">
            لا توجد منتجات متوفرة حالياً في قسم ({displayTitle}). يمكنك تصفح باقي الأقسام أو العودة لكافة الموديلات.
          </p>
          <Link
            to="/shop"
            className="inline-block rounded-full bg-burgundy text-white px-6 py-2.5 text-xs font-bold shadow hover:bg-[#650018] transition"
          >
            تصفح كل التشكيلة
          </Link>
        </div>
      )}
    </section>
  );
}

export default CategoryPage;
