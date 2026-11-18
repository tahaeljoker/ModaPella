import React, { useState } from 'react';
import api from '../../../services/api';
import { Icon } from '../../Icon';
import { resolveImageUrl } from '../../../utils/imageUrl';
import { isDiscountActive } from '../../../utils/discount';
import { printBarcode } from './useAdminProducts';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

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

export default function InventoryTab({ products, loading, onRefresh, onRestock, onEdit, onShowHistory, onShowAnalytics, categories, catAr }) {
 const [search, setSearch] = useState('');
 const [filterCat, setFilterCat] = useState('الكل');
 const [filterSupplier, setFilterSupplier] = useState('الكل');
 const [filterStock, setFilterStock] = useState('all');
 const [filterSeason, setFilterSeason] = useState('All');
 const [adjusting, setAdjusting] = useState(null);
 const [adjValue, setAdjValue] = useState('');
 const [selectedVariant, setSelectedVariant] = useState('');
 const [expanded, setExpanded] = useState(null);
 const [activeMenuId, setActiveMenuId] = useState(null);
 const [toast, setToast] = useState('');

 const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

 const startAdjusting = (p) => {
 setAdjusting(p._id); setAdjValue('');
 setSelectedVariant(p.variants?.length > 0 ? `${p.variants[0].size}|${p.variants[0].color}` : '');
 };

 const handleAdjust = async (productId) => {
 if (!adjValue || isNaN(Number(adjValue))) return;
 try {
 const p = products.find(x => x._id === productId);
 const payload = { adjustment: Number(adjValue) };
 if (p?.variants?.length > 0 && selectedVariant) {
 const [size, color] = selectedVariant.split('|');
 payload.size = size; payload.color = color;
 }
 await api.patch(`/pos/storage/${productId}`, payload);
 showToast('تم تحديث المخزون بنجاح');
 setAdjusting(null); setAdjValue(''); setSelectedVariant('');
 onRefresh();
 } catch { showToast('حدث خطأ'); }
 };

 const stockBadge = (s) => s === 0 ? 'bg-red-100 text-red-600' : s <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';

  const productList = Array.isArray(products) ? products : [];
  const uniqueSuppliers = Array.from(new Set(productList.map(p => p.supplier).filter(Boolean))).sort();

  const translatedSearch = translateArabicKeyboard(search);
  const normalizedSearch = normalizeDigits(translatedSearch).trim().toLowerCase();

  const filtered = productList.filter(p => {
    const pName = (p.name || '').toLowerCase();
    const pSku = (p.sku || '').toLowerCase();
    const pOldSku = (p.oldSku || '').toLowerCase();
    const pCat = ((catAr[p.category] || p.category) || '').toLowerCase();

    const ms = !search ||
      pName.includes(search.toLowerCase()) || pName.includes(normalizedSearch) ||
      pSku.includes(search.toLowerCase()) || pSku.includes(normalizedSearch) ||
      pOldSku.includes(search.toLowerCase()) || pOldSku.includes(normalizedSearch) ||
      pCat.includes(search.toLowerCase()) || pCat.includes(normalizedSearch);

    const mc = filterCat === 'الكل' || p.category === filterCat;
    const mk = filterStock === 'all' ? true : filterStock === 'low' ? ((p.stock || 0) > 0 && (p.stock || 0) <= 5) : (p.stock || 0) === 0;
    const mSup = filterSupplier === 'الكل' ? true : (filterSupplier === 'بدون مورد' ? !p.supplier : p.supplier === filterSupplier);

    let mSeason = true;
    if (filterSeason === 'summer') mSeason = p.season === 'summer';
    else if (filterSeason === 'winter') mSeason = p.season === 'winter';
    else if (filterSeason === 'all') mSeason = (!p.season || p.season === 'all');
    else if (filterSeason === 'archived') mSeason = Boolean(p.isSeasonArchived);

    return ms && mc && mk && mSup && mSeason;
  });

  const totalItems = filtered.reduce((s, p) => s + (Number(p.stock) || 0), 0);
  const totalValue = filtered.reduce((s, p) => s + (Number(p.stock) || 0) * (Number(p.price) || 0), 0);
 const lowCount = filtered.filter(p => p.stock > 0 && p.stock <= 5).length;
 const outCount = filtered.filter(p => p.stock === 0).length;

 return (
 <div className="space-y-4">
 {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}

 {/* Stats */}
 <div className="grid gap-3 sm:grid-cols-4">
 {[
 { label: 'إجمالي القطع', value: `${totalItems.toLocaleString()} قطعة`, icon: '', cls: 'border-burgundy/10 bg-white', vcls: 'text-burgundy' },
 { label: 'قيمة المخزون', value: EGP(totalValue), icon: '', cls: 'border-burgundy/10 bg-white', vcls: 'text-burgundy' },
 { label: 'مخزون منخفض', value: `${lowCount} منتج`, icon: '', cls: 'border-amber-200 bg-amber-50', vcls: 'text-amber-700' },
 { label: 'نفد المخزون', value: `${outCount} منتج`, icon: '', cls: outCount > 0 ? 'border-red-200 bg-red-50' : 'border-burgundy/10 bg-white', vcls: outCount > 0 ? 'text-red-600' : 'text-burgundy' },
 ].map(s => (
 <div key={s.label} className={`rounded-[1.5rem] border p-4 ${s.cls}`}>
 <p className="text-xs text-burgundy/50 mb-1">{s.icon} {s.label}</p>
 <p className={`text-xl font-extrabold ${s.vcls}`}>{s.value}</p>
 </div>
 ))}
 </div>

 {/* Filters */}
 <div className="flex flex-wrap items-center gap-3">
 <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الكود..."
 className="flex-1 min-w-[180px] rounded-2xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy shadow-sm" />
 <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
 className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none shadow-sm">
 {['الكل', ...categories].map(c => <option key={c} value={c}>{c === 'الكل' ? 'كل الفئات' : (catAr[c] || c)}</option>)}
 </select>
 <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}
 className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none shadow-sm">
 <option value="الكل">كل الموردين</option>
 {uniqueSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
 <option value="بدون مورد">بدون مورد</option>
 </select>
 <div className="flex rounded-2xl border border-burgundy/20 bg-white overflow-hidden shadow-sm">
 {[{ id: 'all', l: 'الكل' }, { id: 'low', l: 'منخفض' }, { id: 'out', l: 'نفد' }].map(f => (
 <button key={f.id} onClick={() => setFilterStock(f.id)}
 className={`px-4 py-2.5 text-xs font-semibold transition ${filterStock === f.id ? 'bg-burgundy text-white' : 'text-burgundy/60 hover:bg-burgundy/8'}`}>
 {f.l}
 </button>
 ))}
 </div>

 {/* Season filter in inventory tab */}
 <div className="flex rounded-2xl border border-burgundy/20 bg-white overflow-hidden shadow-sm">
 {[
 { id: 'All', l: 'كل المواسم' },
 { id: 'summer', l: 'صيفي' },
 { id: 'winter', l: 'شتوي' },
 { id: 'all', l: 'مستمر' },
 { id: 'archived', l: 'مخزن' },
 ].map(f => (
 <button key={f.id} onClick={() => setFilterSeason(f.id)}
 className={`px-3 py-2.5 text-xs font-bold transition ${filterSeason === f.id ? 'bg-burgundy text-white' : 'text-burgundy/60 hover:bg-burgundy/8'}`}>
 {f.l}
 </button>
 ))}
 </div>

 <button onClick={onRefresh} className="rounded-2xl border border-burgundy/20 px-4 py-2.5 text-sm font-medium text-burgundy hover:bg-burgundy hover:text-white transition shadow-sm">تحديث</button>
 </div>

 {/* Table */}
 {loading ? (
 <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
 ) : filtered.length === 0 ? (
 <div className="rounded-[2rem] border border-burgundy/10 bg-white py-16 text-center"><p className="text-sm text-burgundy/40">لا توجد منتجات مطابقة</p></div>
 ) : (
 <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-x-auto">
 <div className="min-w-[800px]">
 <div className="grid grid-cols-[2fr_1fr_1fr_1fr_160px] gap-4 px-5 py-3 border-b border-burgundy/8 bg-[#F7F0EC] text-xs font-bold uppercase tracking-wide text-burgundy/50">
 <span>المنتج</span><span>الفئة</span><span>السعر</span><span>المخزون</span><span>تعديل الكمية</span>
 </div>
 <div className="divide-y divide-burgundy/6">
 {filtered.map(p => (
 <div key={p._id}>
 <div className="grid grid-cols-[2fr_1fr_1fr_1fr_160px] gap-4 px-5 py-4 items-center hover:bg-[#F7F0EC]/40 transition">
 {/* Product */}
 <div className="flex items-center gap-3 min-w-0">
 {p.images?.[0] ? <img src={resolveImageUrl(p.images[0])} alt={p.name} className="h-12 w-12 flex-shrink-0 rounded-xl object-cover shadow-sm" />
 : <div className="h-12 w-12 rounded-xl bg-burgundy/8 flex items-center justify-center flex-shrink-0"><span className="text-xs text-burgundy/50 font-bold">صورة</span></div>}
 <div className="min-w-0">
 <div className="flex items-center gap-1.5 flex-wrap">
 <p className="font-semibold text-sm truncate">{p.name}</p>
 {p.season === 'summer' && <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full border border-amber-300">صيفي</span>}
 {p.season === 'winter' && <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.2 rounded-full border border-sky-300">شتوي</span>}
 {(!p.season || p.season === 'all') && <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded-full border border-purple-200">مستمر</span>}
 {p.isSeasonArchived && <span className="text-[10px] bg-slate-800 text-white font-bold px-1.5 py-0.2 rounded-full border border-slate-700" title="مخزن ومستبعد من الجرد والكاشير">مخزن</span>}
 </div>
 {p.sku && <p className="text-xs text-burgundy/40 font-mono">{p.sku}</p>}
 {p.supplier && <p className="text-xs text-burgundy/40">{p.supplier}</p>}
 {p.allowDiscount === false && <span className="inline-block mt-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">غير مسموح بالخصم</span>}
 </div>
 </div>
 <span className="inline-block text-xs bg-burgundy/8 text-burgundy px-2.5 py-1 rounded-full font-medium w-fit">{catAr[p.category] || p.category}</span>
 {isDiscountActive(p) ? (
 <div className="flex flex-col">
 <span className="block text-sm font-bold text-burgundy">{EGP(p.discountPrice)}</span>
 <span className="block text-xs text-red-500 line-through">{EGP(p.price)}</span>
 </div>
 ) : (
 <span className="block text-sm font-bold">{EGP(p.price)}</span>
 )}
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
 <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${stockBadge(p.stock)}`} title="المخزون الفعلي المتاح حالياً">
 {p.stock} متبقي
 </span>
 {p.variants?.length > 0 && (
 <button onClick={() => setExpanded(expanded === p._id ? null : p._id)} className="text-xs text-burgundy/40 hover:text-burgundy transition">
 {expanded === p._id ? '▲' : '▼'}
 </button>
 )}
 </div>
 {/* Adjust */}
 <div>
 {adjusting === p._id ? (
 <div className="flex flex-wrap items-center gap-1.5">
 {p.variants?.length > 0 && (
 <select value={selectedVariant} onChange={e => setSelectedVariant(e.target.value)}
 className="rounded-xl border border-burgundy/20 bg-white px-2 py-1 text-xs text-burgundy outline-none">
 {p.variants.map((v, i) => <option key={i} value={`${v.size}|${v.color}`}>{v.size} · {v.color} ({v.stock})</option>)}
 </select>
 )}
 <input type="number" value={adjValue} onChange={e => setAdjValue(e.target.value)} placeholder="+10 أو -3" autoFocus
 className="w-24 rounded-xl border border-burgundy px-2.5 py-1 text-sm text-burgundy outline-none"
 onKeyDown={e => { if (e.key === 'Enter') handleAdjust(p._id); if (e.key === 'Escape') setAdjusting(null); }} />
 <button onClick={() => handleAdjust(p._id)} className="rounded-xl bg-burgundy px-2.5 py-1 text-xs font-bold text-white hover:bg-[#650018] transition"></button>
 <button onClick={() => { setAdjusting(null); setAdjValue(''); }} className="rounded-xl border border-burgundy/20 px-2 py-1 text-xs text-burgundy hover:bg-burgundy/8 transition"></button>
 </div>
 ) : (
 <div className="flex items-center gap-2 justify-end">
 <button
 onClick={() => startAdjusting(p)}
 className="rounded-xl border border-burgundy/20 px-3 py-1.5 text-xs font-semibold text-burgundy transition hover:bg-burgundy hover:text-white"
 >
 تعديل سريع
 </button>

 <div className="relative">
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setActiveMenuId(activeMenuId === p._id ? null : p._id);
 }}
 className="h-8 w-8 rounded-xl border border-burgundy/20 hover:bg-burgundy/10 flex items-center justify-center text-base font-bold text-burgundy transition shadow-sm bg-white"
 title="خيارات إضافية"
 >
 ⋮
 </button>

 {activeMenuId === p._id && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
 <div
 className="absolute left-0 mt-1 w-48 rounded-2xl bg-white p-1.5 shadow-2xl border border-burgundy/10 z-50 text-right space-y-0.5"
 onClick={(e) => e.stopPropagation()}
 >
 <button
 type="button"
 onClick={() => { setActiveMenuId(null); onRestock(p); }}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition"
 >
 تزويد مخزون / شحنة
 </button>
 {onEdit && (
 <button
 type="button"
 onClick={() => { setActiveMenuId(null); onEdit(p); }}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-burgundy hover:bg-burgundy/5 rounded-xl transition"
 >
 تعديل بيانات المنتج
 </button>
 )}
 {onShowAnalytics && (
 <button
 type="button"
 onClick={() => { setActiveMenuId(null); onShowAnalytics(p); }}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition"
 >
 👁️ مشاهدة سريعة للنشاط
 </button>
 )}
 {onShowHistory && (
 <button
 type="button"
 onClick={() => { setActiveMenuId(null); onShowHistory(p); }}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-burgundy hover:bg-burgundy/5 rounded-xl transition"
 >
 سجل حركة المخزون
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
 </div>
 </>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 {/* Variants breakdown */}
 {expanded === p._id && p.variants?.length > 0 && (
 <div className="bg-[#F7F0EC]/60 px-6 py-4 border-t border-burgundy/8">
 <p className="text-xs font-semibold text-burgundy/50 uppercase tracking-wider mb-3">تفاصيل الأحجام والألوان</p>
 <div className="flex flex-wrap gap-2">
 {p.variants.map((v, i) => (
 <div key={i} className={`rounded-2xl border px-4 py-2 text-center text-xs font-medium ${v.stock === 0 ? 'border-red-200 bg-red-50 text-red-600' : v.stock <= 5 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-burgundy/15 bg-white text-burgundy'}`}>
 <p className="font-bold">{v.size} · {v.color}</p>
 <p className="mt-0.5 text-xl font-extrabold">{v.stock}</p>
 <p className="text-[10px] opacity-50">قطعة</p>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
