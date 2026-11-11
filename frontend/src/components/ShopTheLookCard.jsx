import { useState, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CartContext from '../context/CartContext';
import { cleanProductName } from '../utils/discount';
import { saveScrollPosition } from './ScrollRestoration';

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

  // Currently spotlighted / inspected piece index
  const [activePieceIndex, setActivePieceIndex] = useState(0);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [addedBundleSuccess, setAddedBundleSuccess] = useState(false);
  const [addedPieceIndex, setAddedPieceIndex] = useState(null);
  const videoRef = useRef(null);

  if (!look || !look.items || look.items.length === 0) return null;

  // Active item reference
  const validItems = look.items.filter((item) => item.product);
  const currentActiveItem = look.items[activePieceIndex] || look.items[0];
  const currentActiveProd = currentActiveItem?.product;

  // Record scroll position before navigating to product details
  const handleNavigateToProduct = (productId) => {
    try {
      saveScrollPosition(window.location.pathname, window.location.search, window.scrollY);
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
    <article className="overflow-hidden rounded-3xl border border-burgundy/15 bg-white shadow-soft transition-all duration-300 hover:shadow-xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
        
        {/* ── Left Column: Media Stage with Interactive Hotspots ── */}
        <div className="relative lg:col-span-6 bg-stone-900 overflow-hidden flex items-center justify-center min-h-[380px] sm:min-h-[480px] lg:min-h-[580px] max-h-[660px] group select-none">
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
                className="w-full h-full object-cover max-h-[660px]"
              />

              {/* Video Floating Controls */}
              <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md transition shadow cursor-pointer text-xs sm:text-sm border border-white/20"
                  title={isVideoMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                  aria-label={isVideoMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                >
                  {isVideoMuted ? (
                    <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.208-1.605.572-2.296A2.25 2.25 0 014.51 8.25h4.24z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.208-1.605.572-2.296A2.25 2.25 0 014.51 8.25h4.24z"/>
                    </svg>
                  )}
                </button>
                <span className="px-3 py-1 rounded-full bg-black/60 text-[10px] sm:text-[11px] font-bold text-amber-300 backdrop-blur-md flex items-center gap-1.5 border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>فيديو حي</span>
                </span>
              </div>

              {!isVideoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 pointer-events-none">
                  <div className="h-16 w-16 rounded-full bg-white/90 text-burgundy flex items-center justify-center shadow-2xl text-2xl font-bold">
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
                className="w-full h-full object-cover max-h-[660px]"
                loading="lazy"
              />
              <div className="absolute top-3.5 right-3.5 z-20">
                <span className="px-3 py-1 rounded-full bg-black/60 text-[10px] sm:text-[11px] font-bold text-amber-200 backdrop-blur-md border border-white/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>جلسة تصوير حية</span>
                </span>
              </div>
            </div>
          )}

          {/* Guide Hint */}
          <div className="absolute top-3.5 left-3.5 z-20 bg-white/90 backdrop-blur-md text-burgundy text-[10px] font-bold px-3 py-1 rounded-full shadow-xs border border-burgundy/10 hidden sm:flex items-center gap-1.5">
            <span>اضغطي على الدوائر المتوهجة لاكتشاف القطع ✦</span>
          </div>

          {/* ── Interactive Hotspot Pins (Concept 1 Signature) ── */}
          {look.items.map((item, index) => {
            const prod = item.product;
            if (!prod) return null;
            const posX = Math.max(10, Math.min(90, item.positionX ?? (35 + (index % 2) * 30)));
            const posY = Math.max(12, Math.min(88, item.positionY ?? (28 + index * 26)));
            const isHovered = activeTooltip === index;
            const isActive = activePieceIndex === index;

            return (
              <div
                key={index}
                style={{ top: `${posY}%`, left: `${posX}%` }}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                onMouseEnter={() => {
                  setActiveTooltip(index);
                  setActivePieceIndex(index);
                }}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                {/* Hotspot Glowing Trigger */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePieceIndex(index);
                    setActiveTooltip(isHovered ? null : index);
                  }}
                  className={`relative group p-1.5 focus:outline-none cursor-pointer transition-transform ${
                    isActive ? 'scale-115' : 'hover:scale-110'
                  }`}
                  aria-label={`تحديد ${prod.name}`}
                >
                  <span className="absolute inset-0 rounded-full bg-amber-400/50 animate-ping" />
                  <span
                    className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs font-black shadow-2xl transition-all duration-300 border-2 ${
                      isActive
                        ? 'bg-amber-400 text-burgundy border-white shadow-amber-400/50 scale-105'
                        : 'bg-white text-burgundy border-amber-400/80 hover:bg-amber-50'
                    }`}
                  >
                    <span>{index + 1}</span>
                  </span>
                </button>

                {/* Floating Tooltip Card */}
                {isHovered && (
                  <div
                    className="absolute z-30 bottom-full mb-3 left-1/2 -translate-x-1/2 w-52 sm:w-60 rounded-2xl bg-white/95 p-3 shadow-2xl border border-burgundy/15 text-burgundy text-right pointer-events-auto backdrop-blur-md animate-fadeIn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={prod.images?.[0] || prod.mannequinImage || '/placeholder.png'}
                        alt={prod.name}
                        className="h-12 w-12 rounded-xl object-cover border border-burgundy/10 shrink-0 bg-[#FAF7F5]"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block text-[9px] text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded font-bold w-fit mb-0.5">
                          {item.tagLabel || prod.category || 'قطعة من اللوك'}
                        </span>
                        <h4
                          onClick={() => handleNavigateToProduct(prod._id)}
                          className="text-xs font-bold truncate hover:underline cursor-pointer"
                        >
                          {cleanProductName(prod.name)}
                        </h4>
                        <div className="mt-1 flex items-center justify-between text-xs font-black text-burgundy">
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

          {/* Bottom Gradient & Look Headline */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 sm:p-6 z-10 flex items-end justify-between text-white pointer-events-none">
            <div className="space-y-1">
              <span className="inline-block px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-xs font-bold text-amber-300 border border-white/15">
                {look.category || 'إطلالة كلاسيك'}
              </span>
              <h3 className="text-lg sm:text-2xl font-black">{look.title}</h3>
            </div>
            {discountPercent > 0 && (
              <span className="px-3 py-1 rounded-xl bg-emerald-500 text-white font-black text-xs shadow-lg">
                وفرّي {discountPercent}% للطقم
              </span>
            )}
          </div>
        </div>

        {/* ── Right Column: Editorial Details & Spotlight Selector ── */}
        <div className="lg:col-span-6 p-4 sm:p-6 lg:p-8 flex flex-col justify-between space-y-5 bg-gradient-to-b from-white via-[#FCFBF9] to-white">
          <div className="space-y-4">
            
            {/* Editorial Atelier Title */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-burgundy/60">
                  MODAPELLA ATELIER ✦ إطلالة منسقة بالكامل
                </span>
                <span className="text-xs font-black px-3 py-1 rounded-full bg-burgundy/10 text-burgundy">
                  {look.items.length} قطع متناسقة
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-burgundy mt-1.5 leading-snug">
                {look.title}
              </h2>
              {look.description && (
                <p className="text-xs sm:text-sm text-burgundy/75 mt-1 leading-relaxed">
                  {look.description}
                </p>
              )}
            </div>

            {/* ── Dynamic Spotlight Card (Active Selected Hotspot Piece) ── */}
            {currentActiveProd && (
              <div className="rounded-2xl border-2 border-amber-400/50 bg-[#FAF7F5] p-3.5 sm:p-4 shadow-sm transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span>✦</span>
                    <span>القطعة المحددة من الصورة (رقم {activePieceIndex + 1})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNavigateToProduct(currentActiveProd._id)}
                    className="text-xs font-bold text-burgundy/70 hover:text-burgundy underline cursor-pointer"
                  >
                    صفحة المنتج ←
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={currentActiveProd.images?.[0] || currentActiveProd.mannequinImage || '/placeholder.png'}
                    alt={currentActiveProd.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-burgundy/10 shrink-0 bg-white"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold text-burgundy/50">
                      {currentActiveItem.tagLabel || currentActiveProd.category}
                    </span>
                    <h4 className="text-xs sm:text-sm font-extrabold text-burgundy truncate mt-0.5">
                      {cleanProductName(currentActiveProd.name)}
                    </h4>
                    <span className="text-sm sm:text-base font-black text-burgundy block mt-0.5">
                      {currentActiveProd.price} ج.م
                    </span>

                    {/* Variant Selectors for Active Piece */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {currentActiveProd.sizes && currentActiveProd.sizes.length > 0 && (
                        <select
                          value={selectedVariants[activePieceIndex]?.size || currentActiveProd.sizes[0]}
                          onChange={(e) => {
                            const newSize = e.target.value;
                            setSelectedVariants((prev) => ({
                              ...prev,
                              [activePieceIndex]: { ...prev[activePieceIndex], size: newSize }
                            }));
                          }}
                          className="rounded-lg border border-burgundy/20 bg-white px-2 py-1 text-[11px] font-bold text-burgundy focus:border-burgundy outline-none cursor-pointer"
                        >
                          {currentActiveProd.sizes.map((s) => (
                            <option key={s} value={s}>
                              مقاس: {s}
                            </option>
                          ))}
                        </select>
                      )}

                      {currentActiveProd.colors && currentActiveProd.colors.length > 0 && (
                        <select
                          value={selectedVariants[activePieceIndex]?.color || currentActiveProd.colors[0]}
                          onChange={(e) => {
                            const newColor = e.target.value;
                            setSelectedVariants((prev) => ({
                              ...prev,
                              [activePieceIndex]: { ...prev[activePieceIndex], color: newColor }
                            }));
                          }}
                          className="rounded-lg border border-burgundy/20 bg-white px-2 py-1 text-[11px] font-bold text-burgundy focus:border-burgundy outline-none cursor-pointer"
                        >
                          {currentActiveProd.colors.map((c) => (
                            <option key={c} value={c}>
                              لون: {c}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAddSinglePiece(currentActiveItem, activePieceIndex)}
                        className={`mr-auto px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          addedPieceIndex === activePieceIndex
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-burgundy text-white hover:bg-[#680017] border-burgundy'
                        }`}
                      >
                        {addedPieceIndex === activePieceIndex ? 'تمت الإضافة ✓' : 'شراء هذه القطعة'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Included Pieces Track (Clickable to switch Spotlight) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-burgundy/70">كل قطع الإطلالة (اضغطي للمعاينة):</h4>
                <span className="text-[10px] text-burgundy/50 font-semibold">{look.items.length} قطع</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {look.items.map((item, index) => {
                  const prod = item.product;
                  if (!prod) return null;
                  const isActive = activePieceIndex === index;

                  return (
                    <div
                      key={index}
                      onClick={() => setActivePieceIndex(index)}
                      className={`rounded-xl p-2 sm:p-2.5 border transition-all cursor-pointer flex items-center gap-2.5 ${
                        isActive
                          ? 'border-burgundy bg-white shadow-sm ring-1 ring-burgundy/20'
                          : 'border-burgundy/10 bg-[#FAF7F5] hover:bg-white hover:border-burgundy/25'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                          isActive ? 'bg-burgundy text-white' : 'bg-burgundy/10 text-burgundy'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <img
                        src={prod.images?.[0] || prod.mannequinImage || '/placeholder.png'}
                        alt={prod.name}
                        className="h-9 w-9 rounded-lg object-cover border border-burgundy/10 shrink-0 bg-white"
                      />
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-burgundy truncate">{cleanProductName(prod.name)}</h5>
                        <span className="text-[11px] font-black text-burgundy block">{prod.price} ج.م</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Full Bundle Offer Card with Savings Highlight ── */}
          <div className="rounded-2xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-50 via-white to-amber-50 p-4 sm:p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                {discountPercent > 0 && (
                  <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[11px] shadow-xs">
                    وفرّي {bundleSavings} ج.م ({discountPercent}% خصم فوري)
                  </span>
                )}
                <h4 className="text-sm font-black text-burgundy mt-1">
                  اطلبي الطقم كاملاً بنقرة واحدة
                </h4>
              </div>

              <div className="text-left">
                {discountPercent > 0 && (
                  <span className="text-xs text-red-500 line-through block">
                    {totalOriginalPrice} ج.م
                  </span>
                )}
                <span className="text-2xl font-black text-burgundy">
                  {bundleFinalPrice} ج.م
                </span>
              </div>
            </div>

            {/* Add Bundle to Cart Button */}
            <button
              type="button"
              onClick={handleAddFullBundle}
              disabled={addedBundleSuccess}
              className={`w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm transition-all duration-300 shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
                addedBundleSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-burgundy text-white hover:bg-[#680017] shadow-burgundy/25 hover:shadow-lg'
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
    </article>
  );
}
