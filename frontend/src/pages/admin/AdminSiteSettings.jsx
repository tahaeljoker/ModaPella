import { useEffect, useState } from 'react';
import api from '../../services/api';

function AdminSiteSettings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    api.get('/admin/site-config')
      .then((r) => setConfig(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/admin/site-config', config);
      setConfig(res.data);
      showToast('تم حفظ الإعدادات بنجاح ✓');
    } catch (err) {
      showToast('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    try {
      const res = await api.put('/admin/site-config', { ...config, published: !config.published });
      setConfig(res.data);
      showToast(res.data.published ? 'الموقع منشور الآن ✓' : 'الموقع موقوف مؤقتاً');
    } catch (err) {
      console.error(err);
    }
  };

  const inputCls = 'w-full rounded-xl border border-burgundy/20 bg-white px-4 py-3 text-sm text-burgundy outline-none transition focus:border-burgundy';

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-burgundy">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/50">إعدادات</p>
          <h2 className="text-3xl font-bold">محتوى الموقع</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className={`rounded-full px-4 py-2 text-sm font-semibold ${config?.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {config?.published ? '🟢 الموقع مفعّل' : '🔴 الموقع موقوف'}
          </div>
          <button type="button" onClick={handlePublishToggle}
            className="rounded-full border border-burgundy/20 px-5 py-2 text-sm font-semibold text-burgundy transition hover:bg-burgundy hover:text-white">
            {config?.published ? 'إيقاف الموقع' : 'تفعيل الموقع'}
          </button>
        </div>
      </div>

      {config && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Hero Section */}
          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">قسم الهيرو (الصفحة الرئيسية)</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">العنوان الرئيسي</label>
                <input name="heroTitle" value={config.heroTitle || ''} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">النص التوضيحي</label>
                <textarea name="heroSubtitle" value={config.heroSubtitle || ''} onChange={handleChange} className={`${inputCls} min-h-[80px]`} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">نص الزر الرئيسي</label>
                  <input name="heroCtaLabel" value={config.heroCtaLabel || ''} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">رابط الزر الرئيسي</label>
                  <input name="heroCtaLink" value={config.heroCtaLink || ''} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">نص الزر الثانوي</label>
                  <input name="secondaryCtaLabel" value={config.secondaryCtaLabel || ''} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">رابط الزر الثانوي</label>
                  <input name="secondaryCtaLink" value={config.secondaryCtaLink || ''} onChange={handleChange} className={inputCls} />
                </div>
              </div>
            </div>
          </div>

          {/* Featured Section */}
          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">قسم المنتجات المميزة</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">عنوان القسم</label>
                <input name="featuredTitle" value={config.featuredTitle || ''} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">وصف القسم</label>
                <input name="featuredSubtitle" value={config.featuredSubtitle || ''} onChange={handleChange} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Maintenance */}
          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">رسالة الصيانة</h3>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">الرسالة التي تظهر عند إيقاف الموقع</label>
              <textarea name="maintenanceMessage" value={config.maintenanceMessage || ''} onChange={handleChange} className={`${inputCls} min-h-[80px]`} />
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full rounded-full bg-burgundy py-3 text-sm font-bold text-white shadow transition hover:bg-[#650018] disabled:opacity-60">
            {saving ? 'جاري الحفظ...' : 'حفظ جميع الإعدادات'}
          </button>
        </form>
      )}
    </div>
  );
}

export default AdminSiteSettings;
