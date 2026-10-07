import { useRef, useState, useEffect, useContext } from 'react';
import CompareContext from '../context/CompareContext';
import { Link, useNavigate } from 'react-router-dom';
import LazyImage from './LazyImage';
import { isDiscountActive, cleanProductName } from '../utils/discount';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const fallbackImages = {
  Blouse: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
  Chemise: 'https://images.unsplash.com/photo-1520975915070-3d4fa8f300fd?auto=format&fit=crop&w=900&q=80',
  Skirt: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
  Dress: 'https://images.unsplash.com/photo-1521335629791-ce4aec67dd83?auto=format&fit=crop&w=900&q=80',
  Pantalon: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
  'T-shirt': 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
  Portefeuille: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80'
};

export default function BestSellersSlider({ products = [] }) {
  const navigate = useNavigate();
  const { addToCompare, isComparing } = useContext(CompareContext);
  const sliderRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Filter top selling or featured products (max 8)
  const bestSellers = products
    .filter(p => (p.stock ?? 0) > 0)
    .slice(0, 8);

  const checkScroll = () => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    // Note: In RTL browsers, scrollLeft can be negative or 0
    const maxScroll = scrollWidth - clientWidth;
    const currentScroll = Math.abs(scrollLeft);
    setCanScrollLeft(currentScroll > 10);
    setCanScrollRight(currentScroll < maxScroll - 10);
  };

  useEffect(() => {
    checkScroll();
  }, [bestSellers]);

  const scroll = (direction) => {
    if (!sliderRef.current) return;
    const scrollAmount = 300;
    // In RTL, moving forward in the list means scrolling in negative or positive depending on browser
    const delta = direction === 'next' ? -scrollAmount : scrollAmount;
    sliderRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  if (bestSellers.length === 0) return null;

  const getRankBadge = (index) => {
    if (index === 0) {
      return (
        <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[9px] font-black px-2 py-0.5 shadow-sm">
          #1 الأكثر مبيعاً
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="inline-flex items-center rounded-full bg-slate-700 text-white text-[9px] font-black px-2 py-0.5 shadow-sm">
          #2 الأعلى طلباً
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-800 text-white text-[9px] font-black px-2 py-0.5 shadow-sm">
          #3 تريند
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-burgundy/80 text-white text-[8px] font-bold px-1.5 py-0.5 shadow-xs">
        #{index + 1}
      </span>
    );
  };

  return (
    <section className="space-y-4 sm:space-y-6 pt-2" dir="rtl">
      {/* ── Section Header & Controls ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-800 mb-1 border border-amber-500/20">
            <span>تريندات الأسبوع</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-burgundy">
            الموديلات الأكثر مبيعاً
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-burgundy/65">
            القطع التي نالت أعلى إعجاب وتفضيل من عميلاتنا مؤخراً
          </p>
        </div>

        {/* Carousel Navigation Arrows */}
        <div className="flex items-center gap-2">
          <Link
            to="/shop"
            className="hidden sm:inline-flex text-xs font-bold text-burgundy/80 hover:text-burgundy underline ml-3"
          >
            تصفح كل التشكيلة ←
          </Link>
          <button
            type="button"
            onClick={() => scroll('prev')}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-burgundy/20 bg-white text-burgundy shadow-sm transition hover:bg-burgundy hover:text-white active:scale-95 cursor-pointer"
            aria-label="السابق"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => scroll('next')}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-burgundy/20 bg-white text-burgundy shadow-sm transition hover:bg-burgundy hover:text-white active:scale-95 cursor-pointer"
            aria-label="التالي"
          >
            ←
          </button>
        </div>
      </div>

      {/* ── Horizontal Scrollable Track ── */}
      <div
        ref={sliderRef}
        onScroll={checkScroll}
        className="flex gap-3.5 sm:gap-5 overflow-x-auto pb-4 pt-1 no-scrollbar snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {bestSellers.map((product, index) => {
          const image = product.images?.[0] || fallbackImages[product.category] || fallbackImages.Blouse;
          const secondImage = product.images?.[1];

          return (
            <div
              key={product._id}
              onClick={() => navigate(`/product/${product._id}`)}
              className="group relative flex w-[52%] sm:w-[210px] lg:w-[225px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-burgundy/10 bg-white p-2 sm:p-2.5 shadow-sm transition hover:shadow-md interactive-card cursor-pointer"
            >
              {/* Product Image Box - Square compact aspect */}
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-beige/10 sheen-wrapper">
                <LazyImage
                  src={image}
                  alt={cleanProductName(product)}
                  className={`h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-105 ${
                    secondImage ? 'group-hover:opacity-0' : ''
                  }`}
                />
                {secondImage && (
                  <img
                    src={secondImage}
                    alt={`${cleanProductName(product)} 2`}
                    className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-105"
                    loading="lazy"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-burgundy/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Rank Badge */}
                <div className="absolute top-2 right-2 z-10">
                  {getRankBadge(index)}
                </div>

                {/* Compare Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCompare(product);
                  }}
                  className={`absolute top-2.5 left-2.5 z-10 h-7 w-7 rounded-full flex items-center justify-center transition shadow-md backdrop-blur-sm ${
                    isComparing(product._id)
                      ? 'bg-amber-400 text-burgundy font-black ring-2 ring-amber-300'
                      : 'bg-white/90 text-burgundy/80 hover:bg-white hover:text-burgundy'
                  }`}
                  title={isComparing(product._id) ? 'إزالة من المقارنة' : 'مقارنة هذا الموديل'}
                >
                  <span className="text-[10px] font-bold">{isComparing(product._id) ? '✓' : 'مقارنة'}</span>
                </button>

                {/* Discount Badge */}
                {isDiscountActive(product) && (
                  <div className="absolute top-2.5 left-2.5 z-10 rounded-full bg-red-600 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-xs">
                    خصم {Math.round((1 - product.discountPrice / product.price) * 100)}%
                  </div>
                )}

                {/* Stock Tag */}
                <div className="absolute bottom-2.5 right-2.5 z-10">
                  {product.stock <= 5 ? (
                    <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.5 text-[8px] font-bold shadow-xs inline-flex items-center">
                      
                      <span>باقي {product.stock} فقط</span>
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/90 text-burgundy px-1.5 py-0.5 text-[8px] font-semibold shadow-xs">
                      متوفر بالمخزن
                    </span>
                  )}
                </div>
              </div>

              {/* Product Details - Compact & balanced */}
              <div className="mt-2 flex flex-1 flex-col justify-between space-y-1.5">
                <div>
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-burgundy/40">
                    {product.category}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-burgundy group-hover:text-[#650018] transition line-clamp-1 mt-0.5">
                    {cleanProductName(product)}
                  </h3>
                </div>

                {/* Price & Action Button */}
                <div className="pt-1.5 border-t border-burgundy/5 flex items-center justify-between gap-1.5">
                  <div className="flex flex-col">
                    {isDiscountActive(product) ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs sm:text-sm font-black text-burgundy">
                          {EGP(product.discountPrice)}
                        </span>
                        <span className="text-[9px] text-red-500 line-through">
                          {EGP(product.price)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs sm:text-sm font-black text-burgundy">
                        {EGP(product.price)}
                      </span>
                    )}
                  </div>

                  <span className="rounded-lg bg-burgundy/5 group-hover:bg-burgundy group-hover:text-white text-burgundy px-2 py-0.5 text-[10px] font-bold transition flex items-center gap-0.5 shrink-0">
                    <span>طلب</span>
                    <span>←</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
