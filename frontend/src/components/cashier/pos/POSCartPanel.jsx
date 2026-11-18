import React from 'react';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const getProductIcon = () => (
  <svg className="w-5 h-5 text-burgundy/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

export default function POSCartPanel({
  cart = [],
  setCart,
  updateQty,
  removeItem,
  editingPriceKey,
  setEditingPriceKey,
  rawTotal = 0,
  discountableTotal = 0,
  discountAmount = 0,
  totalAfterDiscount = 0,
  change = 0,
  discount = 0,
  setDiscount,
  discountType = 'amount',
  setDiscountType,
  showDiscountInInvoice = true,
  setShowDiscountInInvoice,
  customerName = '',
  setCustomerName,
  customerPhone = '',
  setCustomerPhone,
  matchedCustomer = null,
  employees = [],
  selectedEmployee = '',
  setSelectedEmployee,
  notes = '',
  setNotes,
  paymentMethod = 'Cash',
  setPaymentMethod,
  isDebt = false,
  setIsDebt,
  debtPaidAmount = '',
  setDebtPaidAmount,
  amountPaid = '',
  setAmountPaid,
  heldCarts = [],
  handleHoldCart,
  onOpenHeldModal,
  onClearCartClick,
  handleCheckout,
  submitting = false,
  editOrderId = null
}) {
  return (
    <div className="w-[360px] flex-shrink-0 flex flex-col bg-white border-r border-burgundy/10 shadow-xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-burgundy/10 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-burgundy/40 uppercase tracking-widest">الفاتورة الحالية</p>
          <h2 className="text-lg font-bold text-burgundy flex items-center gap-2">
            <span>سلة المشتريات</span>
            <button
              type="button"
              onClick={onOpenHeldModal}
              className="text-[10px] bg-burgundy/5 text-burgundy hover:bg-burgundy/10 px-2 py-0.5 rounded-full transition font-semibold"
            >
              {heldCarts.length}
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
              تعليق
            </button>
          )}
          {cart.length > 0 && (
            <button
              onClick={onClearCartClick}
              className="text-[11px] text-burgundy/40 hover:text-red-500 transition px-2 py-1 rounded-lg hover:bg-red-50 font-bold"
            >
              مسح
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-3">
            <div className="text-5xl opacity-20">🛒</div>
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
                      getProductIcon()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-burgundy leading-tight truncate">{item.name}</p>
                    <p className="text-xs text-burgundy/45 mt-0.5">
                      {item.size && <span>{item.size}</span>}
                      {item.size && item.color && <span> · </span>}
                      {item.color && <span>{item.color}</span>}
                    </p>
                    {/* Inline price edit */}
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
                      <p className="mt-1 text-[10px] text-red-600 bg-red-50 inline-block px-1.5 py-0.5 rounded border border-red-100 font-bold">⚠️ غير مسموح بالخصم</p>
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
                    <button
                      onClick={() => updateQty(item._cartKey, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-burgundy font-bold hover:bg-burgundy/10 transition text-sm"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-burgundy">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item._cartKey, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-burgundy font-bold hover:bg-burgundy/10 transition text-sm"
                    >
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

      {/* Invoice Summary */}
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
                >
                  ج.م
                </button>
                <button
                  type="button"
                  onClick={() => { setDiscountType('percent'); setDiscount(0); }}
                  className={`px-2.5 py-1.5 transition-all ${
                    discountType === 'percent'
                      ? 'bg-burgundy text-white'
                      : 'bg-white text-burgundy/50 hover:bg-burgundy/10'
                  }`}
                >
                  %
                </button>
              </div>
              <div className="flex-1 flex items-center gap-1 bg-[#F7F0EC] rounded-xl border border-burgundy/15 overflow-hidden px-3 py-1.5">
                <input
                  type="number"
                  value={discount || ''}
                  min={0}
                  max={discountType === 'percent' ? 100 : undefined}
                  onChange={e => setDiscount(e.target.value)}
                  placeholder="0"
                  className="flex-1 text-sm text-burgundy bg-transparent outline-none w-16 text-left"
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
              <div className="mt-1 text-[10px]">
                <p className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded border border-red-100 flex items-center justify-between">
                  <span>⚠️ تذكير: بعض المنتجات في الفاتورة غير خاضعة للخصم عادةً</span>
                </p>
              </div>
            )}

            {/* Discount Visibility Toggle in POS */}
            <div className="flex items-center justify-between py-2 px-3 bg-burgundy/5 rounded-xl border border-burgundy/15 mb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-burgundy">
                <input
                  type="checkbox"
                  checked={showDiscountInInvoice}
                  onChange={e => setShowDiscountInInvoice(e.target.checked)}
                  className="w-4 h-4 accent-burgundy rounded cursor-pointer"
                />
                <span>إظهار الخصم في الفاتورة</span>
              </label>
              <span className="text-[10px] text-burgundy/60 font-bold">{showDiscountInInvoice ? 'مفعّل' : 'مخفي'}</span>
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

            {matchedCustomer && (
              <div className="bg-emerald-50 border border-emerald-500/20 text-emerald-900 rounded-2xl p-3.5 space-y-1 text-xs">
                <div className="flex justify-between font-bold">
                  <span>👤 عميل مسجل: {matchedCustomer.name}</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-bold">عضو ولاء</span>
                </div>
                <div className="flex justify-between text-[10px] text-emerald-700 font-bold mt-1.5 pt-1.5 border-t border-emerald-500/5">
                  <span>⭐️ نقاط الولاء المجمعة: {matchedCustomer.points} نقطة</span>
                  {matchedCustomer.debt > 0 && (
                    <span className="text-amber-700 font-extrabold">⚠️ الديون المتبقية: {EGP(matchedCustomer.debt)}</span>
                  )}
                </div>
              </div>
            )}

            {/* Employee & Notes Selector */}
            <div className="grid grid-cols-2 gap-2 border-t border-burgundy/10 pt-3">
              {employees.length > 0 ? (
                <div>
                  <p className="text-[10px] text-burgundy/50 font-bold mb-1">الموظف البائع</p>
                  <select
                    value={selectedEmployee}
                    onChange={e => setSelectedEmployee(e.target.value)}
                    className="w-full text-xs text-burgundy bg-white border border-burgundy/15 rounded-xl px-3 py-2 outline-none focus:border-burgundy"
                  >
                    <option value="">— اختياري —</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className={employees.length > 0 ? "" : "col-span-2"}>
                <p className="text-[10px] text-burgundy/50 font-bold mb-1">ملاحظات الفاتورة</p>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="ملاحظات..."
                  className="w-full text-xs text-burgundy bg-white border border-burgundy/15 rounded-xl px-3 py-2 outline-none focus:border-burgundy"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <p className="text-xs text-burgundy/50 mb-1.5 font-medium">طريقة الدفع</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'Cash', label: '💵 كاش' },
                  { id: 'Instapay', label: '📱 انستا باي' },
                  { id: 'Wallet', label: '👛 محفظة' },
                  { id: 'Debt', label: '⏳ بيع آجل' },
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => {
                      if (method.id === 'Debt') {
                        setIsDebt(true);
                        setPaymentMethod('Cash');
                      } else {
                        setPaymentMethod(method.id);
                      }
                    }}
                    className={`py-2.5 rounded-xl text-[10px] font-bold border-2 transition-all ${
                      (method.id === 'Debt' && isDebt) || (method.id !== 'Debt' && !isDebt && paymentMethod === method.id)
                        ? 'border-burgundy bg-burgundy text-white shadow-md shadow-burgundy/20'
                        : 'border-burgundy/15 text-burgundy hover:border-burgundy/30'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Client Debt Toggle */}
            <div className="bg-[#FAF7F2] border border-amber-500/20 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <span>⏳</span> بيع آجل / تسجيل دين على العميل
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsDebt(!isDebt);
                    setDebtPaidAmount('');
                  }}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isDebt ? 'bg-amber-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isDebt ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              {isDebt && (
                <div className="space-y-2.5 pt-1.5 border-t border-amber-500/10">
                  <div className="flex items-center gap-2 bg-white rounded-xl border border-amber-500/20 px-3 py-2">
                    <label className="text-xs text-amber-800 font-bold whitespace-nowrap">المبلغ المدفوع الآن</label>
                    <input
                      type="number"
                      value={debtPaidAmount}
                      onChange={e => setDebtPaidAmount(e.target.value)}
                      placeholder="0"
                      className="flex-1 text-xs font-bold text-amber-900 bg-transparent outline-none text-left"
                    />
                    <span className="text-xs text-amber-600 font-bold">ج.م</span>
                  </div>
                  <div className="flex justify-between items-center text-xs bg-amber-600/10 text-amber-900 px-3 py-2 rounded-xl border border-amber-600/10">
                    <span className="font-bold">المتبقي (دين على العميل)</span>
                    <span className="font-extrabold text-sm text-amber-700">
                      {EGP(Math.max(0, totalAfterDiscount - Number(debtPaidAmount || 0)))}
                    </span>
                  </div>
                  {(!customerName.trim() || !customerPhone.trim()) && (
                    <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                      ⚠️ يرجى إدخال اسم العميل ورقم هاتفه أعلاه لتسجيل الدين باسمه.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Cash paid + Change */}
            {paymentMethod === 'Cash' && !isDebt && (
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
                editOrderId ? `💾 حفظ التعديلات — ${EGP(totalAfterDiscount)}` : `✓ إتمام البيع — ${EGP(totalAfterDiscount)}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
