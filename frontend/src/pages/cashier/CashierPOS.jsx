import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';
import POSProductCatalog from '../../components/cashier/pos/POSProductCatalog';
import POSCartPanel from '../../components/cashier/pos/POSCartPanel';
import POSInvoiceModal from '../../components/cashier/pos/POSInvoiceModal';
import { usePOSCheckout } from '../../components/cashier/pos/usePOSCheckout';
import { isDiscountActive } from '../../utils/discount';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const CATEGORY_LABELS = {
  Blazer: 'بليزر', Blouse: 'بلوزة', Chemise: 'شميز', Skirt: 'جيبة',
  Dress: 'فستان', Pantalon: 'بنطلون', 'T-shirt': 'تيشيرت', Bag: 'شنطة',
  Cardigan: 'كاردن', Suit: 'سوت', Tonic: 'تونيك', Takem: 'طقم'
};

const ARABIC_KEYBOARD_MAP = {
  'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u', 'ه': 'i', 'خ': 'o', 'ح': 'p',
  'ج': '[', 'د': ']', 'ش': 'a', 'س': 's', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j', 'ن': 'k',
  'م': 'l', 'ك': ';', 'ط': "'", 'ئ': 'z', 'ء': 'x', 'ؤ': 'c', 'ر': 'v', 'لا': 'b', 'ى': 'n', 'ة': 'm',
  'و': ',', 'ز': '.', 'ظ': '/', 'ذ': '`',
  'أ': 'h', 'إ': 'y', 'آ': 'n'
};

const normalizeBarcodeString = (str) => {
  if (!str) return '';
  let result = '';
  const strVal = String(str);
  for (let i = 0; i < strVal.length; i++) {
    const char = strVal[i];
    result += ARABIC_KEYBOARD_MAP[char] || char;
  }
  return result.trim();
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

function Toast({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold text-white transition-all transform translate-y-0 ${
            t.type === 'error' ? 'bg-red-600 shadow-red-500/20' :
            t.type === 'warning' ? 'bg-amber-600 shadow-amber-500/20' :
            'bg-emerald-600 shadow-emerald-500/20'
          }`}
        >
          <span>{t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠️' : '✓'}</span>
          <span>{t.message}</span>
        </div>
      ))}
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
                {isDiscountActive(p) ? (
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-burgundy">{EGP(p.discountPrice)}</span>
                    <span className="text-xs text-red-500 line-through">{EGP(p.price)}</span>
                    <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-bold mt-1">
                      خصم {Math.round((1 - p.discountPrice / p.price) * 100)}%
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-burgundy">{EGP(p.price)}</span>
                )}
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

export default function CashierPOS() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editOrderId = searchParams.get('editOrder');
  const loadOrderId = searchParams.get('loadOrder');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlinkedBarcode, setUnlinkedBarcode] = useState(null);

  // Modals
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [isPriceCheckOpen, setIsPriceCheckOpen] = useState(false);

  const checkout = usePOSCheckout({ navigate, editOrderId });

  const loadProducts = () => {
    setLoading(true);
    api.get('/products?includeOffSeason=true')
      .then(res => setProducts(Array.isArray(res?.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Handle loadOrder or editOrder from URL
  useEffect(() => {
    if (loadOrderId || editOrderId) {
      const targetId = loadOrderId || editOrderId;
      api.get(`/pos/orders/${targetId}`)
        .then(res => {
          const order = res.data;
          if (order) {
            const loadedCart = (order.items || []).map(i => ({
              _cartKey: `${i.product?._id || i.product}_${i.size || ''}_${i.color || ''}`,
              product: i.product?._id || i.product,
              name: i.name,
              category: i.category,
              price: i.price,
              originalPrice: i.originalPrice || i.price,
              discountPrice: i.discountPrice,
              isDiscountActive: (i.originalPrice && i.originalPrice > i.price),
              size: i.size || '',
              color: i.color || '',
              quantity: i.quantity,
              maxStock: 999,
              image: i.product?.images?.[0] || '',
              allowDiscount: i.allowDiscount !== false
            }));
            checkout.setCart(loadedCart);
            checkout.setDiscount(order.discount || 0);
            checkout.setCustomerName(order.customerName || '');
            checkout.setCustomerPhone(order.customerPhone || '');
            checkout.setNotes(order.notes || '');
            if (order.employee) {
              checkout.setSelectedEmployee(order.employee._id || order.employee);
            }
            checkout.showToast(`تم تحميل الفاتورة #${order.invoiceNumber || targetId.slice(-6)} بنجاح`);
          }
        })
        .catch(() => {
          checkout.showToast('تعذر تحميل بيانات الفاتورة', 'error');
        });
    }
  }, [loadOrderId, editOrderId]);

  // USB Barcode Wedge Listener
  useEffect(() => {
    let buffer = '';
    let timer = null;

    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          const rawSku = buffer.trim();
          const normSku = normalizeBarcodeString(rawSku);
          const sku = normalizeDigits(normSku).toUpperCase();
          const scannedDigits = sku.replace(/[^0-9]/g, '');

          let found = null;
          let matchedVariant = null;

          // 0. Variant SKU match across all local products
          for (const p of products) {
            if (p.variants && p.variants.length > 0) {
              const v = p.variants.find(item => {
                if (!item.sku) return false;
                const vSku = normalizeDigits(item.sku).trim().toUpperCase();
                return vSku === sku || vSku.replace(/[^A-Z0-9]/g, '') === sku.replace(/[^A-Z0-9]/g, '');
              });
              if (v) {
                found = p;
                matchedVariant = v;
                break;
              }
            }
          }

          // 1. Exact match by sku, oldSku, or oldSkus array
          if (!found) {
            found = products.find(p => {
              const pSku = normalizeDigits(p.sku || '').trim().toUpperCase();
              const pOldSku = normalizeDigits(p.oldSku || '').trim().toUpperCase();
              const pOldSkus = Array.isArray(p.oldSkus) ? p.oldSkus.map(s => normalizeDigits(s || '').trim().toUpperCase()) : [];
              return (pSku && pSku === sku) || (pOldSku && pOldSku === sku) || pOldSkus.includes(sku);
            });
          }

          // 2. Clean alphanumeric match (ignoring dashes and spaces)
          if (!found) {
            const skuClean = sku.replace(/[^A-Z0-9]/g, '');
            if (skuClean) {
              found = products.find(p => {
                const pSkuClean = normalizeDigits(p.sku || '').replace(/[^A-Z0-9]/g, '').toUpperCase();
                const pOldSkuClean = normalizeDigits(p.oldSku || '').replace(/[^A-Z0-9]/g, '').toUpperCase();
                return (pSkuClean && pSkuClean === skuClean) || (pOldSkuClean && pOldSkuClean === skuClean);
              });
            }
          }

          // 3. Exact 5-digit pIdDigits match
          if (!found) {
            found = products.find(p => {
              const pIdDigits = p._id ? (parseInt(p._id.toString().slice(-6), 16) % 89999 + 10000).toString() : '';
              return pIdDigits && pIdDigits === sku;
            });
          }

          // 4. Fallback to digits match ONLY if digits >= 4
          if (!found && scannedDigits && scannedDigits.length >= 4) {
            found = products.find(p => {
              const pSku = normalizeDigits(p.sku || '').trim();
              const pDigits = pSku.replace(/[^0-9]/g, '');
              return pSku === scannedDigits || pDigits === scannedDigits;
            });
          }

          if (found) {
            let autoSize = '';
            let autoColor = '';
            let autoStock = 0;

            if (matchedVariant) {
              autoSize = matchedVariant.size || '';
              autoColor = matchedVariant.color || '';
              autoStock = matchedVariant.stock ?? 0;
            } else if (found.variants && found.variants.length > 0) {
              const availableVariant = found.variants.find(v => v.stock > 0) || found.variants[0];
              autoSize = availableVariant.size || '';
              autoColor = availableVariant.color || '';
              autoStock = availableVariant.stock ?? 0;
            } else {
              autoSize = found.sizes?.[0] || '';
              autoColor = found.colors?.[0] || '';
              autoStock = found.stock ?? 0;
            }

            if (autoStock <= 0) {
              checkout.showToast(`تنبيه: "${found.name}" رصيده في السيستم 0 (تمت الإضافة)`, 'warning');
              autoStock = 999;
            }

            checkout.addToCart(found, autoSize, autoColor, 1, autoStock);
            checkout.showToast(`تم مسح الكود [${sku}] — إضافة "${found.name}"`, 'success');
          } else {
            // Server fallback lookup
            api.get(`/products/lookup-barcode?code=${encodeURIComponent(sku)}`)
              .then(res => {
                const serverProduct = res.data;
                if (serverProduct && serverProduct._id) {
                  setProducts(prev => {
                    if (!prev.some(p => p._id === serverProduct._id)) {
                      return [serverProduct, ...prev];
                    }
                    return prev;
                  });

                  let autoSize = serverProduct.matchedVariant?.size || serverProduct.sizes?.[0] || serverProduct.variants?.[0]?.size || '';
                  let autoColor = serverProduct.matchedVariant?.color || serverProduct.colors?.[0] || serverProduct.variants?.[0]?.color || '';
                  let autoStock = serverProduct.matchedVariant != null ? serverProduct.matchedVariant.stock : (serverProduct.stock || 99);

                  checkout.addToCart(serverProduct, autoSize, autoColor, 1, autoStock);
                  checkout.showToast(`تم مسح الكود [${sku}] — إضافة "${serverProduct.name}"`, 'success');
                } else {
                  setUnlinkedBarcode(sku);
                  checkout.showToast(`تم مسح الكود [${sku}] — اضغط الخيار بالأسفل لربطه بمنتج`, 'error');
                }
              })
              .catch(() => {
                setUnlinkedBarcode(sku);
                checkout.showToast(`تم مسح الكود [${sku}] — اضغط الخيار بالأسفل لربطه بمنتج`, 'error');
              });
          }
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timer);
        timer = setTimeout(() => { buffer = ''; }, 500);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [products, checkout]);

  const handleLinkUnlinkedBarcode = async (p) => {
    if (!unlinkedBarcode || !p) return;
    try {
      await api.post('/products/link-barcode', { code: unlinkedBarcode, productId: p._id });
      p.oldSku = unlinkedBarcode;
      const autoSize = p.sizes?.[0] || p.variants?.[0]?.size || '';
      const autoColor = p.colors?.[0] || p.variants?.[0]?.color || '';
      const autoStock = p.stock || 99;

      checkout.addToCart(p, autoSize, autoColor, 1, autoStock);
      checkout.showToast(`تم ربط الباركود [${unlinkedBarcode}] بـ "${p.name}" بنجاح!`, 'success');
      setUnlinkedBarcode(null);
    } catch {
      checkout.showToast('فشل ربط الباركود بالمنتج', 'error');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] -m-6 overflow-hidden">
      {/* Offline Warning Banner */}
      {(checkout.offlineSales.length > 0 || !checkout.isOnline) && (
        <div className={`flex items-center justify-between px-6 py-2.5 text-xs font-bold text-white transition-all ${
          !checkout.isOnline ? 'bg-amber-600' : 'bg-emerald-600'
        }`}>
          <div className="flex items-center gap-2">
            <span>{!checkout.isOnline ? 'أنت تعمل بدون إنترنت حالياً (الوضع أوفلاين نشط)' : 'تم استعادة الاتصال بالإنترنت'}</span>
            {checkout.offlineSales.length > 0 && (
              <span>| لديك <strong>{checkout.offlineSales.length}</strong> فواتير محفوظة محلياً بانتظار المزامنة.</span>
            )}
          </div>
          {checkout.offlineSales.length > 0 && checkout.isOnline && (
            <button
              onClick={() => checkout.handleSyncOfflineSales(loadProducts)}
              disabled={checkout.syncing}
              className="rounded-full bg-white px-4 py-1 text-xs font-extrabold text-burgundy shadow transition hover:bg-[#F7F0EC] disabled:opacity-50"
            >
              {checkout.syncing ? 'جاري المزامنة...' : 'مزامنة الفواتير المعلقة'}
            </button>
          )}
        </div>
      )}

      <div className="flex-1 flex gap-0 overflow-hidden">
        {/* CENTER: Product Search & Details */}
        <POSProductCatalog
          products={products}
          loading={loading}
          cartCount={checkout.cart.length}
          onAddToCart={checkout.addToCart}
          onOpenPriceCheck={() => setIsPriceCheckOpen(true)}
          unlinkedBarcode={unlinkedBarcode}
          onCloseUnlinkedBarcode={() => setUnlinkedBarcode(null)}
          onLinkUnlinkedBarcode={handleLinkUnlinkedBarcode}
        />

        {/* LEFT: Cart / Invoice Panel */}
        <POSCartPanel
          cart={checkout.cart}
          setCart={checkout.setCart}
          updateQty={checkout.updateQty}
          removeItem={checkout.removeItem}
          editingPriceKey={checkout.editingPriceKey}
          setEditingPriceKey={checkout.setEditingPriceKey}
          rawTotal={checkout.rawTotal}
          discountableTotal={checkout.discountableTotal}
          discountAmount={checkout.discountAmount}
          totalAfterDiscount={checkout.totalAfterDiscount}
          change={checkout.change}
          discount={checkout.discount}
          setDiscount={checkout.setDiscount}
          discountType={checkout.discountType}
          setDiscountType={checkout.setDiscountType}
          showDiscountInInvoice={checkout.showDiscountInInvoice}
          setShowDiscountInInvoice={checkout.setShowDiscountInInvoice}
          customerName={checkout.customerName}
          setCustomerName={checkout.setCustomerName}
          customerPhone={checkout.customerPhone}
          setCustomerPhone={checkout.setCustomerPhone}
          matchedCustomer={checkout.matchedCustomer}
          employees={checkout.employees}
          selectedEmployee={checkout.selectedEmployee}
          setSelectedEmployee={checkout.setSelectedEmployee}
          notes={checkout.notes}
          setNotes={checkout.setNotes}
          paymentMethod={checkout.paymentMethod}
          setPaymentMethod={checkout.setPaymentMethod}
          isDebt={checkout.isDebt}
          setIsDebt={checkout.setIsDebt}
          debtPaidAmount={checkout.debtPaidAmount}
          setDebtPaidAmount={checkout.setDebtPaidAmount}
          amountPaid={checkout.amountPaid}
          setAmountPaid={checkout.setAmountPaid}
          heldCarts={checkout.heldCarts}
          handleHoldCart={checkout.handleHoldCart}
          onOpenHeldModal={() => setIsHeldModalOpen(true)}
          onClearCartClick={() => setIsClearConfirmOpen(true)}
          handleCheckout={checkout.handleCheckout}
          submitting={checkout.submitting}
          editOrderId={editOrderId}
        />
      </div>

      {/* Invoice Modal */}
      {checkout.completedOrder && (
        <POSInvoiceModal
          order={checkout.completedOrder}
          onClose={() => checkout.setCompletedOrder(null)}
        />
      )}

      {/* Toast Notifications */}
      <Toast toasts={checkout.toasts} />

      {/* Clear Cart Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearConfirmOpen}
        title="تأكيد مسح الفاتورة"
        message="هل أنت متأكد أنك تريد مسح جميع المنتجات من الفاتورة الحالية؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="نعم، مسح الفاتورة"
        onConfirm={() => {
          checkout.setCart([]);
          checkout.setDiscount(0);
          checkout.setDiscountType('amount');
          checkout.setAmountPaid('');
          checkout.setCustomerName('');
          checkout.setCustomerPhone('');
          checkout.setNotes('');
          setIsClearConfirmOpen(false);
          checkout.showToast('تم مسح الفاتورة بنجاح', 'success');
        }}
        onCancel={() => setIsClearConfirmOpen(false)}
      />

      {/* Price Check Modal */}
      {isPriceCheckOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setIsPriceCheckOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-y-auto rounded-[2rem] bg-[#F7F0EC] p-6 shadow-2xl max-h-[85vh] text-burgundy text-right"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 border-b border-burgundy/10 pb-3">
              <h3 className="text-lg font-bold">🔍 الاستعلام السريع عن السعر والمخزون</h3>
              <button
                onClick={() => setIsPriceCheckOpen(false)}
                className="text-sm font-bold text-burgundy/50 hover:text-burgundy"
              >
                ✕
              </button>
            </div>
            <PriceCheckModalContent products={products} />
          </div>
        </div>
      )}

      {/* Held Carts Modal */}
      {isHeldModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setIsHeldModalOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-y-auto rounded-[2rem] bg-[#F7F0EC] p-6 shadow-2xl max-h-[85vh] text-burgundy text-right"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 border-b border-burgundy/10 pb-3">
              <h3 className="text-lg font-bold">⏸️ الفواتير المعلقة والمسودات</h3>
              <button
                onClick={() => setIsHeldModalOpen(false)}
                className="text-sm font-bold text-burgundy/50 hover:text-burgundy"
              >
                ✕
              </button>
            </div>

            {checkout.heldCarts.length === 0 ? (
              <p className="text-center text-xs text-burgundy/40 py-8">لا توجد فواتير معلقة حالياً.</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {checkout.heldCarts.map(held => {
                  const itemsCount = held.cart.reduce((s, i) => s + i.quantity, 0);
                  const total = held.cart.reduce((s, i) => s + i.price * i.quantity, 0) - (held.discount || 0);
                  return (
                    <div key={held.id} className="bg-white rounded-2xl p-4 border border-burgundy/5 shadow-sm space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-burgundy">زبون: {held.note || 'بدون اسم'}</h4>
                          <p className="text-[10px] text-burgundy/40 mt-0.5">
                            {new Date(held.createdAt).toLocaleString('ar-EG-u-nu-latn')}
                          </p>
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
                          onClick={() => {
                            checkout.handleResumeCart(held);
                            setIsHeldModalOpen(false);
                          }}
                          className="rounded-xl bg-burgundy px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#650018]"
                        >
                          استرجاع الفاتورة
                        </button>
                        <button
                          type="button"
                          onClick={() => checkout.handleDeleteHeldCart(held.id)}
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
  );
}
