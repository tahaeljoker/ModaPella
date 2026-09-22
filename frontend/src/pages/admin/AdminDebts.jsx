import { useEffect, useState } from 'react';
import api from '../../services/api';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

function AdminDebts() {
 const [debts, setDebts] = useState([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 
 // Selected customer for payment / details
 const [selectedCust, setSelectedCust] = useState(null); // customer object
 const [selectedOrderDetails, setSelectedOrderDetails] = useState(null); // invoice details modal object
 const [payAmount, setPayAmount] = useState('');
 const [payMethod, setPayMethod] = useState('Cash');
 const [payNotes, setPayNotes] = useState('');
 const [submitting, setSubmitting] = useState(false);
 const [successMsg, setSuccessMsg] = useState('');

 // Manual Debt states
 const [manualDebtModal, setManualDebtModal] = useState(false);
 const [manualData, setManualData] = useState({ name: '', phone: '', amount: '', notes: '' });
 const [submittingManual, setSubmittingManual] = useState(false);
 const loadDebts = async () => {
 setLoading(true);
 try {
 const res = await api.get('/cashier/debts');
 setDebts(res.data);
 } catch (e) {
 console.error('Failed to load customer debts:', e);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadDebts();
 }, []);

  const handleOpenPay = (cust) => {
    setSelectedCust(cust);
    setPayAmount(Math.round((cust.totalDebt || 0) * 100) / 100); // default to full payment
    setPayNotes('');
    setSuccessMsg('');
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!selectedCust || !payAmount || Number(payAmount) <= 0) return;
    setSubmitting(true);
    try {
      const res = await api.post('/cashier/debts/pay', {
        customerPhone: selectedCust.phone,
        customerName: selectedCust.name,
        amount: Math.round(Number(payAmount) * 100) / 100,
        paymentMethod: payMethod,
        notes: payNotes
      });
 setSuccessMsg(` تم تسجيل السداد بنجاح! المبلغ المدفوع: ${EGP(payAmount)}`);
 setTimeout(() => {
 setSelectedCust(null);
 setSuccessMsg('');
 loadDebts();
 }, 2000);
 } catch (err) {
 console.error('Failed to record debt payment:', err);
 alert('فشل تسجيل السداد: ' + (err.response?.data?.message || err.message));
 } finally {
 setSubmitting(false);
 }
 };

 const handleManualDebtSubmit = async (e) => {
 e.preventDefault();
 if (!manualData.phone || !manualData.amount) return;
 setSubmittingManual(true);
 try {
 await api.post('/cashier/debts/manual', {
 customerName: manualData.name,
 customerPhone: manualData.phone,
 amount: Number(manualData.amount),
 notes: manualData.notes
 });
 setManualDebtModal(false);
 setManualData({ name: '', phone: '', amount: '', notes: '' });
 loadDebts();
 alert('تم تسجيل الدين بنجاح!');
 } catch (err) {
 console.error('Failed to add manual debt:', err);
 alert('فشل تسجيل الدين: ' + (err.response?.data?.message || err.message));
 } finally {
 setSubmittingManual(false);
 }
 };

 const filtered = debts.filter(d => {
 const searchLower = search.toLowerCase();
 return (
 d.name.toLowerCase().includes(searchLower) ||
 d.phone.toLowerCase().includes(searchLower)
 );
 });

 return (
 <div className="space-y-6 text-burgundy" dir="rtl">
 {/* Header */}
 <div className="flex flex-wrap justify-between items-start gap-4">
 <div>
 <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">إدارة الحسابات</p>
 <h2 className="text-2xl font-bold"> ديون وحسابات العملاء (البيع الآجل)</h2>
 <p className="text-sm text-burgundy/50 mt-0.5">متابعة المبالغ المتبقية على العملاء وإجراء عمليات التحصيل والسداد</p>
 </div>
 <button
 onClick={() => setManualDebtModal(true)}
 className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-sm transition flex items-center gap-2 text-sm"
 >
 <span></span> تسجيل دين يدوي
 </button>
 </div>

 {/* Overview Cards */}
 <div className="grid gap-4 sm:grid-cols-3">
 <div className="rounded-[1.75rem] border border-amber-500/20 bg-amber-50/30 p-6 shadow-sm">
 <p className="text-sm font-medium text-amber-800">إجمالي الديون المعلقة</p>
 <p className="mt-2 text-3xl font-extrabold text-amber-700">
 {EGP(debts.reduce((sum, d) => sum + d.totalDebt, 0))}
 </p>
 <p className="mt-1 text-xs text-amber-600/70 font-semibold">ذمم مالية للتحصيل</p>
 </div>
 <div className="rounded-[1.75rem] border border-burgundy/10 bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-burgundy/60">عدد العملاء المدينين</p>
 <p className="mt-2 text-3xl font-bold text-burgundy">{debts.length}</p>
 <p className="mt-1 text-xs text-burgundy/40 font-semibold">عميل نشط بالبيع الآجل</p>
 </div>
 <div className="rounded-[1.75rem] border border-burgundy/10 bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-burgundy/60">الفواتير غير المسددة</p>
 <p className="mt-2 text-3xl font-bold text-burgundy">
 {debts.reduce((sum, d) => sum + d.ordersCount, 0)}
 </p>
 <p className="mt-1 text-xs text-burgundy/40 font-semibold">فاتورة بحاجة لتسوية</p>
 </div>
 </div>

 {/* Search and Filters */}
 <div className="bg-white p-4 rounded-2xl border border-burgundy/10 shadow-sm flex items-center gap-3">
 <input
 type="text"
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder=" ابحث باسم العميل أو رقم الهاتف..."
 className="flex-1 rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy"
 />
 <button
 onClick={loadDebts}
 className="rounded-xl border border-burgundy/20 px-4 py-2.5 text-xs font-bold text-burgundy transition hover:bg-burgundy hover:text-white"
 >
 تحديث
 </button>
 </div>

 {/* Grid of Debt Cards */}
 {loading ? (
 <div className="flex h-48 items-center justify-center">
 <div className="h-10 w-10 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
 </div>
 ) : filtered.length === 0 ? (
 <div className="rounded-[2rem] border border-burgundy/10 bg-white py-16 text-center">
 <p className="text-4xl mb-3"></p>
 <p className="text-sm text-burgundy/40 font-bold">ممتاز! لا توجد أي ديون مستحقة على العملاء حالياً</p>
 </div>
 ) : (
 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
 {filtered.map((cust, idx) => (
 <div key={idx} className="rounded-2xl border border-burgundy/10 bg-white p-5 shadow-sm space-y-4 hover:shadow-md transition">
 <div className="flex justify-between items-start">
 <div>
 <h4 className="font-bold text-base text-burgundy">{cust.name}</h4>
 <p className="text-xs text-burgundy/50 font-mono mt-0.5">{cust.phone}</p>
 </div>
 <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
 {cust.ordersCount} فواتير آجل
 </span>
 </div>

 <div className="flex justify-between items-center bg-[#F7F0EC]/30 p-3 rounded-xl border border-burgundy/5">
 <span className="text-xs text-burgundy/50 font-medium">الدين المستحق:</span>
 <span className="font-extrabold text-base text-amber-700">{EGP(cust.totalDebt)}</span>
 </div>

 <div className="text-[10px] text-burgundy/40 font-semibold flex justify-between">
 <span>آخر حركة شراء:</span>
 <span>{new Date(cust.lastActivity).toLocaleDateString('ar-EG-u-nu-latn')}</span>
 </div>

  {/* Debt Invoices List with clickable details */}
  <div className="space-y-1.5 pt-2 border-t border-burgundy/5">
    <div className="flex justify-between items-center text-[11px] font-bold text-burgundy/70">
      <span>الفواتير الآجلة ({cust.orders?.length || cust.ordersCount}):</span>
    </div>
    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
      {cust.orders?.map((ord, oIdx) => (
        <div
          key={oIdx}
          onClick={() => setSelectedOrderDetails({ ...ord, customerName: cust.name, customerPhone: cust.phone, custRef: cust })}
          className="group flex items-center justify-between bg-[#F7F0EC]/40 hover:bg-amber-50/80 p-2 rounded-xl border border-burgundy/5 hover:border-amber-300 transition cursor-pointer"
          title="اضغط لعرض تفاصيل الفاتورة كاملة"
        >
          <div className="min-w-0 flex-1 ml-2">
            <p className="font-bold text-xs text-burgundy group-hover:text-amber-900 truncate">
              {ord.isManual ? 'دين مسجل يدوياً' : `فاتورة #${ord._id.toString().slice(-6).toUpperCase()}`}
            </p>
            <p className="text-[10px] text-burgundy/50">
              {new Date(ord.createdAt).toLocaleDateString('ar-EG-u-nu-latn')}
            </p>
          </div>
          <div className="text-left flex items-center gap-1.5">
            <span className="font-extrabold text-xs text-amber-700 whitespace-nowrap">{EGP(ord.debtAmount)}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOrderDetails({ ...ord, customerName: cust.name, customerPhone: cust.phone, custRef: cust });
              }}
              className="text-[10px] bg-white border border-burgundy/15 group-hover:border-amber-400 group-hover:bg-amber-100 text-burgundy px-2 py-0.5 rounded-lg font-bold transition shadow-xs whitespace-nowrap"
            >
              تفاصيل الفاتورة 🔍
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>

 <div className="pt-2 border-t border-burgundy/5 flex gap-2">
 <button
 onClick={() => handleOpenPay(cust)}
 className="flex-1 rounded-xl bg-burgundy px-3 py-2 text-xs font-bold text-white transition hover:bg-[#650018] shadow-sm shadow-burgundy/10"
 >
 سداد الديون
 </button>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Pay Debt Modal */}
 {selectedCust && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
 <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
 <div className="bg-burgundy text-white text-center py-5 px-6">
 <p className="text-xs tracking-widest uppercase opacity-70">تسجيل سداد دين</p>
 <h3 className="text-lg font-bold mt-1">{selectedCust.name}</h3>
 <p className="text-xs opacity-60 mt-1 font-mono">{selectedCust.phone}</p>
 </div>

 <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
 {successMsg ? (
 <div className="py-8 text-center space-y-2">
 <p className="text-lg font-bold text-emerald-700">{successMsg}</p>
 <p className="text-xs text-burgundy/50">جاري تحديث البيانات والصفحة...</p>
 </div>
 ) : (
 <form onSubmit={handlePaySubmit} className="space-y-4">
 {/* Debt Info */}
 <div className="flex justify-between items-center bg-amber-50 rounded-xl px-4 py-2.5 border border-amber-100 text-xs">
 <span className="text-amber-800 font-bold">إجمالي الدين المستحق</span>
 <span className="text-sm font-extrabold text-amber-700">{EGP(selectedCust.totalDebt)}</span>
 </div>

  {/* Pay Amount input */}
  <div>
    <div className="flex justify-between items-center mb-1">
      <label className="text-xs font-bold text-burgundy/60">المبلغ المراد سداده</label>
      <button
        type="button"
        onClick={() => setPayAmount(Math.round(selectedCust.totalDebt * 100) / 100)}
        className="text-[11px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
      >
        سداد بالكامل ({EGP(selectedCust.totalDebt)})
      </button>
    </div>
    <div className="flex items-center bg-[#F7F0EC] rounded-xl border border-burgundy/15 px-3 py-2">
      <input
        type="number"
        step="any"
        required
        value={payAmount}
        max={Math.ceil((selectedCust.totalDebt || 0) * 100) / 100}
        min={0.01}
        onChange={e => setPayAmount(e.target.value)}
        className="flex-1 text-sm font-bold text-burgundy bg-transparent outline-none text-left font-mono"
      />
      <span className="text-xs text-burgundy/40 mr-2">ج.م</span>
    </div>
  </div>

 {/* Payment Method */}
 <div>
 <label className="text-xs font-bold text-burgundy/60 block mb-1.5">طريقة الدفع المستلم بها المبلغ</label>
 <div className="grid grid-cols-3 gap-2">
 {[
 { id: 'Cash', label: ' كاش' },
 { id: 'Instapay', label: ' انستا' },
 { id: 'Wallet', label: ' محفظة' }
 ].map(method => (
 <button
 key={method.id}
 type="button"
 onClick={() => setPayMethod(method.id)}
 className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
 payMethod === method.id
 ? 'border-burgundy bg-burgundy text-white'
 : 'border-burgundy/15 text-burgundy hover:border-burgundy/30'
 }`}
 >
 {method.label}
 </button>
 ))}
 </div>
 </div>

 {/* Notes */}
 <div>
 <label className="text-xs font-bold text-burgundy/60 block mb-1">بيان / ملاحظات السداد</label>
 <input
 type="text"
 value={payNotes}
 onChange={e => setPayNotes(e.target.value)}
 placeholder="سداد جزئي، استلام من العميل..."
 className="w-full text-xs text-burgundy bg-white border border-burgundy/15 rounded-xl px-3 py-2 outline-none focus:border-burgundy"
 />
 </div>

 {/* Action Buttons */}
 <div className="flex gap-3 pt-2">
 <button
 type="button"
 onClick={() => setSelectedCust(null)}
 className="flex-1 rounded-xl border border-burgundy/20 py-2.5 text-xs font-bold text-burgundy hover:bg-burgundy/5 transition"
 >
 إلغاء
 </button>
 <button
 type="submit"
 disabled={submitting}
 className="flex-1 rounded-xl bg-[#059669] hover:bg-emerald-700 py-2.5 text-xs font-bold text-white transition shadow-md shadow-emerald-500/10"
 >
 {submitting ? 'جاري الحفظ...' : 'تأكيد السداد'}
 </button>
 </div>
 </form>
 )}

 {/* Invoices List */}
 {!successMsg && selectedCust.orders && (
 <div className="mt-4 pt-4 border-t border-dashed border-burgundy/15 space-y-2">
 <p className="text-xs font-bold text-burgundy/60">تفاصيل الفواتير ذات الديون:</p>
 <div className="max-h-[25vh] overflow-y-auto space-y-2 pr-1">
 {selectedCust.orders.map((order, oIdx) => (
 <div
   key={oIdx}
   onClick={() => setSelectedOrderDetails({ ...order, customerName: selectedCust.name, customerPhone: selectedCust.phone, custRef: selectedCust })}
   className="group bg-slate-50 hover:bg-amber-50/80 border border-slate-200 hover:border-amber-300 rounded-xl p-2.5 text-xs space-y-1.5 cursor-pointer transition"
   title="اضغط لعرض تفاصيل الفاتورة كاملة"
 >
 <div className="flex justify-between font-bold text-burgundy items-center">
 <span>{order.isManual ? ` دين مسجل يدوياً` : `فاتورة #${order._id.slice(-6).toUpperCase()}`}</span>
 <div className="flex items-center gap-1.5">
   <span className="text-amber-700 font-extrabold">{EGP(order.debtAmount)}</span>
   <button
     type="button"
     onClick={(e) => {
       e.stopPropagation();
       setSelectedOrderDetails({ ...order, customerName: selectedCust.name, customerPhone: selectedCust.phone, custRef: selectedCust });
     }}
     className="text-[10px] bg-white border border-burgundy/15 group-hover:border-amber-400 group-hover:bg-amber-100 text-burgundy px-2 py-0.5 rounded-lg font-bold transition shadow-xs whitespace-nowrap"
   >
     تفاصيل الفاتورة 🔍
   </button>
 </div>
 </div>
 {order.isManual && order.notes && (
 <div className="text-[10.5px] text-burgundy/70 bg-amber-50 p-1.5 rounded-md mb-1">
 {order.notes}
 </div>
 )}
 <div className="flex justify-between text-[10px] text-burgundy/40">
 <span>التاريخ: {new Date(order.createdAt).toLocaleDateString('ar-EG-u-nu-latn')}</span>
 {!order.isManual && <span>المدفوع: {EGP(order.amountPaid)} / الإجمالي: {EGP(order.totalAmount)}</span>}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 {/* Add Manual Debt Modal */}
 {manualDebtModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
 <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
 <h3 className="text-xl font-bold text-burgundy mb-2"> تسجيل دين يدوي</h3>
 <p className="text-xs text-burgundy/50 mb-6">سيتم تسجيل الدين على حساب العميل دون الحاجة لإنشاء فاتورة مبيعات جديدة.</p>
 
 <form onSubmit={handleManualDebtSubmit} className="space-y-4">
 <div>
 <label className="text-xs font-bold text-burgundy/60 block mb-1">رقم الهاتف (مطلوب)</label>
 <input
 type="text"
 required
 value={manualData.phone}
 onChange={e => setManualData({ ...manualData, phone: e.target.value })}
 placeholder="010..."
 className="w-full rounded-xl border border-burgundy/20 bg-[#F7F0EC]/50 px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy"
 />
 </div>
 <div>
 <label className="text-xs font-bold text-burgundy/60 block mb-1">اسم العميل (اختياري)</label>
 <input
 type="text"
 value={manualData.name}
 onChange={e => setManualData({ ...manualData, name: e.target.value })}
 placeholder="اسم العميل..."
 className="w-full rounded-xl border border-burgundy/20 bg-[#F7F0EC]/50 px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy"
 />
 </div>
 <div>
 <label className="text-xs font-bold text-burgundy/60 block mb-1">قيمة الدين (مطلوب)</label>
 <input
 type="number"
 required
 min={1}
 value={manualData.amount}
 onChange={e => setManualData({ ...manualData, amount: e.target.value })}
 placeholder="المبلغ بالجنيه..."
 className="w-full rounded-xl border border-burgundy/20 bg-[#F7F0EC]/50 px-4 py-2.5 text-sm font-bold text-amber-700 outline-none focus:border-amber-600"
 />
 </div>
 <div>
 <label className="text-xs font-bold text-burgundy/60 block mb-1">البيان / الملاحظات (سبب الدين)</label>
 <textarea
 rows="2"
 value={manualData.notes}
 onChange={e => setManualData({ ...manualData, notes: e.target.value })}
 placeholder="مثال: باقي حساب من فاتورة قديمة..."
 className="w-full rounded-xl border border-burgundy/20 bg-[#F7F0EC]/50 px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy resize-none"
 />
 </div>

 <div className="flex gap-3 pt-4">
 <button
 type="button"
 onClick={() => setManualDebtModal(false)}
 className="flex-1 rounded-xl border border-burgundy/20 py-3 text-sm font-bold text-burgundy hover:bg-burgundy/5 transition"
 >
 إلغاء
 </button>
 <button
 type="submit"
 disabled={submittingManual}
 className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 py-3 text-sm font-bold text-white transition shadow-md shadow-amber-600/20"
 >
 {submittingManual ? 'جاري الحفظ...' : 'تأكيد التسجيل'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

      {/* Order Details Modal */}
      {selectedOrderDetails && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedOrderDetails(null)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-burgundy/10 text-burgundy animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-burgundy text-white px-6 py-5 flex justify-between items-center">
              <div>
                <span className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  فاتورة بيع آجل
                </span>
                <h3 className="text-lg font-bold mt-1">
                  {selectedOrderDetails.isManual 
                    ? 'تفاصيل الدين اليدوي' 
                    : `فاتورة رقم #${selectedOrderDetails._id.toString().slice(-6).toUpperCase()}`}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedOrderDetails(null)}
                className="text-white/60 hover:text-white text-lg font-bold transition p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 gap-3 bg-[#F7F0EC]/50 p-3.5 rounded-2xl border border-burgundy/10 text-xs">
                <div>
                  <p className="text-[10px] text-burgundy/50 font-bold">اسم العميل:</p>
                  <p className="font-bold text-burgundy mt-0.5">{selectedOrderDetails.customerName || selectedCust?.name || 'عميل غير مسجل'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-burgundy/50 font-bold">رقم الهاتف:</p>
                  <p className="font-bold font-mono text-burgundy mt-0.5">{selectedOrderDetails.customerPhone || selectedCust?.phone || 'بدون هاتف'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-burgundy/50 font-bold">وقت وتاريخ الفاتورة (امتى):</p>
                  <p className="font-bold text-burgundy mt-0.5">
                    {new Date(selectedOrderDetails.createdAt).toLocaleString('ar-EG-u-nu-latn', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-burgundy/50 font-bold">طريقة الدفع الأولية:</p>
                  <p className="font-bold text-burgundy mt-0.5">
                    {selectedOrderDetails.paymentMethod === 'Cash' 
                      ? 'كاش' 
                      : selectedOrderDetails.paymentMethod === 'Instapay' 
                      ? 'إنستاباي / بنك' 
                      : selectedOrderDetails.paymentMethod || 'كاش'}
                  </p>
                </div>
                {selectedOrderDetails.employeeName && (
                  <div className="col-span-2 pt-1 border-t border-burgundy/10">
                    <p className="text-[10px] text-burgundy/50 font-bold">الموظف البائع / الكاشير:</p>
                    <p className="font-bold text-burgundy mt-0.5">{selectedOrderDetails.employeeName}</p>
                  </div>
                )}
              </div>

              {/* Items Table if not manual */}
              {!selectedOrderDetails.isManual && selectedOrderDetails.items?.length > 0 ? (
                <div>
                  <p className="text-xs font-bold text-burgundy/70 mb-2">الأصناف والمنتجات المشتراة:</p>
                  <div className="border border-burgundy/10 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#F7F0EC] text-burgundy/70 text-[11px] font-bold border-b border-burgundy/10">
                        <tr>
                          <th className="py-2 px-3">المنتج</th>
                          <th className="py-2 px-2 text-center">المقاس / اللون</th>
                          <th className="py-2 px-2 text-center">الكمية</th>
                          <th className="py-2 px-3 text-left">السعر</th>
                          <th className="py-2 px-3 text-left">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-burgundy/5">
                        {selectedOrderDetails.items.map((it, iIdx) => (
                          <tr key={iIdx} className="hover:bg-burgundy/2">
                            <td className="py-2.5 px-3 font-semibold">{it.name}</td>
                            <td className="py-2.5 px-2 text-center text-burgundy/60 text-[11px]">
                              {[it.size, it.color].filter(Boolean).join(' - ') || '—'}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold">{it.quantity}</td>
                            <td className="py-2.5 px-3 text-left font-mono">{EGP(it.price)}</td>
                            <td className="py-2.5 px-3 text-left font-bold font-mono">{EGP((it.price || 0) * (it.quantity || 1))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : selectedOrderDetails.isManual ? (
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-1.5">
                  <p className="font-bold text-amber-900"> دين مسجل يدوياً في الخزينة</p>
                  <p className="text-amber-800/80">
                    {selectedOrderDetails.notes || 'لا يوجد سبب أو بيان مسجل لهذا الدين.'}
                  </p>
                </div>
              ) : null}

              {/* Notes if regular invoice */}
              {!selectedOrderDetails.isManual && selectedOrderDetails.notes && (
                <div className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-3 text-xs">
                  <p className="font-bold text-blue-900 text-[11px] mb-0.5">ملاحظات الفاتورة:</p>
                  <p className="text-blue-800">{selectedOrderDetails.notes}</p>
                </div>
              )}

              {/* Financial Summary */}
              <div className="bg-amber-50/40 rounded-2xl border border-amber-200/60 p-4 space-y-2">
                <div className="flex justify-between text-xs text-burgundy/70">
                  <span>إجمالي قيمة الفاتورة:</span>
                  <span className="font-bold font-mono">{EGP(selectedOrderDetails.totalAmount)}</span>
                </div>
                {selectedOrderDetails.discount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-700">
                    <span>خصم مطبق:</span>
                    <span className="font-bold font-mono">-{EGP(selectedOrderDetails.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-burgundy/70">
                  <span>المبلغ المسدد مقدماً (المدفوع):</span>
                  <span className="font-bold font-mono text-emerald-700">{EGP(selectedOrderDetails.amountPaid)}</span>
                </div>
                <div className="pt-2 border-t border-amber-200/80 flex justify-between items-center text-sm">
                  <span className="font-extrabold text-amber-900">المبلغ الآجل المتبقي (الدين المستحق):</span>
                  <span className="font-black text-lg text-amber-700 font-mono bg-white px-3 py-1 rounded-xl border border-amber-300 shadow-xs">
                    {EGP(selectedOrderDetails.debtAmount)}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderDetails(null)}
                  className="flex-1 rounded-xl border border-burgundy/20 py-2.5 text-xs font-bold text-burgundy hover:bg-burgundy/5 transition"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const custToPay = selectedOrderDetails.custRef || debts.find(d => d.phone === selectedOrderDetails.customerPhone || d.name === selectedOrderDetails.customerName);
                    if (custToPay) {
                      const debtAmt = selectedOrderDetails.debtAmount;
                      setSelectedOrderDetails(null);
                      handleOpenPay(custToPay);
                      if (debtAmt) setPayAmount(Math.round(debtAmt * 100) / 100);
                    }
                  }}
                  className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 py-2.5 text-xs font-bold text-white transition shadow-sm"
                >
                  سداد هذا الدين 💰
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
 </div>
 );
}

export default AdminDebts;
