import React, { useState } from 'react';
import api from '../../../services/api';
import { Icon } from '../../Icon';
import { resolveImageUrl } from '../../../utils/imageUrl';
import { isDiscountActive } from '../../../utils/discount';
import { printBarcode } from './useAdminProducts';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const getProductIcon = () => (
  <svg className="w-5 h-5 text-burgundy/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

export default function CatalogTab({ products, loading, onAdd, onEdit, onDelete, onShowHistory, onShowAnalytics, onRestock, categories, catAr, onRefresh, showToast, onOpenCategoryAnalytics, siteConfig = null, setSiteConfig = () => {} }) {
 const [filter, setFilter] = useState('All');
 const [filterSeason, setFilterSeason] = useState('All'); // 'All' | 'summer' | 'winter' | 'all' | 'archived'
 const [search, setSearch] = useState('');
 const [filterSupplier, setFilterSupplier] = useState('الكل');
 const [filterSize, setFilterSize] = useState('الكل');
 const [activeMenuId, setActiveMenuId] = useState(null);
 const [selectedIds, setSelectedIds] = useState([]);
 const [bulkLoading, setBulkLoading] = useState(false);
 const [seasonConfirmModal, setSeasonConfirmModal] = useState(null); // { targetSeason: 'winter' | 'summer' }

const arabicKeyboardMap = {
 'ض': 'Q', 'ص': 'W', 'ث': 'E', 'ق': 'R', 'ف': 'T', 'غ': 'Y', 'ع': 'U', 'ه': 'I', 'خ': 'O', 'ح': 'P',
 'ج': 'C', 'د': 'D', 'ش': 'A', 'س': 'S', 'ي': 'D', 'ب': 'F', 'ل': 'G', 'ا': 'H', 'ت': 'J', 'ن': 'K',
 'م': 'L', 'ك': 'K', 'ط': 'T', 'ئ': 'Z', 'ء': 'X', 'ؤ': 'C', 'ر': 'V', 'ى': 'N', 'ة': 'M', 'و': 'W',
 'ز': 'Z', 'ظ': 'Z', 'ذ': 'Z', 'أ': 'H', 'إ': 'H', 'آ': 'H'
};

const translateArabicKeyboard = (str) => {
 if (!str) return '';
 let res = '';
 for (let char of str) {
 if (arabicKeyboardMap[char]) {
 res += arabicKeyboardMap[char];
 } else {
 res += char;
 }
 }
 return res;
};

const normalizeDigits = (str) => {
 if (!str) return '';
 const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
 let res = String(str);
 for (let i = 0; i < 10; i++) {
 res = res.replaceAll(arabicDigits[i], String(i));
 }
 return res;
};

 const productList = Array.isArray(products) ? products : [];
 const summerProducts = productList.filter(p => p.season === 'summer');
 const winterProducts = productList.filter(p => p.season === 'winter');
 const allYearProducts = productList.filter(p => !p.season || p.season === 'all');
 const archivedSummer = summerProducts.filter(p => p.isSeasonArchived).length;
 const activeSummer = summerProducts.length - archivedSummer;
 const archivedWinter = winterProducts.filter(p => p.isSeasonArchived).length;
 const activeWinter = winterProducts.length - archivedWinter;
 const totalArchived = productList.filter(p => p.isSeasonArchived).length;

 const suppliersList = Array.from(new Set(productList.map(p => p.supplier).filter(Boolean))).sort();
 const sizesList = Array.from(new Set(productList.flatMap(p => p.sizes || []).filter(Boolean))).sort();

 const translatedSearch = translateArabicKeyboard(search);
 const normalizedSearch = normalizeDigits(translatedSearch).trim().toLowerCase();

 const filtered = productList.filter(p => {
 const mc = filter === 'All' || p.category === filter;
 const pName = (p.name || '').toLowerCase();
 const pSku = (p.sku || '').toLowerCase();
 const pOldSku = (p.oldSku || '').toLowerCase();

 const ms = !search ||
 pName.includes(search.toLowerCase()) || pName.includes(normalizedSearch) ||
 pSku.includes(search.toLowerCase()) || pSku.includes(normalizedSearch) ||
 pOldSku.includes(search.toLowerCase()) || pOldSku.includes(normalizedSearch);

 const mSup = filterSupplier === 'الكل' || p.supplier === filterSupplier;
 const mSz = filterSize === 'الكل' || p.sizes?.includes(filterSize) || p.variants?.some(v => v.size === filterSize);

 let mSeason = true;
 if (filterSeason === 'summer') mSeason = p.season === 'summer';
 else if (filterSeason === 'winter') mSeason = p.season === 'winter';
 else if (filterSeason === 'all') mSeason = (!p.season || p.season === 'all');
 else if (filterSeason === 'archived') mSeason = Boolean(p.isSeasonArchived);

 return mc && ms && mSup && mSz && mSeason;
 });

  const handleSetWebsiteSeason = async (targetSeason) => {
    try {
      setBulkLoading(true);
      const res = await api.post('/admin/products/bulk-season', {
        action: 'setWebsiteSeason',
        season: targetSeason
      });
      showToast?.(res.data?.message || 'تم تحديث موسم المتجر أونلاين');
      setSiteConfig(prev => ({ ...prev, websiteSeason: targetSeason }));
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'فشل تحديث موسم المتجر أونلاين');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkSeason = async (action, extra = {}) => {
 if (selectedIds.length === 0) return;
 try {
 setBulkLoading(true);
 const res = await api.post('/admin/products/bulk-season', {
 action,
 productIds: selectedIds,
 ...extra
 });
 showToast?.(res.data?.message || 'تم تنفيذ العملية بنجاح');
 setSelectedIds([]);
 await onRefresh?.();
 } catch (err) {
 alert(err.response?.data?.message || err.message || 'فشل تنفيذ العملية');
 } finally {
 setBulkLoading(false);
 }
 };

 const handleConfirmSeasonSwitch = async () => {
 if (!seasonConfirmModal?.targetSeason) return;
 try {
 setBulkLoading(true);
 const res = await api.post('/admin/products/bulk-season', {
          action: 'switchActiveSeason',
          targetSeason: seasonConfirmModal.targetSeason
 });
 showToast?.(res.data?.message || 'تم تبديل الموسم بنجاح');
 setSeasonConfirmModal(null);
 setSelectedIds([]);
 await onRefresh?.();
 } catch (err) {
 alert(err.response?.data?.message || err.message || 'فشل تبديل الموسم');
 } finally {
 setBulkLoading(false);
 }
 };

 return (
 <div className="space-y-4">
 {/* Seasonal Switcher & Overview Header */}
 <div className="rounded-3xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-amber-50/50 p-5 shadow-sm space-y-4">
 <div className="flex flex-wrap items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2">
 <Icon name="cloud" className="w-5 h-5 text-sky-600" />
 <h4 className="text-base font-bold text-burgundy">نظام إدارة المخزون الموسمي (صيفي / شتوي)</h4>
 <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full border border-sky-200">ميزة حصرية</span>
 </div>
 <p className="text-xs text-burgundy/60 mt-1 max-w-xl leading-relaxed">
 يمكنك هنا تحديد بضاعة الصيف لتخزينها بالمستودع بضغطة زر فتختفي فوراً من الجرد والكاشير دون أن تفقد أي كمية أو كود باركود، وإتاحة بضاعة الشتاء للبيع والجرد.
 </p>

 {/* Online Website Season Control */}
 <div className="mt-3 p-3 rounded-2xl bg-white/80 border border-sky-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
 <div className="flex items-center gap-2">
 <span className="text-base">🌐</span>
 <div>
 <span className="text-xs font-bold text-burgundy">موسم المتجر الإلكتروني (الموقع أونلاين):</span>
 <span className={`mr-2 text-xs font-black px-2 py-0.5 rounded-full border ${
 siteConfig?.websiteSeason === 'winter'
 ? 'bg-sky-100 text-sky-800 border-sky-300'
 : siteConfig?.websiteSeason === 'summer'
 ? 'bg-amber-100 text-amber-800 border-amber-300'
 : 'bg-purple-100 text-purple-800 border-purple-300'
 }`}>
 {siteConfig?.websiteSeason === 'winter' ? 'الموقع شتوي ❄️ (يمنع الصيفي)' : siteConfig?.websiteSeason === 'summer' ? 'الموقع صيفي ☀️ (يمنع الشتوي)' : 'كل المواسم معروضة 🔄'}
 </span>
 </div>
 </div>

 <div className="flex items-center gap-1.5">
 <span className="text-[11px] text-burgundy/60 font-medium">التحويل السريع للموقع:</span>
 <button
 type="button"
 onClick={() => handleSetWebsiteSeason('winter')}
 disabled={bulkLoading}
 className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
 siteConfig?.websiteSeason === 'winter'
 ? 'bg-sky-600 text-white shadow-xs'
 : 'bg-white text-sky-800 border border-sky-200 hover:bg-sky-50'
 }`}
 >
 <span>❄️ شتوي</span>
 </button>
 <button
 type="button"
 onClick={() => handleSetWebsiteSeason('summer')}
 disabled={bulkLoading}
 className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
 siteConfig?.websiteSeason === 'summer'
 ? 'bg-amber-500 text-white shadow-xs'
 : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
 }`}
 >
 <span>☀️ صيفي</span>
 </button>
 <button
 type="button"
 onClick={() => handleSetWebsiteSeason('all')}
 disabled={bulkLoading}
 className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
 siteConfig?.websiteSeason === 'all'
 ? 'bg-burgundy text-white shadow-xs'
 : 'bg-white text-burgundy border border-burgundy/20 hover:bg-burgundy/5'
 }`}
 >
 <span>🔄 الكل</span>
 </button>
 </div>
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 <button
 type="button"
 onClick={() => setSeasonConfirmModal({ targetSeason: 'winter' })}
 disabled={bulkLoading}
 className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
 >
 <Icon name="snowflake" className="w-4 h-4 text-sky-600" />
 <span>التحويل للموسم الشتوي</span>
 </button>

 <button
 type="button"
 onClick={() => setSeasonConfirmModal({ targetSeason: 'summer' })}
 disabled={bulkLoading}
 className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
 >
 <Icon name="sun" className="w-4 h-4 text-amber-500" />
 <span>التحويل للموسم الصيفي</span>
 </button>
 </div>
 </div>

 {/* Stats Grid */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-burgundy/10 text-xs">
 <div className="bg-white/90 rounded-2xl p-3 border border-amber-200 shadow-sm">
 <div className="flex items-center justify-between">
 <span className="text-amber-800 font-bold flex items-center gap-1 text-xs">بضاعة صيفية</span>
 <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">{summerProducts.length}</span>
 </div>
 <p className="text-[11px] text-burgundy/60 mt-1.5 font-medium">
 معروض: <strong className="text-emerald-600">{activeSummer}</strong> | مخزن: <strong className="text-purple-700">{archivedSummer}</strong>
 </p>
 </div>

 <div className="bg-white/90 rounded-2xl p-3 border border-sky-200 shadow-sm">
 <div className="flex items-center justify-between">
 <span className="text-sky-800 font-bold flex items-center gap-1 text-xs">بضاعة شتوية</span>
 <span className="text-xs font-bold text-sky-900 bg-sky-100 px-2 py-0.5 rounded-full">{winterProducts.length}</span>
 </div>
 <p className="text-[11px] text-burgundy/60 mt-1.5 font-medium">
 معروض: <strong className="text-emerald-600">{activeWinter}</strong> | مخزن: <strong className="text-purple-700">{archivedWinter}</strong>
 </p>
 </div>

 <div className="bg-white/90 rounded-2xl p-3 border border-purple-200 shadow-sm">
 <div className="flex items-center justify-between">
 <span className="text-purple-800 font-bold flex items-center gap-1 text-xs">طوال العام</span>
 <span className="text-xs font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full">{allYearProducts.length}</span>
 </div>
 <p className="text-[11px] text-burgundy/60 mt-1.5 font-medium">
 أساسي ومستمر بكل المواسم
 </p>
 </div>

 <div className="bg-white/90 rounded-2xl p-3 border border-slate-200 shadow-sm">
 <div className="flex items-center justify-between">
 <span className="text-slate-800 font-bold flex items-center gap-1 text-xs">المخزن بالمستودع</span>
 <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">{totalArchived}</span>
 </div>
 <p className="text-[11px] text-burgundy/60 mt-1.5 font-medium">
 مستبعد تلقائياً من الكاشير والجرد
 </p>
 </div>
 </div>
 </div>

 {/* Filters row */}
 <div className="space-y-3">
 {/* Season Filter Tabs */}
 <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-burgundy/10 shadow-sm w-fit">
 <span className="text-xs font-bold text-burgundy/40 px-2">تصفية الموسم:</span>
 <button
 type="button"
 onClick={() => setFilterSeason('All')}
 className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${filterSeason === 'All' ? 'bg-burgundy text-white shadow-sm' : 'text-burgundy/60 hover:text-burgundy hover:bg-burgundy/5'}`}
 >
 الكل ({productList.length})
 </button>
 <button
 type="button"
 onClick={() => setFilterSeason('summer')}
 className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${filterSeason === 'summer' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-800 hover:bg-amber-50'}`}
 >
 صيفي ({summerProducts.length})
 </button>
 <button
 type="button"
 onClick={() => setFilterSeason('winter')}
 className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${filterSeason === 'winter' ? 'bg-sky-600 text-white shadow-sm' : 'text-sky-800 hover:bg-sky-50'}`}
 >
 شتوي ({winterProducts.length})
 </button>
 <button
 type="button"
 onClick={() => setFilterSeason('all')}
 className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${filterSeason === 'all' ? 'bg-purple-700 text-white shadow-sm' : 'text-purple-800 hover:bg-purple-50'}`}
 >
 طوال العام ({allYearProducts.length})
 </button>
 <button
 type="button"
 onClick={() => setFilterSeason('archived')}
 className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${filterSeason === 'archived' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}
 >
 المخزن بالمستودع ({totalArchived})
 </button>
 </div>

 <div className="flex flex-wrap items-center gap-3">
 <input
 type="text"
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="بحث بالاسم أو الكود..."
 className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none transition focus:border-burgundy min-w-[180px] flex-1 shadow-sm"
 />

 {/* Supplier Filter */}
 <select
 value={filterSupplier}
 onChange={e => setFilterSupplier(e.target.value)}
 className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy shadow-sm"
 >
 <option value="الكل">كل الموردين</option>
 {suppliersList.map(s => <option key={s} value={s}>{s}</option>)}
 </select>

 {/* Size Filter */}
 <select
 value={filterSize}
 onChange={e => setFilterSize(e.target.value)}
 className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy shadow-sm"
 >
 <option value="الكل">كل المقاسات</option>
 {sizesList.map(sz => <option key={sz} value={sz}>{sz}</option>)}
 </select>

 <div className="flex flex-wrap gap-1.5">
 {['All', ...categories].map(c => (
 <button
 key={c}
 onClick={() => setFilter(c)}
 className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filter === c ? 'bg-burgundy text-white' : 'border border-burgundy/20 text-burgundy hover:bg-burgundy/10'}`}
 >
 {c === 'All' ? 'الكل' : (catAr[c] || c)}
 </button>
 ))}
 {onOpenCategoryAnalytics && (
 <button
 type="button"
 onClick={() => onOpenCategoryAnalytics(filter === 'All' ? 'all' : filter)}
 className="rounded-full px-3.5 py-1.5 text-xs font-bold bg-amber-500/15 text-amber-900 border border-amber-500/30 hover:bg-amber-500/25 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
 title={`تحليل نشاط ومبيعات قسم ${catAr[filter] || filter} بالكامل`}
 >
 <span>📊</span>
 <span>{filter === 'All' ? 'تتبع نشاط الأقسام' : `نشاط قسم ${catAr[filter] || filter}`}</span>
 </button>
 )}
 </div>

 <div>
 <button
 onClick={onAdd}
 className="rounded-full bg-burgundy px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-burgundy/20 transition hover:bg-[#650018]"
 >
 + إضافة منتج
 </button>
 </div>
 </div>
 </div>

 {/* Table */}
 {loading ? (
 <div className="flex h-40 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
 </div>
 ) : filtered.length === 0 ? (
 <div className="rounded-[2rem] border border-burgundy/10 bg-white py-16 text-center">
 <p className="text-sm text-burgundy/40">لا توجد منتجات مطابقة للتصفية الحالية</p>
 </div>
 ) : (
 <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-x-auto">
 <div className="min-w-[950px]">
 <div className="grid grid-cols-[2.3fr_1fr_1fr_1.2fr_0.8fr_auto] gap-4 bg-[#F7F0EC] px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-burgundy/50 items-center">
 <div className="flex items-center gap-2.5">
 <input
 type="checkbox"
 checked={filtered.length > 0 && filtered.every(p => selectedIds.includes(p._id))}
 onChange={(e) => {
 if (e.target.checked) {
 setSelectedIds(Array.from(new Set([...selectedIds, ...filtered.map(p => p._id)])));
 } else {
 const filteredSet = new Set(filtered.map(p => p._id));
 setSelectedIds(selectedIds.filter(id => !filteredSet.has(id)));
 }
 }}
 className="w-4 h-4 accent-burgundy rounded cursor-pointer"
 title="تحديد كل المعروض"
 />
 <span>المنتج ({filtered.length})</span>
 </div>
 <span>الفئة</span>
 <span>السعر</span>
 <span>التكلفة والربح</span>
 <span>المخزون</span>
 <span>الإجراءات</span>
 </div>

 <div className="divide-y divide-burgundy/6">
 {filtered.map(p => (
 <div
 key={p._id}
 className={`grid grid-cols-[2.3fr_1fr_1fr_1.2fr_0.8fr_auto] items-center gap-4 px-6 py-4 transition ${
 selectedIds.includes(p._id) ? 'bg-burgundy/5' : 'hover:bg-burgundy/3'
 }`}
 >
 {/* Product */}
 <div className="flex items-center gap-3 min-w-0">
 <input
 type="checkbox"
 checked={selectedIds.includes(p._id)}
 onChange={(e) => {
 if (e.target.checked) {
 setSelectedIds(prev => [...prev, p._id]);
 } else {
 setSelectedIds(prev => prev.filter(id => id !== p._id));
 }
 }}
 className="w-4 h-4 accent-burgundy rounded cursor-pointer flex-shrink-0"
 />

 <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-burgundy/8 flex items-center justify-center text-xl">
 {getProductIcon(p.category, p.name)}
 </div>

 <div className="min-w-0">
 <div className="flex items-center gap-1.5 flex-wrap">
 <p className="truncate font-semibold text-sm">{p.name}</p>
 {p.season === 'summer' && (
 <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.2 text-[10px] font-bold">
 صيفي
 </span>
 )}
 {p.season === 'winter' && (
 <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-800 border border-sky-300 px-2 py-0.2 text-[10px] font-bold">
 شتوي
 </span>
 )}
 {(!p.season || p.season === 'all') && (
 <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.2 text-[10px] font-bold">
 طوال العام
 </span>
 )}
 {p.isSeasonArchived && (
 <span className="inline-flex items-center rounded-full bg-slate-800 text-white border border-slate-700 px-2 py-0.2 text-[10px] font-bold" title="مخزن بالمستودع ومستبعد تلقائياً من الجرد والكاشير">
 مخزن
 </span>
 )}
 </div>

 <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-burgundy/50 items-center">
 {p.sku && <span className="font-mono bg-burgundy/5 px-1.5 py-0.5 rounded text-burgundy">{p.sku}</span>}
 {p.supplier && <span>{p.supplier}</span>}
 </div>

 {p.sizes?.length > 0 && <p className="mt-0.5 text-xs text-burgundy/35">{p.sizes.join(' · ')}</p>}

 <div className="flex items-center gap-2 mt-1.5 flex-wrap">
 <button
 type="button"
 onClick={() => onShowHistory(p)}
 className="text-[10px] text-burgundy/60 hover:text-burgundy hover:underline flex items-center gap-0.5 font-medium"
 >
 حركة المخزون
 </button>
 </div>
 </div>
 </div>

 {/* Category */}
 <span className="inline-block rounded-full bg-burgundy/8 px-3 py-1 text-xs font-medium w-fit">
 {catAr[p.category] || p.category}
 </span>

 {/* Price */}
 {isDiscountActive(p) ? (
 <div className="flex flex-col">
 <span className="block text-sm font-bold text-burgundy">{EGP(p.discountPrice)}</span>
 <span className="block text-xs text-red-500 line-through">{EGP(p.price)}</span>
 <span className="inline-block mt-1 rounded bg-red-100 text-red-600 px-1.5 py-0.5 text-[9px] font-bold w-fit">
 خصم {Math.round((1 - p.discountPrice / p.price) * 100)}%
 </span>
 </div>
 ) : (
 <span className="block text-sm font-bold">{EGP(p.price)}</span>
 )}

 {/* Cost & Profit */}
 <div className="flex flex-col text-xs space-y-0.5">
 <span className="text-burgundy/50">التكلفة: {p.costPrice ? EGP(p.costPrice) : '—'}</span>
 {p.costPrice ? (
 (() => {
 const effPrice = isDiscountActive(p) ? p.discountPrice : p.price;
 return (
 <span className="font-bold text-emerald-600">
 الربح: {EGP(effPrice - p.costPrice)} ({(((effPrice - p.costPrice) / effPrice) * 100).toFixed(0)}%)
 </span>
 );
 })()
 ) : (
 <span className="text-amber-500 font-semibold text-[10px]">غير مسعر تكلفة</span>
 )}
 </div>

 {/* Stock */}
 <div className="flex items-center gap-1.5 flex-wrap">
 <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 px-2.5 py-1 text-xs font-bold" title="إجمالي ما دخل المحل من المنتج">
 {Math.max(p.totalReceived || 0, (p.stock || 0) + (p.sold || 0))} توريد
 </span>
 {p.sold > 0 && (
 <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200/80 px-2 py-1 text-xs font-bold" title="إجمالي مبيعات المنتج">
 {p.sold} مباع
 </span>
 )}
 <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.stock === 0 ? 'bg-red-100 text-red-600' : p.stock <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`} title="المخزون الفعلي المتاح حالياً">
 {p.stock} متبقي
 </span>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-2 justify-end">
 {onShowAnalytics && (
 <button
 type="button"
 onClick={() => onShowAnalytics(p)}
 className="rounded-xl border border-burgundy/20 hover:border-burgundy bg-burgundy/5 hover:bg-burgundy hover:text-white px-2.5 py-1 text-xs font-bold text-burgundy transition shadow-xs flex items-center gap-1 cursor-pointer"
 title="مشاهدة سريعة لنشاط وأرباح ومبيعات هذا الصنف"
 >
 <span>👁️</span>
 <span>مشاهدة سريعة</span>
 </button>
 )}
 {p.stock === 0 && (
 <button
 onClick={() => onRestock(p)}
 className="rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-sm flex items-center gap-1"
 title="تزويد واستلام شحنة جديدة"
 >
 <span>تزويد</span>
 </button>
 )}

 <div className="relative">
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setActiveMenuId(activeMenuId === p._id ? null : p._id);
 }}
 className="h-8 w-8 rounded-xl border border-burgundy/20 hover:bg-burgundy/10 flex items-center justify-center text-base font-bold text-burgundy transition shadow-sm bg-white"
 title="خيارات المنتج"
 >
 ⋮
 </button>

 {activeMenuId === p._id && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
 <div
 className="absolute left-0 mt-1 w-52 rounded-2xl bg-white p-1.5 shadow-2xl border border-burgundy/10 z-50 text-right space-y-0.5"
 onClick={(e) => e.stopPropagation()}
 >
 <button
 type="button"
 onClick={() => { setActiveMenuId(null); onRestock(p); }}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition"
 >
 تزويد مخزون / شحنة
 </button>
 <button
 type="button"
 onClick={() => { setActiveMenuId(null); onEdit(p); }}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-burgundy hover:bg-burgundy/5 rounded-xl transition"
 >
 تعديل بيانات المنتج
 </button>
 <button
 type="button"
 onClick={async () => {
 setActiveMenuId(null);
 const action = p.isSeasonArchived ? 'activateSeason' : 'archiveSeason';
 try {
 await api.post('/admin/products/bulk-season', { action, productIds: [p._id] });
 showToast?.(p.isSeasonArchived ? 'تم تنشيط المنتج في المعرض' : 'تم تخزين المنتج بالمستودع');
 await onRefresh?.();
 } catch {
 alert('فشل تغيير حالة الصنف');
 }
 }}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 rounded-xl transition"
 >
 {p.isSeasonArchived ? 'تنشيط وعرض بالمعرض' : 'تخزين بالمستودع (إخفاء)'}
 </button>
 <button
 type="button"
 onClick={() => { setActiveMenuId(null); onShowHistory(p); }}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-burgundy hover:bg-burgundy/5 rounded-xl transition"
 >
 سجل حركة المخزون
 </button>
 {onShowAnalytics && (
 <button
 type="button"
 onClick={() => { setActiveMenuId(null); onShowAnalytics(p); }}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition"
 >
 👁️ مشاهدة سريعة للنشاط
 </button>
 )}
 {p.sku && (
 <button
 type="button"
 onClick={() => { setActiveMenuId(null); printBarcode(p); }}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded-xl transition"
 >
 طباعة ملصق الباركود
 </button>
 )}
 <div className="border-t border-burgundy/5 my-1" />
 <button
 type="button"
 onClick={() => { setActiveMenuId(null); onDelete(p._id); }}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition"
 >
 أرشفة المنتج نهائياً
 </button>
 </div>
 </>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Floating Bulk Action Bar */}
 {selectedIds.length > 0 && (
 <div className="sticky bottom-6 z-40 bg-burgundy text-white p-3.5 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-3 border border-burgundy/40 animate-in fade-in slide-in-from-bottom-3">
 <div className="flex items-center gap-3">
 <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
 تم تحديد {selectedIds.length} منتج
 </span>
 <button
 type="button"
 onClick={() => setSelectedIds([])}
 className="text-white/70 hover:text-white text-xs underline"
 >
 إلغاء التحديد
 </button>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 <span className="text-xs text-white/70 font-semibold">تعيين الموسم:</span>
 <button
 type="button"
 onClick={() => handleBulkSeason('setSeason', { season: 'summer' })}
 disabled={bulkLoading}
 className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60"
 >
 صيفي
 </button>
 <button
 type="button"
 onClick={() => handleBulkSeason('setSeason', { season: 'winter' })}
 disabled={bulkLoading}
 className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60"
 >
 شتوي
 </button>
 <button
 type="button"
 onClick={() => handleBulkSeason('setSeason', { season: 'all' })}
 disabled={bulkLoading}
 className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60"
 >
 طوال العام
 </button>

 <div className="h-5 w-[1px] bg-white/20 mx-1 hidden sm:block" />

 <button
 type="button"
 onClick={() => handleBulkSeason('setShowOnWebsite', { showOnWebsite: true })}
 disabled={bulkLoading}
 className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60 flex items-center gap-1"
 title="إتاحة ظهور المنتجات المحددة على الموقع أونلاين"
 >
 <span>🌐</span>
 <span>عرض بالموقع</span>
 </button>

 <button
 type="button"
 onClick={() => handleBulkSeason('setShowOnWebsite', { showOnWebsite: false })}
 disabled={bulkLoading}
 className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60 flex items-center gap-1"
 title="إخفاء المنتجات المحددة من المتجر الإلكتروني فقط"
 >
 <span>🚫</span>
 <span>إخفاء من الموقع</span>
 </button>

 <div className="h-5 w-[1px] bg-white/20 mx-1 hidden sm:block" />

 <button
 type="button"
 onClick={() => handleBulkSeason('archiveSeason')}
 disabled={bulkLoading}
 className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 border border-white/20 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60"
 title="إخفاء المنتجات المحددة من الكاشير والجرد"
 >
 تخزين بالمستودع (إخفاء)
 </button>
 <button
 type="button"
 onClick={() => handleBulkSeason('activateSeason')}
 disabled={bulkLoading}
 className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60"
 title="تنشيط وإتاحة المنتجات في المحل والجرد"
 >
 تنشيط وعرض بالمعرض
 </button>
 </div>
 </div>
 )}

 {/* Season Switch Confirmation Modal */}
 {seasonConfirmModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setSeasonConfirmModal(null)}>
 <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl space-y-4 text-burgundy" onClick={e => e.stopPropagation()}>
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 flex items-center justify-center rounded-full bg-burgundy/10 text-burgundy"><Icon name={seasonConfirmModal.targetSeason === "winter" ? "snowflake" : "sun"} className="w-6 h-6" /></div>
 <div>
 <h3 className="text-lg font-bold">
 {seasonConfirmModal.targetSeason === 'winter' ? 'تأكيد التحويل للموسم الشتوي' : 'تأكيد التحويل للموسم الصيفي'}
 </h3>
 <p className="text-xs text-burgundy/60 mt-0.5">
 {seasonConfirmModal.targetSeason === 'winter'
 ? 'سيتم تجميد وتخزين كل البضاعة الصيفية، وتنشيط كل البضاعة الشتوية.'
 : 'سيتم تنشيط وإظهار كل البضاعة الصيفية، وتخزين البضاعة الشتوية.'}
 </p>
 </div>
 </div>

 <div className="p-3.5 bg-[#F7F0EC] rounded-2xl text-xs space-y-2 text-burgundy/80">
 <p className="font-bold text-burgundy flex items-center gap-1.5">
 <span>ضمانات حفظ البيانات والمخزون:</span>
 </p>
 <p>• لن يتم مسح أي صنف، كل الكميات وأسعار التكلفة والأكواد (SKU) محفوظة 100%.</p>
 <p>• بضاعة الصيف ستختفي من شاشة الجرد والكاشير لتجنب التشتت أثناء جرد الشتوي.</p>
 <p>• أصناف طوال العام (الأساسية) ستظل متاحة في كل الأحوال.</p>
 <p>• يمكنك التبديل والرجوع في أي وقت بنقرة واحدة.</p>
 </div>

 <div className="flex gap-2.5 pt-2">
 <button
 type="button"
 onClick={handleConfirmSeasonSwitch}
 disabled={bulkLoading}
 className={`flex-1 py-3 rounded-xl text-xs font-bold text-white transition shadow-md ${
 seasonConfirmModal.targetSeason === 'winter' ? 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
 }`}
 >
 {bulkLoading ? 'جاري التحويل...' : 'نعم، قم بالتحويل الآن'}
 </button>
 <button
 type="button"
 onClick={() => setSeasonConfirmModal(null)}
 disabled={bulkLoading}
 className="px-5 py-3 rounded-xl border border-burgundy/20 text-xs font-semibold text-burgundy hover:bg-burgundy/5 transition"
 >
 إلغاء
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

