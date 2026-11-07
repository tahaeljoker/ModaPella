import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { Icon } from '../../components/Icon';

export default function AdminLookbook() {
  const [looks, setLooks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLook, setEditingLook] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'كاجوال',
    mediaType: 'image',
    mediaUrl: '',
    videoThumbnail: '',
    bundleDiscountPercent: 10,
    active: true,
    order: 0,
    items: []
  });

  const [productSearch, setProductSearch] = useState('');
  const [activePinTargetIndex, setActivePinTargetIndex] = useState(null);
  const mediaPreviewRef = useRef(null);

  // File upload states
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [looksRes, prodsRes] = await Promise.all([
        api.get('/looks/admin/all'),
        api.get('/products?context=admin')
      ]);
      setLooks(looksRes.data || []);
      setProducts(prodsRes.data || []);
    } catch (err) {
      console.error('Failed to load lookbook admin data:', err);
      showToast('فشل تحميل بيانات الإطلالات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingLook(null);
    setFormData({
      title: '',
      description: '',
      category: 'كاجوال',
      mediaType: 'image',
      mediaUrl: '',
      videoThumbnail: '',
      bundleDiscountPercent: 10,
      active: true,
      order: looks.length,
      items: []
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (look) => {
    setEditingLook(look);
    setFormData({
      title: look.title || '',
      description: look.description || '',
      category: look.category || 'كاجوال',
      mediaType: look.mediaType || 'image',
      mediaUrl: look.mediaUrl || '',
      videoThumbnail: look.videoThumbnail || '',
      bundleDiscountPercent: look.bundleDiscountPercent ?? 10,
      active: look.active ?? true,
      order: look.order ?? 0,
      items: (look.items || []).map((it) => ({
        product: it.product?._id || it.product,
        productObj: typeof it.product === 'object' ? it.product : products.find((p) => p._id === it.product),
        tagRole: it.tagRole || 'top',
        tagLabel: it.tagLabel || '',
        positionX: it.positionX ?? 50,
        positionY: it.positionY ?? 50
      }))
    });
    setModalOpen(true);
  };

  // Upload file (Image or Video)
  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showToast('حجم الملف كبير جداً (الحد الأقصى 25 ميجابايت)');
      return;
    }

    setUploadingMedia(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const res = await api.post('/upload', {
          file: base64Data,
          name: `${file.name.split('.')[0]}_${Date.now()}`
        });

        if (res.data?.url) {
          setFormData((prev) => ({
            ...prev,
            [fieldName]: res.data.url
          }));
          showToast('تم رفع الملف بنجاح ✓');
        }
      } catch (err) {
        console.error('File upload failed:', err);
        showToast('فشل رفع الملف، يرجى المحاولة مرة أخرى');
      } finally {
        setUploadingMedia(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add a product item to the look
  const handleAddProductToLook = (prod) => {
    if (formData.items.some((it) => it.product === prod._id)) {
      showToast('هذا المنتج مضاف بالفعل في الإطلالة');
      return;
    }

    const defaultRole =
      prod.category === 'Pantalon' || prod.category === 'Skirt'
        ? 'bottom'
        : prod.category === 'Dress'
        ? 'dress'
        : prod.category === 'Bag'
        ? 'bag'
        : 'top';

    const defaultLabel =
      defaultRole === 'top'
        ? 'القطعة العلوية'
        : defaultRole === 'bottom'
        ? 'القطعة السفلية'
        : defaultRole === 'dress'
        ? 'الفستان'
        : defaultRole === 'bag'
        ? 'الشنطة'
        : 'قطعة إضافية';

    const count = formData.items.length;
    const newItem = {
      product: prod._id,
      productObj: prod,
      tagRole: defaultRole,
      tagLabel: defaultLabel,
      positionX: 50,
      positionY: Math.min(85, 30 + count * 22)
    };

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setProductSearch('');
  };

  // Remove a product from the look
  const handleRemoveProductFromLook = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    if (activePinTargetIndex === index) {
      setActivePinTargetIndex(null);
    }
  };

  // Interactive Pin Placement by Clicking on the Media Preview
  const handleMediaClick = (e) => {
    if (activePinTargetIndex === null || !mediaPreviewRef.current) return;
    const rect = mediaPreviewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.round(Math.max(5, Math.min(95, x)));
    const clampedY = Math.round(Math.max(5, Math.min(95, y)));

    setFormData((prev) => {
      const updated = [...prev.items];
      if (updated[activePinTargetIndex]) {
        updated[activePinTargetIndex] = {
          ...updated[activePinTargetIndex],
          positionX: clampedX,
          positionY: clampedY
        };
      }
      return { ...prev, items: updated };
    });

    showToast(`تم تحديد مكان القطعة #${activePinTargetIndex + 1} بنجاح`);
    setActivePinTargetIndex(null);
  };

  // Toggle active state directly from table
  const handleToggleActive = async (look) => {
    try {
      const updatedStatus = !look.active;
      await api.put(`/looks/admin/${look._id}`, { active: updatedStatus });
      setLooks((prev) =>
        prev.map((l) => (l._id === look._id ? { ...l, active: updatedStatus } : l))
      );
      showToast(updatedStatus ? 'تم تفعيل الإطلالة في الموقع' : 'تم إخفاء الإطلالة من الموقع');
    } catch {
      showToast('فشل تحديث الحالة');
    }
  };

  // Delete look
  const handleDeleteLook = async (id) => {
    try {
      await api.delete(`/looks/admin/${id}`);
      setLooks((prev) => prev.filter((l) => l._id !== id));
      setDeleteConfirmId(null);
      showToast('تم حذف الإطلالة بنجاح');
    } catch {
      showToast('فشل حذف الإطلالة');
    }
  };

  // Save (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('يرجى كتابة عنوان الإطلالة');
      return;
    }
    if (!formData.mediaUrl.trim()) {
      showToast('يرجى رفع أو وضع رابط صورة/فيديو الموديل');
      return;
    }
    if (formData.items.length === 0) {
      showToast('يرجى ربط قطعة واحدة على الأقل من المنتجات');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category.trim(),
        mediaType: formData.mediaType,
        mediaUrl: formData.mediaUrl.trim(),
        videoThumbnail: formData.videoThumbnail.trim(),
        bundleDiscountPercent: Number(formData.bundleDiscountPercent) || 0,
        active: formData.active,
        order: Number(formData.order) || 0,
        items: formData.items.map((it) => ({
          product: it.product,
          tagRole: it.tagRole,
          tagLabel: it.tagLabel,
          positionX: it.positionX,
          positionY: it.positionY
        }))
      };

      if (editingLook) {
        const res = await api.put(`/looks/admin/${editingLook._id}`, payload);
        setLooks((prev) =>
          prev.map((l) => (l._id === editingLook._id ? res.data.look : l))
        );
        showToast('تم تعديل الإطلالة بنجاح ✓');
      } else {
        const res = await api.post('/looks/admin', payload);
        setLooks((prev) => [res.data.look, ...prev]);
        showToast('تم إنشاء ونشر إطلالة الموديل بنجاح ✓');
      }

      setModalOpen(false);
    } catch (err) {
      console.error('Save look failed:', err);
      showToast(err.response?.data?.message || 'فشل حفظ الإطلالة');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered products for search dropdown
  const filteredProducts = productSearch.trim()
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase()))
        )
        .slice(0, 8)
    : [];

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-burgundy px-6 py-3 text-sm font-semibold text-white shadow-2xl animate-in fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-burgundy/10 shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">👗</span>
            <h1 className="text-2xl font-black text-burgundy">إطلالات وتنسيقات الموديلز (Lookbook)</h1>
          </div>
          <p className="text-xs sm:text-sm text-burgundy/60 mt-1">
            ارفعي فيديوهات وصور الموديلز واربطي كل قطعة بالمنتج الحقيقي من المخزن لتمكين الزبائن من طلب الطقم بخصم خاص.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-burgundy px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#680017] transition active:scale-95"
        >
          <span>➕ إضافة إطلالة جديدة</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الإطلالات', value: looks.length, icon: '👗' },
          { label: 'نشطة في المتجر', value: looks.filter((l) => l.active).length, icon: '✓' },
          { label: 'فيديوهات ريلز', value: looks.filter((l) => l.mediaType === 'video').length, icon: '🎥' },
          { label: 'صور الموديلز', value: looks.filter((l) => l.mediaType === 'image').length, icon: '📸' }
        ].map((s, idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl border border-burgundy/10 shadow-soft flex items-center justify-between">
            <div>
              <span className="text-xs text-burgundy/60 font-semibold block">{s.label}</span>
              <span className="text-xl font-black text-burgundy mt-1 block">{s.value}</span>
            </div>
            <span className="text-2xl opacity-80">{s.icon}</span>
          </div>
        ))}
      </div>

      {/* Looks List / Table */}
      {loading ? (
        <div className="h-64 rounded-3xl bg-white border border-burgundy/10 animate-pulse flex items-center justify-center text-sm font-bold text-burgundy/50">
          جاري تحميل الإطلالات...
        </div>
      ) : looks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-burgundy/20 p-8 space-y-3">
          <span className="text-4xl block">👗</span>
          <h3 className="text-lg font-bold">لم تقومي بإضافة أي إطلالة للموديلز بعد</h3>
          <p className="text-xs text-burgundy/60 max-w-md mx-auto">
            اضغطي على زر "إضافة إطلالة جديدة" لرفع فيديو أو صورة الموديل وتحديد قطع الطقم ليراها العملاء فوراً في الصفحة الرئيسية وصفحة اللوك بوك.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="mt-2 px-5 py-2.5 rounded-full bg-burgundy text-white text-xs font-bold shadow hover:bg-[#680017]"
          >
            إضافة أول إطلالة الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {looks.map((look) => (
            <div
              key={look._id}
              className={`rounded-3xl border bg-white overflow-hidden shadow-soft transition-all duration-200 flex flex-col justify-between ${
                look.active ? 'border-burgundy/15' : 'border-black/10 opacity-70 bg-stone-50'
              }`}
            >
              <div>
                {/* Media Preview Thumbnail */}
                <div className="relative aspect-[4/3] bg-stone-900 overflow-hidden">
                  {look.mediaType === 'video' ? (
                    <video
                      src={look.mediaUrl}
                      poster={look.videoThumbnail || undefined}
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={look.mediaUrl}
                      alt={look.title}
                      className="w-full h-full object-cover"
                    />
                  )}

                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-md">
                      {look.mediaType === 'video' ? '🎥 فيديو' : '📸 صورة'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-burgundy text-white text-[10px] font-bold">
                      {look.category || 'كاجوال'}
                    </span>
                  </div>

                  {look.bundleDiscountPercent > 0 && (
                    <div className="absolute bottom-3 right-3">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow">
                        خصم {look.bundleDiscountPercent}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-base text-burgundy">{look.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      look.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                    }`}>
                      {look.active ? 'ظاهر بالموقع' : 'مخفي'}
                    </span>
                  </div>

                  {look.description && (
                    <p className="text-xs text-burgundy/60 line-clamp-2 leading-relaxed">
                      {look.description}
                    </p>
                  )}

                  <div className="pt-2 border-t border-burgundy/10 flex items-center justify-between text-xs font-semibold text-burgundy/70">
                    <span>عدد القطع: {look.items?.length || 0}</span>
                    <span>الترتيب: {look.order ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 pt-0 border-t border-burgundy/10 bg-[#FAF7F5] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(look)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    look.active
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-stone-300 bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {look.active ? 'إخفاء' : 'تفعيل'}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(look)}
                    className="p-2 rounded-xl bg-white border border-burgundy/15 text-burgundy hover:bg-burgundy hover:text-white transition shadow-2xs text-xs font-bold"
                    title="تعديل الإطلالة"
                  >
                    تعديل
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(look._id)}
                    className="p-2 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 transition shadow-2xs text-xs font-bold"
                    title="حذف"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={() => setDeleteConfirmId(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <span className="text-4xl block">⚠️</span>
            <h3 className="text-lg font-black text-burgundy">تأكيد حذف الإطلالة</h3>
            <p className="text-xs text-burgundy/70">هل أنتِ متأكدة من حذف هذه الإطلالة؟ لن تظهر مجدداً في واجهة المتجر.</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDeleteLook(deleteConfirmId)}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                نعم، احذفها
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-5 py-2.5 rounded-xl border border-burgundy/20 text-burgundy text-xs font-bold hover:bg-stone-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div
            className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-burgundy/15 space-y-6 my-auto text-burgundy"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-burgundy/10 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-burgundy">
                  {editingLook ? 'تعديل إطلالة الموديل' : 'إضافة إطلالة جديدة للموديل'}
                </h2>
                <p className="text-xs text-burgundy/60">
                  حددي صور وفيديوهات الموديل واربطي القطع مع تحديد مكان النقطة على الصورة بسهولة.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl bg-stone-100 text-burgundy hover:bg-stone-200 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-burgundy">عنوان الإطلالة *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: إطلالة كاجوال أنيقة / ستايل العيد"
                    className="w-full rounded-xl border border-burgundy/20 px-3.5 py-2.5 text-xs text-burgundy outline-none focus:border-burgundy"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-burgundy">التصنيف</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-burgundy/20 px-3.5 py-2.5 text-xs text-burgundy outline-none focus:border-burgundy"
                  >
                    <option value="كاجوال">كاجوال</option>
                    <option value="فورمال">فورمال</option>
                    <option value="خروج">خروج</option>
                    <option value="سهرة">سهرة</option>
                    <option value="شتوي">شتوي</option>
                    <option value="صيفي">صيفي</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-burgundy">وصف الإطلالة (اختياري)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="اكتبي تفاصيل أو مناسبة اللبس وخامته..."
                  className="w-full rounded-xl border border-burgundy/20 px-3.5 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
                />
              </div>

              {/* Media Settings (Video or Image) */}
              <div className="rounded-2xl border border-burgundy/15 bg-[#FAF7F5] p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-black text-burgundy flex items-center gap-2">
                  <span>📸</span>
                  <span>ملف ميديا الموديل (صورة أو فيديو)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Media Type Switcher */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-burgundy">نوع الميديا</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, mediaType: 'image' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                          formData.mediaType === 'image'
                            ? 'bg-burgundy text-white border-burgundy shadow-xs'
                            : 'bg-white border-burgundy/20 text-burgundy'
                        }`}
                      >
                        📸 صورة موديل
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, mediaType: 'video' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                          formData.mediaType === 'video'
                            ? 'bg-burgundy text-white border-burgundy shadow-xs'
                            : 'bg-white border-burgundy/20 text-burgundy'
                        }`}
                      >
                        🎥 فيديو ريلز
                      </button>
                    </div>
                  </div>

                  {/* Bundle Discount */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-burgundy">
                      نسبة الخصم عند طلب الطقم كاملاً (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={90}
                      value={formData.bundleDiscountPercent}
                      onChange={(e) => setFormData({ ...formData, bundleDiscountPercent: Number(e.target.value) })}
                      className="w-full rounded-xl border border-burgundy/20 px-3.5 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
                    />
                  </div>
                </div>

                {/* Media Upload or URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-burgundy">
                      {formData.mediaType === 'video' ? 'رفع فيديو الموديل (MP4 / WebM)' : 'رفع صورة الموديل (JPG / PNG)'}
                    </label>
                    <input
                      type="file"
                      accept={formData.mediaType === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}
                      onChange={(e) => handleFileUpload(e, 'mediaUrl')}
                      disabled={uploadingMedia}
                      className="w-full text-xs text-burgundy file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-burgundy file:text-white hover:file:bg-[#680017] cursor-pointer"
                    />
                    {uploadingMedia && (
                      <span className="text-[11px] text-burgundy font-bold animate-pulse block">
                        جاري رفع ومعالجة الملف...
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-burgundy">أو ضعي رابط مباشر (URL)</label>
                    <input
                      type="text"
                      value={formData.mediaUrl}
                      onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                      placeholder="https://... أو /uploads/..."
                      className="w-full rounded-xl border border-burgundy/20 px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy dir-ltr text-left"
                    />
                  </div>
                </div>

                {/* Interactive Media Preview & Hotspot Picker */}
                {formData.mediaUrl && (
                  <div className="pt-3 border-t border-burgundy/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-burgundy">
                        معاينة تفاعلية وتحديد مواقع القطع (Hotspots):
                      </span>
                      {activePinTargetIndex !== null && (
                        <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse">
                          اضغطي الآن على مكان القطعة #{activePinTargetIndex + 1} فوق الصورة!
                        </span>
                      )}
                    </div>

                    <div
                      ref={mediaPreviewRef}
                      onClick={handleMediaClick}
                      className={`relative w-full max-w-md mx-auto aspect-[3/4] bg-stone-900 rounded-2xl overflow-hidden shadow-inner ${
                        activePinTargetIndex !== null ? 'cursor-crosshair ring-4 ring-amber-400' : ''
                      }`}
                    >
                      {formData.mediaType === 'video' ? (
                        <video
                          src={formData.mediaUrl}
                          muted
                          autoPlay
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={formData.mediaUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Display Pinned Hotspots */}
                      {formData.items.map((it, idx) => (
                        <div
                          key={idx}
                          style={{ top: `${it.positionY}%`, left: `${it.positionX}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-burgundy font-black text-xs shadow-xl border-2 border-burgundy">
                            {idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Product Items Selection */}
              <div className="rounded-2xl border border-burgundy/15 bg-white p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-burgundy flex items-center gap-2">
                    <span>🛍️</span>
                    <span>قطع الطقم المربوطة من المخزن ({formData.items.length})</span>
                  </h3>
                  <span className="text-xs text-burgundy/60">
                    ابحثي عن المنتجات وأضيفيها للطقم
                  </span>
                </div>

                {/* Product Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="ابحثي عن منتج بالاسم لإضافته لهذا الطقم..."
                    className="w-full rounded-xl border border-burgundy/20 px-4 py-2.5 text-xs text-burgundy outline-none focus:border-burgundy"
                  />

                  {filteredProducts.length > 0 && (
                    <div className="absolute top-full mt-1.5 inset-x-0 z-30 rounded-2xl bg-white border border-burgundy/15 shadow-2xl max-h-56 overflow-y-auto divide-y divide-burgundy/5">
                      {filteredProducts.map((prod) => (
                        <div
                          key={prod._id}
                          onClick={() => handleAddProductToLook(prod)}
                          className="p-3 hover:bg-[#FAF7F5] cursor-pointer flex items-center justify-between transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={prod.images?.[0] || prod.mannequinImage || '/placeholder.png'}
                              alt={prod.name}
                              className="h-9 w-9 rounded-lg object-cover border border-burgundy/10"
                            />
                            <div>
                              <span className="text-xs font-bold block text-burgundy">{prod.name}</span>
                              <span className="text-[10px] text-burgundy/60">{prod.category} — {prod.price} ج.م</span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                            + إضافة للطقم
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Items List */}
                {formData.items.length === 0 ? (
                  <p className="text-xs text-burgundy/50 text-center py-4 bg-stone-50 rounded-xl">
                    لم تقومي باختيار أي قطع بعد. ابحثي بالأعلى لاختيار القطع التي ترتديها الموديل.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.items.map((item, index) => {
                      const prod = item.productObj || products.find((p) => p._id === item.product);
                      return (
                        <div
                          key={index}
                          className="p-3.5 rounded-2xl border border-burgundy/10 bg-[#FAF7F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-burgundy text-white text-xs font-black">
                              {index + 1}
                            </span>
                            <img
                              src={prod?.images?.[0] || prod?.mannequinImage || '/placeholder.png'}
                              alt=""
                              className="h-10 w-10 rounded-lg object-cover border"
                            />
                            <div>
                              <span className="font-bold text-xs text-burgundy block">
                                {prod?.name || 'منتج غير معروف'}
                              </span>
                              <span className="text-[11px] text-burgundy/60">
                                السعر: {prod?.price} ج.م | المخزون: {prod?.stock ?? 'متوفر'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Role Label */}
                            <input
                              type="text"
                              value={item.tagLabel}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData((prev) => {
                                  const updated = [...prev.items];
                                  updated[index].tagLabel = val;
                                  return { ...prev, items: updated };
                                });
                              }}
                              placeholder="مسمى القطعة (مثلاً: البلوزة)"
                              className="rounded-lg border border-burgundy/20 bg-white px-2 py-1 text-xs text-burgundy w-28"
                            />

                            {/* Pick Pin Location Button */}
                            <button
                              type="button"
                              onClick={() => setActivePinTargetIndex(index)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                                activePinTargetIndex === index
                                  ? 'bg-amber-500 text-white border-amber-600 animate-pulse'
                                  : 'bg-white border-burgundy/20 text-burgundy hover:bg-stone-50'
                              }`}
                              title="اضغطي هنا ثم اضغطي على الصورة لتحديد مكان النقطة"
                            >
                              📍 تحديد مكانها ({item.positionX}%, {item.positionY}%)
                            </button>

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveProductFromLook(index)}
                              className="p-1 text-red-500 hover:text-red-700 text-sm font-bold"
                              title="حذف من الطقم"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Order & Active Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-burgundy">ترتيب العرض (Order)</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="w-full rounded-xl border border-burgundy/20 px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="lookActiveCheck"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 accent-burgundy cursor-pointer"
                  />
                  <label htmlFor="lookActiveCheck" className="text-xs font-bold text-burgundy cursor-pointer">
                    نشر وتفعيل الإطلالة في الموقع فوراً
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-burgundy/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-burgundy/20 text-xs font-bold text-burgundy hover:bg-stone-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-7 py-2.5 rounded-xl bg-burgundy text-white text-xs sm:text-sm font-bold shadow hover:bg-[#680017] transition disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : editingLook ? 'حفظ التعديلات ✓' : 'إنشاء ونشر الإطلالة ✨'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
