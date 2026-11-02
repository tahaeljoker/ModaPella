import { useState, useEffect, useMemo, useContext, useRef } from 'react';
import CartContext from '../context/CartContext';

// Default Luxury Outfits Dataset
export const DEFAULT_OUTFITTER_DATA = {
  mannequinBase: '/outfitter/mannequin.svg',
  bundleDiscountPercent: 15, // 15% bundle discount when buying Top + Bottom
  tops: [
    {
      id: 'top-blouse-silk',
      name: 'بلوزة حريرية مطرزة بريميوم',
      categoryName: 'بلوزات فاخرة',
      description: 'قصة انسيابية راقية مع ياقة صينية وأزرار لؤلؤية كلاسيكية، مثالية للمناسبات والإطلالات الرسمية.',
      price: 650,
      originalPrice: 790,
      availableSizes: ['S', 'M', 'L', 'XL'],
      variants: [
        {
          colorName: 'بورجوندي ملكي',
          colorHex: '#7C0A12',
          image: '/outfitter/top_blouse_burgundy.svg',
          badge: 'الأكثر طلباً'
        },
        {
          colorName: 'أسود كلاسيك',
          colorHex: '#1A1A1A',
          image: '/outfitter/top_blouse_black.svg'
        },
        {
          colorName: 'بيج عاجي',
          colorHex: '#E5D6C7',
          image: '/outfitter/top_blouse_beige.svg'
        },
        {
          colorName: 'زمردي عميق',
          colorHex: '#0F4D3A',
          image: '/outfitter/top_blouse_emerald.svg'
        }
      ]
    },
    {
      id: 'top-blazer-italian',
      name: 'بليزر كلاسيك بقصة إيطالية',
      categoryName: 'بليزرات ومعاطف',
      description: 'قصة عصرية بأكتاف محددة وياقة رفيعة مع أزرار ذهبية فاخرة لإطلالة حضورية لا تُنسى.',
      price: 980,
      originalPrice: 1150,
      availableSizes: ['M', 'L', 'XL', 'XXL'],
      variants: [
        {
          colorName: 'كحلي داكن',
          colorHex: '#1E293B',
          image: '/outfitter/top_blazer_navy.svg',
          badge: 'وصل حديثاً'
        },
        {
          colorName: 'بيج كاميل',
          colorHex: '#9A6B43',
          image: '/outfitter/top_blazer_camel.svg'
        },
        {
          colorName: 'أسود فحمي',
          colorHex: '#141414',
          image: '/outfitter/top_blazer_black.svg'
        },
        {
          colorName: 'أبيض لؤلؤي',
          colorHex: '#F3F4F6',
          image: '/outfitter/top_blazer_white.svg'
        }
      ]
    }
  ],
  bottoms: [
    {
      id: 'bottom-pants-tailored',
      name: 'بنطلون قماش بقصة مستقيمة عالية الخصر',
      categoryName: 'بناطيل كلاسيك',
      description: 'خامة تركية مقاومة للتجعد مع حزام خصر عالي وكسرة أمامية حادة تعطي قواماً متناسقاً وممشوقاً.',
      price: 540,
      originalPrice: 650,
      availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
      variants: [
        {
          colorName: 'أسود كلاسيك',
          colorHex: '#18181B',
          image: '/outfitter/bottom_pants_black.svg',
          badge: 'أساسي'
        },
        {
          colorName: 'بيج كشمير',
          colorHex: '#C8B8A6',
          image: '/outfitter/bottom_pants_beige.svg'
        },
        {
          colorName: 'كحلي داكن',
          colorHex: '#1E293B',
          image: '/outfitter/bottom_pants_navy.svg'
        },
        {
          colorName: 'بورجوندي دافئ',
          colorHex: '#7C0A12',
          image: '/outfitter/bottom_pants_burgundy.svg'
        }
      ]
    },
    {
      id: 'bottom-skirt-pleated',
      name: 'تنورة بليسيه ميدي بقصة أنثوية',
      categoryName: 'تنانير راقية',
      description: 'كسرات متناسقة متدفقة بخفة وأناقة مع خصر مطاطي مريح يناسب مختلف الإطلالات النهارية والمسائية.',
      price: 590,
      originalPrice: 720,
      availableSizes: ['M', 'L', 'XL'],
      variants: [
        {
          colorName: 'بيج لؤلؤي',
          colorHex: '#EDE3D8',
          image: '/outfitter/bottom_skirt_ivory.svg',
          badge: 'تريند'
        },
        {
          colorName: 'أخضر زمردي',
          colorHex: '#0F4D3A',
          image: '/outfitter/bottom_skirt_emerald.svg'
        },
        {
          colorName: 'رمادي شاركول',
          colorHex: '#334155',
          image: '/outfitter/bottom_skirt_charcoal.svg'
        },
        {
          colorName: 'عسلي دافئ',
          colorHex: '#B45309',
          image: '/outfitter/bottom_skirt_amber.svg'
        }
      ]
    }
  ],
  accessories: [
    {
      id: 'acc-bag-leather',
      name: 'حقيبة يد جلدية كلاسيكية بحلية ذهبية',
      categoryName: 'حقائب وإكسسوارات',
      description: 'جلد محبب فاخر مع حزام كتف عملي وقفل معدني ذهبي بشعار مودة بيلا الملكي.',
      price: 420,
      originalPrice: 510,
      availableSizes: ['مقاس موحد'],
      variants: [
        {
          colorName: 'كونياك عسلي',
          colorHex: '#8B4513',
          image: '/outfitter/acc_bag_cognac.svg',
          badge: 'مفضل'
        },
        {
          colorName: 'أسود كلاسيك',
          colorHex: '#18181B',
          image: '/outfitter/acc_bag_black.svg'
        },
        {
          colorName: 'بورجوندي ملكي',
          colorHex: '#7C0A12',
          image: '/outfitter/acc_bag_burgundy.svg'
        }
      ]
    }
  ]
};

// Animated Layer Component with Smooth Crossfade
function CanvasLayer({ src, alt, zIndex, isFading = false }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!src) return;
    setLoaded(false);
    const img = new Image();
    img.src = src;
    img.onload = () => setLoaded(true);
    img.onerror = () => setLoaded(true); // show fallback
  }, [src]);

  if (!src) return null;

  return (
    <div
      className={`absolute inset-0 w-full h-full pointer-events-none transition-all duration-300 ease-out ${
        isFading || !loaded ? 'opacity-0 scale-[0.99]' : 'opacity-100 scale-100'
      }`}
      style={{ zIndex }}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain select-none"
        loading="eager"
        draggable="false"
      />
    </div>
  );
}

export default function OutfitterCanvas({
  initialData = DEFAULT_OUTFITTER_DATA,
  onBundleAdded = null,
  className = ''
}) {
  const { addItem } = useContext(CartContext);

  // Active Selections
  const [selectedTopIdx, setSelectedTopIdx] = useState(0);
  const [selectedTopColorIdx, setSelectedTopColorIdx] = useState(0);
  const [selectedTopSize, setSelectedTopSize] = useState('M');

  const [selectedBottomIdx, setSelectedBottomIdx] = useState(0);
  const [selectedBottomColorIdx, setSelectedBottomColorIdx] = useState(0);
  const [selectedBottomSize, setSelectedBottomSize] = useState('M');

  const [includeAccessory, setIncludeAccessory] = useState(true);
  const [selectedAccIdx, setSelectedAccIdx] = useState(0);
  const [selectedAccColorIdx, setSelectedAccColorIdx] = useState(0);

  // Active Category Tab for options panel: 'tops' | 'bottoms' | 'accessories'
  const [activeTab, setActiveTab] = useState('tops');

  // UI States
  const [isLayerTransitioning, setIsLayerTransitioning] = useState(false);
  const [addedToCartFeedback, setAddedToCartFeedback] = useState(false);
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  // Custom User Uploaded PNGs (Local Tester Mode)
  const [customLayers, setCustomLayers] = useState({
    mannequin: null,
    top: null,
    bottom: null,
    accessory: null
  });

  // Current Selected Objects
  const currentTop = initialData.tops[selectedTopIdx] || initialData.tops[0];
  const currentTopVariant = currentTop?.variants[selectedTopColorIdx] || currentTop?.variants[0];

  const currentBottom = initialData.bottoms[selectedBottomIdx] || initialData.bottoms[0];
  const currentBottomVariant = currentBottom?.variants[selectedBottomColorIdx] || currentBottom?.variants[0];

  const currentAccessory = initialData.accessories?.[selectedAccIdx] || initialData.accessories?.[0];
  const currentAccVariant = currentAccessory?.variants[selectedAccColorIdx] || currentAccessory?.variants[0];

  // Preload next variant images for silky 0ms instant swaps
  useEffect(() => {
    const urlsToPreload = [];
    currentTop?.variants?.forEach((v) => v.image && urlsToPreload.push(v.image));
    currentBottom?.variants?.forEach((v) => v.image && urlsToPreload.push(v.image));
    currentAccessory?.variants?.forEach((v) => v.image && urlsToPreload.push(v.image));

    urlsToPreload.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, [currentTop, currentBottom, currentAccessory]);

  // Trigger brief transition animation on item switch
  const triggerTransition = () => {
    setIsLayerTransitioning(true);
    setTimeout(() => setIsLayerTransitioning(false), 180);
  };

  // Pricing Calculations
  const pricing = useMemo(() => {
    const topPrice = currentTop?.price || 0;
    const topOriginal = currentTop?.originalPrice || topPrice;

    const bottomPrice = currentBottom?.price || 0;
    const bottomOriginal = currentBottom?.originalPrice || bottomPrice;

    const accPrice = includeAccessory && currentAccessory ? currentAccessory.price : 0;
    const accOriginal = includeAccessory && currentAccessory ? currentAccessory.originalPrice : 0;

    const baseSum = topPrice + bottomPrice + accPrice;
    const originalSum = topOriginal + bottomOriginal + accOriginal;

    // Apply bundle discount if at least top and bottom are selected
    const discountRate = (initialData.bundleDiscountPercent || 15) / 100;
    const bundleDiscountAmount = Math.round(baseSum * discountRate);
    const finalBundlePrice = baseSum - bundleDiscountAmount;
    const totalSavings = (originalSum - baseSum) + bundleDiscountAmount;

    return {
      topPrice,
      bottomPrice,
      accPrice,
      baseSum,
      originalSum,
      discountPercent: initialData.bundleDiscountPercent || 15,
      bundleDiscountAmount,
      finalBundlePrice,
      totalSavings
    };
  }, [currentTop, currentBottom, currentAccessory, includeAccessory, initialData.bundleDiscountPercent]);

  // Add Complete Bundle to Cart
  const handleAddBundleToCart = () => {
    if (!currentTop || !currentBottom) return;

    // 1. Top Cart Item
    const topCartItem = {
      _id: `${currentTop.id}_${Date.now()}`,
      name: `${currentTop.name} (${currentTopVariant.colorName})`,
      price: Math.round(currentTop.price * (1 - (initialData.bundleDiscountPercent / 100))),
      originalPrice: currentTop.price,
      isDiscountActive: true,
      selectedSize: selectedTopSize,
      selectedColor: currentTopVariant.colorName,
      images: [currentTopVariant.image],
      category: 'ملابس علوية',
      cartId: `${currentTop.id}_${selectedTopSize}_${currentTopVariant.colorName}_bundle`
    };

    // 2. Bottom Cart Item
    const bottomCartItem = {
      _id: `${currentBottom.id}_${Date.now() + 1}`,
      name: `${currentBottom.name} (${currentBottomVariant.colorName})`,
      price: Math.round(currentBottom.price * (1 - (initialData.bundleDiscountPercent / 100))),
      originalPrice: currentBottom.price,
      isDiscountActive: true,
      selectedSize: selectedBottomSize,
      selectedColor: currentBottomVariant.colorName,
      images: [currentBottomVariant.image],
      category: 'ملابس سفلية',
      cartId: `${currentBottom.id}_${selectedBottomSize}_${currentBottomVariant.colorName}_bundle`
    };

    addItem(topCartItem, 1);
    addItem(bottomCartItem, 1);

    // 3. Accessory if enabled
    if (includeAccessory && currentAccessory && currentAccVariant) {
      const accCartItem = {
        _id: `${currentAccessory.id}_${Date.now() + 2}`,
        name: `${currentAccessory.name} (${currentAccVariant.colorName})`,
        price: Math.round(currentAccessory.price * (1 - (initialData.bundleDiscountPercent / 100))),
        originalPrice: currentAccessory.price,
        isDiscountActive: true,
        selectedSize: 'مقاس موحد',
        selectedColor: currentAccVariant.colorName,
        images: [currentAccVariant.image],
        category: 'إكسسوارات',
        cartId: `${currentAccessory.id}_one_size_${currentAccVariant.colorName}_bundle`
      };
      addItem(accCartItem, 1);
    }

    setAddedToCartFeedback(true);
    if (onBundleAdded) onBundleAdded();
    setTimeout(() => setAddedToCartFeedback(false), 2400);
  };

  // Surprise Me / Randomize Look
  const handleRandomizeLook = () => {
    triggerTransition();
    const randomTopIdx = Math.floor(Math.random() * initialData.tops.length);
    const topItem = initialData.tops[randomTopIdx];
    const randomTopColor = Math.floor(Math.random() * topItem.variants.length);

    const randomBottomIdx = Math.floor(Math.random() * initialData.bottoms.length);
    const bottomItem = initialData.bottoms[randomBottomIdx];
    const randomBottomColor = Math.floor(Math.random() * bottomItem.variants.length);

    setSelectedTopIdx(randomTopIdx);
    setSelectedTopColorIdx(randomTopColor);
    setSelectedBottomIdx(randomBottomIdx);
    setSelectedBottomColorIdx(randomBottomColor);

    if (initialData.accessories?.length > 0) {
      const randomAcc = Math.floor(Math.random() * initialData.accessories.length);
      const accItem = initialData.accessories[randomAcc];
      setSelectedAccIdx(randomAcc);
      setSelectedAccColorIdx(Math.floor(Math.random() * accItem.variants.length));
    }
  };

  // Reset to Signature Look
  const handleResetLook = () => {
    triggerTransition();
    setSelectedTopIdx(0);
    setSelectedTopColorIdx(0);
    setSelectedTopSize(initialData.tops[0]?.availableSizes[1] || 'M');

    setSelectedBottomIdx(0);
    setSelectedBottomColorIdx(0);
    setSelectedBottomSize(initialData.bottoms[0]?.availableSizes[1] || 'M');

    setIncludeAccessory(true);
    setSelectedAccIdx(0);
    setSelectedAccColorIdx(0);

    setCustomLayers({ mannequin: null, top: null, bottom: null, accessory: null });
  };

  // Handle Local Custom PNG File Uploads for Instant Testing
  const handleCustomFileUpload = (e, layerKey) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomLayers((prev) => ({
        ...prev,
        [layerKey]: event.target.result
      }));
      triggerTransition();
    };
    reader.readAsDataURL(file);
  };

  // Effective Image Sources (custom override takes precedence if loaded)
  const effectiveMannequinSrc = customLayers.mannequin || initialData.mannequinBase;
  const effectiveBottomSrc = customLayers.bottom || currentBottomVariant?.image;
  const effectiveTopSrc = customLayers.top || currentTopVariant?.image;
  const effectiveAccSrc = customLayers.accessory || (includeAccessory ? currentAccVariant?.image : null);

  return (
    <div className={`w-full text-burgundy ${className}`} dir="rtl">
      {/* Studio Banner & Utility Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-4 rounded-2xl bg-gradient-to-r from-beige/80 via-white to-beige/80 border border-burgundy/10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy text-xl">
            ✨
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <span>غرفة تنسيق الإطلالات الذكية</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 border border-amber-500/30">
                Mix & Match Studio
              </span>
            </h2>
            <p className="text-xs text-burgundy/70">
              بدّلي بين القطع والألوان ونسّقي لوك كامل وشوفيه فوراً على المانيكان!
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRandomizeLook}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-burgundy/20 bg-white hover:bg-beige/40 text-burgundy transition shadow-xs active:scale-95"
            title="اختيار إطلالة عشوائية متناسقة"
          >
            <span>🎲</span>
            <span>نسّقي لي لوك</span>
          </button>

          <button
            type="button"
            onClick={handleResetLook}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-burgundy/15 bg-white/70 hover:bg-white text-burgundy/80 hover:text-burgundy transition active:scale-95"
            title="إعادة ضبط الإطلالة"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">إعادة ضبط</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTesterOpen(!isTesterOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition active:scale-95 ${
              isTesterOpen
                ? 'bg-burgundy text-white border-burgundy shadow-sm'
                : 'border-burgundy/20 bg-white text-burgundy hover:bg-beige/40'
            }`}
            title="تجربة رفع صور مفرغة خاصة بك"
          >
            <span>🧪</span>
            <span>تجربة الصور</span>
          </button>
        </div>
      </div>

      {/* Expandable Image Tester Drawer for User/Admin Custom PNG testing */}
      {isTesterOpen && (
        <div className="mb-6 p-5 rounded-2xl bg-amber-50/70 border-2 border-dashed border-amber-300 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📸</span>
              <h3 className="text-sm font-black text-amber-950">
                وضع تجربة الصور المفرغة (Custom PNG Tester Mode)
              </h3>
            </div>
            <span className="text-[11px] text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full font-bold">
              معاينة فورية بدون رفع على السيرفر
            </span>
          </div>
          <p className="text-xs text-amber-900/80 leading-relaxed">
            تقدري هنا تختاري أي صورة مفرغة الخلفية (Transparent PNG) عندك من الجهاز للقطعة العلوية أو السفلية أو المانيكان، وهتظهر فوراً في طبقتها المحددة على المانيكان عشان تشوفي التطابق والأبعاد!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Mannequin Base */}
            <div className="p-3 bg-white rounded-xl border border-amber-200 text-center space-y-2">
              <span className="text-xs font-bold block text-burgundy">1. صورة المانيكان (Base)</span>
              <label className="cursor-pointer block text-[11px] py-1.5 px-3 rounded-lg bg-beige/40 hover:bg-beige border border-burgundy/15 font-semibold text-burgundy truncate">
                {customLayers.mannequin ? '✓ تم تحديد صورة' : 'اختاري ملف PNG...'}
                <input
                  type="file"
                  accept="image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => handleCustomFileUpload(e, 'mannequin')}
                />
              </label>
              {customLayers.mannequin && (
                <button
                  type="button"
                  onClick={() => setCustomLayers((prev) => ({ ...prev, mannequin: null }))}
                  className="text-[10px] text-red-600 underline font-semibold"
                >
                  إلغاء التخصيص
                </button>
              )}
            </div>

            {/* Bottom Wear */}
            <div className="p-3 bg-white rounded-xl border border-amber-200 text-center space-y-2">
              <span className="text-xs font-bold block text-burgundy">2. القطعة السفلية (Bottom)</span>
              <label className="cursor-pointer block text-[11px] py-1.5 px-3 rounded-lg bg-beige/40 hover:bg-beige border border-burgundy/15 font-semibold text-burgundy truncate">
                {customLayers.bottom ? '✓ تم تحديد صورة' : 'اختاري ملف PNG...'}
                <input
                  type="file"
                  accept="image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => handleCustomFileUpload(e, 'bottom')}
                />
              </label>
              {customLayers.bottom && (
                <button
                  type="button"
                  onClick={() => setCustomLayers((prev) => ({ ...prev, bottom: null }))}
                  className="text-[10px] text-red-600 underline font-semibold"
                >
                  إلغاء التخصيص
                </button>
              )}
            </div>

            {/* Top Wear */}
            <div className="p-3 bg-white rounded-xl border border-amber-200 text-center space-y-2">
              <span className="text-xs font-bold block text-burgundy">3. القطعة العلوية (Top)</span>
              <label className="cursor-pointer block text-[11px] py-1.5 px-3 rounded-lg bg-beige/40 hover:bg-beige border border-burgundy/15 font-semibold text-burgundy truncate">
                {customLayers.top ? '✓ تم تحديد صورة' : 'اختاري ملف PNG...'}
                <input
                  type="file"
                  accept="image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => handleCustomFileUpload(e, 'top')}
                />
              </label>
              {customLayers.top && (
                <button
                  type="button"
                  onClick={() => setCustomLayers((prev) => ({ ...prev, top: null }))}
                  className="text-[10px] text-red-600 underline font-semibold"
                >
                  إلغاء التخصيص
                </button>
              )}
            </div>

            {/* Accessory */}
            <div className="p-3 bg-white rounded-xl border border-amber-200 text-center space-y-2">
              <span className="text-xs font-bold block text-burgundy">4. الإكسسوار / الحقيبة</span>
              <label className="cursor-pointer block text-[11px] py-1.5 px-3 rounded-lg bg-beige/40 hover:bg-beige border border-burgundy/15 font-semibold text-burgundy truncate">
                {customLayers.accessory ? '✓ تم تحديد صورة' : 'اختاري ملف PNG...'}
                <input
                  type="file"
                  accept="image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => handleCustomFileUpload(e, 'accessory')}
                />
              </label>
              {customLayers.accessory && (
                <button
                  type="button"
                  onClick={() => setCustomLayers((prev) => ({ ...prev, accessory: null }))}
                  className="text-[10px] text-red-600 underline font-semibold"
                >
                  إلغاء التخصيص
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Studio Grid: Left Canvas, Right Selectors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ======================================================== */}
        {/* LEFT / CENTER: The 2D Layered Mannequin Canvas (5 cols)  */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-md mx-auto sticky top-24">
            {/* Visual Stacking Container (Fixed 2:3 aspect ratio) */}
            <div
              onClick={() => setIsZoomModalOpen(true)}
              className="relative w-full aspect-[2/3] rounded-3xl overflow-hidden bg-gradient-to-b from-[#FAF6F3] via-white to-[#F2EAE4] border-2 border-burgundy/15 shadow-soft shadow-burgundy/10 cursor-zoom-in group select-none transition-transform duration-300 hover:scale-[1.01]"
              title="انقري لتكبير الإطلالة بدقة عالية"
            >
              {/* Studio ambient glow backdrop */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/70 via-transparent to-burgundy/5 pointer-events-none" />

              {/* Layer 1 (z-10): Base Mannequin Canvas */}
              <CanvasLayer
                src={effectiveMannequinSrc}
                alt="مانيكان مودة بيلا"
                zIndex={10}
                isFading={isLayerTransitioning}
              />

              {/* Layer 2 (z-20): Bottom Wear Layer */}
              <CanvasLayer
                src={effectiveBottomSrc}
                alt={currentBottom?.name || 'القطعة السفلية'}
                zIndex={20}
                isFading={isLayerTransitioning}
              />

              {/* Layer 3 (z-30): Top Wear Layer */}
              <CanvasLayer
                src={effectiveTopSrc}
                alt={currentTop?.name || 'القطعة العلوية'}
                zIndex={30}
                isFading={isLayerTransitioning}
              />

              {/* Layer 4 (z-40): Accessory / Bag Layer */}
              {includeAccessory && (
                <CanvasLayer
                  src={effectiveAccSrc}
                  alt={currentAccessory?.name || 'حقيبة وإكسسوار'}
                  zIndex={40}
                  isFading={isLayerTransitioning}
                />
              )}

              {/* Overlay Badges */}
              <div className="absolute top-4 right-4 z-50 flex flex-col gap-1.5 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-burgundy/90 backdrop-blur-md text-white text-[11px] font-extrabold shadow-md">
                  <span>✨</span>
                  <span>طقم متناسق</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black shadow-sm">
                  خصم {pricing.discountPercent}% للطقم
                </span>
              </div>

              {/* Zoom hint badge */}
              <div className="absolute bottom-4 left-4 z-50 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                <span>🔍</span>
                <span>تكبير اللوك</span>
              </div>

              {/* Active Color Palette indicators at the bottom */}
              <div className="absolute bottom-4 right-4 z-50 flex items-center gap-1.5 bg-white/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-burgundy/10 shadow-xs">
                <span className="text-[10px] font-bold text-burgundy/70 ml-1">الألوان:</span>
                {currentTopVariant && (
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white shadow-xs"
                    style={{ backgroundColor: currentTopVariant.colorHex }}
                    title={`القطعة العلوية: ${currentTopVariant.colorName}`}
                  />
                )}
                {currentBottomVariant && (
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white shadow-xs"
                    style={{ backgroundColor: currentBottomVariant.colorHex }}
                    title={`القطعة السفلية: ${currentBottomVariant.colorName}`}
                  />
                )}
                {includeAccessory && currentAccVariant && (
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white shadow-xs"
                    style={{ backgroundColor: currentAccVariant.colorHex }}
                    title={`الإكسسوار: ${currentAccVariant.colorName}`}
                  />
                )}
              </div>
            </div>

            {/* Accessory On/Off Quick Switcher */}
            <div className="mt-3 w-full flex items-center justify-between p-3 rounded-2xl bg-white border border-burgundy/10 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-lg">👜</span>
                <div>
                  <span className="text-xs font-bold block text-burgundy">إضافة حقيبة يد متناسقة</span>
                  <span className="text-[10px] text-burgundy/60">
                    +{pricing.accPrice} ج.م مع خصم الطقم
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIncludeAccessory(!includeAccessory);
                  triggerTransition();
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  includeAccessory ? 'bg-burgundy' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    includeAccessory ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT: Mix & Match Customizer & Price Card (7 cols)       */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* Navigation Category Tabs */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-beige/40 border border-burgundy/10">
            <button
              type="button"
              onClick={() => setActiveTab('tops')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 ${
                activeTab === 'tops'
                  ? 'bg-burgundy text-white shadow-md'
                  : 'text-burgundy/70 hover:text-burgundy hover:bg-white/60'
              }`}
            >
              <span>👚</span>
              <span>القطعة العلوية</span>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTopVariant?.colorHex || '#7C0A12' }} />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bottoms')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 ${
                activeTab === 'bottoms'
                  ? 'bg-burgundy text-white shadow-md'
                  : 'text-burgundy/70 hover:text-burgundy hover:bg-white/60'
              }`}
            >
              <span>👖</span>
              <span>القطعة السفلية</span>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentBottomVariant?.colorHex || '#18181B' }} />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('accessories')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 ${
                activeTab === 'accessories'
                  ? 'bg-burgundy text-white shadow-md'
                  : 'text-burgundy/70 hover:text-burgundy hover:bg-white/60'
              }`}
            >
              <span>👜</span>
              <span>الإكسسوار</span>
              {includeAccessory && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentAccVariant?.colorHex || '#8B4513' }} />
              )}
            </button>
          </div>

          {/* ==================== TAB 1: TOPS ==================== */}
          {activeTab === 'tops' && (
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-burgundy/10 shadow-soft space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-burgundy/10 pb-4">
                <div>
                  <h3 className="text-base font-black text-burgundy">{currentTop.name}</h3>
                  <p className="text-xs text-burgundy/60 mt-0.5">{currentTop.description}</p>
                </div>
                <div className="text-left">
                  <span className="text-lg font-black text-burgundy">{currentTop.price} ج.م</span>
                  {currentTop.originalPrice > currentTop.price && (
                    <span className="block text-xs text-burgundy/40 line-through">
                      {currentTop.originalPrice} ج.م
                    </span>
                  )}
                </div>
              </div>

              {/* Models Switcher */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-burgundy block">اختاري موديل القطعة العلوية:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {initialData.tops.map((top, idx) => (
                    <button
                      key={top.id}
                      type="button"
                      onClick={() => {
                        setSelectedTopIdx(idx);
                        setSelectedTopColorIdx(0);
                        setSelectedTopSize(top.availableSizes[0] || 'M');
                        triggerTransition();
                      }}
                      className={`p-3 rounded-2xl border text-right transition flex items-center justify-between ${
                        selectedTopIdx === idx
                          ? 'border-burgundy bg-burgundy/5 ring-2 ring-burgundy/20 shadow-xs'
                          : 'border-burgundy/15 bg-white hover:border-burgundy/40'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block text-burgundy">{top.name}</span>
                        <span className="text-[11px] text-burgundy/60">{top.price} ج.م</span>
                      </div>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        selectedTopIdx === idx ? 'bg-burgundy text-white font-bold' : 'border border-burgundy/20'
                      }`}>
                        {selectedTopIdx === idx ? '✓' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Swatches */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-burgundy">
                    اللون: <span className="font-bold text-amber-900">{currentTopVariant?.colorName}</span>
                  </label>
                  {currentTopVariant?.badge && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-burgundy/10 text-burgundy">
                      {currentTopVariant.badge}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {currentTop.variants.map((v, cIdx) => (
                    <button
                      key={v.colorName}
                      type="button"
                      onClick={() => {
                        setSelectedTopColorIdx(cIdx);
                        triggerTransition();
                      }}
                      className={`group relative flex items-center gap-2 p-1.5 pr-2.5 rounded-full border transition active:scale-95 ${
                        selectedTopColorIdx === cIdx
                          ? 'border-burgundy bg-burgundy/10 ring-2 ring-burgundy/30'
                          : 'border-burgundy/15 bg-beige/20 hover:bg-beige/50'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-black/15 shadow-inner"
                        style={{ backgroundColor: v.colorHex }}
                      />
                      <span className="text-xs font-bold text-burgundy">{v.colorName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-burgundy block">
                  المقاس للقطعة العلوية:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {currentTop.availableSizes.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedTopSize(sz)}
                      className={`min-w-[46px] py-2 px-3 rounded-xl text-xs font-black transition border ${
                        selectedTopSize === sz
                          ? 'bg-burgundy text-white border-burgundy shadow-sm'
                          : 'border-burgundy/15 bg-white text-burgundy hover:bg-beige/40'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: BOTTOMS ==================== */}
          {activeTab === 'bottoms' && (
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-burgundy/10 shadow-soft space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-burgundy/10 pb-4">
                <div>
                  <h3 className="text-base font-black text-burgundy">{currentBottom.name}</h3>
                  <p className="text-xs text-burgundy/60 mt-0.5">{currentBottom.description}</p>
                </div>
                <div className="text-left">
                  <span className="text-lg font-black text-burgundy">{currentBottom.price} ج.م</span>
                  {currentBottom.originalPrice > currentBottom.price && (
                    <span className="block text-xs text-burgundy/40 line-through">
                      {currentBottom.originalPrice} ج.م
                    </span>
                  )}
                </div>
              </div>

              {/* Models Switcher */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-burgundy block">اختاري موديل القطعة السفلية:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {initialData.bottoms.map((bottom, idx) => (
                    <button
                      key={bottom.id}
                      type="button"
                      onClick={() => {
                        setSelectedBottomIdx(idx);
                        setSelectedBottomColorIdx(0);
                        setSelectedBottomSize(bottom.availableSizes[0] || 'M');
                        triggerTransition();
                      }}
                      className={`p-3 rounded-2xl border text-right transition flex items-center justify-between ${
                        selectedBottomIdx === idx
                          ? 'border-burgundy bg-burgundy/5 ring-2 ring-burgundy/20 shadow-xs'
                          : 'border-burgundy/15 bg-white hover:border-burgundy/40'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block text-burgundy">{bottom.name}</span>
                        <span className="text-[11px] text-burgundy/60">{bottom.price} ج.م</span>
                      </div>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        selectedBottomIdx === idx ? 'bg-burgundy text-white font-bold' : 'border border-burgundy/20'
                      }`}>
                        {selectedBottomIdx === idx ? '✓' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Swatches */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-burgundy">
                    اللون: <span className="font-bold text-amber-900">{currentBottomVariant?.colorName}</span>
                  </label>
                  {currentBottomVariant?.badge && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-burgundy/10 text-burgundy">
                      {currentBottomVariant.badge}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {currentBottom.variants.map((v, cIdx) => (
                    <button
                      key={v.colorName}
                      type="button"
                      onClick={() => {
                        setSelectedBottomColorIdx(cIdx);
                        triggerTransition();
                      }}
                      className={`group relative flex items-center gap-2 p-1.5 pr-2.5 rounded-full border transition active:scale-95 ${
                        selectedBottomColorIdx === cIdx
                          ? 'border-burgundy bg-burgundy/10 ring-2 ring-burgundy/30'
                          : 'border-burgundy/15 bg-beige/20 hover:bg-beige/50'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-black/15 shadow-inner"
                        style={{ backgroundColor: v.colorHex }}
                      />
                      <span className="text-xs font-bold text-burgundy">{v.colorName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-burgundy block">
                  المقاس للقطعة السفلية:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {currentBottom.availableSizes.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedBottomSize(sz)}
                      className={`min-w-[46px] py-2 px-3 rounded-xl text-xs font-black transition border ${
                        selectedBottomSize === sz
                          ? 'bg-burgundy text-white border-burgundy shadow-sm'
                          : 'border-burgundy/15 bg-white text-burgundy hover:bg-beige/40'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: ACCESSORIES ==================== */}
          {activeTab === 'accessories' && (
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-burgundy/10 shadow-soft space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-burgundy/10 pb-4">
                <div>
                  <h3 className="text-base font-black text-burgundy">{currentAccessory.name}</h3>
                  <p className="text-xs text-burgundy/60 mt-0.5">{currentAccessory.description}</p>
                </div>
                <div className="text-left">
                  <span className="text-lg font-black text-burgundy">{currentAccessory.price} ج.م</span>
                  {currentAccessory.originalPrice > currentAccessory.price && (
                    <span className="block text-xs text-burgundy/40 line-through">
                      {currentAccessory.originalPrice} ج.م
                    </span>
                  )}
                </div>
              </div>

              {/* Inclusion Switcher */}
              <div className="p-3.5 rounded-2xl bg-beige/30 border border-burgundy/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold block text-burgundy">تضمين الإكسسوار في هذا اللوك</span>
                  <span className="text-[11px] text-burgundy/60">يمكنكِ تفعيلها أو إزالتها بنقرة واحدة</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIncludeAccessory(!includeAccessory);
                    triggerTransition();
                  }}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition ${
                    includeAccessory
                      ? 'bg-burgundy text-white shadow-xs'
                      : 'bg-white border border-burgundy/20 text-burgundy'
                  }`}
                >
                  {includeAccessory ? 'مُفعّلة ✓' : 'مُستبعدة'}
                </button>
              </div>

              {/* Color Swatches */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-burgundy">
                    اللون: <span className="font-bold text-amber-900">{currentAccVariant?.colorName}</span>
                  </label>
                  {currentAccVariant?.badge && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-burgundy/10 text-burgundy">
                      {currentAccVariant.badge}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {currentAccessory.variants.map((v, cIdx) => (
                    <button
                      key={v.colorName}
                      type="button"
                      onClick={() => {
                        setSelectedAccColorIdx(cIdx);
                        if (!includeAccessory) setIncludeAccessory(true);
                        triggerTransition();
                      }}
                      className={`group relative flex items-center gap-2 p-1.5 pr-2.5 rounded-full border transition active:scale-95 ${
                        selectedAccColorIdx === cIdx && includeAccessory
                          ? 'border-burgundy bg-burgundy/10 ring-2 ring-burgundy/30'
                          : 'border-burgundy/15 bg-beige/20 hover:bg-beige/50'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-black/15 shadow-inner"
                        style={{ backgroundColor: v.colorHex }}
                      />
                      <span className="text-xs font-bold text-burgundy">{v.colorName}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* LIVE PRICE BREAKDOWN & BUNDLE PURCHASE CARD              */}
          {/* ======================================================== */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-white via-beige/20 to-amber-50/50 border-2 border-burgundy/15 shadow-soft space-y-5">
            <div className="flex items-center justify-between border-b border-burgundy/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛍️</span>
                <div>
                  <h4 className="text-sm font-black text-burgundy">ملخص الطقم المتكامل</h4>
                  <p className="text-[11px] text-burgundy/60">
                    أضيفي القطع معاً واستفيدي من عرض الخصم الحصري
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300">
                وفّري {pricing.totalSavings} ج.م
              </span>
            </div>

            {/* Itemized Line Items */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-burgundy/80">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTopVariant?.colorHex }} />
                  <span>{currentTop.name} ({currentTopVariant?.colorName} - {selectedTopSize})</span>
                </div>
                <span className="font-bold">{pricing.topPrice} ج.م</span>
              </div>

              <div className="flex items-center justify-between text-burgundy/80">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentBottomVariant?.colorHex }} />
                  <span>{currentBottom.name} ({currentBottomVariant?.colorName} - {selectedBottomSize})</span>
                </div>
                <span className="font-bold">{pricing.bottomPrice} ج.م</span>
              </div>

              {includeAccessory && currentAccessory && (
                <div className="flex items-center justify-between text-burgundy/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentAccVariant?.colorHex }} />
                    <span>{currentAccessory.name} ({currentAccVariant?.colorName})</span>
                  </div>
                  <span className="font-bold">{pricing.accPrice} ج.م</span>
                </div>
              )}

              {/* Subtotal & Discount line */}
              <div className="pt-2 border-t border-burgundy/10 flex items-center justify-between text-burgundy/60">
                <span>المجموع قبل الخصم:</span>
                <span className="line-through">{pricing.originalSum} ج.م</span>
              </div>

              <div className="flex items-center justify-between text-emerald-700 font-bold">
                <span>خصم طقم الإطلالة المتكاملة ({pricing.discountPercent}%):</span>
                <span>-{pricing.bundleDiscountAmount} ج.م</span>
              </div>
            </div>

            {/* Total Price Banner */}
            <div className="p-4 rounded-2xl bg-burgundy/5 border border-burgundy/15 flex items-center justify-between">
              <div>
                <span className="text-xs text-burgundy/70 block">السعر الإجمالي للطقم:</span>
                <span className="text-2xl font-black text-burgundy">
                  {pricing.finalBundlePrice} ج.م
                </span>
              </div>
              <div className="text-left text-[11px] text-burgundy/60 font-semibold">
                شحن سريع لجميع المحافظات 🚚
                <br />
                معاينة مجانية عند الاستلام
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleAddBundleToCart}
              className={`w-full py-4 px-6 rounded-2xl text-base font-black transition-all flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] ${
                addedToCartFeedback
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                  : 'bg-burgundy hover:bg-[#650018] text-white shadow-burgundy/25'
              }`}
            >
              <span className="text-xl">
                {addedToCartFeedback ? '✓' : '🛍️'}
              </span>
              <span>
                {addedToCartFeedback
                  ? 'تمت إضافة الطقم كاملاً إلى سلة مشترياتكِ!'
                  : 'أضيفي الطقم كاملاً للسلة بخصم 15%'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* FULLSCREEN LIGHTBOX ZOOM MODAL                            */}
      {/* ======================================================== */}
      {isZoomModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setIsZoomModalOpen(false)}
        >
          <div
            className="relative max-w-lg w-full aspect-[2/3] rounded-3xl overflow-hidden bg-gradient-to-b from-[#FAF6F3] via-white to-[#F2EAE4] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsZoomModalOpen(false)}
              className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-black/60 text-white font-bold flex items-center justify-center hover:bg-black transition shadow"
            >
              ✕
            </button>

            {/* High-res Layers */}
            <CanvasLayer src={effectiveMannequinSrc} alt="مانيكان مودة بيلا" zIndex={10} />
            <CanvasLayer src={effectiveBottomSrc} alt={currentBottom?.name} zIndex={20} />
            <CanvasLayer src={effectiveTopSrc} alt={currentTop?.name} zIndex={30} />
            {includeAccessory && (
              <CanvasLayer src={effectiveAccSrc} alt={currentAccessory?.name} zIndex={40} />
            )}

            <div className="absolute bottom-4 inset-x-4 z-50 p-3 rounded-2xl bg-white/90 backdrop-blur-md border border-burgundy/15 text-center">
              <h4 className="text-sm font-black text-burgundy">
                {currentTop?.name} + {currentBottom?.name}
              </h4>
              <p className="text-xs text-burgundy/70 mt-0.5">
                {currentTopVariant?.colorName} مع {currentBottomVariant?.colorName}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
