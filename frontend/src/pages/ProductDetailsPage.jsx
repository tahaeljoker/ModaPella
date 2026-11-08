import { useContext, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import CartContext from '../context/CartContext';
import CompareContext from '../context/CompareContext';
import LazyImage from '../components/LazyImage';
import ProductCard from '../components/ProductCard';
import sampleProducts from '../data/sampleProducts';
import { isDiscountActive, cleanProductName } from '../utils/discount';
import QuickOrderModal from '../components/QuickOrderModal';
import ShareOutfitModal from '../components/ShareOutfitModal';
import MannequinComparisonSlider from '../components/MannequinComparisonSlider';
import { getColorHex } from '../utils/colorSwatches';
import { resolveImageUrl } from '../utils/imageUrl';

function ProductDetailsPage() {
 const { id } = useParams();
 const navigate = useNavigate();
 const { addItem } = useContext(CartContext);
 const { addToCompare, isComparing } = useContext(CompareContext);
 const [product, setProduct] = useState(null);
 const isItemComparing = isComparing(product?._id);
 const [error, setError] = useState('');
 const [selectedSize, setSelectedSize] = useState('');
 const [selectedColor, setSelectedColor] = useState('');
 const [quantity, setQuantity] = useState(1);
 const [added, setAdded] = useState(false);
 const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [colorOverride, setColorOverride] = useState(null);
 const [isLightboxOpen, setIsLightboxOpen] = useState(false);
 const [similarProducts, setSimilarProducts] = useState([]);
 const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
 const [isShareModalOpen, setIsShareModalOpen] = useState(false);
 const [whatsappNumber, setWhatsappNumber] = useState('201090048832');
  const [isColorLabOpen, setIsColorLabOpen] = useState(false);
  const [isDigitalRecolorActive, setIsDigitalRecolorActive] = useState(false);
  const [fitMode, setFitMode] = useState('contain'); // 'contain' | 'cover'
  const [siteConfig, setSiteConfig] = useState(null);

 useEffect(() => {
  api.get('/admin/site-config')
   .then(res => {
    if (res.data) setSiteConfig(res.data);
    if (res.data?.whatsappNumber) setWhatsappNumber(res.data.whatsappNumber);
   })
   .catch(() => {});
 }, []);

 useEffect(() => {
 api.get(`/products/${id}?context=storefront`)
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

  // Find assigned real photo for selected color
  const getColorPhoto = (colorName) => {
    if (!colorName) return null;
    if (Array.isArray(product?.colorImages)) {
      const match = product.colorImages.find(
        ci => ci.color && ci.color.trim().toLowerCase() === colorName.trim().toLowerCase() && ci.image
      );
      if (match) return match.image;
    }
    return null;
  };

  const handleSelectColor = (colorName) => {
    setSelectedColor(colorName);
    const photo = getColorPhoto(colorName);
    if (photo) {
      setColorOverride(photo);
    }
  };

  const rawDefault = (product?.images && product.images.length > 0)
    ? (product.images[activeImageIdx] || product.images[0])
    : 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=80';

  const defaultImage = resolveImageUrl(rawDefault);
  const colorPhoto = selectedColor ? resolveImageUrl(getColorPhoto(selectedColor)) : null;
  const displayedImage = resolveImageUrl(colorOverride) || colorPhoto || defaultImage;

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
 <section className="space-y-6 sm:space-y-10 py-4 sm:py-10 pb-28 sm:pb-12 text-burgundy w-full max-w-full overflow-hidden">
 <div className="rounded-2xl sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-4 sm:p-10 shadow-soft overflow-hidden w-full max-w-full">
 <div className="flex items-center justify-between border-b border-burgundy/10 pb-3 mb-4">
   <button
     type="button"
     onClick={() => {
       if (window.history.length > 1) {
         navigate(-1);
       } else {
         navigate('/shop');
       }
     }}
     className="inline-flex items-center gap-2 rounded-full border border-burgundy/20 bg-[#FAF7F5] px-4 py-2 text-xs sm:text-sm font-bold text-burgundy transition hover:bg-burgundy hover:text-white cursor-pointer shadow-xs active:scale-95"
   >
     <span className="text-base leading-none">←</span>
     <span>الرجوع</span>
   </button>
   <Link to="/shop" className="text-xs text-burgundy/60 hover:text-burgundy underline">
     تصفح كل التشكيلة
   </Link>
 </div>
 <div className="mt-4 sm:mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] w-full max-w-full min-w-0">
 {/* Image Slider Container */}
 <div className="flex flex-col gap-4 w-full max-w-full min-w-0 overflow-hidden">
  {product.mannequinImage && siteConfig?.features?.mannequinComparison !== false ? (
    <MannequinComparisonSlider
      flatImage={product.images && product.images.length > 0 ? resolveImageUrl(product.images[activeImageIdx]) : "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=80"}
      mannequinImage={resolveImageUrl(product.mannequinImage)}
      productName={cleanProductName(product)}
      aspectRatio="aspect-[4/5] max-h-[380px] sm:max-h-[620px]"
      onImageClick={() => setIsLightboxOpen(true)}
    />
  ) : (
 <div className="relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] bg-[#FAF7F5] aspect-[4/5] max-h-[380px] sm:max-h-[620px] group border border-burgundy/10 shadow-inner flex items-center justify-center select-none w-full max-w-full min-w-0">
 
 {/* Fit Toggle (Contain <-> Cover) */}
 <button
   type="button"
   onClick={(e) => {
     e.stopPropagation();
     setFitMode(prev => prev === "contain" ? "cover" : "contain");
   }}
   className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-burgundy text-xs font-bold shadow-md border border-burgundy/10 backdrop-blur-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
   title={fitMode === "contain" ? "ملء الإطار" : "إظهار القطعة بالكامل"}
 >
   <span>{fitMode === "contain" ? "ملء الإطار" : "إظهار كامل"}</span>
 </button>

 {/* Zoom Hint */}
 <button
   type="button"
   onClick={() => setIsLightboxOpen(true)}
   className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-burgundy text-xs font-bold shadow-md border border-burgundy/10 backdrop-blur-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
   title="تكبير الصورة"
 >
   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
   </svg>
   <span>تكبير</span>
 </button>

 <div 
   onClick={() => setIsLightboxOpen(true)}
   className="w-full h-full min-w-0 min-h-0 max-w-full max-h-full cursor-zoom-in transition-all duration-300 hover:scale-[1.01] flex items-center justify-center p-2"
 >
   <LazyImage 
     src={displayedImage} 
     alt={cleanProductName(product)} 
     className="w-full h-full min-w-0 min-h-0 max-w-full max-h-full" 
     fit={fitMode} 
   />
 </div>

 {/* Arrow controls */}
 {product.images && product.images.length > 1 && (
 <>
 <button
   type="button"
   onClick={(e) => {
     e.stopPropagation();
     setActiveImageIdx(prev => (prev === 0 ? product.images.length - 1 : prev - 1));
     setColorOverride(null);
   }}
   className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/90 border border-burgundy/15 text-burgundy shadow-md transition hover:bg-white hover:scale-110 active:scale-95 z-20 cursor-pointer"
   aria-label="Previous image"
 >
   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
   </svg>
 </button>
 <button
   type="button"
   onClick={(e) => {
     e.stopPropagation();
     setActiveImageIdx(prev => (prev === product.images.length - 1 ? 0 : prev + 1));
     setColorOverride(null);
   }}
   className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/90 border border-burgundy/15 text-burgundy shadow-md transition hover:bg-white hover:scale-110 active:scale-95 z-20 cursor-pointer"
   aria-label="Next image"
 >
   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
   </svg>
 </button>
 </>
 )}

 {/* Dots indicator */}
 {product.images && product.images.length > 1 && (
 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-xs">
 {product.images.map((_, idx) => (
 <button
   key={idx}
   type="button"
   onClick={(e) => { e.stopPropagation(); setActiveImageIdx(idx); setColorOverride(null); }}
   className={`h-2 rounded-full transition-all duration-300 ${activeImageIdx === idx ? "w-5 bg-white" : "w-2 bg-white/60 hover:bg-white"}`}
 />
 ))}
 </div>
 )}
 </div>
  )}

 {/* Thumbnail row */}
 {((product.images && product.images.length > 1) || Boolean(product.mannequinImage)) && (
 <div className="flex gap-2 overflow-x-auto py-1 shrink-0 select-none scrollbar-thin">
 {product.images.map((img, idx) => (
 <button
 key={idx}
 type="button"
 onClick={() => { setActiveImageIdx(idx); setColorOverride(null); }}
 className={`relative w-14 h-14 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#FAF7F5] border-2 transition p-1 flex items-center justify-center cursor-pointer shrink-0 ${activeImageIdx === idx ? "border-burgundy scale-95 shadow-md" : "border-transparent opacity-75 hover:opacity-100 hover:scale-95"}`}
 >
 <img src={resolveImageUrl(img)} alt={`thumbnail ${idx}`} className="w-full h-full object-contain" />
 </button>
 ))}
 </div>
 )}
 </div>
 <div className="space-y-5 sm:space-y-6">
 <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] sm:tracking-[0.35em] text-burgundy/60">{product.category}</p>
 <h1 className="text-xl sm:text-3xl font-extrabold">{cleanProductName(product)}</h1>
 {Boolean(product.description && product.description.trim()) && (
  <p className="text-sm sm:text-base leading-6 sm:leading-8 text-burgundy/75">{product.description}</p>
)}
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
 <div className="mt-1.5 sm:mt-3">
   {product.stock === 0 ? (
     <span className="text-base sm:text-xl font-bold text-red-600 flex items-center gap-1.5">
       <span>نفد من المخزن</span>
     </span>
   ) : product.stock <= 5 ? (
     <div className="flex flex-col">
       <span className="text-base sm:text-xl font-extrabold text-amber-600 flex items-center gap-1">
         <span>متبقي {product.stock} قطع فقط</span>
         
       </span>
       <span className="text-[10px] text-amber-700/80 font-medium">سارعي بالطلب قبل النفاذ</span>
     </div>
   ) : (
     <span className="text-base sm:text-xl font-bold text-emerald-700 flex items-center gap-1">
       <span>متوفر بالمحل</span>
       <span className="text-xs">✓</span>
     </span>
   )}
 </div>
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
  <div className="rounded-[1.25rem] border border-burgundy/10 bg-beige/10 p-4 space-y-2.5">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-bold text-burgundy">
        الألوان المتاحة ({product.colors.length} ألوان):
      </h3>
      {selectedColor && (
        <span className="text-xs font-bold text-burgundy bg-burgundy/10 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full border border-black/20" style={{ backgroundColor: getColorHex(selectedColor) }} />
          <span>اللون المختار: {selectedColor}</span>
        </span>
      )}
    </div>

    <div className="flex flex-wrap gap-2 items-center pt-1">
      {product.colors.map((c) => {
        const isSelected = selectedColor === c;
        const hex = getColorHex(c);
        const hasPhoto = Boolean(getColorPhoto(c));

        return (
          <button
            key={c}
            type="button"
            onClick={() => handleSelectColor(c)}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isSelected
                ? 'border-burgundy bg-burgundy text-white shadow-sm ring-2 ring-burgundy/30'
                : 'border-burgundy/20 bg-white text-burgundy hover:border-burgundy'
            }`}
          >
            <span
              className="h-3.5 w-3.5 rounded-full border border-black/15 shadow-xs shrink-0"
              style={{ backgroundColor: hex }}
            />
            <span>{c}</span>
            
          </button>
        );
      })}
    </div>
  </div>
)}

 <div className="rounded-[1.25rem] border border-burgundy/10 bg-beige/10 p-4">
 <h3 className="text-sm font-semibold text-burgundy">الكمية المطلوبة</h3>
 <div className="mt-3 flex items-center gap-3">
   <div className="flex items-center border border-burgundy/20 bg-white rounded-xl overflow-hidden shadow-xs">
     <button
       type="button"
       disabled={quantity <= 1 || product.stock === 0}
       onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
       className="w-10 h-10 flex items-center justify-center text-lg font-bold text-burgundy hover:bg-burgundy/10 disabled:opacity-40 transition cursor-pointer"
       aria-label="تقليل الكمية"
     >
       −
     </button>
     <span className="w-12 text-center font-extrabold text-sm text-burgundy">
       {product.stock === 0 ? 0 : quantity}
     </span>
     <button
       type="button"
       disabled={quantity >= product.stock || product.stock === 0}
       onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
       className="w-10 h-10 flex items-center justify-center text-lg font-bold text-burgundy hover:bg-burgundy/10 disabled:opacity-40 transition cursor-pointer"
       aria-label="زيادة الكمية"
     >
       +
     </button>
   </div>
   <span className="text-xs text-burgundy/70 font-medium">
     {product.stock === 0 ? 'القطعة غير متوفرة حالياً' : product.stock <= 5 ? `أقصى كمية متاحة: ${product.stock} قطع` : 'جاهز للطلب والشحن الفوري'}
   </span>
 </div>
 </div>

 <div className="flex flex-col sm:flex-row gap-3 pt-2">
  <button
   type="button"
   onClick={() => setIsQuickOrderOpen(true)}
   disabled={product.stock === 0}
   className={`flex-1 rounded-xl sm:rounded-2xl px-5 py-3.5 text-sm sm:text-base font-extrabold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-burgundy/25 ${product.stock === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-burgundy hover:bg-[#650018] active:scale-[0.98]'}`}
  >
   <span>شراء سريع بنقرة واحدة</span>
   
  </button>
  <button
   type="button"
   onClick={handleAddToCart}
   disabled={product.stock === 0}
   className={`rounded-xl sm:rounded-2xl px-5 py-3.5 text-sm sm:text-base font-bold transition flex items-center justify-center gap-2 border-2 ${product.stock === 0 ? 'border-gray-300 text-gray-400 cursor-not-allowed' : added ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-burgundy/30 bg-[#FAF5F2] text-burgundy hover:bg-burgundy/10 active:scale-[0.98]'}`}
  >
   
   <span>{product.stock === 0 ? 'غير متوفر' : added ? 'تمت الإضافة للسلة' : 'أضف للسلة'}</span>
  </button>
 </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
    {siteConfig?.features?.productComparison !== false && (
      <button
       type="button"
       onClick={() => addToCompare(product)}
       className={`rounded-xl sm:rounded-2xl py-3 px-3.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border transition ${
        isItemComparing
         ? 'bg-amber-50 border-amber-400 text-burgundy font-black shadow-sm'
         : 'bg-white hover:bg-beige/20 border-burgundy/15 text-burgundy/80 hover:text-burgundy'
       }`}
      >
       <span className="truncate">{isItemComparing ? '✓ في المقارنة' : 'مقارنة الموديل'}</span>
      </button>
    )}

    {siteConfig?.features?.shareOutfit !== false && (
      <button
       type="button"
       onClick={() => setIsShareModalOpen(true)}
       className="rounded-xl sm:rounded-2xl py-3 px-3.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border border-amber-500/30 bg-gradient-to-r from-amber-50 via-white to-amber-50 hover:from-amber-100 hover:to-amber-100 text-burgundy transition shadow-xs active:scale-95"
      >
       <span>شاركي اللوك مع صديقتكِ</span>
      </button>
    )}
  </div>
 </div>
 </div>
 </div>
 </div>
 <div className="rounded-[2rem] border border-burgundy/10 bg-white p-8 shadow-soft">
 <h3 className="text-2xl font-semibold">منتجات مشابهة</h3>
 <div className="mt-4 grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
 {similarProducts.length === 0 ? (
 <p className="col-span-full py-10 text-center text-sm text-burgundy/40">لا توجد منتجات مشابهة حالياً</p>
 ) : (
 similarProducts.map(p => (
 <ProductCard key={p._id} product={p} />
 ))
 )}
 </div>
 </div>
 {/* Lightbox Modal */}
 {isLightboxOpen && (
 <div 
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3 sm:p-6 backdrop-blur-md"
 onClick={() => setIsLightboxOpen(false)}
 >
 {/* Close button */}
 <button
 type="button"
 onClick={() => setIsLightboxOpen(false)}
 className="absolute top-5 right-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white text-lg transition z-50 font-bold border border-white/20 cursor-pointer"
 aria-label="إغلاق"
 >
 ✕
 </button>

 {/* Large image */}
 <div className="relative max-w-full max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
 <img 
 src={displayedImage || (product.images && product.images.length > 0 ? resolveImageUrl(product.images[activeImageIdx]) : "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=80")} 
 alt={cleanProductName(product)} 
 className="max-w-[95vw] max-h-[88vh] rounded-2xl object-contain shadow-2xl" 
 />

 {/* Arrow controls in lightbox */}
 {product.images && product.images.length > 1 && (
 <>
 <button
 type="button"
 onClick={() => setActiveImageIdx(prev => (prev === 0 ? product.images.length - 1 : prev - 1))}
 className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white shadow-md transition z-50 border border-white/20 cursor-pointer"
 aria-label="Previous"
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
 </svg>
 </button>
 <button
 type="button"
 onClick={() => setActiveImageIdx(prev => (prev === product.images.length - 1 ? 0 : prev + 1))}
 className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white shadow-md transition z-50 border border-white/20 cursor-pointer"
 aria-label="Next"
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
 </svg>
 </button>
 </>
 )}
 </div>
 </div>
 )}

  {/* Sticky Bottom Action Bar for Mobile Devices */}
  <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-burgundy/15 px-3.5 py-2.5 shadow-[0_-6px_25px_rgba(0,0,0,0.12)] flex items-center justify-between gap-3 lg:hidden">
    <div className="flex flex-col shrink-0 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-extrabold text-base text-burgundy">
          {Number(isDiscountActive(product) ? product.discountPrice : product.price).toLocaleString('en-US')} ج.م
        </span>
        {isDiscountActive(product) && (
          <span className="text-[10px] text-red-500 line-through">
            {Number(product.price).toLocaleString('en-US')}
          </span>
        )}
      </div>
      <span className="text-[10px] text-emerald-700 font-semibold truncate">
        {product.stock > 0 ? '✓ متوفر للشحن الفوري' : '✕ غير متوفر'}
      </span>
    </div>

    <div className="flex items-center gap-2 flex-1 justify-end max-w-[240px]">
      {siteConfig?.features?.shareOutfit !== false && (
        <button
          type="button"
          onClick={() => setIsShareModalOpen(true)}
          className="h-11 px-3 rounded-xl border border-burgundy/20 bg-[#FAF5F2] hover:bg-amber-50 text-burgundy flex items-center justify-center transition shrink-0"
          title="شاركي اللوك مع صديقتكِ"
        >
          <span className="text-[11px] font-bold">شير</span>
        </button>
      )}

      {siteConfig?.features?.productComparison !== false && (
        <button
          type="button"
          onClick={() => addToCompare(product)}
          className={`h-11 px-3 rounded-xl border flex items-center justify-center transition shrink-0 ${
            isItemComparing
              ? 'bg-amber-400 text-burgundy border-amber-500 font-bold'
              : 'bg-[#FAF5F2] text-burgundy border-burgundy/20'
          }`}
          title="مقارنة هذا الموديل"
        >
          <span className="text-[11px] font-bold">{isItemComparing ? '✓' : 'مقارنة'}</span>
        </button>
      )}

<button
        type="button"
        onClick={handleAddToCart}
        disabled={product.stock === 0}
        className={`h-11 px-3.5 rounded-xl border border-burgundy/20 flex items-center justify-center transition shrink-0 ${
          added ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-[#FAF5F2] text-burgundy active:scale-95'
        }`}
        title="أضف إلى السلة"
      >
        <span className="text-xs font-bold">{added ? '✓' : 'سلة'}</span>
      </button>

      <button
        type="button"
        onClick={() => setIsQuickOrderOpen(true)}
        disabled={product.stock === 0}
        className="flex-1 h-11 px-3 rounded-xl bg-burgundy hover:bg-[#650018] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-burgundy/30 active:scale-95 disabled:bg-gray-400"
      >
        <span>شراء سريع</span>
        
      </button>
    </div>
  </div>

  {/* Quick Order Modal */}
  <QuickOrderModal
    isOpen={isQuickOrderOpen}
    onClose={() => setIsQuickOrderOpen(false)}
    product={product}
    initialSize={selectedSize}
    initialColor={selectedColor}
    initialQty={quantity}
    whatsappNumber={whatsappNumber}
  />
 
  {/* Share Outfit Modal */}
  <ShareOutfitModal
    isOpen={isShareModalOpen}
    onClose={() => setIsShareModalOpen(false)}
    product={product}
  />
</section>
 );
}

export default ProductDetailsPage;
