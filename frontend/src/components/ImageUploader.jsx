import { useState, useRef } from 'react';
import api from '../services/api';

/**
 * ImageUploader component for uploading product images
 * Supports:
 * - Picking files from phone/PC (multiple files)
 * - Drag and drop
 * - Converting to base64 & uploading to /api/upload
 * - Preview, reordering, and deleting images
 */
export default function ImageUploader({ images = [], onChange, label = 'صور المنتج' }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const imageList = Array.isArray(images)
    ? images
    : typeof images === 'string'
    ? images.split('\n').map(s => s.trim()).filter(Boolean)
    : [];

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setError('');
    setUploading(true);

    const uploadedUrls = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setError('يرجى اختيار ملفات صور فقط');
        continue;
      }

      // Max 5MB per image
      if (file.size > 5 * 1024 * 1024) {
        setError('حجم إحدى الصور أكبر من 5 ميجابايت');
        continue;
      }

      try {
        const base64 = await readFileAsBase64(file);
        const res = await api.post('/upload', {
          image: base64,
          name: file.name
        });

        if (res.data && res.data.url) {
          uploadedUrls.push(res.data.url);
        }
      } catch (err) {
        console.error('Failed to upload image:', err);
        setError('حدث خطأ أثناء رفع إحدى الصور');
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...imageList, ...uploadedUrls]);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleRemove = (index) => {
    const updated = imageList.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMove = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= imageList.length) return;
    const updated = [...imageList];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-burgundy/60">
          {label} ({imageList.length})
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs bg-burgundy text-white px-3 py-1.5 rounded-xl font-bold hover:bg-[#650018] transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          {uploading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>جاري الرفع...</span>
            </>
          ) : (
            <>
              <span>+ رفع صور من الجهاز</span>
            </>
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && (
        <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Drop / upload zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-burgundy/20 hover:border-burgundy/50 bg-white/60 hover:bg-white rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 group"
      >
        <div className="w-10 h-10 rounded-full bg-burgundy/5 text-burgundy flex items-center justify-center group-hover:scale-110 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-xs font-bold text-burgundy">
          اضغط هنا لاختيار صور من الموبايل أو الكمبيوتر
        </p>
        <p className="text-[10px] text-burgundy/50">
          يمكنك تحديد عدة صور معاً (PNG, JPG, WebP)
        </p>
      </div>

      {/* Image Previews */}
      {imageList.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
          {imageList.map((url, idx) => (
            <div
              key={idx}
              className="relative aspect-square rounded-2xl border border-burgundy/15 overflow-hidden group shadow-sm bg-white"
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80';
                }}
              />

              {idx === 0 && (
                <span className="absolute top-1.5 right-1.5 bg-burgundy text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                  الرئيسية
                </span>
              )}

              {/* Action controls */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleMove(idx, -1); }}
                    title="تحريك لليمين (تقديم)"
                    className="w-7 h-7 bg-white/90 text-burgundy rounded-full flex items-center justify-center text-xs font-bold hover:bg-white shadow"
                  >
                    →
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemove(idx); }}
                  title="حذف الصورة"
                  className="w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-700 shadow"
                >
                  ✕
                </button>
                {idx < imageList.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleMove(idx, 1); }}
                    title="تحريك لليسار (تأخير)"
                    className="w-7 h-7 bg-white/90 text-burgundy rounded-full flex items-center justify-center text-xs font-bold hover:bg-white shadow"
                  >
                    ←
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
