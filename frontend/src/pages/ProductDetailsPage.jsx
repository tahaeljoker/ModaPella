import { useContext, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import CartContext from '../context/CartContext';
import LazyImage from '../components/LazyImage';
import sampleProducts from '../data/sampleProducts';
import { isDiscountActive, cleanProductName } from '../utils/discount';

function ProductDetailsPage() {
  const { id } = useParams();
  const { addItem } = useContext(CartContext);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [similarProducts, setSimilarProducts] = useState([]);

  useEffect(() => {
    api.get(`/products/${id}`)
      .then((response) => setProduct(response.data))
      .catch(() => {
        const sample = sampleProducts.find((item) => item._id === id);
        if (sample) {
          setProduct(sample);
        } else {
          setError('تعذر تحميل المنتج');
        }
      });
  }, [id]);

  useEffect(() => {
    if (product) {
      setSelectedSize(product.sizes?.[0] || '');
      setSelectedColor(product.colors?.[0] || '');
      setQuantity(product.stock > 0 ? 1 : 0);
      setActiveImageIdx(0);
      
      api.get(`/products?category=${product.category}&excludeId=${product._id}&limit=4`)
        .then(res => setSimilarProducts(res.data))
        .catch(err => console.error('Error loading similar products:', err));
    }
  }, [product]);

  if (error) {
    return (
      <section className="py-10 text-burgundy">
        <div className="rounded-[2.5rem] border border-burgundy/10 bg-white p-10 shadow-soft">{error}</div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="py-10 text-burgundy">
        <div className="rounded-[2.5rem] border border-burgundy/10 bg-white p-10 shadow-soft">جاري التحميل...</div>
      </section>
    );
  }

  const image = product.images?.[0] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=80';

  const handleAddToCart = () => {
    const activeDiscount = isDiscountActive(product);
    const cartItem = {
      ...product,
      price: activeDiscount ? product.discountPrice : product.price,
      originalPrice: product.price,
      isDiscountActive: activeDiscount,
      selectedSize,
      selectedColor,
      cartId: `${product._id}_${selectedSize || 'default'}_${selectedColor || 'default'}`
    };
    addItem(cartItem, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <section className="space-y-6 sm:space-y-10 py-4 sm:py-10 text-burgundy">
      <div className="rounded-2xl sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-4 sm:p-10 shadow-soft">
        <Link to="/shop" className="text-sm text-burgundy/70 underline">عودة إلى المتجر</Link>
        <div className="mt-6 sm:mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Image Slider Container */}
          <div className="flex flex-col gap-4">
            {/* Main Viewport */}
            <div className="relative overflow-hidden rounded-xl sm:rounded-[2rem] bg-beige/10 aspect-[4/3] sm:aspect-[3/2] group border border-burgundy/5 shadow-inner">
              <div 
                onClick={() => setIsLightboxOpen(true)}
                className="w-full h-full cursor-zoom-in transition-all duration-300 hover:scale-[1.02]"
              >
                <LazyImage 
                  src={product.images && product.images.length > 0 ? product.images[activeImageIdx] : 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=80'} 
                  alt={cleanProductName(product.name)} 
                  className="w-full h-full object-cover" 
                />
              </div>

              {/* Arrow controls */}
              {product.images && product.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveImageIdx(prev => (prev === 0 ? product.images.length - 1 : prev - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/85 border border-burgundy/10 text-burgundy shadow-md transition hover:bg-white hover:scale-105 active:scale-95 z-10"
                    aria-label="Previous image"
                  >
                    ❮
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImageIdx(prev => (prev === product.images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/85 border border-burgundy/10 text-burgundy shadow-md transition hover:bg-white hover:scale-105 active:scale-95 z-10"
                    aria-label="Next image"
                  >
                    ❯
                  </button>
                </>
              )}

              {/* Dots indicator */}
              {product.images && product.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-[2px]">
                  {product.images.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${activeImageIdx === idx ? 'w-5 bg-white' : 'w-2 bg-white/55 hover:bg-white'}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail row */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1 shrink-0 select-none scrollbar-thin">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden bg-beige/5 border-2 transition ${activeImageIdx === idx ? 'border-burgundy scale-95 shadow-md' : 'border-transparent opacity-75 hover:opacity-100 hover:scale-95'}`}
                  >
                    <img src={img} alt={`thumbnail ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-5 sm:space-y-6">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] sm:tracking-[0.35em] text-burgundy/60">{product.category}</p>
            <h1 className="text-xl sm:text-3xl font-extrabold">{cleanProductName(product.name)}</h1>
            <p className="text-sm sm:text-base leading-6 sm:leading-8 text-burgundy/75">{product.description || 'وصف مميز للمنتج يعرض تفاصيل التصميم والجودة.'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl sm:rounded-[1.75rem] border border-burgundy/10 bg-white p-3.5 sm:p-6 text-burgundy/80">
                <h2 className="text-xs sm:text-sm font-semibold text-burgundy">السعر</h2>
                {isDiscountActive(product) ? (
                  <div className="flex flex-col gap-1 mt-1.5 sm:mt-3">
                    <p className="text-lg sm:text-2xl font-bold text-burgundy">{Number(product.discountPrice).toLocaleString('en-US')} ج.م</p>
                    <p className="text-xs text-red-500 line-through">{Number(product.price).toLocaleString('en-US')} ج.م</p>
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold w-fit">خصم {Math.round((1 - product.discountPrice / product.price) * 100)}%</span>
                  </div>
                ) : (
                  <p className="mt-1.5 sm:mt-3 text-lg sm:text-2xl font-bold text-burgundy">{Number(product.price).toLocaleString('en-US')} ج.م</p>
                )}
              </div>
              <div className="rounded-xl sm:rounded-[1.75rem] border border-burgundy/10 bg-white p-3.5 sm:p-6 text-burgundy/80">
                <h2 className="text-xs sm:text-sm font-semibold text-burgundy">حالة المخزون</h2>
                <p className="mt-1.5 sm:mt-3 text-lg sm:text-2xl font-bold text-burgundy">
                  {product.stock > 10 ? 'متوفر' : product.stock > 0 ? 'كمية محدودة' : 'نفد من المخزن'}
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-[1.75rem] border border-burgundy/10 bg-beige/10 p-6 text-burgundy/80">
                <h2 className="text-sm font-semibold text-burgundy">معلومات المنتج</h2>
                <ul className="mt-4 space-y-3 text-sm leading-7">
                  <li><span className="font-semibold">الفئة:</span> {product.category}</li>
                  <li><span className="font-semibold">المقاسات:</span> {product.sizes?.join('، ') || 'غير محدد'}</li>
                  <li><span className="font-semibold">الألوان:</span> {product.colors?.join('، ') || 'متعدد'}</li>
                  <li><span className="font-semibold">النوع:</span> {product.type || 'أزياء أنيقة'}</li>
                </ul>
              </div>
              {product.sizes && product.sizes.length > 0 && (
                <div className="rounded-[1.25rem] border border-burgundy/10 bg-beige/10 p-4">
                  <h3 className="text-sm font-semibold">المقاسات المتاحة</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        className={`rounded-full border px-3 py-1 text-sm ${selectedSize === s ? 'border-burgundy bg-burgundy/10 text-burgundy' : 'border-burgundy/20 text-burgundy/80'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.colors && product.colors.length > 0 && (
                <div className="rounded-[1.25rem] border border-burgundy/10 bg-beige/10 p-4">
                  <h3 className="text-sm font-semibold">الألوان المتاحة</h3>
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    {product.colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${selectedColor === c ? 'border-burgundy bg-burgundy/10 text-burgundy' : 'border-burgundy/20 text-burgundy/80'}`}
                      >
                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c }} />
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-[1.25rem] border border-burgundy/10 bg-beige/10 p-4">
                <h3 className="text-sm font-semibold">الكمية المطلوبة</h3>
                <div className="mt-3 flex items-center gap-3">
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    disabled={product.stock === 0}
                    className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2 text-burgundy"
                  >
                    {Array.from({ length: Math.min(product.stock, 10) }, (_, index) => index + 1).map((qty) => (
                      <option key={qty} value={qty}>{qty} قطعة</option>
                    ))}
                  </select>
                  <span className="text-sm text-burgundy/70">من أصل {product.stock} قطع</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={`w-full rounded-xl sm:rounded-3xl px-6 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-white transition ${product.stock === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-burgundy hover:bg-[#650018]'}`}
              >
                {product.stock === 0 ? 'غير متوفر' : added ? 'تمت الإضافة' : 'أضف إلى السلة'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-[2rem] border border-burgundy/10 bg-white p-8 shadow-soft">
        <h3 className="text-2xl font-semibold">منتجات مشابهة</h3>
        <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-4">
          {similarProducts.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-burgundy/40">لا توجد منتجات مشابهة حالياً</p>
          ) : (
            similarProducts.map(p => (
              <Link 
                key={p._id} 
                to={`/product/${p._id}`}
                onClick={() => window.scrollTo(0, 0)}
                className="group block rounded-[1.25rem] overflow-hidden border border-burgundy/5 bg-[#F7F0EC]/20 p-2 transition hover:shadow-soft animate-fade-in"
              >
                <div className="aspect-[4/3] overflow-hidden relative rounded-xl bg-beige/5">
                  <LazyImage 
                    src={p.images && p.images.length > 0 ? p.images[0] : 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80'} 
                    alt={cleanProductName(p.name)} 
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" 
                  />
                </div>
                <div className="mt-2 text-right px-1">
                  <p className="text-xs font-bold text-burgundy truncate">{cleanProductName(p.name)}</p>
                  <p className="text-xs font-extrabold text-burgundy/60 mt-0.5">{Number(p.price).toLocaleString('en-US')} ج.م</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl transition-all duration-200 z-50 font-bold"
          >
            ✕
          </button>

          {/* Large image */}
          <div className="relative max-w-full max-h-[85vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <img 
              src={product.images && product.images.length > 0 ? product.images[activeImageIdx] : 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=80'} 
              alt={cleanProductName(product.name)} 
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" 
            />

            {/* Arrow controls in lightbox */}
            {product.images && product.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImageIdx(prev => (prev === 0 ? product.images.length - 1 : prev - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl font-bold shadow-md transition z-50"
                >
                  ❮
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImageIdx(prev => (prev === product.images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl font-bold shadow-md transition z-50"
                >
                  ❯
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default ProductDetailsPage;
