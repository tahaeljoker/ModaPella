import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../services/api';
import { isDiscountActive } from '../../../utils/discount';

export function usePOSCheckout({ navigate, editOrderId = null } = {}) {
  // Cart & Invoice
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('amount'); // 'amount' | 'percent'
  const [showDiscountInInvoice, setShowDiscountInInvoice] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [editingPriceKey, setEditingPriceKey] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Debt fields
  const [isDebt, setIsDebt] = useState(false);
  const [debtPaidAmount, setDebtPaidAmount] = useState('');
  const [matchedCustomer, setMatchedCustomer] = useState(null);

  // Employee
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');

  // Offline Sales & Status
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [offlineSales, setOfflineSales] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('modapella_offline_sales') || '[]');
    } catch {
      return [];
    }
  });

  // Held Carts
  const [heldCarts, setHeldCarts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('modapella_held_carts') || '[]');
    } catch {
      return [];
    }
  });

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const saveOfflineSales = useCallback((salesList) => {
    setOfflineSales(salesList);
    localStorage.setItem('modapella_offline_sales', JSON.stringify(salesList));
  }, []);

  // Fetch employees
  useEffect(() => {
    api.get('/employees')
      .then(res => setEmployees(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Customer debt lookup debounce
  useEffect(() => {
    if (!customerPhone || customerPhone.length < 4) {
      setMatchedCustomer(null);
      return;
    }
    const timer = setTimeout(() => {
      api.get(`/cashier/debts?search=${encodeURIComponent(customerPhone)}`)
        .then(res => {
          if (res.data?.customers && res.data.customers.length > 0) {
            const found = res.data.customers.find(c => c.phone === customerPhone.trim()) || res.data.customers[0];
            setMatchedCustomer(found);
            if (!customerName && found.name) {
              setCustomerName(found.name);
            }
          } else {
            setMatchedCustomer(null);
          }
        })
        .catch(() => setMatchedCustomer(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [customerPhone, customerName]);

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
    setNotes('');
    setSelectedEmployee('');
    showToast('تم تعليق الفاتورة بنجاح');
  };

  const handleResumeCart = (held) => {
    setCart(held.cart);
    setDiscount(held.discount);
    setDiscountType(held.discountType || 'amount');
    setCustomerName(held.customerName || '');
    setCustomerPhone(held.customerPhone || '');
    setSelectedEmployee(held.selectedEmployee || '');
    handleDeleteHeldCart(held.id);
    showToast(`تم استئناف فاتورة "${held.note}"`);
  };

  const handleDeleteHeldCart = (id) => {
    const updated = heldCarts.filter(h => h.id !== id);
    setHeldCarts(updated);
    localStorage.setItem('modapella_held_carts', JSON.stringify(updated));
  };

  const handleSyncOfflineSales = async (onSyncSuccess) => {
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
      showToast(`تم مزامنة ${successCount} فاتورة معلقة بنجاح!`);
      if (onSyncSuccess) onSyncSuccess();
    } else {
      showToast('فشلت المزامنة. تأكد من اتصال السيرفر بالإنترنت.', 'error');
    }
  };

  const addToCart = (product, size, color, quantity = 1, availableStock = 999) => {
    if (!product) return;
    const key = `${product._id}_${size}_${color}`;
    const activeDiscount = isDiscountActive(product);
    const origPrice = Number(product.price || 0);
    const effPrice = activeDiscount && product.discountPrice != null && Number(product.discountPrice) > 0
      ? Number(product.discountPrice)
      : origPrice;

    const cartItem = {
      _cartKey: key,
      product: product._id,
      name: product.name,
      category: product.category,
      price: effPrice,
      originalPrice: origPrice,
      discountPrice: product.discountPrice,
      isDiscountActive: activeDiscount,
      size,
      color,
      quantity,
      maxStock: availableStock,
      image: product.images?.[0] || '',
      allowDiscount: product.allowDiscount !== false,
      costPrice: product.costPrice || 0
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
  };

  const updateQty = (key, val) => {
    if (val <= 0) {
      setCart(prev => prev.filter(i => i._cartKey !== key));
    } else {
      setCart(prev => prev.map(i => i._cartKey === key ? { ...i, quantity: Math.min(val, i.maxStock) } : i));
    }
  };

  const removeItem = (key) => {
    setCart(prev => prev.filter(i => i._cartKey !== key));
  };

  const rawTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountableTotal = cart.filter(i => i.allowDiscount).reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = discountType === 'percent'
    ? Math.min(rawTotal, rawTotal * Math.min(Number(discount || 0), 100) / 100)
    : Math.min(rawTotal, Number(discount || 0));
  const totalAfterDiscount = Math.max(0, rawTotal - discountAmount);
  const change = paymentMethod === 'Cash' && amountPaid ? Math.max(0, Number(amountPaid) - totalAfterDiscount) : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (isDebt && !customerName.trim()) {
      showToast('يجب إدخال اسم العميل لتسجيل البيع الآجل (الدين)', 'error');
      return;
    }

    setSubmitting(true);

    const user = JSON.parse(localStorage.getItem('modapella_user') || '{}');
    const salePayload = {
      sellerId: user._id,
      employeeId: selectedEmployee || null,
      customerName,
      customerPhone,
      notes,
      items: cart.map(i => ({
        product: i.product,
        name: i.name,
        category: i.category,
        price: i.price,
        originalPrice: i.originalPrice || i.price,
        quantity: i.quantity,
        size: i.size,
        color: i.color,
        costPrice: i.costPrice || 0
      })),
      showDiscountInInvoice,
      paymentMethod,
      discount: discountAmount,
      type: 'Offline',
      createdAt: new Date().toISOString(),
      isDebt,
      amountPaid: isDebt ? Number(debtPaidAmount || 0) : totalAfterDiscount
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
        notes: salePayload.notes || '',
        createdAt: salePayload.createdAt,
        _employeeName: emp?.name || '',
        showDiscountInInvoice,
        isOfflineSaved: true
      };

      saveOfflineSales([...offlineSales, { id: offlineId, payload: salePayload }]);
      setCompletedOrder(fakeOrder);
      showToast('تم حفظ الفاتورة محلياً لعدم اتصالك بالإنترنت', 'error');

      setCart([]);
      setDiscount(0);
      setDiscountType('amount');
      setAmountPaid('');
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
      setIsDebt(false);
      setDebtPaidAmount('');
      setSubmitting(false);
      return;
    }

    try {
      let res;
      if (editOrderId) {
        res = await api.put(`/pos/orders/${editOrderId}`, salePayload);
        if (navigate) navigate('/cashier/pos', { replace: true });
      } else {
        res = await api.post('/pos/sell', salePayload);
      }
      const emp = employees.find(e => e._id === selectedEmployee);
      setCompletedOrder({ ...res.data.order, _employeeName: emp?.name || '', showDiscountInInvoice });
      setCart([]);
      setDiscount(0);
      setDiscountType('amount');
      setAmountPaid('');
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
      setIsDebt(false);
      setDebtPaidAmount('');
    } catch (err) {
      if (editOrderId) {
        const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'فشل تعديل الفاتورة';
        showToast(errMsg, 'error');
        return;
      }

      if (err.response) {
        const errMsg = err.response?.data?.message || err.response?.data?.error || 'فشلت عملية البيع';
        showToast(errMsg, 'error');
        return;
      }

      const offlineId = `OFFLINE-${Date.now()}`;
      const emp = employees.find(e => e._id === selectedEmployee);

      const fakeOrder = {
        _id: offlineId,
        items: salePayload.items,
        totalAmount: totalAfterDiscount,
        discount: salePayload.discount,
        paymentMethod: salePayload.paymentMethod,
        notes: salePayload.notes || '',
        createdAt: salePayload.createdAt,
        _employeeName: emp?.name || '',
        isOfflineSaved: true
      };

      saveOfflineSales([...offlineSales, { id: offlineId, payload: salePayload }]);
      setCompletedOrder(fakeOrder);
      showToast('تم حفظ الفاتورة محلياً لعدم القدرة على الوصول للسيرفر', 'error');

      setCart([]);
      setDiscount(0);
      setDiscountType('amount');
      setAmountPaid('');
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
      setIsDebt(false);
      setDebtPaidAmount('');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    cart,
    setCart,
    paymentMethod,
    setPaymentMethod,
    amountPaid,
    setAmountPaid,
    discount,
    setDiscount,
    discountType,
    setDiscountType,
    showDiscountInInvoice,
    setShowDiscountInInvoice,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    notes,
    setNotes,
    submitting,
    completedOrder,
    setCompletedOrder,
    editingPriceKey,
    setEditingPriceKey,
    toasts,
    showToast,
    isDebt,
    setIsDebt,
    debtPaidAmount,
    setDebtPaidAmount,
    matchedCustomer,
    employees,
    selectedEmployee,
    setSelectedEmployee,
    heldCarts,
    handleHoldCart,
    handleResumeCart,
    handleDeleteHeldCart,
    offlineSales,
    isOnline,
    syncing,
    handleSyncOfflineSales,
    addToCart,
    updateQty,
    removeItem,
    rawTotal,
    discountableTotal,
    discountAmount,
    totalAfterDiscount,
    change,
    handleCheckout
  };
}
