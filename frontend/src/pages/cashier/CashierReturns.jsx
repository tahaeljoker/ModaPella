import { useEffect, useState } from 'react';
import api from '../../services/api';
import { isDiscountActive } from '../../utils/discount';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;
const SHORT_ID = (id) => id?.slice(-6).toUpperCase() || '------';

function CashierReturns() {
  const [mode, setMode] = useState('return'); // 'return' | 'exchange'
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [reason, setReason] = useState('');
  const [returnQtys, setReturnQtys] = useState({});
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: '' });

  // Exchange state: new items to buy
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newCart, setNewCart] = useState([]);
  const [exchangeDiscount, setExchangeDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  useEffect(() => {
    api.get('/products')
      .then(res => setProducts(res.data))
      .catch(console.error);
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!orderId.trim()) return;
    setLoading(true);
    setOrder(null);
    setReturnQtys({});
    setNewCart([]);
    try {
      const res = await api.get(`/cashier/orders/${orderId.trim()}`);
      setOrder(res.data);
      
      const initial = {};
      res.data.items.forEach(item => {
        initial[item._id] = 0;
      });
      setReturnQtys(initial);
    } catch (err) {
      showToast(err.response?.data?.message || 'لم يُعثر على طلب بهذا الرقم أو الكود', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!order || order.recovered) return;
    const itemsToReturn = Object.entries(returnQtys)
      .map(([itemId, qty]) => ({ itemId, quantity: qty }))
      .filter(x => x.quantity > 0);

    if (itemsToReturn.length === 0) {
      return alert('يرجى تحديد قطعة واحدة على الأقل لإرجاعها');
    }

    setProcessing(true);
    try {
      await api.post('/pos/recover', { orderId: order._id, reason, returnItems: itemsToReturn });
      showToast('تم استرداد القطع وإعادة المخزون بنجاح ✓');
      setOrder(null);
      setOrderId('');
      setReason('');
      setReturnQtys({});
    } catch (err) {
      showToast(err.response?.data?.message || 'حدث خطأ أثناء الاسترداد', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Add new item to exchange cart
  const handleAddNewItem = () => {
    if (!selectedProduct) return;
    const key = `${selectedProduct._id}_${selectedSize}_${selectedColor}`;
    const activeDiscount = isDiscountActive(selectedProduct);
    const effPrice = activeDiscount ? selectedProduct.discountPrice : selectedProduct.price;

    let maxAvail = selectedProduct.stock || 0;
    if (selectedProduct.variants && selectedProduct.variants.length > 0) {
      const v = selectedProduct.variants.find(x => x.size === selectedSize && x.color === selectedColor);
      if (v) maxAvail = v.stock || 0;
    }

    if (maxAvail <= 0) {
      return alert('نفد مخزون هذا المقاس/اللون');
    }

    const newItem = {
      _cartKey: key,
      product: selectedProduct._id,
      name: selectedProduct.name,
      category: selectedProduct.category,
      price: effPrice,
      size: selectedSize,
      color: selectedColor,
      quantity: Math.min(newQuantity, maxAvail),
      costPrice: selectedProduct.costPrice || 0
    };

    setNewCart(prev => {
      const exists = prev.find(i => i._cartKey === key);
      if (exists) {
        return prev.map(i => i._cartKey === key ? { ...i, quantity: Math.min(i.quantity + newQuantity, maxAvail) } : i);
      }
      return [...prev, newItem];
    });

    setSelectedProduct(null);
    setSelectedSize('');
    setSelectedColor('');
    setNewQuantity(1);
    setProductSearch('');
  };

  const handleRemoveNewItem = (key) => {
    setNewCart(prev => prev.filter(i => i._cartKey !== key));
  };

  // Calculate Exchange Totals
  const returnItemsList = Object.entries(returnQtys)
    .map(([itemId, qty]) => {
      const item = order?.items?.find(i => i._id === itemId);
      return item ? { ...item, returnQty: qty } : null;
    })
    .filter(x => x && x.returnQty > 0);

  const originalTotal = (order?.totalAmount || 0) + (order?.discount || 0);
  const returnedRawValue = returnItemsList.reduce((sum, i) => sum + i.price * i.returnQty, 0);
  const returnCreditValue = originalTotal > 0
    ? Math.round((order.totalAmount * (returnedRawValue / originalTotal)) * 100) / 100
    : 0;

  const rawNewTotal = newCart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const newTotalAmount = Math.max(0, rawNewTotal - Number(exchangeDiscount || 0));
  const netDifference = newTotalAmount - returnCreditValue; // > 0 customer pays, < 0 store refunds

  const handleExchangeSubmit = async () => {
    if (!order || order.recovered) return;
    if (returnItemsList.length === 0) {
      return alert('يرجى تحديد قطعة واحدة على الأقل لإرجاعها في عملية الاستبدال');
    }
    if (newCart.length === 0) {
      return alert('يرجى إضافة قطعة جديدة واحدة على الأقل للشراء في عملية الاستبدال');
    }

    setProcessing(true);
    try {
      const payload = {
        originalOrderId: order._id,
        returnItems: returnItemsList.map(i => ({ itemId: i._id, quantity: i.returnQty })),
        newItems: newCart.map(i => ({
          product: i.product,
          name: i.name,
          category: i.category,
          price: i.price,
          quantity: i.quantity,
          size: i.size,
          color: i.color,
          costPrice: i.costPrice
        })),
        discount: Number(exchangeDiscount || 0),
        paymentMethod,
        reason,
        notes: `استبدال مباشر ${returnItemsList.length} قطعة بـ ${newCart.length} قطعة`
      };

      await api.post('/pos/exchange', payload);
      showToast('✅ تم إتمام عملية الاستبدال المباشر بنجاح وتحديث الخزنة والمخزون!');
      setOrder(null);
      setOrderId('');
      setReason('');
      setReturnQtys({});
      setNewCart([]);
    } catch (err) {
      showToast(err.response?.data?.message || 'فشلت عملية الاستبدال', 'error');
    } finally {
      setProcessing(false);
    }
  };

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

  const translatedSearch = translateArabicKeyboard(productSearch);
  const normalizedSearch = normalizeDigits(translatedSearch).trim().toLowerCase();

  const filteredProducts = productSearch.trim()
    ? products.filter(p => {
        const pName = p.name.toLowerCase();
        const pSku = (p.sku || '').toLowerCase();
        const pOldSku = (p.oldSku || '').toLowerCase();

        return pName.includes(productSearch.toLowerCase()) ||
               pName.includes(normalizedSearch) ||
               pSku.includes(productSearch.toLowerCase()) ||
               pSku.includes(normalizedSearch) ||
               pOldSku.includes(productSearch.toLowerCase()) ||
               pOldSku.includes(normalizedSearch);
      })
    : [];

  const inputCls = 'w-full rounded-xl border border-burgundy/20 bg-white px-4 py-3 text-sm text-burgundy outline-none transition focus:border-burgundy';

  return (
    <div className="max-w-4xl space-y-6 text-burgundy" dir="rtl">
      {toast.msg && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-xl ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/50">كاشير</p>
          <h2 className="text-2xl font-bold">إدارة المرتجعات والاستبدال</h2>
          <p className="mt-1 text-sm text-burgundy/60">أدخل كود الفاتورة لإجراء مرتجع أو استبدال مباشر بنفس اللحظة</p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 rounded-2xl border border-burgundy/15 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setMode('return')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              mode === 'return' ? 'bg-burgundy text-white shadow-sm' : 'text-burgundy/70 hover:bg-burgundy/5'
            }`}
          >
            <span>↩️ مرتجع فقط</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('exchange')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              mode === 'exchange' ? 'bg-emerald-600 text-white shadow-sm' : 'text-burgundy/70 hover:bg-burgundy/5'
            }`}
          >
            <span>🔄 استبدال مباشر</span>
          </button>
        </div>
      </div>

      {/* Search Form */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold">🔍 البحث عن الفاتورة الأصلية</h3>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="أدخل كود الفاتورة (مثل F6E8A1) أو ID الفاتورة..."
            className={`${inputCls} flex-1`}
          />
          <button type="submit" disabled={loading}
            className="rounded-full bg-burgundy px-7 py-2.5 text-sm font-bold text-white transition hover:bg-[#650018] disabled:opacity-60">
            {loading ? '...' : 'بحث عن الفاتورة'}
          </button>
        </form>
        <p className="mt-2 text-xs text-burgundy/40">الكود مكون من 6 رموز ويظهر أعلى الفاتورة المطبوعة</p>
      </div>

      {/* Order Details & Exchange Workflow */}
      {order && (
        <div className="space-y-6">
          {/* Invoice Summary Header */}
          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">تفاصيل الفاتورة الأصليّة</h3>
                <p className="text-xs text-burgundy/50 mt-0.5">#{SHORT_ID(order._id)} · {new Date(order.createdAt).toLocaleString('ar-EG-u-nu-latn')}</p>
              </div>
              <div className="flex gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : order.status === 'Returned' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                  {order.status === 'Completed' ? 'مكتمل' : order.status === 'Returned' ? 'مرتجع بالفعل' : 'معلق'}
                </span>
                {order.recovered && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">تم الاسترداد بالكامل</span>
                )}
              </div>
            </div>

            {/* Original Items list with return counters */}
            <div className="rounded-xl border border-burgundy/8 overflow-hidden bg-white">
              <div className="bg-burgundy/5 px-4 py-2 text-xs font-bold text-burgundy flex justify-between">
                <span>القطع بالفاتورة</span>
                <span>حدد الكمية المراد ترجيعها/استبدالها</span>
              </div>
              {order.items?.map((item) => {
                const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                return (
                  <div key={item._id} className="flex flex-wrap items-center justify-between border-b border-burgundy/5 last:border-0 px-4 py-3 text-sm gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-burgundy">{item.name}</p>
                      <p className="text-xs text-burgundy/50 mt-0.5">
                        {item.size && <span>مقاس: {item.size}</span>}
                        {item.size && item.color && <span> · </span>}
                        {item.color && <span>اللون: {item.color}</span>}
                      </p>
                      <p className="text-xs text-burgundy/40 mt-0.5">
                        المباع: {item.quantity} قطعة | تم إرجاع سابقاً: {item.returnedQuantity || 0}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-rose-700">كمية الإرجاع:</span>
                      <input
                        type="number"
                        min="0"
                        max={maxReturnable}
                        value={returnQtys[item._id] ?? 0}
                        onChange={(e) => {
                          const val = Math.min(maxReturnable, Math.max(0, Number(e.target.value) || 0));
                          setReturnQtys(prev => ({ ...prev, [item._id]: val }));
                        }}
                        className="w-16 rounded-lg border border-burgundy/20 bg-white px-2 py-1 text-center font-bold outline-none focus:border-burgundy"
                      />
                      <span className="text-xs text-burgundy/40">/ {maxReturnable}</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between bg-burgundy/5 px-4 py-3 font-bold text-xs">
                <span>إجمالي الفاتورة الأصلي: {EGP(order.totalAmount)}</span>
                <span className="text-rose-700">رصيد المرتجع المحسوب: {EGP(returnCreditValue)}</span>
              </div>
            </div>
          </div>

          {/* Mode 1: Return Only */}
          {mode === 'return' && !order.recovered && (
            <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-bold">↩️ إتمام المرتجع</h3>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">سبب الإرجاع</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={`${inputCls} min-h-[70px]`}
                  placeholder="اكتب سبب الإرجاع..."
                />
              </div>
              <button
                type="button"
                onClick={handleReturn}
                disabled={processing}
                className="w-full rounded-full bg-red-600 py-3.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60 shadow-lg shadow-red-600/20"
              >
                {processing ? 'جاري الاسترداد...' : `↩ تأكيد إرجاع القطع واسترداد ${EGP(returnCreditValue)}`}
              </button>
            </div>
          )}

          {/* Mode 2: Direct Exchange */}
          {mode === 'exchange' && !order.recovered && (
            <div className="rounded-[2rem] border border-emerald-600/20 bg-emerald-50/40 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                <h3 className="text-lg font-bold text-emerald-900">🔄 اختيار البضاعة الجديدة للاستبدال</h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">استبدال مباشر</span>
              </div>

              {/* Product Picker for New Items */}
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                <label className="block text-xs font-bold text-burgundy/70">ابحث عن الصنف الجديد وسجله:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="امسح الباركود أو اكتب اسم المنتج الجديد..."
                    className={inputCls}
                  />
                  {filteredProducts.length > 0 && (
                    <div className="absolute top-full right-0 left-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-burgundy/10 bg-white shadow-xl">
                      {filteredProducts.map(p => (
                        <div
                          key={p._id}
                          onClick={() => {
                            setSelectedProduct(p);
                            setSelectedSize(p.sizes?.[0] || p.variants?.[0]?.size || '');
                            setSelectedColor(p.colors?.[0] || p.variants?.[0]?.color || '');
                            setProductSearch('');
                          }}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-emerald-50 cursor-pointer border-b border-burgundy/5 text-xs font-semibold"
                        >
                          <span>{p.name}</span>
                          <span className="font-bold text-emerald-700">{EGP(p.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Product Form */}
                {selectedProduct && (
                  <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200 space-y-3 text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-emerald-900">{selectedProduct.name}</span>
                      <span className="text-emerald-700 font-extrabold text-sm">{EGP(isDiscountActive(selectedProduct) ? selectedProduct.discountPrice : selectedProduct.price)}</span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {/* Size */}
                      {selectedProduct.sizes?.length > 0 && (
                        <div>
                          <label className="block font-semibold text-burgundy/60 mb-1">المقاس</label>
                          <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} className="w-full rounded-lg border border-burgundy/15 bg-white p-2 outline-none font-bold">
                            {selectedProduct.sizes.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      )}
                      {/* Color */}
                      {selectedProduct.colors?.length > 0 && (
                        <div>
                          <label className="block font-semibold text-burgundy/60 mb-1">اللون</label>
                          <select value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="w-full rounded-lg border border-burgundy/15 bg-white p-2 outline-none font-bold">
                            {selectedProduct.colors.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      )}
                      {/* Qty */}
                      <div>
                        <label className="block font-semibold text-burgundy/60 mb-1">الكمية</label>
                        <input
                          type="number"
                          min="1"
                          value={newQuantity}
                          onChange={(e) => setNewQuantity(Math.max(1, Number(e.target.value)))}
                          className="w-full rounded-lg border border-burgundy/15 bg-white p-2 outline-none font-bold text-center"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddNewItem}
                      className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                    >
                      ➕ إضافة للصنف الجديد
                    </button>
                  </div>
                )}
              </div>

              {/* New Cart List */}
              {newCart.length > 0 && (
                <div className="rounded-xl border border-emerald-200 overflow-hidden bg-white">
                  <div className="bg-emerald-100/60 px-4 py-2 text-xs font-bold text-emerald-900 flex justify-between">
                    <span>البضاعة الجديدة المطلوبة</span>
                    <span>الكمية والسعر</span>
                  </div>
                  {newCart.map(item => (
                    <div key={item._cartKey} className="flex items-center justify-between border-b border-burgundy/5 px-4 py-3 text-xs">
                      <div>
                        <p className="font-bold text-burgundy">{item.name}</p>
                        <p className="text-[10px] text-burgundy/50">
                          {item.size && <span>مقاس: {item.size}</span>}
                          {item.color && <span> · لون: {item.color}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-burgundy">{item.quantity} × {EGP(item.price)}</span>
                        <span className="font-extrabold text-emerald-800">{EGP(item.quantity * item.price)}</span>
                        <button type="button" onClick={() => handleRemoveNewItem(item._cartKey)} className="text-red-500 font-bold text-xs hover:text-red-700 px-1">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Live Financial Balance Summary Card */}
              <div className="rounded-2xl bg-white p-5 border border-emerald-200 shadow-md space-y-3">
                <h4 className="text-sm font-bold text-burgundy border-b border-burgundy/10 pb-2">📊 الميزان المحاسبي لعملية الاستبدال</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-burgundy/70">
                    <span>رصيد المرتجع (حق الزبون من الفاتورة القديمة):</span>
                    <span className="font-bold text-rose-700">- {EGP(returnCreditValue)}</span>
                  </div>
                  <div className="flex justify-between text-burgundy/70">
                    <span>إجمالي المشتريات الجديدة:</span>
                    <span className="font-bold text-burgundy">{EGP(rawNewTotal)}</span>
                  </div>
                  {exchangeDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>خصم إضافي على الاستبدال:</span>
                      <span className="font-bold">- {EGP(exchangeDiscount)}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-burgundy/20 pt-2 flex justify-between text-sm font-extrabold">
                    <span>الصافي النهائي:</span>
                    <span className={netDifference > 0 ? 'text-emerald-700' : netDifference < 0 ? 'text-amber-700' : 'text-blue-700'}>
                      {netDifference > 0
                        ? `مطلوب تحصيل ${EGP(netDifference)} من العميل 📥`
                        : netDifference < 0
                        ? `مطلوب رد ${EGP(Math.abs(netDifference))} للعميل 📤`
                        : 'استبدال متساوي (0 ج.م) ⚖️'}
                    </span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                {netDifference !== 0 && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-burgundy/60 mb-1">طريقة سداد/استرداد الفرق:</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-xl border border-burgundy/15 bg-[#F7F0EC]/50 px-3 py-2 text-xs font-bold text-burgundy outline-none"
                    >
                      <option value="Cash">💵 كاش (الدرج)</option>
                      <option value="Instapay">📱 انستا باي / تحويل</option>
                      <option value="Wallet">💳 محفظة كاش</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Submit Exchange Button */}
              <button
                type="button"
                onClick={handleExchangeSubmit}
                disabled={processing || returnItemsList.length === 0 || newCart.length === 0}
                className="w-full rounded-full bg-emerald-600 py-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-600/25"
              >
                {processing ? 'جاري تنفيذ الاستبدال...' : '🔄 تأكيد عملية الاستبدال المباشر وتحديث الخزنة والمخزون'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CashierReturns;
