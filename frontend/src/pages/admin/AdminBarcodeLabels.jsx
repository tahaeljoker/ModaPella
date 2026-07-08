import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

const CATEGORY_LABELS = {
  Blouse: 'بلوزة',
  Chemise: 'شميز',
  Skirt: 'جيبة',
  Dress: 'فستان',
  Pantalon: 'بنطلون',
  'T-shirt': 'تيشيرت',
  Bag: 'شنطة',
  Cardigan: 'كاردن',
  Suit: 'سوت',
};

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;

// ── Simple Code 128 barcode renderer using SVG bars ─────────────────────────
// Uses a simplified encoding sufficient for short alphanumeric SKU codes.
// Pattern tables for Code 128B (A-Z, 0-9, -)
const CODE128B = {
  ' ': [2,1,2,2,2,2], '!': [2,2,2,1,2,2], '"': [2,2,2,2,2,1],
  '#': [1,2,1,2,2,3], '$': [1,2,1,3,2,2], '%': [1,3,1,2,2,2],
  '&': [1,2,2,2,1,3], "'": [1,2,2,3,1,2], '(': [1,3,2,2,1,2],
  ')': [2,2,1,2,1,3], '*': [2,2,1,3,1,2], '+': [2,3,1,2,1,2],
  ',': [1,1,2,2,3,2], '-': [1,2,2,1,3,2], '.': [1,2,2,2,3,1],
  '/': [1,1,3,2,2,2], '0': [1,2,3,2,2,1], '1': [1,2,3,1,2,2],
  '2': [1,2,3,2,1,2], '3': [2,1,1,2,2,3], '4': [2,1,1,3,2,2],
  '5': [2,2,1,1,2,3], '6': [2,2,1,3,2,1], '7': [2,1,2,2,1,3],
  '8': [2,1,2,3,1,2], '9': [3,1,2,2,1,2], ':': [3,1,1,2,2,2],
  ';': [2,1,3,2,1,2], '<': [3,2,1,1,2,2], '=': [3,2,1,2,2,1],
  '>': [2,1,2,1,3,2], '?': [2,2,3,1,1,2], '@': [2,2,3,2,1,1],
  'A': [3,1,1,1,2,3], 'B': [3,1,1,3,2,1], 'C': [3,3,1,1,2,1],
  'D': [3,1,2,1,1,3], 'E': [3,1,2,3,1,1], 'F': [3,3,2,1,1,1],
  'G': [3,1,4,1,1,1], 'H': [2,2,1,4,1,1], 'I': [4,3,1,1,1,1],
  'J': [1,1,1,2,2,4], 'K': [1,1,1,4,2,2], 'L': [1,2,1,1,2,4],
  'M': [1,2,1,4,2,1], 'N': [1,4,1,1,2,2], 'O': [1,4,1,2,2,1],
  'P': [1,1,2,2,1,4], 'Q': [1,1,2,4,1,2], 'R': [1,2,2,1,1,4],
  'S': [1,2,2,4,1,1], 'T': [1,4,2,1,1,2], 'U': [1,4,2,2,1,1],
  'V': [2,4,1,2,1,1], 'W': [2,2,1,1,1,4], 'X': [4,1,3,1,1,1],
  'Y': [2,4,1,1,1,2], 'Z': [1,1,4,2,1,2],
  START_B: [2,1,1,4,1,2], STOP: [2,3,3,1,1,1,2]
};

function renderCode128(text) {
  const chars = text.toUpperCase().split('').filter(c => CODE128B[c]);
  if (chars.length === 0) return null;

  const startPattern = CODE128B['START_B'];
  const stopPattern  = CODE128B['STOP'];
  const barPatterns  = chars.map(c => CODE128B[c]);
  const allPatterns  = [startPattern, ...barPatterns, stopPattern];

  const bars = [];
  allPatterns.forEach(pattern => {
    pattern.forEach((w, i) => bars.push({ width: w, isBar: i % 2 === 0 }));
  });

  const totalUnits = bars.reduce((s, b) => s + b.width, 0);
  const unitPx = 2;
  const totalWidth = totalUnits * unitPx;
  const height = 48;
  let x = 0;

  const rects = bars.map((bar, i) => {
    const rect = bar.isBar
      ? <rect key={i} x={x} y={0} width={bar.width * unitPx} height={height} fill="#1a0509" />
      : null;
    x += bar.width * unitPx;
    return rect;
  }).filter(Boolean);

  return { rects, totalWidth, height };
}

// ── Label Component (40mm × 20mm thermal label style) ───────────────────────
function BarcodeLabel({ product, qty }) {
  const svg = renderCode128(product.sku);
  return (
    <div
      className="barcode-label"
      style={{
        width: '40mm',
        height: '20mm',
        border: '1px solid #ddd',
        borderRadius: '3px',
        padding: '1.5px 3px',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: 'Cairo, Arial, sans-serif',
        direction: 'rtl',
        background: '#fff',
        margin: '1mm',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ width: '100%', textAlign: 'center', lineHeight: '1.1' }}>
        <div style={{ fontSize: '7px', fontWeight: '900', color: '#7C0A12' }}>ModaPella</div>
        <div style={{ fontSize: '6.5px', color: '#333', marginTop: '0.5px', maxWidth: '36mm', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {product.name}
        </div>
      </div>

      {svg ? (
        <svg
          viewBox={`0 0 ${svg.totalWidth} ${svg.height}`}
          style={{ width: '36mm', height: '6mm', margin: '1px 0' }}
          preserveAspectRatio="none"
        >
          {svg.rects}
        </svg>
      ) : (
        <div style={{ fontSize: '6px', color: '#ccc', margin: '2px 0' }}>[ لا يوجد باركود ]</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 2px', alignItems: 'center', lineHeight: '1' }}>
        <span style={{ fontSize: '7px', fontWeight: '700', fontFamily: 'monospace', color: '#1a0509' }}>
          {product.sku}
        </span>
        <span style={{ fontSize: '7.5px', fontWeight: '900', color: '#7C0A12' }}>
          {EGP(product.price)}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
function AdminBarcodeLabels() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState({}); // productId => qty
  const [selected, setSelected] = useState({}); // productId => bool
  const printRef = useRef(null);

  useEffect(() => {
    api.get('/products')
      .then(res => {
        const withSku = (res.data || []).filter(p => p.sku && p.active !== false);
        setProducts(withSku);
        const defaultQtys = {};
        const defaultSel = {};
        withSku.forEach(p => { defaultQtys[p._id] = 1; defaultSel[p._id] = false; });
        setQuantities(defaultQtys);
        setSelected(defaultSel);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
    (CATEGORY_LABELS[p.category] || '').includes(search)
  );

  const selectedProducts = products.filter(p => selected[p._id]);

  const handlePrint = () => {
    if (selectedProducts.length === 0) return alert('اختر منتجاً واحداً على الأقل لطباعة ملصقاته');
    const printDiv = document.createElement('div');
    printDiv.id = 'barcode-print-root';

    const labelsHTML = selectedProducts.flatMap(p => {
      const qty = quantities[p._id] || 1;
      return Array.from({ length: qty }, () => {
        const svg = renderCode128(p.sku);
        const svgContent = svg
          ? `<svg viewBox="0 0 ${svg.totalWidth} ${svg.height}" style="width:36mm;height:6mm;margin:1px 0;" preserveAspectRatio="none">
              ${svg.rects.map(r => `<rect x="${r.props.x}" y="0" width="${r.props.width}" height="${svg.height}" fill="#1a0509"/>`).join('')}
             </svg>`
          : `<div style="font-size:6px;color:#ccc;text-align:center">[ لا يوجد باركود ]</div>`;

        return `<div class="print-label-wrapper" style="page-break-after:always;break-after:page;display:block;width:40mm;height:19mm;overflow:hidden;box-sizing:border-box;">
          <div class="print-label-page" style="width:40mm;height:19mm;padding:1.5px 3px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;font-family:Cairo,Arial,sans-serif;direction:rtl;background:#fff;box-sizing:border-box;overflow:hidden;">
            <div style="width:100%;text-align:center;line-height:1.1;">
              <div style="font-size:7px;font-weight:900;color:#7C0A12;">ModaPella</div>
              <div style="font-size:6.5px;color:#333;margin-top:0.5px;max-width:36mm;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${p.name}</div>
            </div>
            ${svgContent}
            <div style="display:flex;justify-content:space-between;width:100%;padding:0 2px;align-items:center;line-height:1;">
              <span style="font-size:7px;font-weight:700;font-family:monospace;color:#1a0509;">${p.sku}</span>
              <span style="font-size:7.5px;font-weight:900;color:#7C0A12;">${Number(p.price).toLocaleString('ar-EG')} ج.م</span>
            </div>
          </div>
        </div>`;
      });
    }).join('');

    printDiv.innerHTML = labelsHTML;

    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          size: 40mm 20mm landscape;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          background: #fff;
        }
        body > * {
          display: none !important;
        }
        #barcode-print-root {
          display: block !important;
          width: 40mm;
          margin: 0;
          padding: 0;
        }
        #barcode-print-root, #barcode-print-root * {
          visibility: visible;
        }
        .print-label-wrapper {
          display: block !important;
          width: 40mm;
          height: 19mm;
          page-break-after: always;
          break-after: page;
          box-sizing: border-box;
          overflow: hidden;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
    document.head.removeChild(style);
  };

  const toggleAll = (val) => {
    const upd = {};
    filtered.forEach(p => { upd[p._id] = val; });
    setSelected(prev => ({ ...prev, ...upd }));
  };

  const totalLabels = selectedProducts.reduce((s, p) => s + (quantities[p._id] || 1), 0);

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/50">لوحة التحكم</p>
          <h2 className="mt-1 text-3xl font-bold">🏷️ مولّد ملصقات الباركود</h2>
          <p className="mt-1 text-sm text-burgundy/60">
            اختر المنتجات وحدد عدد الملصقات لكل منتج، ثم اضغط طباعة
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalLabels > 0 && (
            <span className="rounded-full bg-burgundy/10 px-4 py-2 text-sm font-bold text-burgundy">
              {totalLabels} ملصق جاهز للطباعة
            </span>
          )}
          <button
            onClick={handlePrint}
            disabled={selectedProducts.length === 0}
            className="flex items-center gap-2 rounded-full bg-burgundy px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#650018] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🖨️ طباعة الملصقات
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-800">
        💡 <strong>نصيحة:</strong> استخدم ورق ملصقات (Sticker Paper) بحجم A4 للحصول على أفضل نتيجة. كل ملصق مصمم بعرض 57mm مناسب للطابعات الحرارية وطابعات الملصقات العادية.
      </div>

      {/* Search + Select All */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث باسم المنتج أو SKU أو الفئة..."
          className="flex-1 rounded-2xl border border-burgundy/20 bg-white px-5 py-3 text-sm outline-none transition focus:border-burgundy focus:shadow-sm"
        />
        <button
          onClick={() => toggleAll(true)}
          className="rounded-xl bg-burgundy/10 px-4 py-2.5 text-sm font-bold text-burgundy transition hover:bg-burgundy/20"
        >
          تحديد الكل
        </button>
        <button
          onClick={() => toggleAll(false)}
          className="rounded-xl border border-burgundy/20 px-4 py-2.5 text-sm font-bold text-burgundy/60 transition hover:bg-burgundy/5"
        >
          إلغاء التحديد
        </button>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-burgundy/40">
          <span className="text-4xl">🔍</span>
          <p className="text-sm">لا توجد منتجات بباركود تطابق البحث</p>
          <p className="text-xs">تأكد من إضافة كود SKU للمنتجات من صفحة إدارة المنتجات</p>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-burgundy/8 bg-burgundy/5">
                <th className="py-4 pr-5 font-semibold text-burgundy/70 w-10">
                  <input
                    type="checkbox"
                    checked={filtered.every(p => selected[p._id])}
                    onChange={e => toggleAll(e.target.checked)}
                    className="rounded"
                  />
                </th>
                <th className="py-4 font-semibold text-burgundy/70">المنتج</th>
                <th className="py-4 font-semibold text-burgundy/70">SKU / الكود</th>
                <th className="py-4 font-semibold text-burgundy/70">الفئة</th>
                <th className="py-4 font-semibold text-burgundy/70">السعر</th>
                <th className="py-4 font-semibold text-burgundy/70 pl-5 text-left">عدد الملصقات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr
                  key={p._id}
                  onClick={() => setSelected(prev => ({ ...prev, [p._id]: !prev[p._id] }))}
                  className={`border-b border-burgundy/5 last:border-0 cursor-pointer transition ${
                    selected[p._id] ? 'bg-burgundy/5' : 'hover:bg-burgundy/3'
                  }`}
                >
                  <td className="py-3 pr-5">
                    <input
                      type="checkbox"
                      checked={!!selected[p._id]}
                      onChange={() => {}}
                      className="rounded pointer-events-none"
                    />
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-burgundy/8 flex items-center justify-center text-lg flex-shrink-0">👗</div>
                      )}
                      <div>
                        <p className="font-semibold text-burgundy">{p.name}</p>
                        {p.supplier && <p className="text-xs text-burgundy/50">🏭 {p.supplier}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="rounded-lg bg-burgundy/8 px-3 py-1 font-mono text-xs font-bold text-burgundy">
                      {p.sku}
                    </span>
                  </td>
                  <td className="py-3 text-burgundy/70">{CATEGORY_LABELS[p.category] || p.category}</td>
                  <td className="py-3 font-bold">{EGP(p.price)}</td>
                  <td className="py-3 pl-5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setQuantities(prev => ({ ...prev, [p._id]: Math.max(1, (prev[p._id] || 1) - 1) }))}
                        className="w-8 h-8 rounded-lg bg-burgundy/8 text-burgundy font-bold hover:bg-burgundy/15 transition"
                      >−</button>
                      <span className="w-8 text-center font-bold text-burgundy">{quantities[p._id] || 1}</span>
                      <button
                        onClick={() => setQuantities(prev => ({ ...prev, [p._id]: (prev[p._id] || 1) + 1 }))}
                        className="w-8 h-8 rounded-lg bg-burgundy/8 text-burgundy font-bold hover:bg-burgundy/15 transition"
                      >+</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview */}
      {selectedProducts.length > 0 && (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">معاينة الملصقات</h3>
            <span className="text-sm text-burgundy/50">{totalLabels} ملصق</span>
          </div>
          <div ref={printRef} className="flex flex-wrap gap-2">
            {selectedProducts.flatMap(p =>
              Array.from({ length: quantities[p._id] || 1 }, (_, i) => (
                <BarcodeLabel key={`${p._id}-${i}`} product={p} qty={quantities[p._id] || 1} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBarcodeLabels;
