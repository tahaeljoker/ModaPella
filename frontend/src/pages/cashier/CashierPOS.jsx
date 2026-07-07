import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;

const CATEGORY_LABELS = {
  Blouse: 'بلوزة',
  Chemise: 'قميص',
  Skirt: 'جيبة',
  Dress: 'فستان',
  Pantalon: 'بنطلون',
  'T-shirt': 'تيشيرت',
  Portefeuille: 'محفظة',
};

// ─── Save Invoice as HTML ─────────────────────────────────────────────────────
function saveInvoiceAsHTML(order) {
  const id = order._id?.toString().slice(-8).toUpperCase();
  const date = new Date(order.createdAt).toLocaleString('ar-EG');
  const itemsHTML = (order.items || []).map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.size || '—'}</td>
      <td>${item.color || '—'}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:left">${Number(item.price).toLocaleString('ar-EG')} ج.م</td>
      <td style="text-align:left;font-weight:bold">${Number(item.price * item.quantity).toLocaleString('ar-EG')} ج.م</td>
    </tr>`).join('');
  const discountRow = order.discount > 0 ? `
    <tr><td colspan="5" style="text-align:right;color:#16a34a">خصم</td>
    <td style="text-align:left;color:#16a34a">- ${Number(order.discount).toLocaleString('ar-EG')} ج.م</td></tr>` : '';

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>فاتورة ModaPella #${id}</title>
<style>
  body{font-family:Cairo,Arial,sans-serif;background:#fff;color:#1a0509;padding:32px;max-width:600px;margin:auto}
  h1{color:#7C0A12;text-align:center;margin:0;font-size:24px}
  .sub{text-align:center;color:#888;font-size:12px;margin:4px 0 20px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#f7f0ec;color:#7C0A12;padding:8px;text-align:right;border-bottom:2px solid #e0c9c9}
  td{padding:7px 8px;border-bottom:1px solid #f0e8e8}
  .total{font-size:16px;font-weight:900;color:#7C0A12;text-align:left;margin-top:16px;border-top:2px solid #7C0A12;padding-top:10px}
  .footer{text-align:center;color:#aaa;font-size:11px;margin-top:24px;line-height:1.6}
  .method{color:#555;font-size:12px;margin-top:6px;text-align:left}
</style></head>
<body>
<h1>ModaPella</h1>
<div class="sub">فاتورة بيع | رقم: #${id} | التاريخ: ${date}</div>
<table>
  <thead><tr><th>المنتج</th><th>المقاس</th><th>اللون</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
  <tbody>${itemsHTML}${discountRow}</tbody>
</table>
<div class="total">الإجمالي الكلي: ${Number(order.totalAmount).toLocaleString('ar-EG')} ج.م</div>
<div class="method">طريقة الدفع: ${order.paymentMethod === 'Cash' ? 'كاش 💵' : 'انستا باي 📱'}</div>
<div class="footer">
  شكراً لتعاملكم مع ModaPella 🎀<br/>
  تواصل معنا: 01112556672 - 01122372297
</div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `فاتورة-ModaPella-${id}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Invoice Receipt Modal ────────────────────────────────────────────────────
function InvoiceModal({ order, onClose }) {
  const [copies, setCopies] = useState(1);

  if (!order) return null;

  const handlePrint = () => {
    const printDiv = document.createElement('div');
    printDiv.id = 'invoice-print-root';
    const id = order._id?.toString().slice(-8).toUpperCase();
    const date = new Date(order.createdAt).toLocaleString('ar-EG');
    
    // Create the HTML for ONE receipt
    const singleReceiptHTML = `
      <div class="invoice-print-header">
        <h1>ModaPella</h1>
        <p>فاتورة بيع | رقم: #${id}</p>
        <p>${date}</p>
        ${order.customerName ? `<p>العميل: ${order.customerName} ${order.customerPhone ? `- ${order.customerPhone}` : ''}</p>` : ''}
      </div>
      <table class="invoice-print-table">
        <thead><tr><th>المنتج</th><th>المقاس</th><th>اللون</th><th>الكمية</th><th>الإجمالي</th></tr></thead>
        <tbody>
          ${(order.items || []).map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.size || '—'}</td>
              <td>${item.color || '—'}</td>
              <td style="text-align:center">${item.quantity}</td>
              <td style="text-align:left">${Number(item.price * item.quantity).toLocaleString('ar-EG')} ج.م</td>
            </tr>`).join('')}
          ${order.discount > 0 ? `<tr><td colspan="4" style="color:#16a34a">خصم</td><td style="color:#16a34a">- ${Number(order.discount).toLocaleString('ar-EG')} ج.م</td></tr>` : ''}
        </tbody>
      </table>
      <div class="invoice-print-total">الإجمالي: ${Number(order.totalAmount).toLocaleString('ar-EG')} ج.م &nbsp;&nbsp; ${order.paymentMethod === 'Cash' ? 'كاش' : 'انستا باي'}</div>
      <div class="invoice-print-footer">
        شكراً لتعاملكم مع ModaPella 🎀<br/>
        تواصل معنا: 01112556672 - 01122372297
      </div>
      <div style="page-break-after: always;"></div>
    `;

    // Repeat the HTML based on copies
    printDiv.innerHTML = Array(copies).fill(singleReceiptHTML).join('');
    
    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
  };
    const id = order._id?.toString().slice(-8).toUpperCase();
    const date = new Date(order.createdAt).toLocaleString('ar-EG');
    printDiv.innerHTML = `
      <div class="invoice-print-header">
        <h1>ModaPella</h1>
        <p>فاتورة بيع | رقم: #${id}</p>
        <p>${date}</p>
      </div>
      <table class="invoice-print-table">
        <thead><tr><th>المنتج</th><th>المقاس</th><th>اللون</th><th>الكمية</th><th>الإجمالي</th></tr></thead>
        <tbody>
          ${(order.items || []).map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.size || '—'}</td>
              <td>${item.color || '—'}</td>
              <td style="text-align:center">${item.quantity}</td>
              <td style="text-align:left">${Number(item.price * item.quantity).toLocaleString('ar-EG')} ج.م</td>
            </tr>`).join('')}
          ${order.discount > 0 ? `<tr><td colspan="4" style="color:#16a34a">خصم</td><td style="color:#16a34a">- ${Number(order.discount).toLocaleString('ar-EG')} ج.م</td></tr>` : ''}
        </tbody>
      </table>
      <div class="invoice-print-total">الإجمالي: ${Number(order.totalAmount).toLocaleString('ar-EG')} ج.م &nbsp;&nbsp; ${order.paymentMethod === 'Cash' ? 'كاش' : 'انستا باي'}</div>
      <div class="invoice-print-footer">
        شكراً لتعاملكم مع ModaPella 🎀<br/>
        تواصل معنا: 01112556672 - 01122372297
      </div>
    `;
    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-burgundy text-white text-center py-5 px-6">
          <p className="text-xs tracking-widest uppercase opacity-70">ModaPella</p>
          <h2 className="text-xl font-bold mt-1">فاتورة البيع</h2>
          <p className="text-xs opacity-60 mt-1">#{order._id?.toString().slice(-8).toUpperCase()}</p>
        </div>

        {/* Invoice Body */}
        <div className="p-5 space-y-4">
          <div className="flex justify-between text-xs text-burgundy/50">
            <span>التاريخ</span>
            <span>{new Date(order.createdAt).toLocaleString('ar-EG')}</span>
          </div>
          <div className="border-t border-dashed border-burgundy/20" />

          {/* Items */}
          <div className="space-y-2">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between items-start text-sm">
                <div>
                  <p className="font-semibold text-burgundy">{item.name}</p>
                  <p className="text-xs text-burgundy/50">
                    {item.size && <span className="ml-2">المقاس: {item.size}</span>}
                    {item.color && <span>اللون: {item.color}</span>}
                  </p>
                  <p className="text-xs text-burgundy/50">الكمية: {item.quantity}</p>
                </div>
                <p className="font-bold text-burgundy">{EGP(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-burgundy/20" />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            {order.discount > 0 && (
              <>
                <div className="flex justify-between text-burgundy/60">
                  <span>الإجمالي قبل الخصم</span>
                  <span>{EGP(order.totalAmount + order.discount)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>خصم</span>
                  <span>- {EGP(order.discount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold text-base text-burgundy">
              <span>الإجمالي</span>
              <span>{EGP(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-burgundy/60">
              <span>طريقة الدفع</span>
              <span>{order.paymentMethod === 'Cash' ? '💵 كاش' : '📱 انستا باي'}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-burgundy/20" />
          <p className="text-center text-xs text-burgundy/40">شكراً لتعاملكم معنا 🎀</p>
          <p className="text-center text-[10px] text-burgundy/30">تواصل معنا: 01112556672 - 01122372297</p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 p-4 bg-[#F7F0EC] border-b border-burgundy/10">
          <button
            onClick={onClose}
            className="rounded-xl border border-burgundy/20 py-2.5 text-sm font-medium text-burgundy/70 transition hover:bg-burgundy/10"
          >
            إغلاق
          </button>
          <button
            onClick={() => saveInvoiceAsHTML(order)}
            className="rounded-xl border-2 border-burgundy/30 py-2.5 text-sm font-bold text-burgundy transition hover:bg-burgundy/10"
          >
            💾 حفظ HTML
          </button>
        </div>
        
        {/* Print Section with Copies Counter */}
        <div className="p-4 bg-white flex items-center gap-3">
          <div className="flex items-center gap-0 bg-[#F7F0EC] rounded-xl overflow-hidden border border-burgundy/15">
            <button onClick={() => setCopies(c => Math.max(1, c - 1))} className="w-10 h-10 flex items-center justify-center text-lg font-bold text-burgundy hover:bg-burgundy/10 transition">−</button>
            <span className="w-10 text-center font-bold text-burgundy">{copies}</span>
            <button onClick={() => setCopies(c => c + 1)} className="w-10 h-10 flex items-center justify-center text-lg font-bold text-burgundy hover:bg-burgundy/10 transition">+</button>
          </div>
          <span className="text-xs font-bold text-burgundy/50 w-8">نسخة</span>
          <button
            onClick={handlePrint}
            className="flex-1 rounded-xl bg-burgundy py-3 text-sm font-bold text-white transition hover:bg-[#650018] shadow-lg shadow-burgundy/20"
          >
            🖨️ طباعة الفاتورة
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast Notification ───────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-2xl transition-all duration-300 ${
            t.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          <span className="text-lg">{t.type === 'success' ? '✅' : '❌'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Main POS ─────────────────────────────────────────────────────────────────
function CashierPOS() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Selected product state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Cart / Invoice
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [editingPriceKey, setEditingPriceKey] = useState(null); // inline price edit
  const [toasts, setToasts] = useState([]);
  
  // Modals
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const searchRef = useRef(null);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
    api.get('/products')
      .then(res => setProducts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Barcode scanner hook — auto-add to cart ───────────────────────────────
  useEffect(() => {
    let buffer = '';
    let timer = null;
    const handleKey = (e) => {
      // Ignore keypresses inside inputs (except search)
      if (e.target.tagName === 'INPUT' && e.target !== searchRef.current) return;
      if (e.key === 'Enter' && buffer.length > 3) {
        const sku = buffer.trim().toUpperCase();
        const found = products.find(p => p.sku === sku);
        if (found) {
          // Pick first available variant (size + color) automatically
          let autoSize = '';
          let autoColor = '';
          let autoStock = 0;

          if (found.variants && found.variants.length > 0) {
            // Find first variant with stock > 0
            const availableVariant = found.variants.find(v => v.stock > 0);
            if (availableVariant) {
              autoSize = availableVariant.size;
              autoColor = availableVariant.color;
              autoStock = availableVariant.stock;
            } else {
              showToast(`${found.name} — نفد المخزون!`, 'error');
              buffer = '';
              return;
            }
          } else {
            autoSize = found.sizes?.[0] || '';
            autoColor = found.colors?.[0] || '';
            autoStock = found.stock || 0;
          }

          if (autoStock <= 0) {
            showToast(`${found.name} — نفد المخزون!`, 'error');
            buffer = '';
            return;
          }

          // Add directly to cart
          const key = `${found._id}_${autoSize}_${autoColor}`;
          const cartItem = {
            _cartKey: key,
            product: found._id,
            name: found.name,
            category: found.category,
            price: found.price,
            size: autoSize,
            color: autoColor,
            quantity: 1,
            maxStock: autoStock,
            image: found.images?.[0] || '',
          };
          setCart(prev => {
            const exists = prev.find(i => i._cartKey === key);
            if (exists) {
              if (exists.quantity >= exists.maxStock) {
                showToast(`${found.name} — وصلت للحد الأقصى المتاح (${exists.maxStock})`, 'error');
                return prev;
              }
              showToast(`${found.name} — تمت الإضافة ✓ (${exists.quantity + 1} قطعة)`, 'success');
              return prev.map(i => i._cartKey === key ? { ...i, quantity: i.quantity + 1 } : i);
            }
            showToast(`${found.name}${autoSize ? ` | ${autoSize}` : ''}${autoColor ? ` | ${autoColor}` : ''} — أُضيف للفاتورة ✓`, 'success');
            return [...prev, cartItem];
          });
          setSearch('');
        } else {
          showToast(`الكود "${sku}" غير موجود في المخزون`, 'error');
        }
        buffer = '';
        return;
      }
      if (e.key.length === 1) buffer += e.key;
      clearTimeout(timer);
      timer = setTimeout(() => { buffer = ''; }, 300);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [products]);

  // ── Filtered products ─────────────────────────────────────────────────────
  const filtered = search.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
        (CATEGORY_LABELS[p.category] || '').includes(search)
      )
    : [];

  // ── Select a product from search ──────────────────────────────────────────
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSelectedSize(product.sizes?.[0] || product.variants?.[0]?.size || '');
    setSelectedColor(product.colors?.[0] || product.variants?.[0]?.color || '');
    setQuantity(1);
    setSearch('');
    setSearchFocused(false);
  };

  // ── Available stock for selected variant ──────────────────────────────────
  const availableStock = (() => {
    if (!selectedProduct) return 0;
    if (selectedProduct.variants?.length > 0 && selectedSize && selectedColor) {
      const v = selectedProduct.variants.find(v => v.size === selectedSize && v.color === selectedColor);
      return v ? v.stock : 0;
    }
    return selectedProduct.stock || 0;
  })();

  // ── Add to cart ───────────────────────────────────────────────────────────
  const addToCart = () => {
    if (!selectedProduct) return;
    const key = `${selectedProduct._id}_${selectedSize}_${selectedColor}`;
    const cartItem = {
      _cartKey: key,
      product: selectedProduct._id,
      name: selectedProduct.name,
      category: selectedProduct.category,
      price: selectedProduct.price,
      size: selectedSize,
      color: selectedColor,
      quantity,
      maxStock: availableStock,
      image: selectedProduct.images?.[0] || '',
    };

    setCart(prev => {
      const exists = prev.find(i => i._cartKey === key);
      if (exists) {
        return prev.map(i =>
          i._cartKey === key
            ? { ...i, quantity: Math.min(i.quantity + quantity, i.maxStock) }
            : i
        );
      }
      return [...prev, cartItem];
    });
    // Reset selection
    setSelectedProduct(null);
    setSelectedSize('');
    setSelectedColor('');
    setQuantity(1);
  };

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const updateQty = (key, val) => {
    if (val <= 0) setCart(prev => prev.filter(i => i._cartKey !== key));
    else setCart(prev => prev.map(i => i._cartKey === key ? { ...i, quantity: Math.min(val, i.maxStock) } : i));
  };
  const removeItem = (key) => setCart(prev => prev.filter(i => i._cartKey !== key));

  const rawTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalAfterDiscount = Math.max(0, rawTotal - Number(discount || 0));
  const change = paymentMethod === 'Cash' && amountPaid ? Math.max(0, Number(amountPaid) - totalAfterDiscount) : 0;

  // ── Checkout ──────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem('modapella_user') || '{}');
      const res = await api.post('/pos/sell', {
        sellerId: user._id,
        customerName,
        customerPhone,
        items: cart.map(i => ({
          product: i.product,
          name: i.name,
          category: i.category,
          price: i.price,
          quantity: i.quantity,
          size: i.size,
          color: i.color,
        })),
        paymentMethod,
        discount: Number(discount || 0),
        type: 'Offline',
      });
      setCompletedOrder(res.data.order);
      setCart([]);
      setDiscount(0);
      setAmountPaid('');
      setCustomerName('');
      setCustomerPhone('');
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء إتمام البيع');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Sizes & colors for selected product ───────────────────────────────────
  const availableSizes = selectedProduct
    ? (selectedProduct.variants?.length > 0
        ? [...new Set(selectedProduct.variants.map(v => v.size))]
        : selectedProduct.sizes || [])
    : [];
  const availableColors = selectedProduct
    ? (selectedProduct.variants?.length > 0
        ? [...new Set(
            selectedProduct.variants
              .filter(v => !selectedSize || v.size === selectedSize)
              .map(v => v.color)
          )]
        : selectedProduct.colors || [])
    : [];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-0 h-[calc(100vh-48px)] -m-6 overflow-hidden">

      {/* ═══════════════════════════════════════════════════════════════════
          CENTER — Product Search + Details
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col bg-[#F7F0EC] overflow-hidden">

        {/* ── Top: Search Bar ────────────────────────────────────────── */}
        <div className="bg-white border-b border-burgundy/10 px-6 py-4">
          <p className="text-[10px] font-semibold text-burgundy/40 uppercase tracking-widest mb-2">
            🔍 البحث عن منتج أو باركود
          </p>
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="اسم المنتج، الكود (SKU)، أو الفئة..."
              className="w-full rounded-2xl border-2 border-burgundy/15 bg-[#F7F0EC] px-5 py-3.5 pr-12 text-sm text-burgundy placeholder-burgundy/30 outline-none transition-all focus:border-burgundy focus:bg-white focus:shadow-lg focus:shadow-burgundy/10"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">
              {loading ? '⏳' : '🔎'}
            </span>

            {/* Dropdown Results */}
            {searchFocused && search.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white rounded-2xl shadow-2xl border border-burgundy/10 overflow-hidden max-h-64 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-burgundy/40 text-center">لا توجد نتائج</div>
                ) : (
                  filtered.map(product => (
                    <button
                      key={product._id}
                      onMouseDown={() => handleSelectProduct(product)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-burgundy/5 transition border-b border-burgundy/5 last:border-0"
                    >
                      {product.images?.[0] && (
                        <img src={product.images[0]} alt={product.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-burgundy truncate">{product.name}</p>
                        <p className="text-xs text-burgundy/50">{CATEGORY_LABELS[product.category]} {product.sku && `• ${product.sku}`}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-burgundy">{EGP(product.price)}</p>
                        <p className="text-xs text-burgundy/40">مخزون: {product.stock}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom: Product Details Card ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedProduct ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <div className="w-24 h-24 rounded-full bg-burgundy/8 flex items-center justify-center text-5xl">
                🏷️
              </div>
              <div>
                <h3 className="text-lg font-bold text-burgundy/40">ابحث عن منتج</h3>
                <p className="text-sm text-burgundy/30 mt-1">
                  ابحث بالاسم أو امسح الباركود لإضافة منتج للفاتورة
                </p>
              </div>
              {/* Quick stats */}
              <div className="mt-4 flex gap-4">
                <div className="bg-white rounded-2xl px-5 py-3 text-center shadow-sm border border-burgundy/8">
                  <p className="text-2xl font-bold text-burgundy">{products.length}</p>
                  <p className="text-xs text-burgundy/40 mt-0.5">منتج متاح</p>
                </div>
                <div className="bg-white rounded-2xl px-5 py-3 text-center shadow-sm border border-burgundy/8">
                  <p className="text-2xl font-bold text-burgundy">{cart.length}</p>
                  <p className="text-xs text-burgundy/40 mt-0.5">في الفاتورة</p>
                </div>
              </div>
            </div>
          ) : (
            /* Product Detail */
            <div className="max-w-xl mx-auto">
              {/* Product Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-burgundy/10 overflow-hidden">
                {/* Image + basic info */}
                <div className="flex gap-5 p-5 border-b border-burgundy/8">
                  {selectedProduct.images?.[0] ? (
                    <img
                      src={selectedProduct.images[0]}
                      alt={selectedProduct.name}
                      className="w-28 h-28 rounded-2xl object-cover flex-shrink-0 shadow-md"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-2xl bg-burgundy/8 flex items-center justify-center text-4xl flex-shrink-0">
                      👗
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-xs bg-burgundy/10 text-burgundy px-2.5 py-0.5 rounded-full font-medium mb-1.5">
                      {CATEGORY_LABELS[selectedProduct.category] || selectedProduct.category}
                    </span>
                    <h3 className="font-bold text-xl text-burgundy leading-tight">{selectedProduct.name}</h3>
                    {selectedProduct.sku && (
                      <p className="text-xs text-burgundy/40 mt-1 font-mono">{selectedProduct.sku}</p>
                    )}
                    {selectedProduct.supplier && (
                      <p className="text-xs text-burgundy/50 mt-0.5">🏭 {selectedProduct.supplier}</p>
                    )}
                    <p className="mt-2 text-2xl font-extrabold text-burgundy">{EGP(selectedProduct.price)}</p>
                  </div>
                  {/* Close */}
                  <button
                    onClick={() => { setSelectedProduct(null); setSearch(''); }}
                    className="self-start p-1.5 rounded-xl hover:bg-burgundy/10 text-burgundy/40 hover:text-burgundy transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Sizes */}
                  {availableSizes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-burgundy/50 uppercase tracking-wider mb-2">المقاس</p>
                      <div className="flex flex-wrap gap-2">
                        {availableSizes.map(size => (
                          <button
                            key={size}
                            onClick={() => {
                              setSelectedSize(size);
                              // Reset color if no longer valid
                              if (selectedProduct.variants?.length > 0) {
                                const valid = selectedProduct.variants.filter(v => v.size === size).map(v => v.color);
                                if (!valid.includes(selectedColor)) setSelectedColor(valid[0] || '');
                              }
                            }}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                              selectedSize === size
                                ? 'border-burgundy bg-burgundy text-white shadow-md shadow-burgundy/25'
                                : 'border-burgundy/15 text-burgundy hover:border-burgundy/40'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Colors */}
                  {availableColors.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-burgundy/50 uppercase tracking-wider mb-2">اللون</p>
                      <div className="flex flex-wrap gap-2">
                        {availableColors.map(color => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                              selectedColor === color
                                ? 'border-burgundy bg-burgundy text-white shadow-md shadow-burgundy/25'
                                : 'border-burgundy/15 text-burgundy hover:border-burgundy/40'
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity + Stock */}
                  <div>
                    <p className="text-xs font-semibold text-burgundy/50 uppercase tracking-wider mb-2">الكمية</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-0 bg-[#F7F0EC] rounded-2xl border border-burgundy/15 overflow-hidden">
                        <button
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          className="w-11 h-11 flex items-center justify-center text-lg font-bold text-burgundy hover:bg-burgundy/10 transition"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={quantity}
                          min={1}
                          max={availableStock}
                          onChange={e => setQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), availableStock))}
                          className="w-14 text-center font-bold text-burgundy bg-transparent outline-none text-lg"
                        />
                        <button
                          onClick={() => setQuantity(q => Math.min(q + 1, availableStock))}
                          className="w-11 h-11 flex items-center justify-center text-lg font-bold text-burgundy hover:bg-burgundy/10 transition"
                        >
                          +
                        </button>
                      </div>
                      <div className={`text-sm px-3 py-1.5 rounded-xl font-medium ${
                        availableStock === 0 ? 'bg-red-100 text-red-600' :
                        availableStock <= 5 ? 'bg-amber-50 text-amber-600' :
                        'bg-green-50 text-green-600'
                      }`}>
                        {availableStock === 0 ? '❌ نفد المخزون' : `✅ متوفر: ${availableStock}`}
                      </div>
                    </div>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={addToCart}
                    disabled={availableStock === 0 || quantity < 1}
                    className="w-full rounded-2xl bg-burgundy py-4 text-white font-bold text-base transition-all hover:bg-[#650018] hover:shadow-lg hover:shadow-burgundy/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ＋ إضافة للفاتورة — {EGP(selectedProduct.price * quantity)}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          LEFT — Invoice Panel
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="w-[360px] flex-shrink-0 flex flex-col bg-white border-r border-burgundy/10 shadow-xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-burgundy/10 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-burgundy/40 uppercase tracking-widest">الفاتورة الحالية</p>
            <h2 className="text-lg font-bold text-burgundy">سلة المشتريات</h2>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setIsClearConfirmOpen(true)}
              className="text-xs text-burgundy/40 hover:text-red-500 transition px-2 py-1 rounded-lg hover:bg-red-50"
            >
              مسح الكل ✕
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-3">
              <div className="text-5xl opacity-20">🧾</div>
              <p className="text-sm text-burgundy/30 font-medium">لا توجد منتجات في الفاتورة</p>
              <p className="text-xs text-burgundy/20">ابحث عن منتج وأضفه من الوسط</p>
            </div>
          ) : (
            <div className="divide-y divide-burgundy/6">
              {cart.map((item) => (
                <div key={item._cartKey} className="px-4 py-3 hover:bg-[#F7F0EC]/50 transition group">
                  <div className="flex items-start gap-3">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-burgundy leading-tight truncate">{item.name}</p>
                      <p className="text-xs text-burgundy/45 mt-0.5">
                        {item.size && <span>{item.size}</span>}
                        {item.size && item.color && <span> · </span>}
                        {item.color && <span>{item.color}</span>}
                      </p>
                      {/* ── Inline price edit ───────────────────────── */}
                      {editingPriceKey === item._cartKey ? (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="number"
                            autoFocus
                            defaultValue={item.price}
                            min={0}
                            onBlur={e => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0) {
                                setCart(prev => prev.map(i =>
                                  i._cartKey === item._cartKey ? { ...i, price: val } : i
                                ));
                              }
                              setEditingPriceKey(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') e.target.blur();
                              if (e.key === 'Escape') setEditingPriceKey(null);
                            }}
                            className="w-20 text-xs font-bold text-burgundy bg-white border border-burgundy/30 rounded-lg px-2 py-0.5 outline-none focus:border-burgundy"
                          />
                          <span className="text-xs text-burgundy/40">ج.م</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingPriceKey(item._cartKey)}
                          className="flex items-center gap-1 mt-0.5 group/price"
                          title="تعديل السعر"
                        >
                          <span className="text-xs text-burgundy/60 font-medium">{EGP(item.price)} / قطعة</span>
                          <span className="text-[10px] text-burgundy/30 opacity-0 group-hover/price:opacity-100 transition">✏️</span>
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item._cartKey)}
                      className="opacity-0 group-hover:opacity-100 text-burgundy/30 hover:text-red-500 transition p-0.5 text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Qty Controls */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-0 bg-[#F7F0EC] rounded-xl overflow-hidden border border-burgundy/10">
                      <button onClick={() => updateQty(item._cartKey, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-burgundy font-bold hover:bg-burgundy/10 transition text-sm">
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-burgundy">{item.quantity}</span>
                      <button onClick={() => updateQty(item._cartKey, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-burgundy font-bold hover:bg-burgundy/10 transition text-sm">
                        +
                      </button>
                    </div>
                    <p className="font-bold text-burgundy text-sm">{EGP(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Invoice Summary ─────────────────────────────────────────── */}
        {cart.length > 0 && (
          <div className="border-t border-burgundy/10 bg-[#FDFBF9]">
            <div className="px-5 py-4 space-y-3">
              {/* Subtotal */}
              <div className="flex justify-between text-sm text-burgundy/60">
                <span>الإجمالي الفرعي</span>
                <span className="font-medium">{EGP(rawTotal)}</span>
              </div>

              {/* Discount */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-burgundy/60 whitespace-nowrap">خصم</label>
                <div className="flex-1 flex items-center gap-1 bg-[#F7F0EC] rounded-xl border border-burgundy/15 overflow-hidden px-3 py-1.5">
                  <input
                    type="number"
                    value={discount || ''}
                    min={0}
                    onChange={e => setDiscount(e.target.value)}
                    placeholder="0"
                    className="flex-1 text-sm text-burgundy bg-transparent outline-none w-16 text-left"
                  />
                  <span className="text-xs text-burgundy/40">ج.م</span>
                </div>
                {discount > 0 && (
                  <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-lg whitespace-nowrap">
                    - {EGP(discount)}
                  </span>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center py-2 border-t border-burgundy/10">
                <span className="font-bold text-burgundy">الإجمالي</span>
                <span className="text-xl font-extrabold text-burgundy">{EGP(totalAfterDiscount)}</span>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-2 border-b border-burgundy/10 pb-3">
                <div>
                  <p className="text-[10px] text-burgundy/50 font-bold mb-1 ml-1">اسم العميل (اختياري)</p>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="محمد علي..."
                    className="w-full text-xs text-burgundy bg-white border border-burgundy/15 rounded-xl px-3 py-2 outline-none focus:border-burgundy"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-burgundy/50 font-bold mb-1 ml-1">رقم الهاتف (اختياري)</p>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="010..."
                    className="w-full text-xs text-burgundy bg-white border border-burgundy/15 rounded-xl px-3 py-2 outline-none focus:border-burgundy"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <p className="text-xs text-burgundy/50 mb-1.5 font-medium">طريقة الدفع</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Cash', label: '💵 كاش', },
                    { id: 'Instapay', label: '📱 انستا باي', },
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                        paymentMethod === method.id
                          ? 'border-burgundy bg-burgundy text-white shadow-md shadow-burgundy/20'
                          : 'border-burgundy/15 text-burgundy hover:border-burgundy/30'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash paid + Change */}
              {paymentMethod === 'Cash' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-[#F7F0EC] rounded-xl border border-burgundy/15 px-3 py-2">
                    <label className="text-sm text-burgundy/50 whitespace-nowrap">المبلغ المدفوع</label>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={e => setAmountPaid(e.target.value)}
                      placeholder={`${totalAfterDiscount}`}
                      className="flex-1 text-sm font-bold text-burgundy bg-transparent outline-none text-left"
                    />
                    <span className="text-xs text-burgundy/40">ج.م</span>
                  </div>
                  {amountPaid && Number(amountPaid) >= totalAfterDiscount && (
                    <div className="flex justify-between items-center bg-green-50 rounded-xl px-4 py-2.5 border border-green-100">
                      <span className="text-sm text-green-700 font-medium">الباقي</span>
                      <span className="text-lg font-extrabold text-green-700">{EGP(change)}</span>
                    </div>
                  )}
                  {amountPaid && Number(amountPaid) < totalAfterDiscount && (
                    <div className="flex justify-between items-center bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">
                      <span className="text-sm text-red-600 font-medium">ناقص</span>
                      <span className="text-lg font-extrabold text-red-600">{EGP(totalAfterDiscount - Number(amountPaid))}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={submitting || cart.length === 0}
                className="w-full rounded-2xl bg-burgundy py-4 text-white font-extrabold text-base transition-all hover:bg-[#650018] hover:shadow-xl hover:shadow-burgundy/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    جاري المعالجة...
                  </span>
                ) : (
                  `✅ إتمام البيع — ${EGP(totalAfterDiscount)}`
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {completedOrder && (
        <InvoiceModal order={completedOrder} onClose={() => setCompletedOrder(null)} />
      )}

      {/* Barcode scan toast notifications */}
      <Toast toasts={toasts} />

      {/* Clear Cart Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearConfirmOpen}
        title="تأكيد مسح الفاتورة"
        message="هل أنت متأكد أنك تريد مسح جميع المنتجات من الفاتورة الحالية؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="نعم، مسح الفاتورة"
        onConfirm={() => {
          setCart([]);
          setDiscount(0);
          setAmountPaid('');
          setCustomerName('');
          setCustomerPhone('');
          setIsClearConfirmOpen(false);
          showToast('تم مسح الفاتورة بنجاح', 'success');
        }}
        onCancel={() => setIsClearConfirmOpen(false)}
      />
    </div>
  );
}

export default CashierPOS;
