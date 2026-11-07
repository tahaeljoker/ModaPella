import { useState, useEffect } from 'react';
import api from '../services/api';
import ImageUploader from './ImageUploader';
import MannequinImageUploader from './MannequinImageUploader';
import ColorImagesMapper from './ColorImagesMapper';
import { cleanProductName } from '../utils/discount';
import { resolveImageUrl } from '../utils/imageUrl';
import { getColorHex } from '../utils/colorSwatches';
import { Icon } from './Icon';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const PRESET_SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "Free Size", "36", "38", "40", "42", "44", "46"];
const PRESET_COLORS = [
  "أحمر", "أخضر", "بورجندي", "أسود", "أبيض", "بيج", 
  "كحلي", "سماوي", "زيتي", "سيمون", "لافندر", "وردي", 
  "أصفر", "بني", "رصاصي", "موف", "كشمير"
];

const DEFAULT_CATEGORIES = [
  { key: 'Blouse', nameAr: 'بلوزة' },
  { key: 'Chemise', nameAr: 'قميص' },
  { key: 'Skirt', nameAr: 'تنورة' },
  { key: 'Dress', nameAr: 'فستان' },
  { key: 'Pantalon', nameAr: 'بنطال' },
  { key: 'T-shirt', nameAr: 'تيشيرت' },
  { key: 'Portefeuille', nameAr: 'محفظة' },
  { key: 'Jacket', nameAr: 'جاكيت' }
];

export default function AdminOnlineCatalog({ onToast }) {
  const [products, setProducts] = useState([]);
  const [siteConfig, setSiteConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'Dress',
    onlineName: '',
    price: '',
    stock: 1,
    description: '',
    images: [],
    mannequinImage: '',
    sizes: [],
    colors: [],
    colorImages: [],
    showOnWebsite: true,
    season: 'winter',
    allowDiscount: true,
    discountPrice: '',
    discountStartDate: '',
    discountEndDate: ''
  });
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
    
    // Parse sizes
    let parsedSizes = [];
    if (Array.isArray(p.sizes)) {
      parsedSizes = p.sizes.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof p.sizes === 'string') {
      parsedSizes = p.sizes.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Parse colors
    let parsedColors = [];
    if (Array.isArray(p.colors)) {
      parsedColors = p.colors.map(c => String(c).trim()).filter(Boolean);
    } else if (typeof p.colors === 'string') {
      parsedColors = p.colors.split(',').map(c => c.trim()).filter(Boolean);
    }

    setEditForm({
      name: p.name || '',
      category: p.category || (siteConfig?.categories?.[0]?.key || 'Dress'),
      onlineName: p.onlineName || '',
      price: p.price ?? '',
      stock: p.stock ?? 1,
      description: p.description || '',
      images: Array.isArray(p.images) ? p.images : [],
      mannequinImage: p.mannequinImage || '',
      sizes: parsedSizes,
      colors: parsedColors,
      colorImages: Array.isArray(p.colorImages) ? p.colorImages : [],
      showOnWebsite: p.showOnWebsite !== false,
      season: p.season || 'winter',
      allowDiscount: p.allowDiscount !== false,
      discountPrice: p.discountPrice ?? '',
      discountStartDate: p.discountStartDate ? p.discountStartDate.slice(0, 16) : '',
      discountEndDate: p.discountEndDate ? p.discountEndDate.slice(0, 16) : ''
    });
  };

  const handleStartNewProduct = () => {
    const defaultCat = siteConfig?.categories?.[0]?.key || 'Dress';
    const newP = {
      _id: 'new_' + Date.now(),
      isNew: true,
      name: '',
      category: defaultCat,
      price: 0,
      stock: 5,
      showOnWebsite: true,
      season: currentWebsiteSeason !== 'all' ? currentWebsiteSeason : 'winter'
    };
    setSelectedProduct(newP);
    setEditForm({
      name: '',
      category: defaultCat,
      onlineName: '',
      price: '',
      stock: 5,
      description: '',
      images: [],
      mannequinImage: '',
      sizes: ['S', 'M', 'L'],
      colors: [],
      colorImages: [],
      showOnWebsite: true,
      season: newP.season,
      allowDiscount: true,
      discountPrice: '',
      discountStartDate: '',
      discountEndDate: ''
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSaving(true);
    try {
      const payload = {
        name: (editForm.name || selectedProduct.name || 'قطعة جديدة').trim(),
        category: editForm.category || selectedProduct.category || 'Dress',
        onlineName: (editForm.onlineName || '').trim(),
        price: Number(editForm.price) || 0,
        stock: Math.max(0, Number(editForm.stock) || 0),
        description: (editForm.description || '').trim(),
        images: editForm.images || [],
        mannequinImage: editForm.mannequinImage || '',
        sizes: editForm.sizes || [],
        colors: editForm.colors || [],
        colorImages: editForm.colorImages || [],
        showOnWebsite: editForm.showOnWebsite,
        season: editForm.season,
        allowDiscount: editForm.allowDiscount !== false,
        discountPrice: editForm.discountPrice && Number(editForm.discountPrice) > 0 ? Number(editForm.discountPrice) : null,
        discountStartDate: editForm.discountStartDate ? new Date(editForm.discountStartDate) : null,
        discountEndDate: editForm.discountEndDate ? new Date(editForm.discountEndDate) : null
      };

      if (selectedProduct.isNew) {
        // Create new product
        const res = await api.post('/admin/products', payload);
        const created = res.data;
        onToast?.('تمت إضافة المنتج بنجاح ونشره في المتجر 🌐');
        setProducts(prev => [created, ...prev]);
        setSelectedProduct(created);
      } else {
        // Update existing product
        const fullPayload = { ...selectedProduct, ...payload };
        await api.put(`/admin/products/${selectedProduct._id}`, fullPayload);
        onToast?.('تم حفظ جميع تعديلات المنتج، الصور، والخصومات بنجاح ✓');
        
        setProducts(prev => prev.map(item => item._id === selectedProduct._id ? { ...item, ...payload } : item));
        setSelectedProduct(prev => ({ ...prev, ...payload }));
      }
    } catch (err) {
      console.error(err);
      onToast?.(err.response?.data?.message || 'فشل حفظ التعديلات');
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
      await api.post('/admin/products/bulk-season', {
        action: 'setWebsiteSeason',
        season: targetSeason
      });
      setSiteConfig(prev => ({ ...prev, websiteSeason: targetSeason }));
      onToast?.(`تم تغيير موسم المتجر الإلكتروني إلى: ${targetSeason === 'winter' ? 'الشتوي ❄️' : targetSeason === 'summer' ? 'الصيفي ☀️' : 'كل المواسم 🌟'}`);
    } catch (err) {
      console.error(err);
      onToast?.('فشل تغيير موسم المتجر');
    } finally {
      setSwitchingSeason(false);
    }
  };

  const handleToggleSize = (sz) => {
    setEditForm(prev => {
      const current = prev.sizes || [];
      const next = current.includes(sz) ? current.filter(s => s !== sz) : [...current, sz];
      return { ...prev, sizes: next };
    });
  };

  const handleToggleColor = (clr) => {
    setEditForm(prev => {
      const current = prev.colors || [];
      const next = current.includes(clr) ? current.filter(c => c !== clr) : [...current, clr];
      return { ...prev, colors: next };
    });
  };

  // Filter products for the list
  const filtered = products.filter(p => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchOnline = (p.onlineName || '').toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q);
      const matchSku = (p.sku || '').toLowerCase().includes(q);
      if (!matchName && !matchOnline && !matchCat && !matchSku) return false;
    }

    const isVisible = isVisibleOnline(p);
    const isHidden = p.showOnWebsite === false;
    const off = isOffSeason(p);
    const hasImages = Array.isArray(p.images) && p.images.length > 0;

    if (filterMode === 'visible') return isVisible;
    if (filterMode === 'offseason') return off;
    if (filterMode === 'hidden') return isHidden;
    if (filterMode === 'missing') return !hasImages;
    return true;
  });

  const visibleCount = products.filter(isVisibleOnline).length;
  const offSeasonCount = products.filter(isOffSeason).length;
  const hiddenCount = products.filter(p => p.showOnWebsite === false).length;
  const missingCount = products.filter(p => !p.images || p.images.length === 0).length;

  const categoriesList = siteConfig?.categories?.length ? siteConfig.categories : DEFAULT_CATEGORIES;

  // Calculate discount discount%
  const numPrice = Number(editForm.price) || 0;
  const numDiscount = Number(editForm.discountPrice) || 0;
  const hasValidDiscount = numDiscount > 0 && numPrice > 0 && numDiscount < numPrice;
  const discountPercent = hasValidDiscount ? Math.round((1 - numDiscount / numPrice) * 100) : 0;
  const savings = hasValidDiscount ? (numPrice - numDiscount) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner: Season Control & Quick Summary */}
      <div className="rounded-[2.5rem] border border-burgundy/15 bg-gradient-to-r from-burgundy/5 via-white to-amber-50/40 p-5 sm:p-7 shadow-soft space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-burgundy/60 flex items-center gap-1.5">
              <span>إدارة تشكيلة المتجر أونلاين</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-burgundy mt-1">
              المنتجات المعروضة في الموقع والصور والمقاسات والخصومات
            </h2>
            <p className="text-xs sm:text-sm text-burgundy/70 mt-1">
              تحكم كامل في كل ما يراه الزبون: الصور، المقاسات، الألوان، الخصومات المؤقتة، والأسعار في صفحة واحدة.
            </p>
          </div>

          {/* Current Season Switcher */}
          <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-burgundy/15 shadow-xs">
            <span className="text-xs font-bold text-burgundy px-2">موسم الموقع:</span>
            <button
              type="button"
              disabled={switchingSeason}
              onClick={() => handleSwitchWebsiteSeason('winter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentWebsiteSeason === 'winter'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-sky-800 hover:bg-sky-50'
              }`}
            >
              <Icon name="snowflake" className="w-4 h-4" />
              <span>شتوي</span>
            </button>

            <button
              type="button"
              disabled={switchingSeason}
              onClick={() => handleSwitchWebsiteSeason('summer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentWebsiteSeason === 'summer'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <Icon name="sun" className="w-4 h-4" />
              <span>صيفي</span>
            </button>

            <button
              type="button"
              disabled={switchingSeason}
              onClick={() => handleSwitchWebsiteSeason('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentWebsiteSeason === 'all'
                  ? 'bg-burgundy text-white shadow-sm'
                  : 'text-burgundy/70 hover:bg-burgundy/5'
              }`}
            >
              <Icon name="refresh" className="w-4 h-4" />
              <span>طوال العام</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-burgundy/10 text-xs">
          <button
            type="button"
            onClick={() => setFilterMode('visible')}
            className={`p-3 rounded-2xl border text-right transition cursor-pointer ${
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
            className={`p-3 rounded-2xl border text-right transition cursor-pointer ${
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
            className={`p-3 rounded-2xl border text-right transition cursor-pointer ${
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
            className={`p-3 rounded-2xl border text-right transition cursor-pointer ${
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

      {/* Filter and Search Bar + Add New Product Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-burgundy/5 p-1 rounded-2xl border border-burgundy/10 text-xs font-bold">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${filterMode === 'all' ? 'bg-burgundy text-white shadow-xs' : 'text-burgundy/60 hover:text-burgundy'}`}
            >
              الكل ({products.length})
            </button>
            <button
              onClick={() => setFilterMode('visible')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${filterMode === 'visible' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-900'}`}
            >
              معروض أونلاين ({visibleCount})
            </button>
            <button
              onClick={() => setFilterMode('offseason')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${filterMode === 'offseason' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-800 hover:text-amber-900'}`}
            >
              محجوب موسمي ({offSeasonCount})
            </button>
            <button
              onClick={() => setFilterMode('hidden')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${filterMode === 'hidden' ? 'bg-rose-700 text-white shadow-xs' : 'text-rose-700 hover:text-rose-900'}`}
            >
              مخفي ({hiddenCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الكود أو الفئة..."
              className="w-full rounded-2xl border border-burgundy/15 bg-white px-3.5 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
            />
          </div>

          <button
            type="button"
            onClick={handleStartNewProduct}
            className="rounded-2xl bg-burgundy hover:bg-[#650018] text-white px-4 py-2 text-xs font-bold shadow-md flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer"
          >
            <span className="text-base leading-none">+</span>
            <span>إضافة قطعة جديدة</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Products List (Left side) */}
        <div className="lg:col-span-5 rounded-[2rem] border border-burgundy/10 bg-white p-4 shadow-sm space-y-2.5 max-h-[820px] overflow-y-auto scrollbar-thin">
          <div className="flex justify-between items-center px-2 pb-2 border-b border-burgundy/5 text-xs text-burgundy/60">
            <span>المنتجات ({filtered.length})</span>
            <span>اضغط لاختيار وتعديل المنتج</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-burgundy/40">جاري تحميل المنتجات...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-burgundy/40">لا توجد منتجات مطابقة للبحث أو الفلتر</div>
          ) : (
            filtered.map(p => {
              const isSelected = selectedProduct?._id === p._id;
              const isVisible = isVisibleOnline(p);
              const isHidden = p.showOnWebsite === false;
              const off = isOffSeason(p);
              const imgCount = Array.isArray(p.images) ? p.images.length : 0;
              const thumb = imgCount > 0 ? resolveImageUrl(p.images[0]) : null;
              const sizesCount = Array.isArray(p.sizes) ? p.sizes.length : 0;
              const colorsCount = Array.isArray(p.colors) ? p.colors.length : 0;

              return (
                <div
                  key={p._id}
                  onClick={() => handleSelectProduct(p)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-burgundy bg-burgundy/5 shadow-sm ring-2 ring-burgundy/20'
                      : 'border-burgundy/10 hover:border-burgundy/30 bg-white hover:bg-stone-50/50'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-16 rounded-xl overflow-hidden bg-beige/10 shrink-0 border border-burgundy/10 flex items-center justify-center">
                    {thumb ? (
                      <img src={thumb} alt={p.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xl opacity-30">👗</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-burgundy truncate">{cleanProductName(p)}</span>
                      {p.sku && <span className="text-[10px] text-burgundy/40 font-mono">#{p.sku}</span>}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-burgundy">{EGP(p.price)}</span>
                      {p.discountPrice > 0 && p.discountPrice < p.price && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.2 rounded font-bold">
                          خصم {Math.round((1 - p.discountPrice / p.price) * 100)}%
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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

                      {(sizesCount > 0 || colorsCount > 0) && (
                        <span className="text-[9px] text-burgundy/60 font-medium">
                          {sizesCount > 0 && `${sizesCount} مقاسات`}
                          {sizesCount > 0 && colorsCount > 0 && ' · '}
                          {colorsCount > 0 && `${colorsCount} ألوان`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick 1-click Toggle Online Button */}
                  <button
                    type="button"
                    onClick={(e) => handleQuickToggleShow(e, p)}
                    title={p.showOnWebsite !== false ? 'اضغط للإخفاء من المتجر أونلاين' : 'اضغط للعرض في المتجر أونلاين'}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                      p.showOnWebsite !== false
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                    }`}
                  >
                    {p.showOnWebsite !== false ? '🌐' : '🚫'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Edit Panel (Right side) - Unified Single Page Editor */}
        <div className="lg:col-span-7">
          {selectedProduct ? (
            <div className="rounded-[2.5rem] border border-burgundy/15 bg-white p-5 sm:p-7 shadow-sm space-y-6">
              {/* Header */}
              <div className="border-b border-burgundy/10 pb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono text-burgundy/50 uppercase tracking-widest">
                    {selectedProduct.isNew ? '✨ قطعة جديدة تماماً' : `كود: #${selectedProduct.sku || 'N/A'} • الفئة: ${selectedProduct.category}`}
                  </span>
                  <h3 className="text-xl font-black text-burgundy mt-1">
                    {selectedProduct.isNew ? 'إضافة منتج جديد للمتجر الإلكتروني' : `تعديل: ${cleanProductName(selectedProduct)}`}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {!selectedProduct.isNew && (
                    <a
                      href={`/product/${selectedProduct._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-burgundy/5 hover:bg-burgundy/10 text-burgundy font-bold px-3 py-1.5 rounded-full border border-burgundy/15 flex items-center gap-1 transition"
                    >
                      <span>معاينة بالموقع</span>
                      <span>↗</span>
                    </a>
                  )}
                  {editForm.showOnWebsite && !isOffSeason(editForm) ? (
                    <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-full font-bold">
                      معروض للعملاء أونلاين 🌐
                    </span>
                  ) : !editForm.showOnWebsite ? (
                    <span className="text-xs bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1.5 rounded-full font-bold">
                      مخفي من الموقع 🚫
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-full font-bold">
                      محجوب موسمي ⚠️
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-6">
                {/* ── CARD 1: Photos & Mannequin ── */}
                <div className="rounded-2xl border border-burgundy/15 bg-[#FAF7F5]/60 p-4 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-burgundy uppercase tracking-wider flex items-center gap-1.5">
                      <span>📸 صور المنتج وصورة المانيكان</span>
                    </h4>
                    <span className="text-[10px] text-burgundy/50">تظهر للعملاء في المتجر وسلايدر الصور</span>
                  </div>

                  <ImageUploader
                    images={editForm.images}
                    onChange={(imgs) => setEditForm(p => ({ ...p, images: imgs }))}
                    label="صور المنتج للمعرض والموقع (اضغط لرفع صور الموبايل مباشرة)"
                  />

                  <div className="pt-2 border-t border-burgundy/10">
                    <MannequinImageUploader
                      value={editForm.mannequinImage || ''}
                      onChange={(newUrl) => setEditForm(p => ({ ...p, mannequinImage: newUrl }))}
                    />
                  </div>
                </div>

                {/* ── CARD 2: Basic Info, Prices & Stock ── */}
                <div className="rounded-2xl border border-burgundy/15 bg-white p-4 space-y-4 shadow-xs">
                  <h4 className="text-xs font-black text-burgundy uppercase tracking-wider flex items-center gap-1.5">
                    <span>🏷️ بيانات القطعة، السعر والمخزون أونلاين</span>
                  </h4>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* System Name */}
                    <div>
                      <label className="block text-xs font-bold text-burgundy/70 mb-1">اسم المنتج الأساسي *</label>
                      <input
                        type="text"
                        required
                        value={editForm.name}
                        onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="مثال: جاكيت جوخ كلاسيك 102"
                        className="w-full rounded-xl border border-burgundy/20 bg-white px-3.5 py-2.5 text-xs font-bold text-burgundy outline-none focus:border-burgundy"
                      />
                    </div>

                    {/* Online Display Name */}
                    <div>
                      <label className="block text-xs font-bold text-emerald-800 mb-1 flex items-center justify-between">
                        <span>اسم العرض المميز بالموقع (اختياري)</span>
                        <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">يظهر للزبائن</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.onlineName}
                        onChange={(e) => setEditForm(p => ({ ...p, onlineName: e.target.value }))}
                        placeholder="مثال: جاكيت جوخ شتوي فاخر بياقة فرو"
                        className="w-full rounded-xl border border-emerald-300 bg-emerald-50/20 px-3.5 py-2.5 text-xs font-bold text-burgundy outline-none focus:border-emerald-600"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-xs font-bold text-burgundy/70 mb-1">الفئة / القسم *</label>
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm(p => ({ ...p, category: e.target.value }))}
                        className="w-full rounded-xl border border-burgundy/20 bg-white px-3.5 py-2.5 text-xs font-bold text-burgundy outline-none focus:border-burgundy"
                      >
                        {categoriesList.map(c => (
                          <option key={c.key} value={c.key}>{c.nameAr} ({c.key})</option>
                        ))}
                      </select>
                    </div>

                    {/* Original Price */}
                    <div>
                      <label className="block text-xs font-bold text-burgundy/70 mb-1">سعر البيع الأصلي (ج.م) *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={editForm.price}
                        onChange={(e) => setEditForm(p => ({ ...p, price: e.target.value }))}
                        placeholder="مثال: 850"
                        className="w-full rounded-xl border border-burgundy/20 bg-white px-3.5 py-2.5 text-xs font-bold text-burgundy outline-none focus:border-burgundy font-mono"
                      />
                    </div>

                    {/* Available Stock */}
                    <div>
                      <label className="block text-xs font-bold text-burgundy/70 mb-1">المخزون المتاح للبيع أونلاين *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={editForm.stock}
                        onChange={(e) => setEditForm(p => ({ ...p, stock: e.target.value }))}
                        placeholder="مثال: 5 أو 10"
                        className="w-full rounded-xl border border-burgundy/20 bg-white px-3.5 py-2.5 text-xs font-bold text-burgundy outline-none focus:border-burgundy font-mono"
                      />
                      <p className="text-[10px] text-burgundy/50 mt-1">إذا كان 5 أو أقل، سيظهر للعميلة تنبيه "كمية محدودة 🔥"</p>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold text-burgundy/70 mb-1">وصف وخامة القطعة</label>
                      <textarea
                        rows={2}
                        value={editForm.description}
                        onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="خامة صوفية عالية الجودة، مبطن بالكامل، تصميم أنيق..."
                        className="w-full rounded-xl border border-burgundy/20 bg-white px-3.5 py-2 text-xs text-burgundy outline-none focus:border-burgundy resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* ── CARD 3: Limited-Time Discount & Offer ── */}
                <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔥</span>
                      <h4 className="text-xs font-black text-red-800 uppercase tracking-wider">
                        عرض وتخفيض سعري لفترة محدودة
                      </h4>
                    </div>
                    {hasValidDiscount && (
                      <span className="rounded-full bg-red-600 px-3 py-0.5 text-xs font-extrabold text-white shadow-xs">
                        خصم {discountPercent}% — وفري {EGP(savings)}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-bold text-red-900 mb-1">
                        سعر الخصم بعد التخفيض (ج.م)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.discountPrice}
                        onChange={(e) => setEditForm(p => ({ ...p, discountPrice: e.target.value }))}
                        placeholder="اتركه فارغاً لإلغاء الخصم"
                        className="w-full rounded-xl border border-red-300 bg-white px-3.5 py-2 text-xs font-bold text-red-900 outline-none focus:border-red-500 font-mono"
                      />
                      <p className="text-[10px] text-red-700/70 mt-1">اتركه فارغاً إذا كان المنتج يباع بسعره الأصلي</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-red-900 mb-1">
                        تاريخ بداية الخصم (اختياري)
                      </label>
                      <input
                        type="datetime-local"
                        value={editForm.discountStartDate}
                        onChange={(e) => setEditForm(p => ({ ...p, discountStartDate: e.target.value }))}
                        className="w-full rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-900 outline-none focus:border-red-500"
                      />
                      <p className="text-[10px] text-red-700/70 mt-1">لو فارغ، يبدأ الخصم فوراً</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-red-900 mb-1">
                        تاريخ نهاية الخصم المؤقت (اختياري)
                      </label>
                      <input
                        type="datetime-local"
                        value={editForm.discountEndDate}
                        onChange={(e) => setEditForm(p => ({ ...p, discountEndDate: e.target.value }))}
                        className="w-full rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-900 outline-none focus:border-red-500"
                      />
                      <p className="text-[10px] text-red-700/70 mt-1">عند انتهائه يعود السعر الأصلي تلقائياً</p>
                    </div>
                  </div>
                </div>

                {/* ── CARD 4: Sizes, Colors & Color Images ── */}
                <div className="rounded-2xl border border-burgundy/15 bg-white p-4 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-burgundy uppercase tracking-wider flex items-center gap-1.5">
                      <span>👗 المقاسات والألوان المتاحة بالمحل</span>
                    </h4>
                    <span className="text-[10px] text-burgundy/50">تظهر كخيارات لاختيار العميل عند الشراء</span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Sizes Selector */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-burgundy/80">المقاسات المتاحة:</label>
                        <span className="text-[10px] font-bold text-burgundy/60 bg-burgundy/5 px-2 py-0.5 rounded-full">
                          {editForm.sizes.length} مقاسات مختارة
                        </span>
                      </div>
                      
                      {/* Quick Chips */}
                      <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-beige/10 border border-burgundy/10">
                        {PRESET_SIZES.map(sz => {
                          const isSel = editForm.sizes.includes(sz);
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => handleToggleSize(sz)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                isSel
                                  ? 'bg-burgundy text-white border-burgundy shadow-xs ring-1 ring-burgundy/30'
                                  : 'bg-white text-burgundy/70 border-burgundy/15 hover:bg-white hover:border-burgundy/40'
                              }`}
                            >
                              {sz} {isSel && '✓'}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom sizes comma-separated */}
                      <div>
                        <input
                          type="text"
                          value={editForm.sizes.join(', ')}
                          onChange={(e) => {
                            const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            setEditForm(p => ({ ...p, sizes: arr }));
                          }}
                          placeholder="أو اكتب مقاسات مخصصة مفصولة بفاصلة (مثال: S, M, L, XL)"
                          className="w-full rounded-xl border border-burgundy/15 bg-white px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
                        />
                      </div>
                    </div>

                    {/* Colors Selector */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-burgundy/80">الألوان المتاحة:</label>
                        <span className="text-[10px] font-bold text-burgundy/60 bg-burgundy/5 px-2 py-0.5 rounded-full">
                          {editForm.colors.length} ألوان مختارة
                        </span>
                      </div>

                      {/* Quick Color Chips */}
                      <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-beige/10 border border-burgundy/10 max-h-36 overflow-y-auto scrollbar-thin">
                        {PRESET_COLORS.map(clr => {
                          const isSel = editForm.colors.includes(clr);
                          const hex = getColorHex(clr);
                          return (
                            <button
                              key={clr}
                              type="button"
                              onClick={() => handleToggleColor(clr)}
                              className={`px-2 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                                isSel
                                  ? 'bg-burgundy text-white border-burgundy shadow-xs ring-1 ring-burgundy/30'
                                  : 'bg-white text-burgundy/70 border-burgundy/15 hover:bg-white'
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
                                style={{ backgroundColor: hex }}
                              />
                              <span>{clr}</span>
                              {isSel && <span>✓</span>}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom colors comma-separated */}
                      <div>
                        <input
                          type="text"
                          value={editForm.colors.join(', ')}
                          onChange={(e) => {
                            const arr = e.target.value.split(',').map(c => c.trim()).filter(Boolean);
                            setEditForm(p => ({ ...p, colors: arr }));
                          }}
                          placeholder="أو اكتب ألوان مفصولة بفاصلة (مثال: أحمر, أسود, بيج)"
                          className="w-full rounded-xl border border-burgundy/15 bg-white px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Assign specific images to each color */}
                  {editForm.colors.length > 0 && (
                    <div className="pt-3 border-t border-burgundy/10">
                      <ColorImagesMapper
                        colors={editForm.colors}
                        colorImages={editForm.colorImages}
                        productImages={editForm.images}
                        onChange={(newColorImages) => setEditForm(p => ({ ...p, colorImages: newColorImages }))}
                      />
                    </div>
                  )}
                </div>

                {/* ── CARD 5: Season & Online Visibility ── */}
                <div className="rounded-2xl border border-burgundy/15 bg-burgundy/3 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-burgundy flex items-center gap-1.5">
                        <Icon name="site" className="w-4 h-4" />
                        <span>عرض ونشر في المتجر الإلكتروني</span>
                      </h4>
                      <p className="text-[11px] text-burgundy/60 mt-0.5">
                        لو تم إيقافه، القطعة بتختفي من الموقع أونلاين فوراً وبتفضل متاحة في المحل والكاشير.
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
                  <div className="pt-2 border-t border-burgundy/10">
                    <span className="block text-xs font-bold text-burgundy mb-1.5">موسم القطعة:</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditForm(p => ({ ...p, season: 'winter' }))}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
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
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
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
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          editForm.season === 'all'
                            ? 'bg-burgundy text-white border-burgundy shadow-sm'
                            : 'bg-white text-burgundy border-burgundy/20 hover:bg-burgundy/5'
                        }`}
                      >
                        <Icon name="refresh" className="w-3.5 h-3.5" />
                        <span>طوال العام</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2 border-t border-burgundy/10 flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-full bg-burgundy py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#650018] disabled:opacity-60 cursor-pointer active:scale-[0.98]"
                  >
                    {saving ? 'جاري الحفظ...' : selectedProduct.isNew ? '✨ إضافة ونشر المنتج في المتجر' : 'حفظ جميع التعديلات والخصومات للمتجر'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="rounded-full border border-burgundy/20 px-6 py-3.5 text-sm font-bold text-burgundy hover:bg-burgundy/5 cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-[2.5rem] border border-dashed border-burgundy/20 bg-white/40 p-12 text-center text-burgundy/50 space-y-3">
              <div className="w-14 h-14 rounded-full bg-burgundy/5 text-burgundy flex items-center justify-center mx-auto text-2xl font-bold">
                👆
              </div>
              <h4 className="font-extrabold text-base text-burgundy">اختر منتجاً من القائمة أو أضف منتجاً جديداً</h4>
              <p className="text-xs text-burgundy/60 max-w-sm mx-auto leading-relaxed">
                يمكنك من هذه الشاشة الواحدة رفع صور الموبايل، تخصيص المقاسات والألوان، صور المانيكان، وتفعيل عروض وخصومات محددة بالوقت مباشرة!
              </p>
              <button
                type="button"
                onClick={handleStartNewProduct}
                className="inline-flex items-center gap-1.5 rounded-full bg-burgundy text-white px-5 py-2.5 text-xs font-bold shadow-md hover:bg-[#650018] transition cursor-pointer"
              >
                <span>+ إضافة قطعة جديدة للمتجر أونلاين</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
