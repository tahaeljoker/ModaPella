import React, { useState } from 'react';
import api from '../../../services/api';

export default function RestockModal({ product, onClose, onRestocked }) {
 const [additions, setAdditions] = useState(() => {
 if (product?.variants && product.variants.length > 0) {
 return product.variants.map(v => ({
 size: v.size,
 color: v.color,
 currentStock: v.stock || 0,
 quantity: ''
 }));
 }
 return [];
 });
 const [quantity, setQuantity] = useState('');
 const [costPrice, setCostPrice] = useState(product?.costPrice || '');
 const [supplier, setSupplier] = useState(product?.supplier || '');
 const [notes, setNotes] = useState('');
  const [supplierBillOption, setSupplierBillOption] = useState('none');
  const [supplierInvoiceRef, setSupplierInvoiceRef] = useState('');
 const [submitting, setSubmitting] = useState(false);
 const [error, setError] = useState('');

 const hasVariants = product?.variants && product.variants.length > 0;

 const totalAdded = hasVariants
 ? additions.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0)
 : (Number(quantity) || 0);

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (totalAdded <= 0) {
 setError('يرجى إدخال كمية مضافة واحدة على الأقل أكبر من 0');
 return;
 }
 setSubmitting(true);
 setError('');
 try {
 const payload = {
 additions: hasVariants ? additions.filter(a => Number(a.quantity) > 0).map(a => ({ size: a.size, color: a.color, quantity: Number(a.quantity) })) : [],
 quantity: !hasVariants ? Number(quantity) || 0 : 0,
 costPrice: costPrice ? Number(costPrice) : undefined,
 supplier: supplier ? supplier.trim() : undefined,
        supplierBillOption,
        supplierInvoiceRef: supplierInvoiceRef ? supplierInvoiceRef.trim() : undefined,
        notes: notes.trim()
 };
 await api.post(`/admin/products/${product._id}/restock`, payload);
 onRestocked(`تم تزويد المخزون بنجاح (+${totalAdded} قطعة) للمنتج: ${product.name}`);
 onClose();
 } catch (err) {
 setError(err.response?.data?.message || 'فشل تزويد المخزون');
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
 <div className="w-full max-w-md rounded-[2rem] bg-[#F7F0EC] p-7 shadow-2xl overflow-hidden text-burgundy" onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between pb-3 border-b border-burgundy/10">
 <div>
 <p className="text-[11px] uppercase tracking-widest text-emerald-700 font-extrabold flex items-center gap-1">
 <span>تزويد مخزون / استلام شحنة جديدة</span>
 </p>
 <h3 className="text-xl font-bold mt-1 text-burgundy">{product?.name}</h3>
 <p className="text-xs text-burgundy/60 font-mono mt-0.5">
 {product?.sku ? `كود: ${product.sku} · ` : ''}المخزون الحالي: <strong className={product?.stock === 0 ? 'text-red-600' : 'text-emerald-700'}>{product?.stock || 0} قطعة</strong>
 </p>
 </div>
 <button onClick={onClose} className="rounded-full p-2 text-burgundy/40 hover:bg-burgundy/10 hover:text-burgundy font-bold text-sm"></button>
 </div>

 <form onSubmit={handleSubmit} className="mt-4 space-y-4">
 {hasVariants ? (
 <div className="space-y-2">
 <label className="block text-xs font-bold text-burgundy/80">أدخل الكميات الجديدة الموردة لكل مقاس ولون:</label>
 <div className="max-h-52 overflow-y-auto space-y-2 border border-burgundy/10 rounded-2xl p-3 bg-white shadow-inner">
 {additions.map((item, idx) => (
 <div key={idx} className="flex items-center justify-between gap-3 bg-burgundy/3 p-2.5 rounded-xl border border-burgundy/5">
 <div className="text-xs font-semibold">
 <span className="font-bold">{item.size || 'عادي'}</span>
 {item.color && item.color !== '-' && <span className="text-burgundy/60"> · {item.color}</span>}
 <span className="text-[10px] text-burgundy/40 block mt-0.5">المتاح حالياً: {item.currentStock} قطعة</span>
 </div>
 <div className="flex items-center gap-1.5">
 <span className="text-xs font-extrabold text-emerald-600">+</span>
 <input
 type="number"
 min="0"
 value={item.quantity}
 onChange={e => {
 const val = e.target.value;
 setAdditions(prev => prev.map((a, i) => i === idx ? { ...a, quantity: val } : a));
 }}
 placeholder="0"
 className="w-20 rounded-xl border border-burgundy/20 bg-white px-2 py-1.5 text-center text-xs font-bold outline-none focus:border-burgundy"
 />
 <span className="text-[10px] text-burgundy/50">قطعة</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 ) : (
 <div>
 <label className="mb-1 block text-xs font-bold text-burgundy/80">الكمية الجديدة المستلمة (+)</label>
 <input
 type="number"
 min="1"
 required
 value={quantity}
 onChange={e => setQuantity(e.target.value)}
 placeholder="مثال: 20 أو 50 قطعة"
 className="w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm font-bold text-burgundy outline-none focus:border-burgundy"
 />
 </div>
 )}

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1 block text-[10px] font-semibold text-burgundy/60">سعر التكلفة للدفعة (ج.م)</label>
 <input
 type="number"
 min="0"
 value={costPrice}
 onChange={e => setCostPrice(e.target.value)}
 placeholder="425"
 className="w-full rounded-xl border border-burgundy/20 bg-white px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
 />
 </div>
 <div>
 <label className="mb-1 block text-[10px] font-semibold text-burgundy/60">الشركة الموردة</label>
 <input
 type="text"
 value={supplier}
 onChange={e => setSupplier(e.target.value)}
 placeholder="مكتب كاردن..."
 className="w-full rounded-xl border border-burgundy/20 bg-white px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
 />
 </div>
 </div>

 <div>
 <label className="mb-1 block text-[10px] font-semibold text-burgundy/60">ملاحظات التوريد (اختياري)</label>
 <input
 type="text"
 value={notes}
 onChange={e => setNotes(e.target.value)}
 placeholder="مثال: شحنة مستلمة بتاريخ اليوم، فاتورة رقم..."
 className="w-full rounded-xl border border-burgundy/20 bg-white px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
 />
 </div>

        {/* Supplier Billing Section */}
        <div className="bg-white/80 border border-burgundy/15 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-burgundy flex items-center gap-1.5">
              <span>حسابات المورد والفاتورة:</span>
            </label>
            {supplierBillOption !== 'none' && (
              <span className="text-xs font-extrabold text-burgundy bg-burgundy/10 px-2 py-0.5 rounded-lg">
                إجمالي الفاتورة: {((Number(costPrice) || 0) * totalAdded).toLocaleString('en-US')} ج.م
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'none', label: 'بدون فاتورة مورد' },
              { id: 'credit', label: 'شراء آجل (دين)' },
              { id: 'cash_safe', label: 'شراء كاش من الخزينة' },
              { id: 'cash_personal', label: 'شراء كاش شخصي' }
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
              <label className="block text-[10px] font-semibold text-burgundy/60">رقم الفاتورة / إيصال التوريد (اختياري)</label>
              <input
                type="text"
                value={supplierInvoiceRef}
                onChange={e => setSupplierInvoiceRef(e.target.value)}
                placeholder="مثال: فاتورة توريد #4092"
                className="w-full rounded-xl border border-burgundy/20 bg-white px-3 py-1.5 text-xs text-burgundy outline-none focus:border-burgundy"
              />
              <p className="text-[10px] text-burgundy/50">
                {supplierBillOption === 'credit' && '• سيتم إضافة إجمالي الفاتورة كدين مستحق للمورد في كشف حسابه.'}
                {supplierBillOption === 'cash_safe' && '• سيتم تسجيل الشراء وسداد الدفعة فوراً وخصم المبلغ من خزنة المحل (مصروفات موردين).'}
                {supplierBillOption === 'cash_personal' && '• سيتم تسجيل الفاتورة وسدادها كاش جيب شخصي دون خصم من خزنة المحل.'}
              </p>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200">{error}</p>}

 <div className="flex items-center justify-between pt-3 border-t border-burgundy/10">
 <div>
 <span className="text-xs text-burgundy/60">إجمالي الزيادة: </span>
 <strong className="text-sm text-emerald-600 font-bold">+{totalAdded} قطعة</strong>
 <span className="text-[10px] text-burgundy/40 block mt-0.5">الرصيد الجديد: {(product?.stock || 0) + totalAdded}</span>
 </div>
 <div className="flex gap-2">
 <button
 type="button"
 onClick={onClose}
 className="rounded-full border border-burgundy/20 px-4 py-2 text-xs font-semibold text-burgundy hover:bg-burgundy/10 transition"
 >
 إلغاء
 </button>
 <button
 type="submit"
 disabled={submitting || totalAdded <= 0}
 className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white transition shadow disabled:opacity-50"
 >
 {submitting ? 'جاري الإضافة...' : 'تأكيد التوريد'}
 </button>
 </div>
 </div>
 </form>
 </div>
 </div>
 );
}
