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

// ─── Barcode generator (Code 39) ──────────────────────────────────────────────
const CODE39_MAP = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  'A': 'wnnnnwnnw', 'B': 'nnwnnwnnw', 'C': 'wnwnnwnnn', 'D': 'nnnnwwnnw',
  'E': 'wnnnwwnnn', 'F': 'nnwnwwnnn', 'G': 'nnnnnwwnw', 'H': 'wnnnnwwnn',
  'I': 'nnwnnwwnn', 'J': 'nnnnwwwnn',
  'K': 'wnnnnnnww', 'L': 'nnwnnnnww', 'M': 'wnwnnnnwn', 'N': 'nnnnwnnww',
  'O': 'wnnnwnnwn', 'P': 'nnwnwnnwn', 'Q': 'nnnnnnwww', 'R': 'wnnnnnwwn',
  'S': 'nnwnnnwwn', 'T': 'nnnnwnwwn',
  'U': 'wwnnnnnnw', 'V': 'nwwnnnnnw', 'W': 'wwwnnnnnn', 'X': 'nwnnwnnnw',
  'Y': 'wwnnwnnnn', 'Z': 'nwwnwnnnn',
  '-': 'nnnnnwwwn', '.': 'wnnnnnwwn', ' ': 'nwnnnnnwn', '*': 'nwnnwnwnn',
  '$': 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn'
};
function generateBarcodeSVG(text) {
  const chars = ('*' + text.toUpperCase() + '*').split('');
  const bars = [];
  let x = 0;
  const narrow = 2;
  const wide = 5;
  const interCharacterGap = 2;

  chars.forEach((ch, ci) => {
    const pattern = CODE39_MAP[ch] || CODE39_MAP['-'];
    pattern.split('').forEach((w, i) => {
      const width = w === 'w' ? wide : narrow;
      const isBar = i % 2 === 0;
      if (isBar) {
        bars.push({ x, width });
      }
      x += width;
    });
    if (ci < chars.length - 1) {
      x += interCharacterGap;
    }
  });
  return { bars, totalW: x };
}

// ── Label Component (1.57in × 1.18in thermal label style) ───────────────────────
function BarcodeLabel({ product, qty }) {
  const svg = generateBarcodeSVG(product.sku);
  return (
    <div
      className="barcode-label"
      style={{
        width: '1.57in',
        height: '1.18in',
        border: '1px solid #ddd',
        borderRadius: '3px',
        padding: '3mm 4mm',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center', // Centers vertically in flex column
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
      <div style={{ width: '100%', textAlign: 'center', lineHeight: '1.1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '7.5px', fontWeight: '900', color: '#7C0A12' }}>ModaPella</div>
        <div style={{ fontSize: '7px', color: '#555', marginTop: '0.5px', maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {product.name}
        </div>
      </div>

      {svg ? (
        <div style={{ width: '100%', height: '8mm', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '2px 0' }}>
          <svg
            viewBox={`0 0 ${svg.totalW} 60`}
            style={{ width: '100%', height: '100%' }}
            preserveAspectRatio="xMidYMid meet"
          >
            {svg.bars.map((b, i) => (
              <rect key={i} x={b.x} y={0} width={b.width} height={60} fill="#000" />
            ))}
          </svg>
        </div>
      ) : (
        <div style={{ fontSize: '6px', color: '#ccc', margin: '2px 0' }}>[ لا يوجد باركود ]</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', lineHeight: '1', marginTop: '2px' }}>
        <span style={{ fontSize: '7.5px', fontWeight: '700', fontFamily: 'monospace', color: '#1a0509' }}>
          {product.sku}
        </span>
        <span style={{ fontSize: '8px', fontWeight: '900', color: '#7C0A12' }}>
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
        const svg = generateBarcodeSVG(p.sku);
        const svgContent = svg
          ? `<svg viewBox="0 0 ${svg.totalW} 60" style="width:100%;height:100%;" preserveAspectRatio="xMidYMid meet">
              ${svg.bars.map(b => `<rect x="${b.x}" y="0" width="${b.width}" height="60" fill="#000"/>`).join('')}
             </svg>`
          : `<div style="font-size:6px;color:#ccc;text-align:center">[ لا يوجد باركود ]</div>`;

        return `<div class="print-label-wrapper" style="page-break-after:always;break-after:page;display:block;width:1.57in;height:1.18in;overflow:hidden;box-sizing:border-box;">
          <div class="print-label-page" style="width:1.57in;height:1.18in;padding:3mm 4mm;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Cairo,Arial,sans-serif;direction:rtl;background:#fff;box-sizing:border-box;overflow:hidden;">
            <div style="width:100%;text-align:center;line-height:1.1;margin-bottom:1px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
              <div style="font-size:7.5px;font-weight:900;color:#7C0A12;">ModaPella</div>
              <div style="font-size:7px;color:#333;margin-top:0.5px;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${p.name}</div>
            </div>
            <div style="width:100%;height:8mm;display:flex;justify-content:center;align-items:center;margin:2px 0;">
              ${svgContent}
            </div>
            <div style="display:flex;justify-content:space-between;width:100%;align-items:center;line-height:1;margin-top:2px;">
              <span style="font-size:7.5px;font-weight:700;font-family:monospace;color:#1a0509;">${p.sku}</span>
              <span style="font-size:8px;font-weight:900;color:#7C0A12;">${Number(p.price).toLocaleString('ar-EG')} ج.م</span>
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
          size: 1.57in 1.18in landscape;
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
          width: 1.57in;
          margin: 0;
          padding: 0;
        }
        #barcode-print-root, #barcode-print-root * {
          visibility: visible;
        }
        .print-label-wrapper {
          display: block !important;
          width: 1.57in;
          height: 1.18in;
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
        💡 <strong>نصيحة:</strong> استخدم رول ملصقات باركود حراري بمقاس **1.57 × 1.18 بوصة (40 × 30 مم)**. التصميم يدعم السنترة التلقائية للمحتوى ومصمم ليناسب هذا المقاس بدقة بدون أي تداخل.
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
