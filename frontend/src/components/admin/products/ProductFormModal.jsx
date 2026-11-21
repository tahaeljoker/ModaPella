import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageUploader from '../../ImageUploader';
import MannequinImageUploader from '../../MannequinImageUploader';
import { getColorHex, getColorStyle, PRESET_MULTI_COLORS, combineColors } from '../../../utils/colorSwatches';
import { Icon } from '../../Icon';
import { isDiscountActive } from '../../../utils/discount';
import { renderBarcodeDataUrl } from '../../../utils/barcode';
import api from '../../../services/api';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const emptyProduct = { name: '', onlineName: '', category: 'Blouse', description: '', price: '', stock: '', totalReceived: '', images: '', mannequinImage: '', colorImages: [], sizes: '', colors: '', type: '', supplier: '', supplierId: null, sku: '', season: 'winter', isSeasonArchived: false, showOnWebsite: true, allowDiscount: true, discountPrice: '', discountStartDate: '', discountEndDate: '' };

const ENABLE_VARIANTS = true; // Toggle to false to completely exclude sizes, colors, and variants

// ─── Product Modal ─────────────────────────────────────────────────────────────
function ProductModal({ product, onClose, onSave, categories, catAr, onAddCategory, siteConfig }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => {
 if (product) {
 return {
 ...product,
 season: product.season || 'all',
 isSeasonArchived: Boolean(product.isSeasonArchived),
    showOnWebsite: product.showOnWebsite !== false,
 totalReceived: product.totalReceived !== undefined ? product.totalReceived : ((product.stock || 0) + (product.sold || 0)),
 discountPrice: product.discountPrice ?? '',
 discountStartDate: product.discountStartDate ? new Date(product.discountStartDate).toISOString().split('T')[0] : '',
 discountEndDate: product.discountEndDate ? new Date(product.discountEndDate).toISOString().split('T')[0] : '',
 mannequinImage: product.mannequinImage || '',
  colorImages: Array.isArray(product.colorImages) ? product.colorImages : [],
 };
 }
 return { ...emptyProduct, season: 'winter' };
 });
 const [loading, setLoading] = useState(false);
 const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [customCalcPct, setCustomCalcPct] = useState('');
 const [suppliers, setSuppliers] = useState([]);
 const [isManualSupplier, setIsManualSupplier] = useState(false);
  const [supplierBillOption, setSupplierBillOption] = useState('none');
  const [supplierInvoiceRef, setSupplierInvoiceRef] = useState('');

 useEffect(() => {
 const fetchSuppliers = async () => {
 try {
 const res = await api.get('/suppliers');
 setSuppliers(res.data);
 if (product?.supplier) {
 const exists = res.data.some(s => s.name === product.supplier);
 if (!exists) {
 setIsManualSupplier(true);
 }
 }
 } catch (err) {
 console.error('Failed to load suppliers:', err);
 }
 };
 fetchSuppliers();
 }, [product]);

 const getParsedItems = (str) => str ? (typeof str === 'string' ? str.split(/[,،]+/).map(s => s.trim()).filter(Boolean) : str) : [];
 const parsedSizes = getParsedItems(form.sizes);
 const parsedColors = getParsedItems(form.colors);

 const normalizeVariantStr = (s) => {
 if (!s) return '';
 return String(s)
 .trim()
 .toLowerCase()
 .replace(/[أإآ]/g, 'ا')
 .replace(/ة/g, 'ه')
 .replace(/ى/g, 'ي')
 .replace(/[-_]/g, '')
 .replace(/\s+/g, '');
 };
 const makeVariantKey = (sz, clr) => `${normalizeVariantStr(sz)}_${normalizeVariantStr(clr)}`;

 const [variantStocks, setVariantStocks] = useState(() => {
 const initial = {};
 if (product?.variants && product.variants.length > 0) {
 product.variants.forEach(v => {
 const normKey = makeVariantKey(v.size, v.color);
 initial[normKey] = v.stock;
 const sz = v.size || '-';
 const clr = v.color || '-';
 initial[`${sz}_${clr}`] = v.stock;
 initial[`${v.size || ''}_${v.color || ''}`] = v.stock;
 });
 }
 return initial;
 });
 const handleChange = (e) => { const { name, value } = e.target; setForm(p => ({ ...p, [name]: value })); };
 const hasVariants = parsedSizes.length > 0 || parsedColors.length > 0;
 const activeSizes = parsedSizes.length > 0 ? parsedSizes : ['One Size'];
 const activeColors = parsedColors.length > 0 ? parsedColors : ['لون واحد'];
 const combinations = [];
 if (hasVariants) activeSizes.forEach(size => activeColors.forEach(color => combinations.push({ size, color })));
 
 const getVariantStockVal = (sz, clr) => {
 const normKey = makeVariantKey(sz, clr);
 if (variantStocks[normKey] !== undefined) return variantStocks[normKey];
 if (variantStocks[`${sz}_${clr}`] !== undefined) return variantStocks[`${sz}_${clr}`];
 if (variantStocks[`${sz}_`] !== undefined) return variantStocks[`${sz}_`];
 if (variantStocks[`_${clr}`] !== undefined) return variantStocks[`_${clr}`];
 if (product?.variants && product.variants.length > 0) {
 const match = product.variants.find(v => makeVariantKey(v.size, v.color) === normKey);
 if (match) return match.stock;
 }
 if (combinations.length === 1 && product?.stock) return Number(product.stock);
 return 0;
 };

 const totalVariantStock = hasVariants
 ? combinations.reduce((sum, c) => sum + Number(getVariantStockVal(c.size, c.color) || 0), 0)
 : Number(form.stock || 0);

 const handleSubmit = async (e) => {
 e.preventDefault(); setLoading(true);
 try {
 const finalStock = hasVariants ? totalVariantStock : Number(form.stock || 0);

 let resolvedSupplierId = form.supplierId;
 if (form.supplier && form.supplier.trim()) {
   const rawTrim = form.supplier.trim().toLowerCase();
   const foundSup = suppliers.find(s => s.name?.trim().toLowerCase() === rawTrim);
   if (foundSup) {
     resolvedSupplierId = foundSup._id;
   }
 }

 const payload = {
        ...form,
        supplierId: resolvedSupplierId,
        supplierBillOption: supplierBillOption !== 'none' ? supplierBillOption : undefined,
        supplierInvoiceRef: supplierBillOption !== 'none' && supplierInvoiceRef ? supplierInvoiceRef.trim() : undefined,
 price: Number(form.price),
 discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
 discountStartDate: form.discountStartDate ? new Date(form.discountStartDate) : null,
 discountEndDate: form.discountEndDate ? new Date(form.discountEndDate) : null,
 stock: finalStock,
 totalReceived: form.totalReceived !== '' && form.totalReceived !== undefined ? Number(form.totalReceived) : undefined,
 variants: hasVariants ? combinations.map(c => ({
 size: c.size,
 color: c.color,
 stock: Number(getVariantStockVal(c.size, c.color) || 0)
 })) : [],
 // Snapshot of variant stocks when modal was opened — backend uses this to compute
 // a safe delta and avoid overwriting sales that happened while modal was open
 originalVariants: product?.variants
 ? product.variants.map(v => ({ size: v.size, color: v.color, stock: v.stock || 0 }))
 : [],
 onlineName: (form.onlineName || '').trim(),
        mannequinImage: form.mannequinImage || '',
images: form.images ? (typeof form.images === 'string' ? form.images.split('\n').map(s => s.trim()).filter(Boolean) : form.images) : [],
 sizes: activeSizes, colors: activeColors,
 };
 await onSave(payload); onClose();
 } catch (e) { console.error(e); } finally { setLoading(false); }
 };

 const inp = 'w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none transition focus:border-burgundy';
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
 <div className="w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-[#F7F0EC] p-8 shadow-2xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
 <h3 className="mb-6 text-2xl font-bold text-burgundy">{form._id ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid gap-4 sm:grid-cols-2">
 <div>
<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">اسم المنتج في السيستم / المخزن *</label>
<input name="name" value={form.name} onChange={handleChange} className={inp} required placeholder="مثال: بلوزة ريون 104" />
</div>
<div>
<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60 flex items-center justify-between">
  <span>اسم العرض في الموقع (اختياري)</span>
  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">يظهر للزبائن بدل كود المخزن</span>
</label>
<input name="onlineName" value={form.onlineName || ''} onChange={handleChange} className={inp} placeholder="مثال: بلوزة كلاسيك ريون بيج" />
</div>
 <div>
 <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60 flex justify-between items-center">
 <span>الفئة *</span>
 <button
 type="button"
 onClick={async () => {
 const key = prompt('أدخل اسم الفئة بالإنجليزية (رمز فريد، مثلاً: Shoes):');
 if (!key) return;
 const nameAr = prompt('أدخل اسم الفئة بالعربية (مثلاً: أحذية):');
 if (!nameAr) return;
 const addedKey = await onAddCategory(key.trim(), nameAr.trim());
 if (addedKey) {
 setForm(p => ({ ...p, category: addedKey }));
 }
 }}
 className="text-[10px] text-burgundy bg-burgundy/5 px-2 py-0.5 rounded hover:bg-burgundy/10 font-bold transition"
 >
 + فئة جديدة
 </button>
 </label>
 <select name="category" value={form.category} onChange={handleChange} className={inp}>
 {categories.map(c => <option key={c} value={c}>{(catAr[c] || c)} ({c})</option>)}
 </select>
 </div>
 <div>
 <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60 flex justify-between items-center">
 <span>سعر البيع (ج.م) *</span>
 <button
 type="button"
 onClick={() => setIsCalcOpen(!isCalcOpen)}
 className="text-[10px] text-burgundy bg-burgundy/5 px-2 py-0.5 rounded hover:bg-burgundy/10 font-bold transition flex items-center gap-1"
 >
 تسعير ذكي
 </button>
 </label>
 <div className="relative">
 <input type="number" name="price" value={form.price} onChange={handleChange} className={inp} required min="0" />
 {isCalcOpen && (
 <div className="absolute top-full right-0 left-0 mt-1.5 z-40 bg-white rounded-2xl p-4 shadow-xl border border-burgundy/10 space-y-2 text-right">
 <p className="text-[11px] font-bold text-burgundy/60">حاسبة تسعير ذكي بناءً على التكلفة:</p>
 <div className="flex gap-1.5 flex-wrap">
 {[50, 60, 70, 80, 90, 100, 110, 120, 130].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const cost = Number(form.costPrice || 0);
                          if (cost > 0) {
                            const calcPrice = Math.round(cost * (1 + pct / 100));
                            setForm(p => ({ ...p, price: calcPrice }));
                            setIsCalcOpen(false);
                          } else {
                            alert('برجاء إدخال سعر التكلفة أولاً');
                          }
                        }}
                        className="text-[10px] bg-burgundy text-white px-2 py-1 rounded hover:bg-[#650018] font-bold transition shadow-xs"
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>

                  {/* Custom Profit Percentage Input */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-burgundy/10">
                    <span className="text-[11px] font-bold text-burgundy/70 whitespace-nowrap">نسبة مخصصة:</span>
                    <div className="relative flex items-center flex-1">
                      <input
                        type="number"
                        value={customCalcPct}
                        onChange={e => setCustomCalcPct(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const cost = Number(form.costPrice || 0);
                            const pct = Number(customCalcPct);
                            if (cost <= 0) {
                              alert('برجاء إدخال سعر التكلفة أولاً');
                              return;
                            }
                            if (!pct || pct <= 0) {
                              alert('برجاء إدخال نسبة ربح صالحة');
                              return;
                            }
                            const calcPrice = Math.round(cost * (1 + pct / 100));
                            setForm(p => ({ ...p, price: calcPrice }));
                            setIsCalcOpen(false);
                            setCustomCalcPct('');
                          }
                        }}
                        placeholder="مثال: 85 أو 140"
                        className="w-full text-xs text-burgundy bg-[#F7F0EC]/60 border border-burgundy/15 rounded-lg px-2.5 py-1 text-left outline-none focus:border-burgundy font-bold"
                      />
                      <span className="absolute left-2 text-xs font-bold text-burgundy/40">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const cost = Number(form.costPrice || 0);
                        const pct = Number(customCalcPct);
                        if (cost <= 0) {
                          alert('برجاء إدخال سعر التكلفة أولاً');
                          return;
                        }
                        if (!pct || pct <= 0) {
                          alert('برجاء إدخال نسبة ربح صالحة');
                          return;
                        }
                        const calcPrice = Math.round(cost * (1 + pct / 100));
                        setForm(p => ({ ...p, price: calcPrice }));
                        setIsCalcOpen(false);
                        setCustomCalcPct('');
                      }}
                      className="text-[10px] bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 rounded-lg font-bold transition shadow-sm whitespace-nowrap"
                    >
                      تطبيق
                    </button>
 </div>
 </div>
 )}
 </div>
 </div>
 <div>
 <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">سعر التكلفة (ج.م)</label>
 <input type="number" name="costPrice" value={form.costPrice ?? ''} onChange={handleChange} className={inp} min="0" placeholder="0" />
 {form.price > 0 && form.costPrice > 0 && (
 <p className="mt-1 text-[10px] text-emerald-600 font-semibold">
 هامش الربح: {(((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100).toFixed(0)}%
 ({EGP(Number(form.price) - Number(form.costPrice))} / قطعة)
 </p>
 )}
 </div>

 {/* Discount Section */}
 <div className="sm:col-span-2">
 <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 space-y-3">
 <div className="flex items-center justify-between">
 <p className="text-xs font-bold text-red-700 uppercase tracking-widest">عرض وتخفيض سعري</p>
 {form.discountPrice > 0 && form.discountPrice < form.price && (
 <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
 خصم {Math.round((1 - form.discountPrice / form.price) * 100)}%
 </span>
 )}
 </div>
 <div className="grid gap-3 sm:grid-cols-3">
 <div>
 <label className="mb-1 block text-[10px] font-semibold text-red-700/80">سعر العرض (ج.م) — اتركه فارغاً لإلغاء العرض</label>
 <input
 type="number"
 name="discountPrice"
 value={form.discountPrice ?? ''}
 onChange={handleChange}
 className={`${inp} border-red-200 focus:border-red-400`}
 min="0"
 placeholder="مثال: 120"
 />
 {form.discountPrice > 0 && form.price > 0 && Number(form.discountPrice) < Number(form.price) && (
 <p className="mt-1 text-[10px] text-red-600 font-bold">
 وفري {EGP(Number(form.price) - Number(form.discountPrice))} عن السعر الأصلي
 </p>
 )}
 </div>
 <div>
 <label className="mb-1 block text-[10px] font-semibold text-red-700/80">بداية العرض (اختياري)</label>
 <input
 type="datetime-local"
 name="discountStartDate"
 value={form.discountStartDate ? form.discountStartDate.slice(0, 16) : ''}
 onChange={handleChange}
 className={`${inp} border-red-200 focus:border-red-400 text-xs`}
 />
 </div>
 <div>
 <label className="mb-1 block text-[10px] font-semibold text-red-700/80">نهاية العرض (اختياري)</label>
 <input
 type="datetime-local"
 name="discountEndDate"
 value={form.discountEndDate ? form.discountEndDate.slice(0, 16) : ''}
 onChange={handleChange}
 className={`${inp} border-red-200 focus:border-red-400 text-xs`}
 />
 </div>
 </div>
 <p className="text-[10px] text-red-700/60">
 لو سعر العرض فارغ أو كبير من سعر البيع، مش هيظهر أي خصم على الموقع.
 </p>
 </div>
 </div>
 <div>
 <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">المخزون الكلي (المتاح حالياً) *</label>
 <input type="number" name="stock" value={hasVariants ? totalVariantStock : form.stock} onChange={handleChange}
 disabled={hasVariants} className={`${inp} ${hasVariants ? 'bg-burgundy/5 opacity-70 cursor-not-allowed font-bold' : ''}`} required min="0" />
 {hasVariants && <p className="mt-1 text-[10px] text-burgundy/50">يُحسب تلقائياً من مجموع مخزون المتغيرات</p>}
 </div>
 <div>
 <div className="flex justify-between items-center mb-1">
 <label className="text-xs font-bold uppercase tracking-wide text-blue-900 flex items-center gap-1">
 <span>إجمالي التوريد (الاستلام الكلي)</span>
 </label>
 {product && (
 <button
 type="button"
 onClick={() => {
 const curStock = hasVariants ? totalVariantStock : Number(form.stock || 0);
 const sold = Number(product?.sold || 0);
 setForm(p => ({ ...p, totalReceived: curStock + sold }));
 }}
 className="text-[10px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-2.5 py-0.5 rounded-lg transition flex items-center gap-1 shadow-sm"
 title="ضبط تلقائي = المتبقي الحالي + المباع"
 >
 <span>ضبط تلقائي</span> ({ (hasVariants ? totalVariantStock : Number(form.stock || 0)) + Number(product?.sold || 0) } قطعة)
 </button>
 )}
 </div>
 <input
 type="number"
 min="0"
 name="totalReceived"
 value={form.totalReceived ?? ''}
 onChange={handleChange}
 placeholder="مثال: 20 أو 50"
 className={`${inp} border-blue-200 bg-blue-50/40 text-blue-900 font-bold focus:border-blue-500`}
 />
 <p className="mt-1 text-[10px] text-blue-800/60">
 {product ? `المباع: ${product.sold || 0} قطعة · المتبقي: ${hasVariants ? totalVariantStock : Number(form.stock || 0)} قطعة` : 'اتركه فارغاً ليتطابق مع المخزون الافتتاحي'}
 </p>
 </div>
 <div className="sm:col-span-2">
 <div className="flex justify-between items-center mb-1">
 <label className="text-xs font-semibold uppercase tracking-wide text-burgundy/60">الشركة الموردة / الماركة</label>
 <button
 onClick={() => {
 setIsManualSupplier(!isManualSupplier);
 setForm(p => ({ ...p, supplier: '', supplierId: null }));
 }}
 className="text-[10px] text-burgundy bg-burgundy/5 px-2.5 py-1 rounded-xl hover:bg-burgundy/10 font-bold transition"
 >
 {isManualSupplier ? 'اختيار من المسجلين' : 'كتابة مورد غير مسجل'}
 </button>
 </div>
 {isManualSupplier ? (
 <input
 name="supplier"
 value={form.supplier}
 onChange={(e) => setForm(p => ({ ...p, supplier: e.target.value, supplierId: null }))}
 className={inp}
 placeholder="مثال: Zara, H&M..."
 />
 ) : (
 <select
 name="supplier"
 value={form.supplier}
 onChange={(e) => {
 const selected = suppliers.find(s => s.name === e.target.value);
 setForm(p => ({
 ...p,
 supplier: e.target.value,
 supplierId: selected?._id || null
 }));
 }}
 className={inp}
 >
 <option value="">-- اختر مورد من القائمة --</option>
 {suppliers.map(s => (
 <option key={s._id} value={s.name}>
 {s.name} {s.phone ? `(${s.phone})` : ''}
 </option>
 ))}
 </select>
 )}
 {!isManualSupplier && suppliers.length === 0 && (
 <p className="mt-1 text-[10px] text-amber-600 font-medium">
 تنبيه: لا يوجد موردون مسجلون حالياً. يمكنك كتابة اسم المورد يدوياً أو تسجيلهم أولاً من شاشة الموردين.
 </p>
 )}
 </div>

          {/* Supplier Billing Section */}
          <div className="sm:col-span-2 bg-white/80 border border-burgundy/15 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-burgundy flex items-center gap-1.5">
                <span>{form._id ? 'ربط / تسجيل فاتورة مورد لهذا المنتج:' : 'ربط حساب المورد بالفاتورة:'}</span>
              </label>
                {supplierBillOption !== 'none' && (
                  <span className="text-xs font-extrabold text-burgundy bg-burgundy/10 px-2 py-0.5 rounded-lg">
                    إجمالي الفاتورة الموردة: {((Number(form.costPrice) || 0) * (hasVariants ? totalVariantStock : Number(form.stock || 0))).toLocaleString('en-US')} ج.م
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'none', label: 'بدون فاتورة مورد' },
                  { id: 'credit', label: 'شراء آجل (دين)' },
                  { id: 'cash_safe', label: 'كاش من خزينة المحل' },
                  { id: 'cash_personal', label: 'كاش جيب شخصي' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSupplierBillOption(opt.id)}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold transition border text-center ${
                      supplierBillOption === opt.id
                        ? 'bg-burgundy text-white border-burgundy shadow-sm'
                        : 'bg-white text-burgundy/70 border-burgundy/15 hover:bg-burgundy/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {supplierBillOption !== 'none' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-burgundy/60">رقم الفاتورة / المرجع للمورد (اختياري)</label>
                  <input
                    type="text"
                    value={supplierInvoiceRef}
                    onChange={e => setSupplierInvoiceRef(e.target.value)}
                    placeholder="مثال: فاتورة #1023"
                    className={inp}
                  />
                  <p className="text-[10px] text-burgundy/50">
                    {supplierBillOption === 'credit' && '• سيتم تسجيل الفاتورة وتثبيت المديونية في كشف حساب المورد.'}
                    {supplierBillOption === 'cash_safe' && '• سيتم تسجيل الفاتورة وسدادها نقداً وخصم المبلغ من خزنة المحل (مصروفات موردين).'}
                    {supplierBillOption === 'cash_personal' && '• سيتم تسجيل الفاتورة وسدادها كاش جيب شخصي دون التأثير على خزنة المحل.'}
                  </p>
                </div>
              )}
            </div>

 <div className="sm:col-span-2">
 <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60 flex items-center gap-2">
 كود المنتج (SKU)
 <span className="normal-case font-normal text-burgundy/40 text-[10px] bg-burgundy/5 px-2 py-0.5 rounded-full">اختياري — لو فراغته بيتولد تلقائي</span>
 </label>
 <input
 name="sku"
 value={form.sku || ''}
 onChange={handleChange}
 className={`${inp} font-mono tracking-widest uppercase`}
 placeholder="مثال: 1019"
 maxLength={30}
 />
 {form.sku && (
 <p className="mt-1 text-[10px] text-emerald-600 font-semibold">
 سيتم حفظ الكود: <span className="font-mono">{form.sku.toUpperCase()}</span>
 </p>
 )}
 {!form.sku && (
 <p className="mt-1 text-[10px] text-burgundy/40">
 سيتولد الكود رقمياً تلقائياً من النظام (مثال: 1019)
 </p>
 )}
 </div>

 {/* Seasonal Classification */}
 <div className="sm:col-span-2 rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50/50 via-amber-50/30 to-purple-50/40 p-4 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold uppercase tracking-wide text-burgundy flex items-center gap-1.5">
 <Icon name="cloud" className="w-4 h-4" /><span>تصنيف موسم البضاعة</span>
 </span>
 <span className="text-[11px] text-burgundy/70 font-bold">
 {form.season === 'summer' ? 'صيفي' : form.season === 'winter' ? 'شتوي' : 'طوال العام (أساسي)'}
 </span>
 </div>
 
 <div className="grid grid-cols-3 gap-2">
 <button
 type="button"
 onClick={() => setForm(p => ({ ...p, season: 'summer' }))}
 className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
 form.season === 'summer'
 ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
 : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
 }`}
 >
 <Icon name="sun" className="w-4 h-4" />
 <span>صيفي</span>
 </button>

 <button
 type="button"
 onClick={() => setForm(p => ({ ...p, season: 'winter' }))}
 className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
 form.season === 'winter'
 ? 'bg-sky-600 text-white border-sky-700 shadow-md shadow-sky-600/20'
 : 'bg-white text-sky-800 border-sky-200 hover:bg-sky-50'
 }`}
 >
 <Icon name="snowflake" className="w-4 h-4" />
 <span>شتوي</span>
 </button>

 <button
 type="button"
 onClick={() => setForm(p => ({ ...p, season: 'all' }))}
 className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
 form.season === 'all'
 ? 'bg-burgundy text-white border-burgundy shadow-md shadow-burgundy/20'
 : 'bg-white text-burgundy border-burgundy/20 hover:bg-burgundy/5'
 }`}
 >
 <Icon name="refresh" className="w-4 h-4" />
 <span>طوال العام</span>
 </button>
 </div>

 {/* Storage / Archival Toggle */}
 <div className="flex items-center justify-between pt-2 border-t border-burgundy/10">
 <div>
 <p className="text-xs font-bold text-burgundy">حالة تداول الصنف في المحل</p>
 <p className="text-[11px] text-burgundy/60">
 {form.isSeasonArchived
 ? 'مخزن بالمستودع (مستبعد ومخفي تلقائياً من الكاشير والجرد)'
 : 'متاح ومعروض في المحل (يظهر في الكاشير وفي شاشة الجرد)'}
 </p>
 </div>
 <button
 type="button"
 onClick={() => setForm(p => ({ ...p, isSeasonArchived: !p.isSeasonArchived }))}
 className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
 form.isSeasonArchived
 ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
 : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
 }`}
 >
 {form.isSeasonArchived ? 'مخزن موسمي' : 'نشط بالمعرض'}
 </button>
 </div>

 {/* Online Storefront Visibility Toggle */}
 <div className="flex items-center justify-between pt-2 border-t border-burgundy/10">
 <div>
 <p className="text-xs font-bold text-burgundy flex items-center gap-1">
 <span>عرض المنتج في المتجر الإلكتروني (الموقع أونلاين) 🌐</span>
 </p>
 <p className="text-[11px] text-burgundy/60">
 {form.showOnWebsite !== false
 ? 'متاح ومعروض للعملاء على الموقع'
 : 'مخفي من الموقع أونلاين (متاح للبيع داخل المحل والكاشير فقط)'}
 </p>
 </div>
 <button
 type="button"
 onClick={() => setForm(p => ({ ...p, showOnWebsite: !(p.showOnWebsite !== false) }))}
 className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
 form.showOnWebsite !== false
 ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
 : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
 }`}
 >
 <span>{form.showOnWebsite !== false ? '🌐 معروض أونلاين' : '🚫 مخفي من الموقع'}</span>
 </button>
 </div>

 {/* Off-Season Warning Notice */}
 {siteConfig?.websiteSeason && siteConfig.websiteSeason !== 'all' && form.season !== 'all' && form.season !== siteConfig.websiteSeason && (
 <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2 mt-2">
 <span>⚠️</span>
 <span>
 <strong>تنبيه موسمي:</strong> موسم المتجر أونلاين مضبوط حالياً على <strong>({siteConfig?.websiteSeason === 'winter' ? 'الشتوي ❄️' : 'الصيفي ☀️'})</strong>، وهذا الصنف مصنف <strong>({form.season === 'winter' ? 'شتوي' : 'صيفي'})</strong>، لذلك لن يظهر لزوار الموقع أونلاين حتى تحويل موسم الموقع.
 </span>
 </div>
 )}
 </div>

 <div className="sm:col-span-2">
 <label className="flex items-center gap-2 cursor-pointer bg-burgundy/5 p-3 rounded-xl border border-burgundy/10 hover:bg-burgundy/10 transition">
 <input
 type="checkbox"
 name="allowDiscount"
 checked={form.allowDiscount !== false}
 onChange={(e) => setForm(p => ({ ...p, allowDiscount: e.target.checked }))}
 className="w-5 h-5 accent-burgundy cursor-pointer"
 />
 <div>
 <span className="block text-sm font-bold text-burgundy">مسموح بالخصم لهذا المنتج؟</span>
 <span className="block text-[10px] text-burgundy/60">لو تم إلغاء التفعيل، الكاشير مش هيقدر يضيف أي خصم على المنتج ده</span>
 </div>
 </label>
 </div>
 
 </div>
<div>
<ImageUploader
  images={form.images}
  onChange={(newImages) => setForm(p => ({ ...p, images: newImages }))}
  label="صور المنتج للمعرض والموقع"
/>
</div>
<div className="pt-2">
  <MannequinImageUploader
    value={form.mannequinImage || ''}
    onChange={(newUrl) => setForm(p => ({ ...p, mannequinImage: newUrl }))}
  />
</div>
{ENABLE_VARIANTS && (
<div className="space-y-4">
<div className="rounded-xl border border-burgundy/15 bg-burgundy/5 p-3 flex items-center justify-between text-xs text-burgundy">
  <div className="flex items-center gap-2">
    <span>💡</span>
    <span><strong>صور ألوان الموقع والمانيكان:</strong> لتخصيص صور كل لون وعرض مانيكان المحل، انتقل إلى صفحة إعدادات الموقع.</span>
  </div>
  <button
    type="button"
    onClick={() => navigate('/admin/site-settings?tab=online-products')}
    className="text-burgundy underline font-bold hover:text-burgundy/80 whitespace-nowrap"
  >
    إعدادات الموقع ←
  </button>
</div>
<div className="grid gap-4 sm:grid-cols-2">
 <div>
 <div className="flex items-center justify-between mb-1">
 <label className="text-xs font-semibold uppercase tracking-wide text-burgundy/60">المقاسات المتاحة للمنتج</label>
 <span className="text-[10px] text-burgundy/50 font-bold">{parsedSizes.length} مقاسات</span>
 </div>
 <input name="sizes" value={typeof form.sizes === "string" ? form.sizes : (form.sizes || []).join(", ")} onChange={handleChange} className={inp} placeholder="اكتب مقاسات مخصصة أو اختر من الأسفل (مثال: One Size, 48, S, M, L)" />
 <div className="flex flex-wrap gap-1 mt-2">
 {["One Size", "مقاس واحد", "Free Size", "S", "M", "L", "XL", "2XL", "3XL", "38", "40", "42", "44", "46"].map(sz => {
 const isSel = parsedSizes.includes(sz);
 return (
 <button
 key={sz}
 type="button"
 onClick={() => {
 const updated = isSel ? parsedSizes.filter(s => s !== sz) : [...parsedSizes, sz];
 setForm(p => ({ ...p, sizes: updated.join(", ") }));
 }}
 className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
 isSel ? "bg-burgundy text-white border-burgundy shadow-xs" : "bg-white text-burgundy/70 border-burgundy/15 hover:bg-burgundy/5"
 }`}
 >
 {sz} {isSel && "✓"}
 </button>
 );
 })}
 </div>
 </div>
 <div>
 <div className="flex items-center justify-between mb-1">
 <label className="text-xs font-semibold uppercase tracking-wide text-burgundy/60">الألوان المتاحة للمنتج</label>
 <span className="text-[10px] text-burgundy/50 font-bold">{parsedColors.length > 0 ? `${parsedColors.length} ألوان` : 'لون واحد (افتراضي)'}</span>
 </div>
 <input name="colors" value={typeof form.colors === "string" ? form.colors : (form.colors || []).join(", ")} onChange={handleChange} className={inp} placeholder="أحمر, أخضر, أبيض × أسود, مشجر (أو اتركه فارغاً ليكون لون واحد)" />
 
 {/* Single Colors Presets */}
 <div className="mt-2">
 <p className="text-[10px] font-bold text-burgundy/60 mb-1">الألوان الفردية الشائعة:</p>
 <div className="flex flex-wrap gap-1">
 {["لون واحد", "أحمر", "أخضر", "بورجندي", "أسود", "أبيض", "بيج", "كحلي", "بترولي", "كشمير", "جنزاري", "سماوي", "زيتي", "سيمون", "لافندر", "أصفر"].map(clr => {
 const isSel = parsedColors.includes(clr);
 return (
 <button
 key={clr}
 type="button"
 onClick={() => {
 const updated = isSel ? parsedColors.filter(c => c !== clr) : [...parsedColors, clr];
 setForm(p => ({ ...p, colors: updated.join(", ") }));
 }}
 className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
 isSel ? "bg-burgundy text-white border-burgundy shadow-xs" : "bg-white text-burgundy/70 border-burgundy/15 hover:bg-burgundy/5"
 }`}
 >
 <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style={getColorStyle(clr)} />
 <span>{clr}</span>
 {isSel && <span>✓</span>}
 </button>
 );
 })}
 </div>
 </div>

 {/* Multi-Colors & Patterns Presets */}
 <div className="mt-3 pt-2 border-t border-burgundy/10">
 <div className="flex items-center justify-between mb-1">
 <p className="text-[10px] font-bold text-burgundy/70 flex items-center gap-1">
 <span>🎨</span>
 <span>ألوان متعددة ونقشات جاهزة (قطعة بأكثر من لون):</span>
 </p>
 <span className="text-[9px] text-burgundy/40">تظهر للعميل بدائرة مقسومة نصفين أو نقشة مميزة</span>
 </div>
 <div className="flex flex-wrap gap-1.5">
 {PRESET_MULTI_COLORS.map(multiClr => {
 const isSel = parsedColors.includes(multiClr);
 return (
 <button
 key={multiClr}
 type="button"
 onClick={() => {
 const updated = isSel ? parsedColors.filter(c => c !== multiClr) : [...parsedColors, multiClr];
 setForm(p => ({ ...p, colors: updated.join(", ") }));
 }}
 className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1.5 cursor-pointer ${
 isSel ? "bg-burgundy text-white border-burgundy shadow-xs" : "bg-white text-burgundy/80 border-burgundy/20 hover:bg-burgundy/5"
 }`}
 >
 <span className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0 shadow-2xs" style={getColorStyle(multiClr)} />
 <span>{multiClr}</span>
 {isSel && <span>✓</span>}
 </button>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 </div>
 )}
 {hasVariants && (
 <div className="rounded-[1.5rem] border border-burgundy/10 bg-white p-5 space-y-3 shadow-inner max-h-[220px] overflow-y-auto">
 <p className="text-xs font-bold uppercase tracking-wider text-burgundy/60">مخزون المقاسات والألوان</p>
 <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
 {combinations.map(c => {
 const key = `${c.size}_${c.color}`;
 return (
 <div key={key} className="flex items-center justify-between gap-3 p-3 bg-burgundy/3 rounded-xl border border-burgundy/5">
 <div className="text-sm font-semibold">
 {c.size && <span>مقاس: {c.size}</span>}
 {c.size && c.color && <span> · </span>}
 {c.color && <span>لون: {c.color}</span>}
 </div>
 <input
 type="number"
 min="0"
 value={getVariantStockVal(c.size, c.color)}
 onChange={e => {
 const val = Math.max(0, Number(e.target.value) || 0);
 const normKey = makeVariantKey(c.size, c.color);
 setVariantStocks(prev => ({
 ...prev,
 [normKey]: val,
 [key]: val,
 [`${c.size}_`]: val,
 [`_${c.color}`]: val
 }));
 }}
 className="w-20 rounded-lg border border-burgundy/20 bg-white px-2 py-1.5 text-center text-xs font-bold outline-none focus:border-burgundy"
 />
 </div>
 );
 })}
 </div>
 </div>
 )}
 <div className="flex gap-3 pt-2">
 <button type="submit" disabled={loading} className="flex-1 rounded-full bg-burgundy py-3 text-sm font-bold text-white transition hover:bg-[#650018] disabled:opacity-60">
 {loading ? 'جاري الحفظ...' : 'حفظ المنتج'}
 </button>
 <button type="button" onClick={onClose} className="rounded-full border border-burgundy/20 px-6 py-3 text-sm font-medium text-burgundy transition hover:bg-burgundy/10">إلغاء</button>
 </div>
 </form>
 </div>
 </div>
 );
}

// ─── Tab: Catalog ──────────────────────────────────────────────────────────────

export default ProductModal;
