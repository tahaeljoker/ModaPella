import { useState, useEffect } from 'react';
import api from '../services/api';
import ImageUploader from './ImageUploader';
import MannequinImageUploader from './MannequinImageUploader';
import { cleanProductName } from '../utils/discount';
import { resolveImageUrl } from '../utils/imageUrl';
import { Icon } from './Icon';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

export default function AdminOnlineCatalog({ onToast }) {
  const [products, setProducts] = useState([]);
  const [siteConfig, setSiteConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editForm, setEditForm] = useState({ onlineName: '', images: [], showOnWebsite: true, season: 'winter' });
  const [saving, setSaving] = useState(false);
  const [switchingSeason, setSwitchingSeason] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'visible' | 'offseason' | 'hidden' | 'missing'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, configRes] = await Promise.all([
        api.get('/products?includeOffSeason=true'),
        api.get('/admin/site-config')
      ]);
      setProducts(prodRes.data || []);
      setSiteConfig(configRes.data || {});
    } catch (err) {
      console.error(err);
      onToast?.('فشل تحميل بيانات المتجر أونلاين');
    } finally {
      setLoading(false);
    }
  };

  const currentWebsiteSeason = siteConfig?.websiteSeason || 'winter';

  const isOffSeason = (p) => {
    if (!currentWebsiteSeason || currentWebsiteSeason === 'all') return false;
    const pSeason = p.season || 'all';
    return pSeason !== 'all' && pSeason !== currentWebsiteSeason;
  };

  const isVisibleOnline = (p) => {
    const isShow = p.showOnWebsite !== false;
    const isNotArchived = !p.isSeasonArchived;
    const isSeasonMatch = !isOffSeason(p);
    return isShow && isNotArchived && isSeasonMatch;
  };

  const handleSelectProduct = (p) => {
    setSelectedProduct(p);
    setEditForm({
      onlineName: p.onlineName || '',
      images: Array.isArray(p.images) ? p.images : [],
      showOnWebsite: p.showOnWebsite !== false,
      season: p.season || 'winter',
      mannequinImage: p.mannequinImage || ''
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
        images: editForm.images,
        showOnWebsite: editForm.showOnWebsite,
        season: editForm.season,
        mannequinImage: editForm.mannequinImage || ''
      };

      await api.put(`/admin/products/${selectedProduct._id}`, payload);
      onToast?.('تم حفظ إعدادات المنتج للمتجر بنجاح');
      
      setProducts(prev => prev.map(item => item._id === selectedProduct._id ? { ...item, ...payload } : item));
      setSelectedProduct(prev => ({ ...prev, ...payload }));
    } catch (err) {
      console.error(err);
      onToast?.('فشل حفظ التعديلات');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggleShow = async (e, p) => {
    e.stopPropagation();
    const nextVal = !(p.showOnWebsite !== false);
    try {
      await api.put(`/admin/products/${p._id}`, { ...p, showOnWebsite: nextVal });
      setProducts(prev => prev.map(item => item._id === p._id ? { ...item, showOnWebsite: nextVal } : item));
      if (selectedProduct?._id === p._id) {
        setSelectedProduct(prev => ({ ...prev, showOnWebsite: nextVal }));
        setEditForm(prev => ({ ...prev, showOnWebsite: nextVal }));
      }
      onToast?.(nextVal ? `تم إتاحة "${cleanProductName(p.name)}" في المتجر أونلاين 🌐` : `تم إخفاء "${cleanProductName(p.name)}" من المتجر أونلاين 🚫`);
    } catch (err) {
      console.error(err);
      onToast?.('فشل تحديث حالة العرض');
    }
  };

  const handleSwitchWebsiteSeason = async (targetSeason) => {
    try {
      setSwitchingSeason(true);
      const res = await api.post('/admin/products/bulk-season', {
        action: 'setWebsiteSeason',
        season: targetSeason
      });
      setSiteConfig(prev => ({ ...prev, websiteSeason: targetSeason }));
      onToast?.(res.data?.message || 'تم تحديث موسم المتجر أونلاين');
    } catch (err) {
      console.error(err);
      onToast?.('فشل تغيير موسم المتجر');
    } finally {
      setSwitchingSeason(false);
    }
  };

  // Filtered Products
  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const nameMatch = (p.name || '').toLowerCase().includes(q);
    const onlineNameMatch = (p.onlineName || '').toLowerCase().includes(q);
    const skuMatch = (p.sku || '').toLowerCase().includes(q);
    const catMatch = (p.category || '').toLowerCase().includes(q);
    const matchesSearch = nameMatch || onlineNameMatch || skuMatch || catMatch;
    if (!matchesSearch) return false;

    const hasImages = p.images && p.images.length > 0;
    const off = isOffSeason(p);
    const hidden = p.showOnWebsite === false;
    const visible = isVisibleOnline(p);

    if (filterMode === 'visible') return visible;
    if (filterMode === 'offseason') return off;
    if (filterMode === 'hidden') return hidden;
    if (filterMode === 'missing') return !hasImages;

    return true;
  });

  const visibleCount = products.filter(p => isVisibleOnline(p)).length;
  const offSeasonCount = products.filter(p => isOffSeason(p)).length;
  const hiddenCount = products.filter(p => p.showOnWebsite === false).length;
  const missingCount = products.filter(p => !p.images || p.images.length === 0).length;

  return (
    <div className="space-y-6">
      {/* Website Season Control Banner */}
      <div className="rounded-[2.5rem] border border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-amber-50/60 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-sky-100 text-sky-700">
                <Icon name="site" className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-burgundy flex items-center gap-2">
                  <span>التحكم في موسم المتجر الإلكتروني (الموقع أونلاين)</span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    currentWebsiteSeason === 'winter'
                      ? 'bg-sky-100 text-sky-800 border-sky-300'
                      : currentWebsiteSeason === 'summer'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-purple-100 text-purple-800 border-purple-300'
                  }`}>
                    {currentWebsiteSeason === 'winter' ? 'الموقع شتوي حالياً ❄️' : currentWebsiteSeason === 'summer' ? 'الموقع صيفي حالياً ☀️' : 'كل المواسم معروضة 🔄'}
                  </span>
                </h3>
                <p className="text-xs text-burgundy/60 mt-0.5">
                  حدد الموسم النشط للموقع. المنتجات غير المطابقة لموسم الموقع ستُحجب تلقائياً عن الزوار دون التأثير على الكاشير.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Season Switcher */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-burgundy/15 shadow-xs">
            <button
              type="button"
              disabled={switchingSeason}
              onClick={() => handleSwitchWebsiteSeason('winter')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                currentWebsiteSeason === 'winter'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-sky-800 hover:bg-sky-50'
              }`}
            >
              <Icon name="snowflake" className="w-4 h-4" />
              <span>موسم شتوي</span>
            </button>

            <button
              type="button"
              disabled={switchingSeason}
              onClick={() => handleSwitchWebsiteSeason('summer')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                currentWebsiteSeason === 'summer'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <Icon name="sun" className="w-4 h-4" />
              <span>موسم صيفي</span>
            </button>

            <button
              type="button"
              disabled={switchingSeason}
              onClick={() => handleSwitchWebsiteSeason('all')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                currentWebsiteSeason === 'all'
                  ? 'bg-burgundy text-white shadow-sm'
                  : 'text-burgundy/70 hover:bg-burgundy/5'
              }`}
            >
              <Icon name="refresh" className="w-4 h-4" />
              <span>كل المواسم</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-burgundy/10 text-xs">
          <button
            type="button"
            onClick={() => setFilterMode('visible')}
            className={`p-3 rounded-2xl border text-right transition ${
              filterMode === 'visible' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' : 'bg-white/80 border-emerald-200 hover:bg-emerald-50/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-800">معروض بالموقع الآن</span>
              <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full text-xs">{visibleCount}</span>
            </div>
            <p className="text-[10px] text-emerald-700/80 mt-1">مطابق للموسم ومفعّل للعامة</p>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('offseason')}
            className={`p-3 rounded-2xl border text-right transition ${
              filterMode === 'offseason' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' : 'bg-white/80 border-amber-200 hover:bg-amber-50/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-800">محجوب بسبب الموسم</span>
              <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full text-xs">{offSeasonCount}</span>
            </div>
            <p className="text-[10px] text-amber-700/80 mt-1">
              {currentWebsiteSeason === 'winter' ? 'بضاعة صيفية محجوبة تلقائياً' : currentWebsiteSeason === 'summer' ? 'بضاعة شتوية محجوبة تلقائياً' : 'لا يوجد حجب'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('hidden')}
            className={`p-3 rounded-2xl border text-right transition ${
              filterMode === 'hidden' ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400' : 'bg-white/80 border-rose-200 hover:bg-rose-50/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-800">مخفي يدوياً</span>
              <span className="bg-rose-100 text-rose-900 font-bold px-2 py-0.5 rounded-full text-xs">{hiddenCount}</span>
            </div>
            <p className="text-[10px] text-rose-700/80 mt-1">معطل بواسطة المدير</p>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('missing')}
            className={`p-3 rounded-2xl border text-right transition ${
              filterMode === 'missing' ? 'bg-slate-50 border-slate-300 ring-2 ring-slate-400' : 'bg-white/80 border-slate-200 hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">بدون صور</span>
              <span className="bg-slate-200 text-slate-900 font-bold px-2 py-0.5 rounded-full text-xs">{missingCount}</span>
            </div>
            <p className="text-[10px] text-slate-600 mt-1">يحتاج رفع صور لعرضه بالموقع</p>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-burgundy/5 p-1 rounded-2xl border border-burgundy/10 text-xs font-bold">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl transition ${filterMode === 'all' ? 'bg-burgundy text-white shadow-xs' : 'text-burgundy/60 hover:text-burgundy'}`}
            >
              الكل ({products.length})
            </button>
            <button
              onClick={() => setFilterMode('visible')}
              className={`px-3 py-1.5 rounded-xl transition ${filterMode === 'visible' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-900'}`}
            >
              معروض أونلاين ({visibleCount})
            </button>
            <button
              onClick={() => setFilterMode('offseason')}
              className={`px-3 py-1.5 rounded-xl transition ${filterMode === 'offseason' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-800 hover:text-amber-900'}`}
            >
              محجوب موسمي ({offSeasonCount})
            </button>
            <button
              onClick={() => setFilterMode('hidden')}
              className={`px-3 py-1.5 rounded-xl transition ${filterMode === 'hidden' ? 'bg-rose-700 text-white shadow-xs' : 'text-rose-700 hover:text-rose-900'}`}
            >
              مخفي يدوياً ({hiddenCount})
            </button>
          </div>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، الكود، أو الصنف..."
            className="w-full rounded-2xl border border-burgundy/15 bg-white px-4 py-2.5 text-xs text-burgundy outline-none focus:border-burgundy"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Products List (Left side) */}
        <div className="lg:col-span-5 rounded-[2rem] border border-burgundy/10 bg-white p-4 shadow-sm space-y-3 max-h-[750px] overflow-y-auto">
          <div className="flex justify-between items-center px-2 pb-2 border-b border-burgundy/5 text-xs text-burgundy/60">
            <span>المنتجات ({filtered.length})</span>
            <span>اضغط لاختيار منتج</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-burgundy/40">جاري تحميل المنتجات...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-burgundy/40">لا توجد منتجات مطابقة للبحث أو الفلتر</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(p => {
                const isSelected = selectedProduct?._id === p._id;
                const hasCustomName = Boolean(p.onlineName && p.onlineName.trim());
                const imgCount = p.images?.length || 0;
                const off = isOffSeason(p);
                const isHidden = p.showOnWebsite === false;
                const isShown = !isHidden && !off;

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
                    <div className="w-12 h-12 rounded-xl bg-burgundy/5 overflow-hidden flex-shrink-0 border border-burgundy/10 relative">
                      {p.images?.[0] ? (
                        <img src={resolveImageUrl(p.images[0])} alt="" className="w-full h-full object-cover" />
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

                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {/* Season Badge */}
                        {p.season === 'summer' && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 font-bold px-1.5 py-0.2 rounded-full">
                            صيفي ☀️
                          </span>
                        )}
                        {p.season === 'winter' && (
                          <span className="text-[9px] bg-sky-100 text-sky-800 border border-sky-300 font-bold px-1.5 py-0.2 rounded-full">
                            شتوي ❄️
                          </span>
                        )}
                        {(!p.season || p.season === 'all') && (
                          <span className="text-[9px] bg-purple-100 text-purple-800 border border-purple-200 font-bold px-1.5 py-0.2 rounded-full">
                            طوال العام 🌟
                          </span>
                        )}

                        {/* Online Status Badge */}
                        {isHidden ? (
                          <span className="text-[9px] bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.2 rounded-full font-bold">
                            مخفي 🚫
                          </span>
                        ) : off ? (
                          <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded-full font-bold">
                            محجوب موسمي ⚠️
                          </span>
                        ) : (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                            أونلاين 🌐
                          </span>
                        )}

                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                          imgCount > 0 ? 'bg-slate-100 text-slate-700' : 'bg-red-50 text-red-600'
                        }`}>
                          {imgCount > 0 ? `${imgCount} صور` : 'بدون صور'}
                        </span>
                      </div>
                    </div>

                    {/* Quick 1-click Toggle Online Button */}
                    <button
                      type="button"
                      onClick={(e) => handleQuickToggleShow(e, p)}
                      title={p.showOnWebsite !== false ? 'اضغط للإخفاء من المتجر أونلاين' : 'اضغط للعرض في المتجر أونلاين'}
                      className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center ${
                        p.showOnWebsite !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                      }`}
                    >
                      {p.showOnWebsite !== false ? '🌐' : '🚫'}
                    </button>
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
              <div className="border-b border-burgundy/10 pb-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-burgundy/50 uppercase tracking-widest">
                    كود المخزن: #{selectedProduct.sku || 'N/A'} • الفئة: {selectedProduct.category}
                  </span>
                  <h3 className="text-xl font-bold text-burgundy mt-1">
                    تعديل عرض: {selectedProduct.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {selectedProduct.showOnWebsite !== false && !isOffSeason(selectedProduct) ? (
                    <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full font-bold">
                      معروض حالياً للعملاء بالموقع 🌐
                    </span>
                  ) : selectedProduct.showOnWebsite === false ? (
                    <span className="text-xs bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 rounded-full font-bold">
                      مخفي من الموقع 🚫
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full font-bold">
                      محجوب بسبب الموسم ⚠️
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-6">
                {/* Online Visibility & Season Controls */}
                <div className="rounded-2xl border border-burgundy/15 bg-burgundy/3 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-burgundy flex items-center gap-1.5">
                        <Icon name="site" className="w-4 h-4" />
                        <span>إتاحة العرض على الموقع أونلاين</span>
                      </h4>
                      <p className="text-[11px] text-burgundy/60 mt-0.5">
                        عند الإيقاف، يختفي هذا المنتج من الموقع فوراً ويظل متاحاً في المحل والكاشير.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.showOnWebsite}
                        onChange={(e) => setEditForm(p => ({ ...p, showOnWebsite: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* Season selector */}
                  <div className="pt-3 border-t border-burgundy/10">
                    <span className="block text-xs font-bold text-burgundy mb-2">موسم المنتج:</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditForm(p => ({ ...p, season: 'winter' }))}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                          editForm.season === 'winter'
                            ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
                            : 'bg-white text-sky-800 border-sky-200 hover:bg-sky-50'
                        }`}
                      >
                        <Icon name="snowflake" className="w-3.5 h-3.5" />
                        <span>شتوي</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditForm(p => ({ ...p, season: 'summer' }))}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                          editForm.season === 'summer'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                            : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
                        }`}
                      >
                        <Icon name="sun" className="w-3.5 h-3.5" />
                        <span>صيفي</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditForm(p => ({ ...p, season: 'all' }))}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                          editForm.season === 'all'
                            ? 'bg-burgundy text-white border-burgundy shadow-sm'
                            : 'bg-white text-burgundy border-burgundy/20 hover:bg-burgundy/5'
                        }`}
                      >
                        <Icon name="refresh" className="w-3.5 h-3.5" />
                        <span>طوال العام</span>
                      </button>
                    </div>

                    {/* Seasonal Alert if off-season */}
                    {currentWebsiteSeason !== 'all' && editForm.season !== 'all' && editForm.season !== currentWebsiteSeason && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                        <span>⚠️</span>
                        <span>
                          موسم المتجر الإلكتروني حالياً <strong>{currentWebsiteSeason === 'winter' ? 'شتوي' : 'صيفي'}</strong>، وهذا المنتج <strong>{editForm.season === 'winter' ? 'شتوي' : 'صيفي'}</strong>، لذلك لن يظهر للزوار حتى يتم تحويل موسم الموقع.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

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
<div className="pt-2">
  <MannequinImageUploader
    value={editForm.mannequinImage || ''}
    onChange={(newUrl) => setEditForm(p => ({ ...p, mannequinImage: newUrl }))}
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
                يمكنك رفع صوره من الموبايل أو الكمبيوتر بضغطة زر واحدة، تحديد اسمه الجذاب، والتحكم في ظهوره وموسمه في المتجر.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
