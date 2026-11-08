import { useState, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CartContext from '../context/CartContext';
import { cleanProductName } from '../utils/discount';

export default function ShopTheLookCard({ look, onProductClick }) {
  const { addItem } = useContext(CartContext);
  const navigate = useNavigate();

  const [selectedVariants, setSelectedVariants] = useState(() => {
    const initial = {};
    (look?.items || []).forEach((item, index) => {
      const prod = item.product;
      if (!prod) return;
      const defaultSize = prod.sizes && prod.sizes.length > 0 ? prod.sizes[0] : (prod.variants?.[0]?.size || 'Standard');
      const defaultColor = prod.colors && prod.colors.length > 0 ? prod.colors[0] : (prod.variants?.[0]?.color || 'Default');
      initial[index] = { size: defaultSize, color: defaultColor };
    });
    return initial;
  });

  const [activeTooltip, setActiveTooltip] = useState(null);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [addedBundleSuccess, setAddedBundleSuccess] = useState(false);
  const [addedPieceIndex, setAddedPieceIndex] = useState(null);
  const videoRef = useRef(null);

  if (!look || !look.items || look.items.length === 0) return null;

  // Record scroll position before navigating to product details
  const handleNavigateToProduct = (productId) => {
    try {
      const key = `mp_scroll_${window.location.pathname}${window.location.search}`;
      sessionStorage.setItem(key, String(window.scrollY));
    } catch (e) {}
    navigate(`/product/${productId}`);
  };

  // Compute pricing
  const totalOriginalPrice = look.items.reduce((sum, item) => {
    const prod = item.product;
    if (!prod) return sum;
    return sum + (prod.price || 0);
  }, 0);

  const discountPercent = Number(look.bundleDiscountPercent) || 0;
  const bundleSavings = Math.round((totalOriginalPrice * discountPercent) / 100);
  const bundleFinalPrice = Math.max(0, totalOriginalPrice - bundleSavings);

  // Toggle video playback
  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsVideoPlaying(true);
    } else {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  // Toggle video mute
  const handleToggleMute = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsVideoMuted(videoRef.current.muted);
  };

  // Add individual piece to cart
  const handleAddSinglePiece = (item, index) => {
    const prod = item.product;
    if (!prod) return;
    const currentVar = selectedVariants[index] || {};
    const size = currentVar.size || 'Standard';
    const color = currentVar.color || 'Default';

    const cartItem = {
      _id: prod._id,
      name: prod.name,
      price: prod.price,
      originalPrice: prod.price,
      size,
      color,
      image: prod.images?.[0] || prod.mannequinImage || '',
      category: prod.category || 'أزياء',
      cartId: `${prod._id}_${size}_${color}_single`
    };

    addItem(cartItem, 1);
    setAddedPieceIndex(index);
    setTimeout(() => setAddedPieceIndex(null), 2000);
  };

  // Add full bundle to cart with discount
  const handleAddFullBundle = () => {
    const count = look.items.length;
    if (count === 0) return;

    look.items.forEach((item, index) => {
      const prod = item.product;
      if (!prod) return;

      const currentVar = selectedVariants[index] || {};
      const size = currentVar.size || 'Standard';
      const color = currentVar.color || 'Default';

      const discountedItemPrice = Math.round(prod.price * (1 - (discountPercent / 100)));

      const cartItem = {
        _id: prod._id,
        name: `${prod.name} (ضمن طقم ${look.title})`,
        price: discountedItemPrice,
        originalPrice: prod.price,
        size,
        color,
        image: prod.images?.[0] || prod.mannequinImage || '',
        category: prod.category || 'طقم موديل',
        cartId: `${prod._id}_${size}_${color}_look_${look._id}`
      };

      addItem(cartItem, 1);
    });

    setAddedBundleSuccess(true);
    setTimeout(() => setAddedBundleSuccess(false), 2500);
  };

  return (
    <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-burgundy/15 bg-white shadow-soft transition-all duration-300 hover:shadow-xl">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left / Top: Model Visual Media (Video or Image) */}
        <div className="relative lg:col-span-6 bg-stone-900 overflow-hidden flex items-center justify-center min-h-[360px] sm:min-h-[460px] lg:min-h-[540px] max-h-[580px] lg:max-h-[640px]">
          {look.mediaType === 'video' ? (
            <div
              className="relative w-full h-full flex items-center justify-center cursor-pointer select-none"
              onClick={handleTogglePlay}
            >
              <video
                ref={videoRef}
                src={look.mediaUrl}
                poster={look.videoThumbnail || undefined}
                autoPlay
                loop
                muted={isVideoMuted}
                playsInline
                className="w-full h-full object-cover max-h-[580px] lg:max-h-[640px]"
              />

              {/* Video Controls Overlay */}
              <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="p-2 sm:p-2.5 rounded-full bg-black/55 hover:bg-black/80 text-white backdrop-blur-md transition shadow cursor-pointer text-xs sm:text-sm"
                  title={isVideoMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                >
                  {isVideoMuted ? (<svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.208-1.605.572-2.296A2.25 2.25 0 014.51 8.25h4.24z"/></svg>) : (<svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.208-1.605.572-2.296A2.25 2.25 0 014.51 8.25h4.24z"/></svg>)}
                </button>
                <span className="px-2.5 py-1 rounded-full bg-black/55 text-[10px] sm:text-[11px] font-bold text-amber-300 backdrop-blur-md flex items-center gap-1 border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span>فيديو حي</span>
                </span>
              </div>

              {!isVideoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 z-10 pointer-events-none">
                  <div className="h-14 w-14 rounded-full bg-white/90 text-burgundy flex items-center justify-center shadow-xl text-xl font-bold">
                    ▶
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={look.mediaUrl}
                alt={look.title}
                className="w-full h-full object-cover max-h-[580px] lg:max-h-[640px]"
                loading="lazy"
              />
              <div className="absolute top-3.5 right-3.5 z-20">
                <span className="px-3 py-1 rounded-full bg-black/55 text-[10px] sm:text-[11px] font-bold text-amber-200 backdrop-blur-md border border-white/10">
                  جلسة تصوير
                </span>
              </div>
            </div>
          )}

          {/* Interactive Hotspot Pins Over the Media */}
          {look.items.map((item, index) => {
            const prod = item.product;
            if (!prod) return null;
            const posX = Math.max(8, Math.min(92, item.positionX ?? 50));
            const posY = Math.max(8, Math.min(92, item.positionY ?? (30 + index * 25)));
            const isHovered = activeTooltip === index;

            return (
              <div
                key={index}
                style={{ top: `${posY}%`, left: `${posX}%` }}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                onMouseEnter={() => setActiveTooltip(index)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                {/* Glowing Pin */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(isHovered ? null : index);
                  }}
                  className="relative group p-2 focus:outline-none cursor-pointer"
                  aria-label={`عرض ${prod.name}`}
                >
                  <span className="absolute inset-0 rounded-full bg-amber-400/40 animate-ping" />
                  <span className="relative flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white text-burgundy shadow-xl font-black text-xs border-2 border-amber-400 hover:scale-110 transition-transform">
                    {index + 1}
                  </span>
                </button>

                {/* Floating Tooltip Card */}
                {isHovered && (
                  <div
                    className="absolute z-30 bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 sm:w-56 rounded-xl bg-white p-2.5 shadow-2xl border border-burgundy/15 text-burgundy text-right pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={prod.images?.[0] || prod.mannequinImage || '/placeholder.png'}
                        alt={prod.name}
                        className="h-11 w-11 rounded-lg object-cover border border-burgundy/10 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block text-[9px] text-burgundy/60 font-semibold truncate">
                          {item.tagLabel || prod.category || 'قطعة من الطقم'}
                        </span>
                        <h4
                          onClick={() => handleNavigateToProduct(prod._id)}
                          className="text-xs font-bold truncate leading-tight hover:underline cursor-pointer"
                        >
                          {cleanProductName(prod.name)}
                        </h4>
                        <div className="mt-0.5 flex items-center justify-between text-xs font-black text-burgundy">
                          <span>{prod.price} ج.م</span>
                          <span
                            onClick={() => handleNavigateToProduct(prod._id)}
                            className="text-[10px] text-burgundy/70 hover:text-burgundy underline cursor-pointer"
                          >
                            التفاصيل ←
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Bottom Overlay Gradient & Category Tag */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 sm:p-5 z-10 flex items-end justify-between text-white pointer-events-none">
            <div className="space-y-0.5">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-xs font-bold text-amber-300 border border-white/10">
                {look.category || 'إطلالة عصرية'}
              </span>
              <h3 className="text-base sm:text-lg font-black">{look.title}</h3>
            </div>
            {discountPercent > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-white font-black text-xs shadow-md">
                خصم {discountPercent}% للطقم
              </span>
            )}
          </div>
        </div>

        {/* Right / Bottom: Outfit Details & Order Breakdown */}
        <div className="lg:col-span-6 p-4 sm:p-6 lg:p-7 flex flex-col justify-between space-y-5">
          <div className="space-y-3.5">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-burgundy/60">
                  MODAPELLA LOOK ✦ تنسيق متكامل
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-burgundy/10 text-burgundy">
                  {look.items.length} قطع متناسقة
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-burgundy mt-1">
                {look.title}
              </h2>
              {look.description && (
                <p className="text-xs text-burgundy/70 mt-1 leading-relaxed">
                  {look.description}
                </p>
              )}
            </div>

            {/* Included Pieces List */}
            <div className="space-y-2 pt-1">
              <h4 className="text-[11px] font-bold text-burgundy/60">القطع المكونة لهذا الطقم:</h4>
              <div className="space-y-2">
                {look.items.map((item, index) => {
                  const prod = item.product;
                  if (!prod) return null;
                  const currentVar = selectedVariants[index] || {};
                  const isAddedThis = addedPieceIndex === index;

                  return (
                    <div
                      key={index}
                      className="group rounded-xl border border-burgundy/10 bg-[#FAF7F5] p-2.5 sm:p-3 transition-all hover:border-burgundy/25 hover:bg-white hover:shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        {/* Number & Thumbnail */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-burgundy/10 text-[10px] font-black text-burgundy">
                            {index + 1}
                          </span>
                          <div
                            onClick={() => handleNavigateToProduct(prod._id)}
                            className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-lg bg-white border border-burgundy/10 group-hover:border-burgundy/30 cursor-pointer"
                          >
                            <img
                              src={prod.images?.[0] || prod.mannequinImage || '/placeholder.png'}
                              alt={prod.name}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[9px] font-bold text-burgundy/50">
                              {item.tagLabel || prod.category}
                            </span>
                            <div
                              onClick={() => handleNavigateToProduct(prod._id)}
                              className="font-bold text-xs text-burgundy hover:underline truncate cursor-pointer"
                            >
                              {cleanProductName(prod.name)}
                            </div>
                            <span className="text-xs font-black text-burgundy block mt-0.5">
                              {prod.price} ج.م
                            </span>
                          </div>
                        </div>

                        {/* Variant pickers & Single item add */}
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                          {/* Size Selector */}
                          {prod.sizes && prod.sizes.length > 0 && (
                            <select
                              value={currentVar.size || prod.sizes[0]}
                              onChange={(e) => {
                                const newSize = e.target.value;
                                setSelectedVariants((prev) => ({
                                  ...prev,
                                  [index]: { ...prev[index], size: newSize }
                                }));
                              }}
                              className="rounded-lg border border-burgundy/15 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-burgundy focus:border-burgundy outline-none cursor-pointer"
                            >
                              {prod.sizes.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* Color Selector */}
                          {prod.colors && prod.colors.length > 0 && (
                            <select
                              value={currentVar.color || prod.colors[0]}
                              onChange={(e) => {
                                const newColor = e.target.value;
                                setSelectedVariants((prev) => ({
                                  ...prev,
                                  [index]: { ...prev[index], color: newColor }
                                }));
                              }}
                              className="rounded-lg border border-burgundy/15 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-burgundy focus:border-burgundy outline-none cursor-pointer"
                            >
                              {prod.colors.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* Add single piece button */}
                          <button
                            type="button"
                            onClick={() => handleAddSinglePiece(item, index)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition whitespace-nowrap cursor-pointer ${
                              isAddedThis
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'border-burgundy/20 text-burgundy hover:bg-burgundy hover:text-white'
                            }`}
                            title="إضافة هذه القطعة فقط إلى السلة"
                          >
                            {isAddedThis ? 'تمت ✓' : '+ القطعة'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Bundle Checkout Summary */}
          <div className="rounded-xl border border-burgundy/20 bg-gradient-to-br from-burgundy/5 via-amber-50/20 to-transparent p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[11px] text-burgundy/70 font-bold block">
                  إجمالي سعر الطقم بالكامل:
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-burgundy">
                    {bundleFinalPrice} ج.م
                  </span>
                  {discountPercent > 0 && (
                    <span className="text-xs text-burgundy/40 line-through">
                      {totalOriginalPrice} ج.م
                    </span>
                  )}
                </div>
              </div>

              {discountPercent > 0 && (
                <div className="text-right">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px]">
                    وفرّي {bundleSavings} ج.م ({discountPercent}% خصم)
                  </span>
                  <span className="block text-[9px] text-burgundy/60 mt-0.5">
                    عند طلب اللوك كاملاً
                  </span>
                </div>
              )}
            </div>

            {/* Add Bundle to Cart Button */}
            <button
              type="button"
              onClick={handleAddFullBundle}
              disabled={addedBundleSuccess}
              className={`w-full py-3 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
                addedBundleSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-burgundy text-white hover:bg-[#680017] shadow-burgundy/20 hover:shadow-lg'
              }`}
            >
              {addedBundleSuccess ? (
                <>
                  <span className="text-base">✓</span>
                  <span>تمت إضافة الطقم كاملاً إلى سلتكِ بنجاح!</span>
                </>
              ) : (
                <>
                  <span>أضيفي الإطلالة بالكامل للسلة {discountPercent > 0 ? `(وفرّي ${bundleSavings} ج.م)` : ''}</span>
                  <span>←</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
