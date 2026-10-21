import { useState, useRef } from 'react';
import api from '../services/api';

/**
 * MannequinImageUploader
 * Component dedicated to uploading and managing the in-store mannequin photo for a product.
 */
export default function MannequinImageUploader({ value = '', onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const fileInputRef = useRef(null);

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
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً، الحد الأقصى 10 ميجابايت');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const base64 = await readFileAsBase64(file);
      const res = await api.post('/upload', {
        image: base64,
        name: `mannequin_${Date.now()}_${file.name}`
      });

      if (res.data?.url) {
        onChange(res.data.url);
      } else {
        setError('تعذر استلام رابط الصورة من السيرفر');
      }
    } catch (err) {
      console.error('Failed to upload mannequin photo:', err);
      setError('فشل رفع الصورة، يرجى المحاولة مرة أخرى');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange('');
    setUrlDraft('');
    setShowUrlInput(false);
  };

  const handleApplyUrl = () => {
    if (urlDraft.trim()) {
      onChange(urlDraft.trim());
      setShowUrlInput(false);
    }
  };

  return (
    <div className="rounded-2xl border border-burgundy/15 bg-gradient-to-br from-white to-[#FBF8F5] p-4 sm:p-5 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-burgundy/10 text-base">
            👤
          </span>
          <div>
            <h4 className="text-xs font-bold text-burgundy">
              صورة القطعة على المانيكان بالمحل (In-Store Look)
            </h4>
            <p className="text-[10px] text-burgundy/60">
              لتفعيل ميزة المقارنة التفاعلية (سلايدر حي وتبديل فوري) في صفحة المنتج للزبائن
            </p>
          </div>
        </div>

        {value && (
          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 shadow-xs">
            <span>✓</span>
            <span>مفعّلة على المنتج</span>
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-2 text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Content Area */}
      {value ? (
        /* Image Preview Card */
        <div className="relative overflow-hidden rounded-xl border border-burgundy/15 bg-black/5 p-2 flex items-center gap-4">
          <div className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-lg overflow-hidden shrink-0 border border-burgundy/10 bg-white shadow-xs">
            <img
              src={value}
              alt="صورة المانيكان"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-1 right-1 bg-burgundy/80 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold">
              👤 مانيكان
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-xs font-bold text-burgundy truncate">
              تم تجهيز صورة المانيكان بنجاح ✨
            </p>
            <p className="text-[11px] text-burgundy/70 break-all line-clamp-1">
              {value}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs bg-white text-burgundy border border-burgundy/20 hover:border-burgundy px-3 py-1.5 rounded-xl font-bold transition shadow-xs disabled:opacity-50"
              >
                تغيير الصورة
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2.5 py-1.5 rounded-xl font-bold transition"
              >
                إلغاء وحذف
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State / Upload Trigger */
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-burgundy/25 bg-white/70 hover:bg-burgundy/5 hover:border-burgundy/40 text-burgundy font-bold text-xs transition duration-200 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-burgundy/30 border-t-burgundy rounded-full animate-spin" />
                <span>جاري رفع صورة المانيكان...</span>
              </>
            ) : (
              <>
                <span className="text-base">📸</span>
                <span>رفع صورة المانيكان من الجهاز (مباشرة)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowUrlInput(prev => !prev)}
            className="text-xs text-burgundy/70 hover:text-burgundy underline font-medium px-2 py-1"
          >
            {showUrlInput ? 'إخفاء الرابط' : 'أو إدخال رابط صورة مباشرة'}
          </button>
        </div>
      )}

      {/* Manual URL Input dropdown */}
      {!value && showUrlInput && (
        <div className="flex items-center gap-2 pt-1 animate-fadeIn">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://... أو /uploads/..."
            className="flex-1 rounded-xl border border-burgundy/20 bg-white px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="text-xs bg-burgundy text-white px-4 py-2 rounded-xl font-bold hover:bg-[#650018] transition shadow-xs"
          >
            تطبيق
          </button>
        </div>
      )}
    </div>
  );
}
