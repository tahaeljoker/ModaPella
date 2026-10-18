import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * MannequinComparisonSlider
 * Interactive component displaying a product on a store mannequin with:
 * 1. Split-screen interactive draggable slider (Before/After comparison).
 * 2. Instant Toggle buttons (Flat ⟷ Mannequin ⟷ Slider).
 * 3. 3D flip & smooth crossfade animations.
 */
export default function MannequinComparisonSlider({
  flatImage,
  mannequinImage,
  productName = 'المنتج',
  className = '',
  aspectRatio = 'aspect-[4/3] sm:aspect-[3/2]',
  onImageClick = null
}) {
  const [mode, setMode] = useState('toggle'); // 'toggle' | 'slider'
  const [activeView, setActiveView] = useState('flat'); // 'flat' | 'mannequin'
  const [sliderPos, setSliderPos] = useState(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // If no mannequin image is provided, fallback cleanly to standard image
  const hasMannequin = Boolean(mannequinImage && mannequinImage.trim());
  const effectiveMannequin = mannequinImage || flatImage;

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percent);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || e.touches.length === 0) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  return (
    <div className={`space-y-3 ${className}`} dir="rtl">
      {/* Visual Canvas Area */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-2xl sm:rounded-[2rem] bg-beige/10 ${aspectRatio} select-none border border-burgundy/10 shadow-inner group`}
      >
        {mode === 'slider' && hasMannequin ? (
          /* ─── Mode A: Interactive Split-Screen Slider ─── */
          <div
            className="relative w-full h-full cursor-ew-resize overflow-hidden"
            onMouseDown={(e) => {
              setIsDragging(true);
              handleMove(e.clientX);
            }}
            onTouchStart={(e) => {
              setIsDragging(true);
              if (e.touches.length > 0) handleMove(e.touches[0].clientX);
            }}
          >
            {/* Base Background: Mannequin Image */}
            <img
              src={effectiveMannequin}
              alt={`${productName} على المانيكان بالمحل`}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
            <div className="absolute top-3 left-3 bg-burgundy/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs pointer-events-none shadow-sm flex items-center gap-1 z-10">
              <span>👤</span>
              <span>على المانيكان بالمحل</span>
            </div>

            {/* Overlaid Layer: Flat Product (clipped to slider position) */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none transition-none"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              <img
                src={flatImage}
                alt={`${productName} فلات`}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 bg-white/90 text-burgundy text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs shadow-sm flex items-center gap-1 z-10">
                <span>👕</span>
                <span>القطعة مسطحة</span>
              </div>
            </div>

            {/* The Draggable Divider Bar */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl z-20 pointer-events-none flex items-center justify-center -translate-x-1/2"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-burgundy text-white shadow-xl flex items-center justify-center border-2 border-white text-xs font-black transition-transform duration-150 scale-100 group-hover:scale-110">
                ⇄
              </div>
            </div>

            {/* Helper Hint */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[10px] font-medium px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none z-10">
              اسحب المؤشر يميناً ويساراً للمقارنة
            </div>
          </div>
        ) : (
          /* ─── Mode B: Animated Toggle Crossfade ─── */
          <div
            onClick={onImageClick}
            className="w-full h-full relative cursor-pointer"
          >
            {/* Flat Image */}
            <img
              src={flatImage}
              alt={`${productName} فلات`}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out ${
                activeView === 'flat'
                  ? 'opacity-100 scale-100 rotate-0'
                  : 'opacity-0 scale-95 pointer-events-none'
              }`}
            />

            {/* Mannequin Image with subtle zoom/light effect */}
            {hasMannequin && (
              <img
                src={effectiveMannequin}
                alt={`${productName} على المانيكان`}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out ${
                  activeView === 'mannequin'
                    ? 'opacity-100 scale-100 rotate-0'
                    : 'opacity-0 scale-105 pointer-events-none'
                }`}
              />
            )}

            {/* In-Store Authenticity Badge */}
            <div className="absolute top-3 right-3 bg-white/90 text-burgundy text-[10px] font-bold px-3 py-1 rounded-full shadow-sm backdrop-blur-sm flex items-center gap-1.5 z-10">
              <span>{activeView === 'mannequin' ? '👤' : '👕'}</span>
              <span>{activeView === 'mannequin' ? 'معروض على مانيكان المحل' : 'عرض مسطح'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar: Mode & View Buttons */}
      {hasMannequin && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#F7F0EC]/80 rounded-2xl border border-burgundy/10 backdrop-blur-xs">
          {/* Quick Toggle Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setMode('toggle');
                setActiveView('flat');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                mode === 'toggle' && activeView === 'flat'
                  ? 'bg-burgundy text-white shadow-sm'
                  : 'bg-white/80 text-burgundy/70 hover:bg-white hover:text-burgundy'
              }`}
            >
              <span>👕</span>
              <span>مسطح</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('toggle');
                setActiveView('mannequin');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                mode === 'toggle' && activeView === 'mannequin'
                  ? 'bg-burgundy text-white shadow-sm animate-pulse-subtle'
                  : 'bg-white/80 text-burgundy/70 hover:bg-white hover:text-burgundy'
              }`}
            >
              <span>👤</span>
              <span>على المانيكان</span>
            </button>
          </div>

          {/* Interactive Split-Screen Mode Button */}
          <button
            type="button"
            onClick={() => {
              setMode(prev => (prev === 'slider' ? 'toggle' : 'slider'));
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
              mode === 'slider'
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-300'
                : 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-900 border border-amber-300 hover:from-amber-200'
            }`}
          >
            <span>✨</span>
            <span>{mode === 'slider' ? 'الرجوع للعرض العادي' : 'مقارنة حية (سلايدر)'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
