import { useState, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import CartContext from '../context/CartContext';
import { cleanProductName } from '../utils/discount';

export default function ShopTheLookCard({ look, onProductClick }) {
  const { addItem } = useContext(CartContext);
  const [selectedVariants, setSelectedVariants] = useState(() => {
    const initial = {};
    (look.items || []).forEach((item, index) => {
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

    // Distribute discount proportionally
    look.items.forEach((item, index) => {
      const prod = item.product;
      if (!prod) return;

      const currentVar = selectedVariants[index] || {};
      const size = currentVar.size || 'Standard';
      const color = currentVar.color || 'Default';

      const itemShare = totalOriginalPrice > 0 ? (prod.price / totalOriginalPrice) : (1 / count);
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
    <div className="overflow-hidden rounded-3xl border border-burgundy/15 bg-white shadow-soft transition-all duration-300 hover:shadow-xl">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left / Top: Model Visual Media (Video or Image) */}
        <div className="relative lg:col-span-6 bg-stone-900 overflow-hidden flex items-center justify-center min-h-[380px] sm:min-h-[460px] lg:min-h-[540px]">
          {look.mediaType === 'video' ? (
            <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] lg:min-h-[540px] flex items-center justify-center cursor-pointer" onClick={handleTogglePlay}>
              <video
                ref={videoRef}
                src={look.mediaUrl}
                poster={look.videoThumbnail || undefined}
                autoPlay
                loop
                muted={isVideoMuted}
                playsInline
                className="w-full h-full object-cover max-h-[640px]"
              />

              {/* Video Controls Overlay */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="p-2.5 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-md transition shadow"
                  title={isVideoMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                >
                  {isVideoMuted ? '🔇' : '🔊'}
                </button>
                <span className="px-3 py-1 rounded-full bg-black/50 text-[11px] font-bold text-white backdrop-blur-md">
                  فيديو الموديل 🎥
                </span>
              </div>

              {!isVideoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10 pointer-events-none">
                  <div className="h-16 w-16 rounded-full bg-white/90 text-burgundy flex items-center justify-center shadow-xl text-2xl font-bold">
                    ▶
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] lg:min-h-[540px]">
              <img
                src={look.mediaUrl}
                alt={look.title}
                className="w-full h-full object-cover max-h-[640px]"
                loading="lazy"
              />
              <div className="absolute top-4 right-4 z-20">
                <span className="px-3 py-1 rounded-full bg-black/50 text-[11px] font-bold text-white backdrop-blur-md">
                  صورة الموديل 📸
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
                  className="relative group p-2 focus:outline-none"
                  aria-label={`عرض ${prod.name}`}
                >
                  <span className="absolute inset-0 rounded-full bg-white/40 animate-ping" />
                  <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white text-burgundy shadow-xl font-black text-xs border-2 border-burgundy/20 hover:scale-110 transition-transform">
                    {index + 1}
                  </span>
                </button>

                {/* Floating Tooltip Card */}
                {isHovered && (
                  <div
                    className="absolute z-30 bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 sm:w-56 rounded-2xl bg-white p-3 shadow-2xl border border-burgundy/15 text-burgundy text-right pointer-events-auto animate-in fade-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={prod.images?.[0] || prod.mannequinImage || '/placeholder.png'}
                        alt={prod.name}
                        className="h-12 w-12 rounded-xl object-cover border border-burgundy/10 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block text-[10px] text-burgundy/60 font-semibold truncate">
                          {item.tagLabel || prod.category || 'قطعة من الطقم'}
                        </span>
                        <h4 className="text-xs font-bold truncate leading-tight">
                          {cleanProductName(prod.name)}
                        </h4>
                        <div className="mt-1 flex items-center gap-1.5 font-black text-xs text-burgundy">
                          <span>{prod.price} ج.م</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Bottom Overlay Gradient & Category Tag */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 sm:p-6 z-10 flex items-end justify-between text-white pointer-events-none">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-amber-300 mb-1 border border-white/10">
                {look.category || 'إطلالة عصرية'}
              </span>
              <h3 className="text-lg sm:text-xl font-black">{look.title}</h3>
            </div>
            {discountPercent > 0 && (
              <span className="px-3 py-1.5 rounded-2xl bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-md">
                خصم {discountPercent}% للطقم كامل
              </span>
            )}
          </div>
        </div>

        {/* Right / Bottom: Outfit Details & Order Breakdown */}
        <div className="lg:col-span-6 p-5 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-extrabold uppercase tracking-widest text-burgundy/60">
                  Shop The Look ✦ تسوقي الإطلالة
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-burgundy/10 text-burgundy">
                  {look.items.length} قطع متناسقة
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-burgundy mt-1">
                {look.title}
              </h2>
              {look.description && (
                <p className="text-xs sm:text-sm text-burgundy/70 mt-1 leading-relaxed">
                  {look.description}
                </p>
              )}
            </div>

            {/* Included Pieces List */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-burgundy/60">القطع المكونة لهذا الطقم:</h4>
              <div className="space-y-2.5">
                {look.items.map((item, index) => {
                  const prod = item.product;
                  if (!prod) return null;
                  const currentVar = selectedVariants[index] || {};
                  const isAddedThis = addedPieceIndex === index;

                  return (
                    <div
                      key={index}
                      className="group relative rounded-2xl border border-burgundy/10 bg-[#FAF7F5] p-3 sm:p-3.5 transition-all hover:border-burgundy/30 hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Number & Thumbnail */}
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-burgundy/10 text-[11px] font-black text-burgundy">
                            {index + 1}
                          </span>
                          <Link
                            to={`/product/${prod._id}`}
                            className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 overflow-hidden rounded-xl bg-white border border-burgundy/10 group-hover:border-burgundy/30"
                          >
                            <img
                              src={prod.images?.[0] || prod.mannequinImage || '/placeholder.png'}
                              alt={prod.name}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          </Link>
                          <div className="min-w-0">
                            <span className="block text-[10px] font-bold text-burgundy/50">
                              {item.tagLabel || prod.category}
                            </span>
                            <Link
                              to={`/product/${prod._id}`}
                              className="font-bold text-xs sm:text-sm text-burgundy hover:underline truncate block"
                            >
                              {cleanProductName(prod.name)}
                            </Link>
                            <span className="text-xs font-extrabold text-burgundy block mt-0.5">
                              {prod.price} ج.م
                            </span>
                          </div>
                        </div>

                        {/* Variant pickers & Single item add */}
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
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
                              className="rounded-lg border border-burgundy/20 bg-white px-2 py-1 text-[11px] font-semibold text-burgundy focus:border-burgundy outline-none cursor-pointer"
                            >
                              {prod.sizes.map((s) => (
                                <option key={s} value={s}>
                                  مقاس: {s}
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
                              className="rounded-lg border border-burgundy/20 bg-white px-2 py-1 text-[11px] font-semibold text-burgundy focus:border-burgundy outline-none cursor-pointer"
                            >
                              {prod.colors.map((c) => (
                                <option key={c} value={c}>
                                  لون: {c}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* Add single piece button */}
                          <button
                            type="button"
                            onClick={() => handleAddSinglePiece(item, index)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition whitespace-nowrap ${
                              isAddedThis
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'border-burgundy/20 text-burgundy hover:bg-burgundy hover:text-white'
                            }`}
                            title="إضافة هذه القطعة فقط إلى السلة"
                          >
                            {isAddedThis ? 'تمت الإضافة ✓' : '+ القطعة فقط'}
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
          <div className="rounded-2xl border-2 border-burgundy/20 bg-gradient-to-br from-burgundy/5 via-beige/10 to-transparent p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-burgundy/70 font-bold block">
                  إجمالي سعر الطقم كاملاً:
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-burgundy">
                    {bundleFinalPrice} ج.م
                  </span>
                  {discountPercent > 0 && (
                    <span className="text-xs sm:text-sm text-burgundy/50 line-through">
                      {totalOriginalPrice} ج.م
                    </span>
                  )}
                </div>
              </div>

              {discountPercent > 0 && (
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                    وفّري {bundleSavings} ج.م ({discountPercent}% خصم)
                  </span>
                  <span className="block text-[10px] text-burgundy/60 mt-0.5">
                    عند شراء الطقم كاملاً
                  </span>
                </div>
              )}
            </div>

            {/* Add Bundle to Cart Button */}
            <button
              type="button"
              onClick={handleAddFullBundle}
              disabled={addedBundleSuccess}
              className={`w-full py-3.5 sm:py-4 rounded-2xl font-black text-sm sm:text-base transition-all duration-300 shadow-md active:scale-98 flex items-center justify-center gap-2 ${
                addedBundleSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-burgundy text-white hover:bg-[#680017] shadow-burgundy/20 hover:shadow-lg'
              }`}
            >
              {addedBundleSuccess ? (
                <>
                  <span className="text-lg">✓</span>
                  <span>تمت إضافة الطقم كاملاً إلى سلتكِ بنجاح!</span>
                </>
              ) : (
                <>
                  <span>✨</span>
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

