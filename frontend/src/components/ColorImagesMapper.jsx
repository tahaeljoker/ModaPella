import { useState, useRef } from 'react';
import api from '../services/api';
import { getColorHex } from '../utils/colorSwatches';

/**
 * ColorImagesMapper
 * Allows the admin to assign a real garment photo for each defined product color.
 */
export default function ColorImagesMapper({
  colors = [],
  colorImages = [],
  productImages = [],
  onChange
}) {
  const [uploadingColor, setUploadingColor] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const activeColorTargetRef = useRef(null);

  const cleanColors = Array.isArray(colors)
    ? colors.map(c => String(c).trim()).filter(Boolean)
    : [];

  const safeColorImages = Array.isArray(colorImages) ? colorImages : [];

  const getColorImage = (colorName) => {
    const found = safeColorImages.find(
      ci => ci.color && ci.color.trim().toLowerCase() === colorName.trim().toLowerCase()
    );
    return found ? found.image : '';
  };

  const handleSetColorImage = (colorName, imageUrl) => {
    const updated = safeColorImages.filter(
      ci => ci.color && ci.color.trim().toLowerCase() !== colorName.trim().toLowerCase()
    );
    if (imageUrl) {
      updated.push({ color: colorName, image: imageUrl });
    }
    onChange(updated);
  };

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    const targetColor = activeColorTargetRef.current;
    if (!file || !targetColor) return;

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح');
      return;
    }

    setError('');
    setUploadingColor(targetColor);

    try {
      const base64 = await readFileAsBase64(file);
      const res = await api.post('/upload', {
        image: base64,
        name: `color_${targetColor}_${Date.now()}_${file.name}`
      });

      if (res.data?.url) {
        handleSetColorImage(targetColor, res.data.url);
      }
    } catch (err) {
      console.error('Failed to upload color photo:', err);
      setError('تعذر رفع صورة اللون');
    } finally {
      setUploadingColor(null);
      activeColorTargetRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerUploadForColor = (colorName) => {
    activeColorTargetRef.current = colorName;
    fileInputRef.current?.click();
  };

  if (cleanColors.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-burgundy/20 bg-burgundy/3 p-4 text-center text-xs text-burgundy/60">
        اكتب أسماء الألوان أعلاه (مثال: أحمر، أخضر، بورجندي) لتتمكن من تخصيص صورة لكل لون.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-burgundy/15 bg-white p-4 sm:p-5 space-y-4 shadow-xs" dir="rtl">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-burgundy/10 pb-3">
        <div>
          <h4 className="text-xs sm:text-sm font-extrabold text-burgundy flex items-center gap-2">
            <span>🎨</span>
            <span>ربط صور الألوان ({cleanColors.length} ألوان محددة للمنتج):</span>
          </h4>
          <p className="text-[11px] text-burgundy/60 mt-0.5">
            ارفع صورة حقيقية لكل لون ليتم تبديل صورة المنتج للزبائن تلقائياً عند النقر على دائرة اللون
          </p>
        </div>

        {error && (
          <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
            {error}
          </span>
        )}
      </div>

      {/* Grid of defined colors */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {cleanColors.map((colorName) => {
          const assignedImage = getColorImage(colorName);
          const isCurrentUploading = uploadingColor === colorName;
          const hex = getColorHex(colorName);

          return (
            <div
              key={colorName}
              className={`rounded-xl border p-3 flex flex-col justify-between gap-3 transition ${
                assignedImage
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : 'border-burgundy/15 bg-[#FAF7F4]'
              }`}
            >
              {/* Color Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border border-black/20 shadow-xs shrink-0"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-xs font-bold text-burgundy">{colorName}</span>
                </div>

                {assignedImage ? (
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    ✓ تم ربط الصورة
                  </span>
                ) : (
                  <span className="text-[10px] text-burgundy/50 font-medium">
                    بدون صورة خاصة
                  </span>
                )}
              </div>

              {/* Image Preview / Upload Box */}
              {assignedImage ? (
                <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-burgundy/10 bg-white group">
                  <img
                    src={assignedImage}
                    alt={colorName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => triggerUploadForColor(colorName)}
                      className="text-[11px] bg-white text-burgundy px-2.5 py-1 rounded-lg font-bold shadow-xs hover:bg-beige"
                    >
                      تغيير
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetColorImage(colorName, '')}
                      className="text-[11px] bg-red-600 text-white px-2 py-1 rounded-lg font-bold shadow-xs hover:bg-red-700"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => triggerUploadForColor(colorName)}
                  disabled={isCurrentUploading}
                  className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-burgundy/20 hover:border-burgundy/40 hover:bg-white bg-white/50 flex flex-col items-center justify-center gap-1.5 text-burgundy font-bold text-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isCurrentUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-burgundy/30 border-t-burgundy rounded-full animate-spin" />
                      <span className="text-[10px]">جاري الرفع...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">📸</span>
                      <span className="text-[11px]">رفع صورة لون {colorName}</span>
                    </>
                  )}
                </button>
              )}

              {/* Quick Pick from already uploaded product images */}
              {!assignedImage && Array.isArray(productImages) && productImages.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-burgundy/10">
                  <span className="text-[10px] text-burgundy/60 block font-medium">أو اختر من صور المعرض:</span>
                  <div className="flex gap-1 overflow-x-auto py-0.5">
                    {productImages.slice(0, 5).map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSetColorImage(colorName, imgUrl)}
                        className="w-8 h-8 rounded border border-burgundy/20 overflow-hidden shrink-0 hover:scale-105 transition"
                        title="استخدام هذه الصورة لهذا اللون"
                      >
                        <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
