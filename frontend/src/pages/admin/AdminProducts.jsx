import { useEffect, useState } from 'react';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';

const CATEGORIES = ['Blouse', 'Chemise', 'Skirt', 'Dress', 'Pantalon', 'T-shirt', 'Bag', 'Cardigan'];
const CAT_AR = { Blouse: 'بلوزة', Chemise: 'شميز', Skirt: 'جيبة', Dress: 'فستان', Pantalon: 'بنطلون', 'T-shirt': 'تيشيرت', Bag: 'شنطة', Cardigan: 'كاردن' };
const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;

const getProductIcon = (category = '', name = '') => {
  const cat = (category || '').toLowerCase();
  const nm = (name || '').toLowerCase();
  if (cat.includes('bag') || cat.includes('حقيبة') || cat.includes('شنط') || nm.includes('شنط') || nm.includes('حقيب')) return '👜';
  if (cat.includes('dress') || cat.includes('فستان') || cat.includes('دريس') || nm.includes('فستان') || nm.includes('دريس')) return '👗';
  if (cat.includes('shoes') || cat.includes('حذاء') || cat.includes('شوز') || cat.includes('كوتش') || nm.includes('شوز') || nm.includes('حذاء') || nm.includes('كوتش')) return '👟';
  if (cat.includes('t-shirt') || cat.includes('تيشرت') || cat.includes('تي شيرت') || nm.includes('تيشرت') || nm.includes('تي شيرت')) return '👕';
  if (cat.includes('shirt') || cat.includes('قميص') || nm.includes('قميص') || nm.includes('شيرت')) return '👔';
  if (cat.includes('pants') || cat.includes('trousers') || cat.includes('بنطلون') || cat.includes('جينز') || nm.includes('بنطلون') || nm.includes('جينز')) return '👖';
  if (cat.includes('jacket') || cat.includes('جاكيت') || cat.includes('معطف') || cat.includes('بالتو') || nm.includes('جاكيت') || nm.includes('معطف')) return '🧥';
  if (cat.includes('skirt') || cat.includes('جيب') || cat.includes('تنورة') || nm.includes('جيب') || nm.includes('تنورة')) return '👗';
  if (cat.includes('wallet') || cat.includes('محفظة') || cat.includes('بورتفيه') || nm.includes('محفظة') || nm.includes('بورتفيه')) return '👛';
  if (cat.includes('perfume') || cat.includes('عطر') || cat.includes('برفيوم') || nm.includes('عطر') || nm.includes('برفيوم')) return '🧴';
  if (cat.includes('accessory') || cat.includes('إكسسوار') || cat.includes('اكسسوار') || nm.includes('إكسسوار') || nm.includes('اكسسوار')) return '💍';
  if (cat.includes('socks') || cat.includes('شراب') || nm.includes('شراب') || nm.includes('جورب')) return '🧦';
  if (cat.includes('blouse') || cat.includes('بلوزة') || nm.includes('بلوزة')) return '👚';
  if (cat.includes('scarf') || cat.includes('طرحة') || cat.includes('شال') || cat.includes('حجاب') || nm.includes('طرحة') || nm.includes('شال') || nm.includes('حجاب')) return '🧣';
  return '🛍️';
};

// ─── Barcode generator (Code 39) ──────────────────────────────────────────────
const CODE39_MAP = {
  '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw',
  '5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',
  'A':'wnnnnwnnw','B':'nnwnnwnnw','C':'wnwnnwnnn','D':'nnnnwwnnw','E':'wnnnwwnnn',
  'F':'nnwnwwnnn','G':'nnnnnwwnw','H':'wnnnnwwnn','I':'nnwnnwwnn','J':'nnnnwwwnn',
  'K':'wnnnnnnww','L':'nnwnnnnww','M':'wnwnnnnwn','N':'nnnnwnnww','O':'wnnnwnnwn',
  'P':'nnwnwnnwn','Q':'nnnnnnwww','R':'wnnnnnwwn','S':'nnwnnnwwn','T':'nnnnwnwwn',
  '-':'nnnnnwwwn','*':'nnnwwnwnn',
};
function generateBarcodeSVG(text) {
  const chars = ('*' + text.toUpperCase() + '*').split('');
  const bars = []; let x = 0;
  const narrow = 2, wide = 5, gap = 2;
  chars.forEach((ch, ci) => {
    const pattern = CODE39_MAP[ch] || CODE39_MAP['-'];
    if (!pattern) return;
    pattern.split('').forEach((w, i) => {
      const width = w === 'w' ? wide : narrow;
      if (i % 2 === 0) bars.push({ x, width });
      x += width + (i % 2 === 1 ? gap : 0);
    });
    if (ci < chars.length - 1) x += gap * 2;
  });
  return { bars, totalW: x + 20 };
}
function printBarcode(product) {
  if (!product.sku) return alert('هذا المنتج ليس له كود (SKU) بعد');
  const { bars, totalW } = generateBarcodeSVG(product.sku);
  const svgBars = bars.map(b => `<rect x="${b.x + 10}" y="0" width="${b.width}" height="60" fill="#000"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="60">${svgBars}</svg>`;
  const win = window.open('', '_blank', 'width=400,height=300');
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"/><title>باركود - ${product.sku}</title>
  <style>@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Cairo',sans-serif;background:#fff;display:flex;justify-content:center;padding:20px}
  .label{border:1px solid #ccc;border-radius:8px;padding:16px 20px;text-align:center}
  .brand{font-size:13px;font-weight:700;color:#7C0A12;margin-bottom:6px}
  .name{font-size:11px;color:#333;margin-bottom:8px}.sku{font-family:monospace;font-size:14px;font-weight:700;letter-spacing:3px;margin-top:8px}
  .price{font-size:12px;color:#555;margin-top:4px}@media print{body{padding:0}}</style></head>
  <body><div class="label"><div class="brand">ModaPella</div><div class="name">${product.name}</div>${svg}
  <div class="sku">${product.sku}</div><div class="price">${Number(product.price).toLocaleString('ar-EG')} ج.م</div>
  </div></body></html>`);
  win.document.close(); win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

const emptyProduct = { name: '', category: 'Blouse', description: '', price: '', stock: '', images: '', sizes: '', colors: '', type: '', supplier: '' };

// ─── Product Modal ─────────────────────────────────────────────────────────────
function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(product || emptyProduct);
  const [loading, setLoading] = useState(false);
  const getParsedItems = (str) => str ? (typeof str === 'string' ? str.split(',').map(s => s.trim()).filter(Boolean) : str) : [];
  const parsedSizes = getParsedItems(form.sizes);
  const parsedColors = getParsedItems(form.colors);
  const [variantStocks, setVariantStocks] = useState(() => {
    const initial = {};
    if (product?.variants) product.variants.forEach(v => { initial[`${v.size || ''}_${v.color || ''}`] = v.stock; });
    return initial;
  });
  const handleChange = (e) => { const { name, value } = e.target; setForm(p => ({ ...p, [name]: value })); };
  const hasVariants = parsedSizes.length > 0 || parsedColors.length > 0;
  const activeSizes = parsedSizes.length > 0 ? parsedSizes : [''];
  const activeColors = parsedColors.length > 0 ? parsedColors : [''];
  const combinations = [];
  if (hasVariants) activeSizes.forEach(size => activeColors.forEach(color => combinations.push({ size, color })));
  const totalVariantStock = hasVariants
    ? combinations.reduce((sum, c) => sum + (variantStocks[`${c.size}_${c.color}`] || 0), 0)
    : Number(form.stock || 0);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const payload = {
        ...form, price: Number(form.price), stock: totalVariantStock,
        variants: hasVariants ? combinations.map(c => ({ size: c.size, color: c.color, stock: variantStocks[`${c.size}_${c.color}`] || 0 })) : [],
        images: form.images ? (typeof form.images === 'string' ? form.images.split('\n').map(s => s.trim()).filter(Boolean) : form.images) : [],
        sizes: parsedSizes, colors: parsedColors,
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
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">اسم المنتج *</label><input name="name" value={form.name} onChange={handleChange} className={inp} required /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">الفئة *</label>
              <select name="category" value={form.category} onChange={handleChange} className={inp}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_AR[c]} ({c})</option>)}
              </select>
            </div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">سعر البيع (ج.م) *</label><input type="number" name="price" value={form.price} onChange={handleChange} className={inp} required min="0" /></div>
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
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">المخزون الكلي *</label>
              <input type="number" name="stock" value={hasVariants ? totalVariantStock : form.stock} onChange={handleChange}
                disabled={hasVariants} className={`${inp} ${hasVariants ? 'bg-burgundy/5 opacity-70 cursor-not-allowed font-bold' : ''}`} required min="0" />
              {hasVariants && <p className="mt-1 text-[10px] text-burgundy/50">يُحسب تلقائياً من مجموع مخزون المتغيرات</p>}
            </div>
            <div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">الشركة الموردة / الماركة</label>
              <input name="supplier" value={form.supplier} onChange={handleChange} className={inp} placeholder="مثال: Zara, H&M..." />
            </div>
          </div>
          <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">الوصف</label><textarea name="description" value={form.description} onChange={handleChange} className={`${inp} min-h-[80px]`} /></div>
          <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">روابط الصور (سطر لكل رابط)</label>
            <textarea name="images" value={typeof form.images === 'string' ? form.images : (form.images || []).join('\n')} onChange={handleChange} className={`${inp} min-h-[70px]`} placeholder="https://example.com/image.jpg" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">المقاسات (بفاصلة)</label>
              <input name="sizes" value={typeof form.sizes === 'string' ? form.sizes : (form.sizes || []).join(', ')} onChange={handleChange} className={inp} placeholder="S, M, L, XL" />
            </div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">الألوان (بفاصلة)</label>
              <input name="colors" value={typeof form.colors === 'string' ? form.colors : (form.colors || []).join(', ')} onChange={handleChange} className={inp} placeholder="أبيض, أسود, بورجندي" />
            </div>
          </div>
          {hasVariants && (
            <div className="rounded-[1.5rem] border border-burgundy/10 bg-white p-5 space-y-3 shadow-inner max-h-[220px] overflow-y-auto">
              <p className="text-xs font-bold uppercase tracking-wider text-burgundy/60">🔢 مخزون المقاسات والألوان</p>
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
                      <input type="number" min="0" value={variantStocks[key] ?? 0}
                        onChange={e => setVariantStocks(prev => ({ ...prev, [key]: Math.max(0, Number(e.target.value) || 0) }))}
                        className="w-20 rounded-lg border border-burgundy/20 bg-white px-2 py-1.5 text-center text-xs font-bold outline-none focus:border-burgundy" />
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
function CatalogTab({ products, loading, onAdd, onEdit, onDelete }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const filtered = products.filter(p =>
    (filter === 'All' || p.category === filter) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 بحث بالاسم أو الكود..."
          className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none transition focus:border-burgundy min-w-[180px]" />
        <div className="flex flex-wrap gap-2">
          {['All', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filter === c ? 'bg-burgundy text-white' : 'border border-burgundy/20 text-burgundy hover:bg-burgundy/10'}`}>
              {c === 'All' ? 'الكل' : CAT_AR[c]}
            </button>
          ))}
        </div>
        <div className="mr-auto">
          <button onClick={onAdd} className="rounded-full bg-burgundy px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-burgundy/20 transition hover:bg-[#650018]">
            + إضافة منتج
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white py-16 text-center"><p className="text-4xl mb-3">📭</p><p className="text-sm text-burgundy/40">لا توجد منتجات مطابقة</p></div>
      ) : (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 bg-[#F7F0EC] px-6 py-3 text-xs font-bold uppercase tracking-wide text-burgundy/50">
            <span>المنتج</span><span>الفئة</span><span>السعر</span><span>المخزون</span><span>الإجراءات</span>
          </div>
          <div className="divide-y divide-burgundy/6">
            {filtered.map(p => (
              <div key={p._id} className="grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 px-6 py-4 transition hover:bg-burgundy/3">
                {/* Product */}
                <div className="flex items-center gap-3 min-w-0">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="h-12 w-12 flex-shrink-0 rounded-xl object-cover shadow-sm" />
                  ) : (
                    <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-burgundy/8 flex items-center justify-center text-xl">
                      {getProductIcon(p.category, p.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-sm">{p.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-burgundy/50">
                      {p.sku && <span className="font-mono bg-burgundy/5 px-1.5 py-0.5 rounded text-burgundy">{p.sku}</span>}
                      {p.supplier && <span>🏭 {p.supplier}</span>}
                    </div>
                    {p.sizes?.length > 0 && <p className="mt-0.5 text-xs text-burgundy/35">{p.sizes.join(' · ')}</p>}
                  </div>
                </div>
                <span className="hidden sm:inline-block rounded-full bg-burgundy/8 px-3 py-1 text-xs font-medium w-fit">{CAT_AR[p.category] || p.category}</span>
                <span className="hidden sm:block text-sm font-bold">{EGP(p.price)}</span>
                <span className={`hidden sm:inline-block rounded-full px-3 py-1 text-xs font-bold w-fit ${p.stock === 0 ? 'bg-red-100 text-red-600' : p.stock <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{p.stock} ق</span>
                <div className="flex gap-1.5">
                  <button onClick={() => onEdit(p)} className="rounded-xl border border-burgundy/20 px-3 py-1.5 text-xs font-medium text-burgundy transition hover:bg-burgundy hover:text-white">تعديل</button>
                  {p.sku && <button onClick={() => printBarcode(p)} className="rounded-xl border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-500 hover:text-white">🖶</button>}
                  <button onClick={() => onDelete(p._id)} className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500 hover:text-white">أرشفة</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Inventory ────────────────────────────────────────────────────────────
function InventoryTab({ products, loading, onRefresh }) {
  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState('الكل');
  const [filterStock, setFilterStock] = useState('all');
  const [adjusting, setAdjusting]   = useState(null);
  const [adjValue, setAdjValue]     = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [expanded, setExpanded]     = useState(null);
  const [toast, setToast]           = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const totalItems = products.reduce((s, p) => s + p.stock, 0);
  const totalValue = products.reduce((s, p) => s + p.stock * p.price, 0);
  const lowCount   = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const outCount   = products.filter(p => p.stock === 0).length;

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
      showToast('✅ تم تحديث المخزون');
      setAdjusting(null); setAdjValue(''); setSelectedVariant('');
      onRefresh();
    } catch { showToast('❌ حدث خطأ'); }
  };

  const stockBadge = (s) => s === 0 ? 'bg-red-100 text-red-600' : s <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';

  const filtered = products.filter(p => {
    const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase()) || (CAT_AR[p.category] || '').includes(search);
    const mc = filterCat === 'الكل' || p.category === filterCat;
    const mk = filterStock === 'all' ? true : filterStock === 'low' ? (p.stock > 0 && p.stock <= 5) : p.stock === 0;
    return ms && mc && mk;
  });

  return (
    <div className="space-y-4">
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'إجمالي القطع', value: `${totalItems.toLocaleString()} قطعة`, icon: '📦', cls: 'border-burgundy/10 bg-white', vcls: 'text-burgundy' },
          { label: 'قيمة المخزون', value: EGP(totalValue), icon: '💰', cls: 'border-burgundy/10 bg-white', vcls: 'text-burgundy' },
          { label: 'مخزون منخفض', value: `${lowCount} منتج`, icon: '⚠️', cls: 'border-amber-200 bg-amber-50', vcls: 'text-amber-700' },
          { label: 'نفد المخزون', value: `${outCount} منتج`, icon: '❌', cls: outCount > 0 ? 'border-red-200 bg-red-50' : 'border-burgundy/10 bg-white', vcls: outCount > 0 ? 'text-red-600' : 'text-burgundy' },
        ].map(s => (
          <div key={s.label} className={`rounded-[1.5rem] border p-4 ${s.cls}`}>
            <p className="text-xs text-burgundy/50 mb-1">{s.icon} {s.label}</p>
            <p className={`text-xl font-extrabold ${s.vcls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 بحث بالاسم أو الكود..."
          className="flex-1 min-w-[180px] rounded-2xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy" />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none">
          {['الكل', ...CATEGORIES].map(c => <option key={c} value={c}>{c === 'الكل' ? 'كل الفئات' : CAT_AR[c]}</option>)}
        </select>
        <div className="flex rounded-2xl border border-burgundy/20 bg-white overflow-hidden">
          {[{ id: 'all', l: 'الكل' }, { id: 'low', l: '⚠️ منخفض' }, { id: 'out', l: '❌ نفد' }].map(f => (
            <button key={f.id} onClick={() => setFilterStock(f.id)}
              className={`px-4 py-2.5 text-xs font-semibold transition ${filterStock === f.id ? 'bg-burgundy text-white' : 'text-burgundy/60 hover:bg-burgundy/8'}`}>
              {f.l}
            </button>
          ))}
        </div>
        <button onClick={onRefresh} className="rounded-2xl border border-burgundy/20 px-4 py-2.5 text-sm font-medium text-burgundy hover:bg-burgundy hover:text-white transition">🔄 تحديث</button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white py-16 text-center"><p className="text-4xl mb-3">📭</p><p className="text-sm text-burgundy/40">لا توجد منتجات مطابقة</p></div>
      ) : (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_160px] gap-4 px-5 py-3 border-b border-burgundy/8 bg-[#F7F0EC] text-xs font-bold uppercase tracking-wide text-burgundy/50">
            <span>المنتج</span><span>الفئة</span><span>السعر</span><span>المخزون</span><span>تعديل الكمية</span>
          </div>
          <div className="divide-y divide-burgundy/6">
            {filtered.map(p => (
              <div key={p._id}>
                <div className="grid sm:grid-cols-[2fr_1fr_1fr_1fr_160px] gap-4 px-5 py-4 items-center hover:bg-[#F7F0EC]/40 transition">
                  {/* Product */}
                  <div className="flex items-center gap-3 min-w-0">
                    {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="h-12 w-12 flex-shrink-0 rounded-xl object-cover shadow-sm" />
                      : <div className="h-12 w-12 rounded-xl bg-burgundy/8 flex items-center justify-center text-xl flex-shrink-0">👗</div>}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      {p.sku && <p className="text-xs text-burgundy/40 font-mono">{p.sku}</p>}
                      {p.supplier && <p className="text-xs text-burgundy/40">🏭 {p.supplier}</p>}
                    </div>
                  </div>
                  <span className="hidden sm:inline-block text-xs bg-burgundy/8 text-burgundy px-2.5 py-1 rounded-full font-medium w-fit">{CAT_AR[p.category] || p.category}</span>
                  <span className="hidden sm:block text-sm font-bold">{EGP(p.price)}</span>
                  {/* Stock */}
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${stockBadge(p.stock)}`}>{p.stock} قطعة</span>
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
                        <button onClick={() => handleAdjust(p._id)} className="rounded-xl bg-burgundy px-2.5 py-1 text-xs font-bold text-white hover:bg-[#650018] transition">✓</button>
                        <button onClick={() => { setAdjusting(null); setAdjValue(''); }} className="rounded-xl border border-burgundy/20 px-2 py-1 text-xs text-burgundy hover:bg-burgundy/8 transition">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => startAdjusting(p)}
                        className="rounded-xl border border-burgundy/20 px-4 py-1.5 text-xs font-semibold text-burgundy transition hover:bg-burgundy hover:text-white">
                        تعديل المخزون
                      </button>
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
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('catalog'); // 'catalog' | 'inventory'
  const [modal, setModal]       = useState(null);
  const [toast, setToast]       = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadProducts(); }, []);

  const handleSave = async (payload) => {
    try {
      if (payload._id) {
        await api.put(`/admin/products/${payload._id}`, payload);
        showToast('✅ تم تحديث المنتج');
      } else {
        await api.post('/admin/products', payload);
        showToast('✅ تم إضافة المنتج');
      }
      await loadProducts();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'خطأ غير معروف';
      alert(`فشل الحفظ: ${msg}`); throw err;
    }
  };

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const handleDelete = async (id) => {
    await api.delete(`/admin/products/${id}`);
    showToast('✅ تم الأرشفة');
    await loadProducts();
    setIsDeleteOpen(false);
    setProductToDelete(null);
  };

  const TABS = [
    { id: 'catalog',   label: 'كتالوج المنتجات', icon: '🛍️' },
    { id: 'inventory', label: 'إدارة المخزون',    icon: '📦' },
  ];

  return (
    <div className="space-y-6 text-burgundy">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">الإدارة</p>
        <h2 className="text-2xl font-bold">المنتجات والمخزون</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl border border-burgundy/10 p-1.5 w-fit shadow-sm">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tab === t.id
                ? 'bg-burgundy text-white shadow-md shadow-burgundy/25'
                : 'text-burgundy/60 hover:text-burgundy hover:bg-burgundy/6'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'catalog' ? (
        <CatalogTab
          products={products}
          loading={loading}
          onAdd={() => setModal('create')}
          onEdit={p => setModal({ ...p, images: (p.images || []).join('\n'), sizes: (p.sizes || []).join(', '), colors: (p.colors || []).join(', ') })}
          onDelete={id => { setProductToDelete(id); setIsDeleteOpen(true); }}
        />
      ) : (
        <InventoryTab
          products={products}
          loading={loading}
          onRefresh={loadProducts}
        />
      )}

      {/* Modal */}
      {modal && (
        <ProductModal
          product={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        title="تأكيد الأرشفة"
        message="هل أنت متأكد من أرشفة هذا المنتج؟ لن يظهر مجدداً في واجهة الكاشير ولكنه سيظل في قاعدة البيانات للتقارير القديمة."
        onConfirm={() => handleDelete(productToDelete)}
        onCancel={() => { setIsDeleteOpen(false); setProductToDelete(null); }}
      />
    </div>
  );
}

export default AdminProducts;
