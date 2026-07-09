import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;

const CATEGORY_LABELS = {
  Blazer: 'بليزر',
  Blouse: 'بلوزة',
  Chemise: 'شميز',
  Skirt: 'جيبة',
  Dress: 'فستان',
  Pantalon: 'بنطلون',
  'T-shirt': 'تيشيرت',
  Bag: 'شنطة',
  Cardigan: 'كاردن',
  Suit: 'سوت',
  Tonic: 'تونيك',
  Takem: 'طقم',
};

const getProductIcon = (category = '', name = '') => {
  const cat = (category || '').toLowerCase();
  const nm = (name || '').toLowerCase();
  if (cat.includes('takem') || cat.includes('طقم') || nm.includes('طقم')) return '🧣';
  if (cat.includes('tonic') || cat.includes('تونيك') || nm.includes('تونيك')) return '👚';
  if (cat.includes('suit') || cat.includes('سوت') || nm.includes('سوت')) return '👔';
  if (cat.includes('bag') || cat.includes('حقيبة') || cat.includes('شنط') || nm.includes('شنط') || nm.includes('حقيب')) return '👜';
  if (cat.includes('dress') || cat.includes('فستان') || cat.includes('دريس') || nm.includes('فستان') || nm.includes('دريس')) return '👗';
  if (cat.includes('shoes') || cat.includes('حذاء') || cat.includes('شوز') || cat.includes('كوتش') || nm.includes('شوز') || nm.includes('حذاء') || nm.includes('كوتش')) return '👟';
  if (cat.includes('t-shirt') || cat.includes('تيشرت') || cat.includes('تي شيرت') || nm.includes('تيشرت') || nm.includes('تي شيرت')) return '👕';
  if (cat.includes('shirt') || cat.includes('قميص') || nm.includes('قميص') || nm.includes('شيرت')) return '👔';
  if (cat.includes('pants') || cat.includes('trousers') || cat.includes('بنطلون') || cat.includes('جينز') || nm.includes('بنطلون') || nm.includes('جينز')) return '👖';
  if (cat.includes('blazer') || cat.includes('بليزر') || nm.includes('بليزر')) return '🧥';
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
  .emp{color:#7C0A12;font-size:11px;margin-top:4px;text-align:left;font-weight:bold}
</style></head>
<body>
<h1>ModaPella</h1>
<div class="sub">فاتورة بيع | رقم: #${id} | التاريخ: ${date}</div>
<table>
  <thead><tr><th>المنتج</th><th>المقاس</th><th>اللون</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
  <tbody>${itemsHTML}${discountRow}</tbody>
</table>
<div class="total">الإجمالي الكلي: ${Number(order.totalAmount).toLocaleString('ar-EG')} ج.م</div>
<div class="method">طريقة الدفع: ${order.paymentMethod === 'Cash' ? 'كاش 💵' : order.paymentMethod === 'Instapay' ? 'انستا باي 📱' : 'محفظة كاش 💳'}</div>
${order._employeeName ? `<div class="emp">الموظف: ${order._employeeName}</div>` : ''}
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
        ${order._employeeName ? `<p style="font-size:11px;color:#7C0A12">الموظف: ${order._employeeName}</p>` : ''}
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
              <span>{order.paymentMethod === 'Cash' ? '💵 كاش' : order.paymentMethod === 'Instapay' ? '📱 انستا باي' : '💳 محفظة كاش'}</span>
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
  const [discountType, setDiscountType] = useState('amount'); // 'amount' | 'percent'
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [editingPriceKey, setEditingPriceKey] = useState(null); // inline price edit
  const [toasts, setToasts] = useState([]);

  // Employee
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  
  // Modals
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [isPriceCheckOpen, setIsPriceCheckOpen] = useState(false);

  const [heldCarts, setHeldCarts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('modapella_held_carts') || '[]');
    } catch {
      return [];
    }
  });

  const handleHoldCart = () => {
    const note = prompt('أدخل اسم الزبون أو ملاحظة سريعة لتعليق الفاتورة:') || '';
    if (note.trim() === '') return;
    const newHeld = {
      id: Date.now().toString(),
      note,
      cart,
      discount,
      discountType,
      customerName,
      customerPhone,
      selectedEmployee,
      createdAt: new Date().toISOString()
    };
    const updated = [...heldCarts, newHeld];
    setHeldCarts(updated);
    localStorage.setItem('modapella_held_carts', JSON.stringify(updated));
    // clear current cart
    setCart([]);
    setDiscount(0);
    setDiscountType('amount');
    setCustomerName('');
    setCustomerPhone('');
    setSelectedEmployee('');
    showToast('📥 تم تعليق الفاتورة بنجاح');
  };

  const handleResumeCart = (held) => {
    setCart(held.cart);
    setDiscount(held.discount);
    setDiscountType(held.discountType || 'amount');
    setCustomerName(held.customerName || '');
    setCustomerPhone(held.customerPhone || '');
    setSelectedEmployee(held.selectedEmployee || '');
    // remove from held
    const updated = heldCarts.filter(h => h.id !== held.id);
    setHeldCarts(updated);
    localStorage.setItem('modapella_held_carts', JSON.stringify(updated));
    setIsHeldModalOpen(false);
    showToast('⏳ تم استرجاع الفاتورة المعلقة');
  };

  const handleDeleteHeldCart = (id) => {
    const updated = heldCarts.filter(h => h.id !== id);
    setHeldCarts(updated);
    localStorage.setItem('modapella_held_carts', JSON.stringify(updated));
    showToast('❌ تم حذف الفاتورة المعلقة');
  };

  // Offline Caching
  const [offlineSales, setOfflineSales] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('modapella_offline_sales') || '[]');
    } catch {
      return [];
    }
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  const saveOfflineSales = (salesList) => {
    setOfflineSales(salesList);
    localStorage.setItem('modapella_offline_sales', JSON.stringify(salesList));
  };

  const handleSyncOfflineSales = async () => {
    if (offlineSales.length === 0 || syncing) return;
    setSyncing(true);
    let successCount = 0;
    const remaining = [...offlineSales];

    for (let i = 0; i < offlineSales.length; i++) {
      const item = offlineSales[i];
      try {
        await api.post('/pos/sell', item.payload);
        successCount++;
        const idx = remaining.findIndex(r => r.id === item.id);
        if (idx !== -1) remaining.splice(idx, 1);
      } catch (err) {
        console.error('Failed to sync sale:', item.id, err);
      }
    }

    saveOfflineSales(remaining);
    setSyncing(false);

    if (successCount > 0) {
      showToast(`✅ تم مزامنة ${successCount} فاتورة معلقة بنجاح!`);
      api.get('/products').then(res => setProducts(res.data)).catch(() => {});
    } else {
      showToast('❌ فشلت المزامنة. تأكد من اتصال السيرفر بالإنترنت.', 'error');
    }
  };

  const searchRef = useRef(null);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  useEffect(() => {
    api.get('/products')
      .then(res => setProducts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
    // load employees list
    api.get('/employees').then(res => setEmployees(res.data)).catch(() => {});

    // Offline handlers
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
      
      // Reconstruct scanned characters from physical key codes (layout-independent)
      let char = '';
      if (e.code.startsWith('Key')) {
        char = e.code.slice(3); // e.g. 'KeyP' -> 'P'
      } else if (e.code.startsWith('Digit')) {
        char = e.code.slice(5); // e.g. 'Digit1' -> '1'
      } else if (e.code === 'Minus') {
        char = '-';
      } else if (e.key.length === 1) {
        char = e.key;
      }

      if (char) {
        buffer += char;
      }
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
      allowDiscount: selectedProduct.allowDiscount !== false,
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
  const discountableTotal = cart.filter(i => i.allowDiscount).reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = discountType === 'percent'
    ? Math.min(discountableTotal, discountableTotal * Math.min(Number(discount || 0), 100) / 100)
    : Math.min(discountableTotal, Number(discount || 0));
  const totalAfterDiscount = Math.max(0, rawTotal - discountAmount);
  const change = paymentMethod === 'Cash' && amountPaid ? Math.max(0, Number(amountPaid) - totalAfterDiscount) : 0;

  // ── Checkout ──────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);

    const user = JSON.parse(localStorage.getItem('modapella_user') || '{}');
    const salePayload = {
      sellerId: user._id,
      employeeId: selectedEmployee || null,
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
        costPrice: i.costPrice || 0
      })),
      paymentMethod,
      discount: discountAmount,
      type: 'Offline',
      createdAt: new Date().toISOString()
    };

    // If browser is offline, skip API request and save locally
    if (!navigator.onLine) {
      const offlineId = `OFFLINE-${Date.now()}`;
      const emp = employees.find(e => e._id === selectedEmployee);
      
      const fakeOrder = {
        _id: offlineId,
        items: salePayload.items,
        totalAmount: totalAfterDiscount,
        discount: salePayload.discount,
        paymentMethod: salePayload.paymentMethod,
        createdAt: salePayload.createdAt,
        _employeeName: emp?.name || '',
        isOfflineSaved: true
      };

      saveOfflineSales([...offlineSales, { id: offlineId, payload: salePayload }]);
      setCompletedOrder(fakeOrder);
      showToast('⚠️ تم حفظ الفاتورة محلياً لعدم اتصالك بالإنترنت', 'error');
      
      setCart([]);
      setDiscount(0);
      setDiscountType('amount');
      setAmountPaid('');
      setCustomerName('');
      setCustomerPhone('');
      setSubmitting(false);
      return;
    }

    try {
      const res = await api.post('/pos/sell', salePayload);
      const emp = employees.find(e => e._id === selectedEmployee);
      setCompletedOrder({ ...res.data.order, _employeeName: emp?.name || '' });
      setCart([]);
      setDiscount(0);
      setDiscountType('amount');
      setAmountPaid('');
      setCustomerName('');
      setCustomerPhone('');
    } catch (err) {
      // If server request fails (connection refused or timeout), also save locally
      const offlineId = `OFFLINE-${Date.now()}`;
      const emp = employees.find(e => e._id === selectedEmployee);
      
      const fakeOrder = {
        _id: offlineId,
        items: salePayload.items,
        totalAmount: totalAfterDiscount,
        discount: salePayload.discount,
        paymentMethod: salePayload.paymentMethod,
        createdAt: salePayload.createdAt,
        _employeeName: emp?.name || '',
        isOfflineSaved: true
      };

      saveOfflineSales([...offlineSales, { id: offlineId, payload: salePayload }]);
      setCompletedOrder(fakeOrder);
      showToast('⚠️ تم حفظ الفاتورة محلياً بسبب انقطاع اتصال الخادم', 'error');

      setCart([]);
      setDiscount(0);
      setDiscountType('amount');
      setAmountPaid('');
      setCustomerName('');
      setCustomerPhone('');
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
    <div className="flex flex-col h-[calc(100vh-48px)] -m-6 overflow-hidden">
      {/* Offline Warning Banner */}
      {(offlineSales.length > 0 || !isOnline) && (
        <div className={`flex items-center justify-between px-6 py-2.5 text-xs font-bold text-white transition-all ${
          !isOnline ? 'bg-amber-600' : 'bg-emerald-600'
        }`}>
          <div className="flex items-center gap-2">
            <span>{!isOnline ? '⚠️ أنت تعمل بدون إنترنت حالياً (الوضع أوفلاين نشط)' : '📡 تم استعادة الاتصال بالإنترنت'}</span>
            {offlineSales.length > 0 && (
              <span>| لديك <strong>{offlineSales.length}</strong> فواتير محفوظة محلياً بانتظار المزامنة.</span>
            )}
          </div>
          {offlineSales.length > 0 && isOnline && (
            <button
              onClick={handleSyncOfflineSales}
              disabled={syncing}
              className="rounded-full bg-white px-4 py-1 text-xs font-extrabold text-burgundy shadow transition hover:bg-[#F7F0EC] disabled:opacity-50"
            >
              {syncing ? 'جاري المزامنة...' : '🔄 مزامنة الفواتير المعلقة'}
            </button>
          )}
        </div>
      )}

      <div className="flex-1 flex gap-0 overflow-hidden">
        {/* CENTER — Product Search + Details */}
        <div className="flex-1 flex flex-col bg-[#F7F0EC] overflow-hidden">

        {/* ── Top: Search Bar ────────────────────────────────────────── */}
        <div className="bg-white border-b border-burgundy/10 px-6 py-4 flex flex-wrap justify-between items-center gap-2">
          <div>
            <p className="text-[10px] font-semibold text-burgundy/40 uppercase tracking-widest">
              🔍 البحث عن منتج أو باركود
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPriceCheckOpen(true)}
            className="text-xs bg-burgundy/5 text-burgundy hover:bg-burgundy/10 px-3 py-1.5 rounded-full transition font-bold flex items-center gap-1 border border-burgundy/10 shadow-sm"
          >
            🔎 استعلام سريع عن الأسعار والمخزون
          </button>
        </div>
        <div className="bg-white border-b border-burgundy/10 px-6 py-3">
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
                      <div className="w-10 h-10 rounded-xl bg-[#F7F0EC] flex items-center justify-center text-xl flex-shrink-0 border border-burgundy/10 overflow-hidden">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          getProductIcon(product.category, product.name)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-burgundy truncate">{product.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-burgundy/50">{CATEGORY_LABELS[product.category]} {product.sku && `• ${product.sku}`}</p>
                          {product.allowDiscount === false && <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 font-bold">🚫 بلا خصم</span>}
                        </div>
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
                      {getProductIcon(selectedProduct.category, selectedProduct.name)}
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
                    {selectedProduct.allowDiscount === false && (
                      <div className="mt-1.5">
                        <span className="inline-block text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 font-bold">🚫 هذا المنتج غير خاضع للخصومات</span>
                      </div>
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
            <h2 className="text-lg font-bold text-burgundy flex items-center gap-2">
              <span>سلة المشتريات</span>
              <button
                type="button"
                onClick={() => setIsHeldModalOpen(true)}
                className="text-[10px] bg-burgundy/5 text-burgundy hover:bg-burgundy/10 px-2 py-0.5 rounded-full transition font-semibold"
              >
                ⏳ {heldCarts.length}
              </button>
            </h2>
          </div>
          <div className="flex gap-1.5 items-center">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleHoldCart}
                className="text-[11px] text-burgundy bg-burgundy/5 px-2 py-1 rounded-lg hover:bg-burgundy/10 transition font-bold"
              >
                📥 تعليق
              </button>
            )}
            {cart.length > 0 && (
              <button
                onClick={() => setIsClearConfirmOpen(true)}
                className="text-[11px] text-burgundy/40 hover:text-red-500 transition px-2 py-1 rounded-lg hover:bg-red-50 font-bold"
              >
                مسح ✕
              </button>
            )}
          </div>
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
                    <div className="w-12 h-12 rounded-xl bg-[#F7F0EC] flex items-center justify-center text-xl flex-shrink-0 border border-burgundy/10 overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        getProductIcon(item.category, item.name)
                      )}
                    </div>
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
                      {!item.allowDiscount && (
                        <p className="mt-1 text-[10px] text-red-600 bg-red-50 inline-block px-1.5 py-0.5 rounded border border-red-100 font-bold">🚫 غير مسموح بالخصم</p>
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
                {/* Type toggle */}
                <div className="flex rounded-lg overflow-hidden border border-burgundy/20 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => { setDiscountType('amount'); setDiscount(0); }}
                    className={`px-2.5 py-1.5 transition-all ${
                      discountType === 'amount'
                        ? 'bg-burgundy text-white'
                        : 'bg-white text-burgundy/50 hover:bg-burgundy/10'
                    }`}
                  >ج.م</button>
                  <button
                    type="button"
                    onClick={() => { setDiscountType('percent'); setDiscount(0); }}
                    className={`px-2.5 py-1.5 transition-all ${
                      discountType === 'percent'
                        ? 'bg-burgundy text-white'
                        : 'bg-white text-burgundy/50 hover:bg-burgundy/10'
                    }`}
                  >%</button>
                </div>
                <div className="flex-1 flex items-center gap-1 bg-[#F7F0EC] rounded-xl border border-burgundy/15 overflow-hidden px-3 py-1.5">
                  <input
                    type="number"
                    value={discount || ''}
                    min={0}
                    max={discountType === 'percent' ? 100 : undefined}
                    onChange={e => setDiscount(e.target.value)}
                    placeholder="0"
                    disabled={discountableTotal === 0 && cart.length > 0}
                    className="flex-1 text-sm text-burgundy bg-transparent outline-none w-16 text-left disabled:opacity-50"
                  />
                  <span className="text-xs text-burgundy/40">{discountType === 'percent' ? '%' : 'ج.م'}</span>
                </div>
                {discountAmount > 0 && (
                  <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-lg whitespace-nowrap">
                    {discountType === 'percent' && <span className="opacity-70">{Number(discount)}% = </span>}
                    - {EGP(discountAmount)}
                  </span>
                )}
              </div>
              
              {cart.length > 0 && discountableTotal < rawTotal && (
                 <div className="mt-1 flex items-center justify-between text-[10px]">
                   <span className="text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100">⚠️ يوجد منتجات في الفاتورة لا تقبل الخصم</span>
                   <span className="text-burgundy/50">المبلغ الخاضع للخصم: {EGP(discountableTotal)}</span>
                 </div>
              )}

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

              {/* Employee Selector */}
              {employees.length > 0 && (
                <div className="border-t border-burgundy/10 pt-3">
                  <p className="text-[10px] text-burgundy/50 font-bold mb-1">الموظف البائع (اختياري)</p>
                  <select
                    value={selectedEmployee}
                    onChange={e => setSelectedEmployee(e.target.value)}
                    className="w-full text-xs text-burgundy bg-white border border-burgundy/15 rounded-xl px-3 py-2 outline-none focus:border-burgundy"
                  >
                    <option value="">— بدون تحديد موظف —</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <p className="text-xs text-burgundy/50 mb-1.5 font-medium">طريقة الدفع</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Cash', label: '💵 كاش', },
                    { id: 'Instapay', label: '📱 انستا باي', },
                    { id: 'Wallet', label: '💳 محفظة كاش', },
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`py-2.5 rounded-xl text-[10px] font-bold border-2 transition-all ${
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
          setDiscountType('amount');
          setAmountPaid('');
          setCustomerName('');
          setCustomerPhone('');
          setIsClearConfirmOpen(false);
          showToast('تم مسح الفاتورة بنجاح', 'success');
        }}
        onCancel={() => setIsClearConfirmOpen(false)}
      />

      {/* Price Check Modal */}
      {isPriceCheckOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setIsPriceCheckOpen(false)}>
          <div className="w-full max-w-lg overflow-y-auto rounded-[2rem] bg-[#F7F0EC] p-6 shadow-2xl max-h-[85vh] text-burgundy text-right" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-burgundy/10 pb-3">
              <h3 className="text-lg font-bold">🔎 الاستعلام السريع عن السعر والمخزون</h3>
              <button onClick={() => setIsPriceCheckOpen(false)} className="text-sm font-bold text-burgundy/50 hover:text-burgundy">✕</button>
            </div>
            <PriceCheckModalContent products={products} />
          </div>
        </div>
      )}

      {/* Held Carts Modal */}
      {isHeldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setIsHeldModalOpen(false)}>
          <div className="w-full max-w-xl overflow-y-auto rounded-[2rem] bg-[#F7F0EC] p-6 shadow-2xl max-h-[85vh] text-burgundy text-right" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-burgundy/10 pb-3">
              <h3 className="text-lg font-bold">⏳ الفواتير المعلقة والمسودات</h3>
              <button onClick={() => setIsHeldModalOpen(false)} className="text-sm font-bold text-burgundy/50 hover:text-burgundy">✕</button>
            </div>
            
            {heldCarts.length === 0 ? (
              <p className="text-center text-xs text-burgundy/40 py-8">لا توجد فواتير معلقة حالياً.</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {heldCarts.map(held => {
                  const itemsCount = held.cart.reduce((s, i) => s + i.quantity, 0);
                  const total = held.cart.reduce((s, i) => s + i.price * i.quantity, 0) - (held.discount || 0);
                  return (
                    <div key={held.id} className="bg-white rounded-2xl p-4 border border-burgundy/5 shadow-sm space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-burgundy">زبون: {held.note || 'بدون اسم'}</h4>
                          <p className="text-[10px] text-burgundy/40 mt-0.5">{new Date(held.createdAt).toLocaleString('ar-EG')}</p>
                        </div>
                        <span className="text-sm font-bold text-burgundy">{EGP(total)}</span>
                      </div>
                      
                      <div className="text-xs text-burgundy/60 border-t border-burgundy/5 pt-2 flex flex-wrap justify-between gap-2">
                        <span>عدد القطع المعلقة: {itemsCount} قطعة</span>
                        {held.customerPhone && <span>رقم الهاتف: {held.customerPhone}</span>}
                      </div>

                      <div className="text-[11px] text-burgundy/40 bg-burgundy/3 p-2 rounded-lg">
                        <strong>الأصناف:</strong> {held.cart.map(c => `${c.name} (${c.size}/${c.color}) x${c.quantity}`).join(' · ')}
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleResumeCart(held)}
                          className="rounded-xl bg-burgundy px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#650018]"
                        >
                          🔄 استرجاع الفاتورة
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHeldCart(held.id)}
                          className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500 hover:text-white"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function PriceCheckModalContent({ products }) {
  const [query, setQuery] = useState('');
  const trimmed = query.trim().toLowerCase();
  
  const results = products.filter(p => 
    p.name.toLowerCase().includes(trimmed) || 
    (p.sku || '').toLowerCase().includes(trimmed)
  ).slice(0, 5);

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="ابحث بالاسم أو امسح الباركود..."
        autoFocus
        className="w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy"
      />
      
      {trimmed === '' ? (
        <p className="text-center text-xs text-burgundy/40 py-6">اكتب اسم المنتج أو امسح باركود للاستعلام...</p>
      ) : results.length === 0 ? (
        <p className="text-center text-xs text-burgundy/40 py-6">لا توجد منتجات مطابقة للبحث</p>
      ) : (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {results.map(p => (
            <div key={p._id} className="bg-white rounded-2xl p-4 border border-burgundy/5 shadow-sm space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-burgundy">{p.name}</h4>
                  <p className="text-[10px] text-burgundy/40 font-mono mt-0.5">{p.sku || 'بدون كود باركود'}</p>
                </div>
                <span className="text-sm font-bold text-burgundy">{EGP(p.price)}</span>
              </div>
              
              <div className="flex justify-between text-xs text-burgundy/60 border-t border-burgundy/5 pt-2">
                <span>الفئة: {CATEGORY_LABELS[p.category] || p.category}</span>
                <span className="font-bold">المخزون الكلي: {p.stock} قطعة</span>
              </div>

              {p.variants && p.variants.length > 0 && (
                <div className="bg-[#F7F0EC]/50 rounded-xl p-2.5 mt-2 space-y-1.5 text-right" dir="rtl">
                  <p className="text-[10px] font-bold text-burgundy/40">تفاصيل الأحجام والألوان:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {p.variants.map((v, idx) => (
                      <div key={idx} className="flex justify-between text-xs bg-white rounded-lg px-2 py-1 border border-burgundy/5">
                        <span className="font-semibold text-burgundy/70">{v.size} / {v.color}</span>
                        <span className={`font-bold ${v.stock === 0 ? 'text-red-500' : 'text-burgundy'}`}>{v.stock} قطعة</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CashierPOS;
