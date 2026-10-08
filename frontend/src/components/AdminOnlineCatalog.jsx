import { useState, useEffect } from 'react';
import api from '../services/api';
import ImageUploader from './ImageUploader';
import { cleanProductName } from '../utils/discount';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

export default function AdminOnlineCatalog({ onToast }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editForm, setEditForm] = useState({ onlineName: '', images: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
      onToast?.('فشل تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (p) => {
    setSelectedProduct(p);
    setEditForm({
      onlineName: p.onlineName || '',
      images: Array.isArray(p.images) ? p.images : []
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSaving(true);
    try {
      const payload = {
        ...selectedProduct,
        onlineName: (editForm.onlineName || '').trim(),
        images: editForm.images
      };

      await api.put(`/admin/products/${selectedProduct._id}`, payload);
      onToast?.('تم حفظ صور واسم المنتج للمتجر بنجاح');
      
      // Update local state
      setProducts(prev => prev.map(item => item._id === selectedProduct._id ? { ...item, ...payload } : item));
      setSelectedProduct(prev => ({ ...prev, ...payload }));
    } catch (err) {
      console.error(err);
      onToast?.('فشل حفظ التعديلات');
    } finally {
      setSaving(false);
    }
  };

  const [imageFilter, setImageFilter] = useState('all'); // 'all' | 'missing' | 'ready'

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const nameMatch = (p.name || '').toLowerCase().includes(q);
    const onlineNameMatch = (p.onlineName || '').toLowerCase().includes(q);
    const skuMatch = (p.sku || '').toLowerCase().includes(q);
    const catMatch = (p.category || '').toLowerCase().includes(q);
    const matchesSearch = nameMatch || onlineNameMatch || skuMatch || catMatch;
    if (!matchesSearch) return false;

    const hasImages = p.images && p.images.length > 0;
    if (imageFilter === 'missing') return !hasImages;
    if (imageFilter === 'ready') return hasImages;
    return true;
  });

  const missingCount = products.filter(p => !p.images || p.images.length === 0).length;
  const readyCount = products.filter(p => p.images && p.images.length > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-burgundy flex items-center gap-2">
            <span>تخصيص منتجات المتجر أونلاين</span>
          </h3>
          <p className="text-xs text-burgundy/60 mt-1">
            ارفع صور المنتجات مباشرة من موبايلك، وحدد اسم العرض الفخم الذي يظهر للعميلات على الموقع دون التأثير على كود المخزن.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Quick Filters */}
          <div className="flex bg-burgundy/5 p-1 rounded-full border border-burgundy/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => setImageFilter('all')}
              className={`px-3 py-1.5 rounded-full transition ${
                imageFilter === 'all'
                  ? 'bg-burgundy text-white shadow-sm'
                  : 'text-burgundy/70 hover:text-burgundy'
              }`}
            >
              الكل ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setImageFilter('missing')}
              className={`px-3 py-1.5 rounded-full transition flex items-center gap-1.5 ${
                imageFilter === 'missing'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              <span>بانتظار الصور</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                imageFilter === 'missing' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900 font-bold'
              }`}>
                {missingCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setImageFilter('ready')}
              className={`px-3 py-1.5 rounded-full transition ${
                imageFilter === 'ready'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-800 hover:text-emerald-950'
              }`}
            >
              جاهزة بصور ({readyCount})
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم، الكود، أو الفئة..."
              className="w-full rounded-full border border-burgundy/20 bg-white px-4 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Products List (Left side) */}
        <div className="lg:col-span-5 rounded-[2rem] border border-burgundy/10 bg-white p-4 shadow-sm space-y-3 max-h-[750px] overflow-y-auto">
          <div className="flex justify-between items-center px-2 pb-2 border-b border-burgundy/5 text-xs text-burgundy/60">
            <span>المنتجات المعروضة ({filtered.length})</span>
            <span>اضغط لاختيار منتج</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-burgundy/40">جاري تحميل المنتجات...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-burgundy/40">لا توجد منتجات مطابقة للبحث</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(p => {
                const isSelected = selectedProduct?._id === p._id;
                const hasCustomName = Boolean(p.onlineName && p.onlineName.trim());
                const imgCount = p.images?.length || 0;

                return (
                  <div
                    key={p._id}
                    onClick={() => handleSelectProduct(p)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'border-burgundy bg-burgundy/5 shadow-sm'
                        : 'border-burgundy/10 hover:border-burgundy/30 bg-white'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-burgundy/5 overflow-hidden flex-shrink-0 border border-burgundy/10">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-burgundy/40 font-bold">
                          بلا صورة
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-burgundy truncate">
                          {p.onlineName || cleanProductName(p.name)}
                        </h4>
                        {p.sku && (
                          <span className="text-[9px] font-mono bg-burgundy/8 px-1.5 py-0.2 rounded text-burgundy/70">
                            #{p.sku}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-burgundy/50 mt-0.5">
                        <span>المخزن: {p.name}</span>
                        <span>•</span>
                        <span>{EGP(p.price)}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                          imgCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {imgCount > 0 ? `${imgCount} صور` : 'بدون صور'}
                        </span>

                        {hasCustomName && (
                          <span className="text-[9px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                            اسم مخصص
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-burgundy/40 text-xs">←</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Panel (Right side) */}
        <div className="lg:col-span-7">
          {selectedProduct ? (
            <div className="rounded-[2.5rem] border border-burgundy/15 bg-white p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-burgundy/10 pb-4">
                <span className="text-[10px] font-mono text-burgundy/50 uppercase tracking-widest">
                  كود المخزن: #{selectedProduct.sku || 'N/A'} • الفئة: {selectedProduct.category}
                </span>
                <h3 className="text-xl font-bold text-burgundy mt-1">
                  تعديل عرض: {selectedProduct.name}
                </h3>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-6">
                {/* Online Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-burgundy flex items-center justify-between">
                    <span>اسم العرض في الموقع (Online Display Name)</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">
                      يظهر لزائرات الموقع حصرياً
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editForm.onlineName}
                    onChange={(e) => setEditForm(p => ({ ...p, onlineName: e.target.value }))}
                    placeholder="مثال: فستان حرير سواريه كلاسيك"
                    className="w-full rounded-xl border border-burgundy/20 bg-white px-4 py-3 text-sm text-burgundy outline-none focus:border-burgundy"
                  />
                  <p className="text-[10px] text-burgundy/50 leading-relaxed">
                    إذا تركت هذا الحقل فارغاً، سيظهر الاسم الأصلي بعد تنظيف الأرقام منه تلقائياً.
                  </p>
                </div>

                {/* System Name Read-only Preview */}
                <div className="p-3.5 rounded-2xl bg-burgundy/3 border border-burgundy/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="block font-bold text-burgundy/70">اسم القطعة في سيستم الكاشير والمخزن:</span>
                    <span className="font-mono text-burgundy font-bold text-sm mt-0.5 block">{selectedProduct.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-burgundy/50">سعر البيع</span>
                    <span className="font-bold text-burgundy text-sm">{EGP(selectedProduct.price)}</span>
                  </div>
                </div>

                {/* Direct Image Uploader */}
                <div className="pt-2 border-t border-burgundy/10">
                  <ImageUploader
                    images={editForm.images}
                    onChange={(imgs) => setEditForm(p => ({ ...p, images: imgs }))}
                    label="صور المنتج في الموقع"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-4 border-t border-burgundy/10 flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-full bg-burgundy py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#650018] disabled:opacity-60"
                  >
                    {saving ? 'جاري الحفظ...' : 'حفظ التعديلات للمتجر'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="rounded-full border border-burgundy/20 px-6 py-3.5 text-sm font-bold text-burgundy hover:bg-burgundy/5"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-[2.5rem] border border-dashed border-burgundy/20 bg-white/40 p-12 text-center text-burgundy/50 space-y-3">
              <div className="w-12 h-12 rounded-full bg-burgundy/5 text-burgundy flex items-center justify-center mx-auto text-xl font-bold">
                👆
              </div>
              <h4 className="font-bold text-base text-burgundy">اختر منتجاً من القائمة على اليمين</h4>
              <p className="text-xs text-burgundy/60 max-w-sm mx-auto">
                يمكنك رفع صوره من الموبايل أو الكمبيوتر بضغطة زر واحدة وتحديد اسمه الجذاب في المتجر.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
