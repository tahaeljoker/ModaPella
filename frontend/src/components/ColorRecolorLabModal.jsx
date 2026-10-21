import { useState, useRef, useEffect, useCallback } from 'react';
import { getColorHex } from '../utils/colorSwatches';

/**
 * ColorRecolorLabModal
 * Interactive Demo & Laboratory for digital fabric recoloring:
 * - Test with current product image or upload a custom mannequin photo
 * - Select from common store colors or custom hex
 * - Smart CSS blend & Canvas pixel-targeted replacement
 * - Split Before / After slider
 */
export default function ColorRecolorLabModal({ isOpen, onClose, initialImage = '', initialColor = 'بورجندي' }) {
  const [imageSrc, setImageSrc] = useState(initialImage || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80');
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [customHex, setCustomHex] = useState(getColorHex(initialColor));
  const [blendMode, setBlendMode] = useState('color'); // 'color' | 'multiply' | 'hue' | 'overlay'
  const [opacity, setOpacity] = useState(85); // 0 - 100
  const [sliderPos, setSliderPos] = useState(50);
  const [isComparing, setIsComparing] = useState(true);
  const [isTargetedMode, setIsTargetedMode] = useState(false);
  const [pickedSample, setPickedSample] = useState(null); // { r, g, b }
  const [tolerance, setTolerance] = useState(45); // 10 - 100
  const [isProcessingCanvas, setIsProcessingCanvas] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const sliderContainerRef = useRef(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  // Sync initial image
  useEffect(() => {
    if (initialImage) {
      setImageSrc(initialImage);
    }
  }, [initialImage]);

  // Handle color preset selection
  const handleSelectPreset = (colorName) => {
    setSelectedColor(colorName);
    const hex = getColorHex(colorName);
    setCustomHex(hex);
  };

  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  };

  // Process canvas for targeted selective color replacement
  const processTargetedRecolor = useCallback(() => {
    if (!isTargetedMode || !pickedSample || !canvasRef.current) return;
    setIsProcessingCanvas(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth || 600;
      canvas.height = img.naturalHeight || 800;
      ctx.drawImage(img, 0, 0);

      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const targetRgb = hexToRgb(customHex);
        const { r: sr, g: sg, b: sb } = pickedSample;
        const tolSq = tolerance * tolerance * 3;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Euclidean color distance from sampled fabric pixel
          const dr = r - sr;
          const dg = g - sg;
          const db = b - sb;
          const distSq = dr * dr + dg * dg + db * db;

          if (distSq < tolSq) {
            // Compute luminance of current pixel to preserve fabric folds & lighting
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const lumFactor = lum / 128; // 0 to 2

            // Blend toward target color proportional to luminance
            const blendRatio = (opacity / 100);
            data[i] = Math.min(255, (r * (1 - blendRatio)) + (targetRgb.r * lumFactor * blendRatio));
            data[i + 1] = Math.min(255, (g * (1 - blendRatio)) + (targetRgb.g * lumFactor * blendRatio));
            data[i + 2] = Math.min(255, (b * (1 - blendRatio)) + (targetRgb.b * lumFactor * blendRatio));
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (err) {
        console.warn('Canvas pixel manipulation restricted by CORS for external image, falling back to overlay blend.', err);
      } finally {
        setIsProcessingCanvas(false);
      }
    };
    img.src = imageSrc;
  }, [isTargetedMode, pickedSample, customHex, tolerance, opacity, imageSrc]);

  useEffect(() => {
    if (isTargetedMode && pickedSample) {
      processTargetedRecolor();
    }
  }, [isTargetedMode, pickedSample, customHex, tolerance, opacity, processTargetedRecolor]);

  // Handle click on canvas image to sample fabric
  const handleCanvasClick = (e) => {
    if (!isTargetedMode || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);

    const ctx = canvas.getContext('2d');
    try {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      setPickedSample({ r: pixel[0], g: pixel[1], b: pixel[2] });
    } catch (err) {
      console.warn('Sample error:', err);
    }
  };

  // Draggable slider handling
  const handleSliderMove = (clientX) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pos);
  };

  // Upload custom test photo (e.g. mannequin photo)
  const handleCustomUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setPickedSample(null);
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const popularColors = [
    { name: 'بورجندي', hex: '#7C0A12' },
    { name: 'كحلي', hex: '#0f1f3d' },
    { name: 'زيتي', hex: '#3f4f34' },
    { name: 'سماوي', hex: '#38bdf8' },
    { name: 'وردي / سيمون', hex: '#f43f5e' },
    { name: 'لافندر / موف', hex: '#7c3aed' },
    { name: 'بيج كافيه', hex: '#c29d7c' },
    { name: 'أصفر خردلي', hex: '#d97706' },
    { name: 'أخضر زمردي', hex: '#15803d' },
    { name: 'رمادي فحمي', hex: '#374151' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#FAF6F3] border border-burgundy/15 shadow-2xl flex flex-col text-burgundy">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-burgundy/10 bg-white/90 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-burgundy/10 text-lg shadow-inner">
              🎨
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-burgundy">
                  مختبر محاكي الألوان الرقمي (Live Color Recolor Demo)
                </h3>
                <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                  ديمو تجريبي
                </span>
              </div>
              <p className="text-[11px] text-burgundy/60">
                تجربة تغيير لون القماشة برمجياً من صورة واحدة بدون الحاجة لتصوير كل لون
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-burgundy/5 text-burgundy/70 hover:bg-burgundy/10 hover:text-burgundy font-bold text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column: Interactive Viewer */}
          <div className="space-y-3">
            <div
              ref={sliderContainerRef}
              className="relative w-full aspect-[4/5] sm:aspect-[3/4] rounded-2xl overflow-hidden bg-black/10 border-2 border-burgundy/15 shadow-inner select-none cursor-ew-resize group"
              onMouseDown={(e) => {
                setIsDraggingSlider(true);
                handleSliderMove(e.clientX);
              }}
              onMouseMove={(e) => {
                if (isDraggingSlider) handleSliderMove(e.clientX);
              }}
              onMouseUp={() => setIsDraggingSlider(false)}
              onMouseLeave={() => setIsDraggingSlider(false)}
              onTouchStart={(e) => {
                if (e.touches[0]) handleSliderMove(e.touches[0].clientX);
              }}
              onTouchMove={(e) => {
                if (e.touches[0]) handleSliderMove(e.touches[0].clientX);
              }}
            >
              {/* Underlying Base Image: Modified/Recolored Layer */}
              <div className="absolute inset-0 w-full h-full overflow-hidden">
                {!isTargetedMode ? (
                  /* Standard Mode: CSS Blend Mode Recolor */
                  <div className="relative w-full h-full">
                    <img
                      src={imageSrc}
                      alt="Original"
                      className="w-full h-full object-cover"
                    />
                    {/* Color Blend Overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none transition-all duration-200"
                      style={{
                        backgroundColor: customHex,
                        mixBlendMode: blendMode,
                        opacity: opacity / 100
                      }}
                    />
                    {/* Shadow / Luminance anchor for realism */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundColor: customHex,
                        mixBlendMode: 'multiply',
                        opacity: (opacity / 100) * 0.2
                      }}
                    />
                  </div>
                ) : (
                  /* Targeted Mode: Canvas Selective Recolor */
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="w-full h-full object-cover cursor-crosshair"
                  />
                )}
                {/* Badge for recolored side */}
                <div className="absolute top-3 left-3 bg-burgundy/85 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm z-10 flex items-center gap-1.5 backdrop-blur-xs">
                  <span className="h-2 w-2 rounded-full border border-white" style={{ backgroundColor: customHex }} />
                  <span>اللون الجديد بالكمبيوتر</span>
                </div>
              </div>

              {/* Overlaid Layer: Original unmodified image (Clipped by slider position) */}
              {isComparing && (
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none transition-none"
                  style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                  <img
                    src={imageSrc}
                    alt="Original Base"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 text-burgundy text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm z-10 backdrop-blur-xs">
                    الصورة الأصلية
                  </div>
                </div>
              )}

              {/* Slider Divider Bar */}
              {isComparing && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl z-20 pointer-events-none flex items-center justify-center -translate-x-1/2"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="w-8 h-8 rounded-full bg-burgundy text-white shadow-xl flex items-center justify-center border-2 border-white text-xs font-black">
                    ⇄
                  </div>
                </div>
              )}

              {/* Footer instruction */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] font-medium px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none z-10">
                {isComparing ? 'اسحب الخط للمقارنة بين الأصلي واللون المضاف' : 'معاينة كاملة للون الجديد'}
              </div>
            </div>

            {/* Quick Toggle Comparison Slider Button */}
            <div className="flex items-center justify-between gap-2 px-1">
              <button
                type="button"
                onClick={() => setIsComparing(prev => !prev)}
                className="text-xs font-bold text-burgundy/80 hover:text-burgundy bg-white px-3 py-1.5 rounded-xl border border-burgundy/15 transition shadow-xs"
              >
                {isComparing ? '👀 إيقاف السلايدر (عرض اللون بالكامل)' : '⇄ تشغيل شريط المقارنة قبل وبعد'}
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-burgundy bg-burgundy/10 hover:bg-burgundy/20 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
              >
                <span>📸</span>
                <span>جرب صورة مانيكان من جهازك</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Right Column: Controls & Color Palette */}
          <div className="space-y-4">
            {/* Color Palette Selector */}
            <div className="rounded-2xl border border-burgundy/15 bg-white p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-burgundy uppercase tracking-wider flex items-center gap-1.5">
                  <span>1. اختر اللون المطلوب للقطعة:</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded-full border border-black/20" style={{ backgroundColor: customHex }} />
                  <span className="text-xs font-bold text-burgundy">{selectedColor}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {popularColors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => handleSelectPreset(c.name)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition ${
                      selectedColor === c.name || customHex.toLowerCase() === c.hex.toLowerCase()
                        ? 'border-burgundy bg-burgundy/10 text-burgundy shadow-xs ring-1 ring-burgundy'
                        : 'border-burgundy/10 bg-[#FAF7F4] text-burgundy/70 hover:bg-white hover:text-burgundy'
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>

              {/* Custom Color Input */}
              <div className="pt-1 flex items-center gap-3">
                <label className="text-[11px] font-bold text-burgundy/70">أو لون مخصص دقيق:</label>
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => {
                    setCustomHex(e.target.value);
                    setSelectedColor('مخصص');
                  }}
                  className="h-8 w-12 rounded-lg cursor-pointer border border-burgundy/20 bg-transparent"
                />
                <span className="text-xs font-mono font-bold text-burgundy/80">{customHex}</span>
              </div>
            </div>

            {/* Recolor Intensity & Blend Algorithm */}
            <div className="rounded-2xl border border-burgundy/15 bg-white p-4 space-y-3 shadow-xs">
              <label className="text-xs font-extrabold text-burgundy uppercase tracking-wider block">
                2. ضبط درجة تشبع وصبغة القماش:
              </label>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-burgundy">
                  <span>كثافة اللون والصبغة:</span>
                  <span>{opacity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-burgundy cursor-pointer"
                />
              </div>

              {/* Blend Algorithm Tabs */}
              <div className="pt-1">
                <span className="block text-[11px] font-bold text-burgundy/70 mb-1.5">نوع الفلتر البرمجي:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'color', label: 'صبغة كاملة (Color)' },
                    { id: 'multiply', label: 'تعتيق داكن (Multiply)' },
                    { id: 'hue', label: 'تدريج لوني (Hue)' },
                    { id: 'overlay', label: 'إضاءة (Overlay)' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setBlendMode(mode.id)}
                      className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition text-center border ${
                        blendMode === mode.id
                          ? 'bg-burgundy text-white border-burgundy shadow-xs'
                          : 'bg-[#FAF7F4] text-burgundy/70 border-burgundy/10 hover:bg-white'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Smart Evaluation Notes */}
            <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 space-y-2 text-amber-900 shadow-xs">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <span>💡</span>
                <span>تقييم النتيجة وتجربة الزبونة:</span>
              </div>
              <ul className="text-[11px] leading-5 space-y-1 text-amber-950/80 list-disc list-inside">
                <li>
                  <strong>الألوان الزاهية (أزرق، أحمر، أخضر، سيمون):</strong> بتاخد صبغة طبيعية مع لمعة القماش وكرمشاته بدون أي تشويه.
                </li>
                <li>
                  <strong>الخلفية والمانيكان:</strong> الفلتر البسيط بيلون الصورة كلها؛ عشان كدة لو الخلفية بيضاء أو معزولة بتطلع ممتازة جداً.
                </li>
                <li>
                  <strong>الألوان الصعبة (الأسود والأبيض):</strong> الأسود مفيهوش ألوان تانية جواه، عشان كدة بيتأثر بنسبة أقل من الألوان التانية.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 flex items-center justify-between border-t border-burgundy/10 bg-white/95 px-5 py-3 backdrop-blur-md">
          <p className="text-xs text-burgundy/60">
            جرب رفع صورة المانيكان اللي صورتها من المحل واختبر الألوان عليها مباشرة!
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs bg-burgundy hover:bg-[#650018] text-white px-5 py-2 rounded-xl font-bold transition shadow-sm"
          >
            إغلاق المختبر
          </button>
        </div>
      </div>
    </div>
  );
}
