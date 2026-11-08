import { useState, useRef } from 'react';
import api from '../services/api';
import { compressImage } from '../utils/imageCompressor';
import { resolveImageUrl } from '../utils/imageUrl';

export default function HeroImagesManager({
  images = [],
  onChange,
  autoplaySpeed = 5,
  onSpeedChange
}) {
  const [uploading, setUploading] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleAddUrl = (e) => {
    e.preventDefault();
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
      setError('يرجى إدخال رابط صورة يبدأ بـ http:// أو https://');
      return;
    }
    setError('');
    onChange([...(images || []), trimmed]);
    setNewUrl('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً، الحد الأقصى 15 ميجابايت');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const base64 = await compressImage(file, 1800, 0.85);
      const res = await api.post('/upload', {
        image: base64,
        name: `hero_slide_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      });

      if (res.data?.url) {
        onChange([...(images || []), res.data.url]);
      } else {
        setError('تعذر استلام رابط الصورة من الخادم');
      }
    } catch (err) {
      console.error('Failed to upload hero image:', err);
      setError('فشل رفع الصورة، يرجى المحاولة مرة أخرى');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (indexToRemove) => {
    const updated = (images || []).filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleResetDefaults = () => {
    const defaults = [
      'https://i.postimg.cc/NFz9t4fC/Elegant-fashion-website-hero-banner-women-s-clothing-rack-background-soft-burgundy-overlay-modern.jpg',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1600&q=85'
    ];
    onChange(defaults);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-burgundy/15 bg-white p-5 shadow-xs" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-burgundy/10 pb-3">
        <div>
          <h4 className="text-sm font-bold text-burgundy">صور السلايدر المتحرك في الهيرو</h4>
          <p className="text-xs text-burgundy/60">
            تتبدل هذه الصور تلقائياً في واجهة المتجر كل عدة ثوانٍ بنعومة وبحجم متجاوب
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-burgundy/70 flex items-center gap-1.5 whitespace-nowrap">
            <span>سرعة التبديل:</span>
            <select
              value={autoplaySpeed || 5}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="rounded-lg border border-burgundy/20 bg-burgundy/5 px-2.5 py-1 text-xs font-bold text-burgundy"
            >
              <option value={3}>3 ثوانٍ</option>
              <option value={4}>4 ثوانٍ</option>
              <option value={5}>5 ثوانٍ (موصى به)</option>
              <option value={6}>6 ثوانٍ</option>
              <option value={8}>8 ثوانٍ</option>
            </select>
          </label>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[11px] font-bold text-burgundy/70 hover:text-burgundy underline"
          >
            استعادة الافتراضي
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {/* Grid of Current Images */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {(images || []).map((imgUrl, idx) => (
          <div
            key={idx}
            className="group relative aspect-[16/10] overflow-hidden rounded-xl border border-burgundy/15 bg-burgundy/5 shadow-2xs"
          >
            <img
              src={resolveImageUrl(imgUrl)}
              alt={`Slide ${idx + 1}`}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
            {/* Slide Index Badge */}
            <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
              شريحة {idx + 1}
            </span>
            {/* Delete button */}
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow-md transition hover:bg-red-700 active:scale-95"
              title="حذف الصورة"
            >
              <svg className="w-4 h-4 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {(!images || images.length === 0) && (
          <div className="col-span-full py-6 text-center text-xs text-burgundy/50 border border-dashed border-burgundy/20 rounded-xl">
            لا توجد صور حالياً، سيتم استخدام الصور الافتراضية
          </div>
        )}
      </div>

      {/* Actions: Upload from device or add URL */}
      <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-burgundy/10">
        {/* Upload Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-burgundy/30 bg-burgundy/5 px-4 py-2.5 text-xs font-bold text-burgundy transition hover:bg-burgundy/10 disabled:opacity-50"
          >
            <svg className="w-4 h-4 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span>{uploading ? 'جاري رفع الصورة...' : 'رفع صورة من الجهاز'}</span>
          </button>
        </div>

        {/* Add URL form */}
        <form onSubmit={handleAddUrl} className="flex gap-2">
          <input
            type="url"
            placeholder="أو ضعي رابط صورة مباشر (https://...)"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="flex-1 rounded-xl border border-burgundy/20 bg-white px-3 py-2 text-xs text-burgundy placeholder:text-burgundy/40 focus:border-burgundy focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-burgundy px-4 py-2 text-xs font-bold text-white transition hover:bg-[#680017] shrink-0"
          >
            إضافة
          </button>
        </form>
      </div>
    </div>
  );
}
