import { useEffect, useState } from 'react';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';
import { exportToCSV } from '../../services/export';

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;

const EXPENSE_CATEGORIES = ['ضيافة', 'كهرباء ومياه', 'نظافة', 'نولون شحن', 'دفع لمورد', 'أخرى'];

function CashierSafe() {
  const [data, setData] = useState({
    transactions: [],
    summary: { cashDrawer: 0, instapayTotal: 0, expenses: 0, expectedCash: 0 },
    todaySummary: { cashSales: 0, instapaySales: 0, expenses: 0, netCashInSafe: 0 },
    recentShifts: []
  });
  const [loading, setLoading] = useState(true);

  const [modalType, setModalType] = useState(null); // 'EXPENSE' | 'DEPOSIT' | 'CLOSE' | 'OPEN'
  const [form, setForm] = useState({ amount: '', category: 'ضيافة', description: '' });
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);

  const loadSafe = () => {
    setLoading(true);
    api.get('/cashier/safe')
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSafe();
    // load current shift info
    api.get('/cashier/shift/current').then(r => setCurrentShift(r.data.shift)).catch(() => setCurrentShift(null));
  }, []);

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'EXPENSE') {
        await api.post('/cashier/safe/transaction', { ...form, type: 'OUT' });
      } else if (modalType === 'DEPOSIT') {
        await api.post('/cashier/safe/transaction', { ...form, type: 'IN', category: 'Deposit' });
      } else if (modalType === 'TRANSFER') {
        await api.post('/cashier/safe/transaction', {
          amount: Number(form.amount),
          type: 'OUT',
          category: 'Safe Transfer',
          description: form.description || 'تحويل نقدية إلى الخزينة الرئيسية'
        });
      } else if (modalType === 'CLOSE') {
        // ensure there is a shift open
        if (!currentShift) return alert('لا يوجد وردية مفتوحة. افتح وردية أولاً.');
        const counted = Number(form.amount || data.summary.cashDrawer || 0);
        await api.post('/cashier/shift/close', { countedCash: counted });
        // after close, clear current shift
        setCurrentShift(null);
        setForm({ amount: '', category: 'ضيافة', description: '' });
      } else if (modalType === 'OPEN') {
        const opening = Number(form.amount || 0);
        const res = await api.post('/cashier/shift/open', { openingBalance: opening });
        setCurrentShift(res.data);
      }
      setModalType(null);
      setForm({ amount: '', category: 'ضيافة', description: '' });
      loadSafe();
    } catch (error) {
      alert(error.response?.data?.message || 'حدث خطأ');
    }
  };

  const handleExport = () => {
    const headers = ['الوقت', 'نوع العملية', 'التصنيف', 'طريقة الدفع', 'المبلغ', 'التفاصيل'];
    const rows = data.transactions.map(t => [
      new Date(t.createdAt).toLocaleTimeString('ar-EG'),
      t.type === 'IN' ? 'داخل' : 'خارج',
      t.category === 'Sale' ? 'مبيعات' : t.category === 'Refund' ? 'مرتجع' : t.category === 'Deposit' ? 'إيداع' : t.category === 'Safe Transfer' ? 'تحويل للخزينة' : t.category === 'Expense' ? 'مصروف' : 'أخرى',
      t.paymentMethod === 'Cash' ? 'كاش' : 'انستا باي',
      t.amount,
      t.description || ''
    ]);
    exportToCSV(`حركات_الخزنة_${new Date().toLocaleDateString('ar-EG')}`, headers, rows);
  };

  const handlePrintZReport = (shift) => {
    const shiftData = shift || currentShift;
    const now = new Date().toLocaleString('ar-EG');
    const openTime = shiftData?.createdAt ? new Date(shiftData.createdAt).toLocaleString('ar-EG') : '—';
    const cashSales = data.todaySummary?.cashSales || 0;
    const instapaySales = data.todaySummary?.instapaySales || 0;
    const expenses = data.todaySummary?.expenses || 0;
    const openingBal = shiftData?.openingBalance || 0;
    const expectedCash = shiftData?.expectedCash ?? data.summary?.cashDrawer ?? 0;
    const countedCash = shiftData?.closingBalance ?? expectedCash;
    const variance = countedCash - expectedCash;

    const printDiv = document.createElement('div');
    printDiv.id = 'invoice-print-root';
    printDiv.innerHTML = `
      <div class="invoice-print-header">
        <h1>ModaPella</h1>
        <p>تقرير تقفيل الوردية (Z-Report)</p>
        <p>${now}</p>
      </div>
      <table class="invoice-print-table" style="font-size:12px">
        <tbody>
          <tr><td>وقت الفتح</td><td style="text-align:left">${openTime}</td></tr>
          <tr><td>وقت الإغلاق</td><td style="text-align:left">${now}</td></tr>
          <tr><td colspan="2" style="padding-top:8px;font-weight:bold;background:#f7f0ec">الإيرادات</td></tr>
          <tr><td>مبيعات كاش 💵</td><td style="text-align:left;color:#15803d;font-weight:bold">${Number(cashSales).toLocaleString('ar-EG')} ج.م</td></tr>
          <tr><td>مبيعات انستا باي 📱</td><td style="text-align:left;color:#2563eb;font-weight:bold">${Number(instapaySales).toLocaleString('ar-EG')} ج.م</td></tr>
          <tr><td>إجمالي المبيعات</td><td style="text-align:left;font-weight:bold">${Number(cashSales + instapaySales).toLocaleString('ar-EG')} ج.م</td></tr>
          <tr><td colspan="2" style="padding-top:8px;font-weight:bold;background:#f7f0ec">الدرج النقدي</td></tr>
          <tr><td>رصيد الافتتاح</td><td style="text-align:left">${Number(openingBal).toLocaleString('ar-EG')} ج.م</td></tr>
          <tr><td>مصروفات كاش</td><td style="text-align:left;color:#dc2626">- ${Number(expenses).toLocaleString('ar-EG')} ج.م</td></tr>
          <tr><td>الكاش المتوقع في الدرج</td><td style="text-align:left;font-weight:bold">${Number(expectedCash).toLocaleString('ar-EG')} ج.م</td></tr>
          <tr><td>الكاش الفعلي (عند العد)</td><td style="text-align:left;font-weight:bold">${Number(countedCash).toLocaleString('ar-EG')} ج.م</td></tr>
          <tr><td>الفرق (عجز/زيادة)</td><td style="text-align:left;font-weight:bold;color:${variance === 0 ? '#15803d' : variance > 0 ? '#d97706' : '#dc2626'}">${variance >= 0 ? '+' : ''}${Number(variance).toLocaleString('ar-EG')} ج.م</td></tr>
        </tbody>
      </table>
      <div class="invoice-print-footer">
        ModaPella — تقرير تقفيل الوردية<br/>
        ${now}
      </div>
    `;
    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-6 text-burgundy">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/50">كاشير</p>
          <h2 className="text-2xl font-bold">الخزنة وتتبع الأموال</h2>
        </div>
        <div className="flex items-center gap-3">
          {data.transactions.length > 0 && (
            <button
              onClick={handleExport}
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 shadow"
            >
              📥 تصدير حركات الخزنة
            </button>
          )}
          {currentShift ? (
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                🟢 وردية مفتوحة
              </div>
              <button onClick={() => handlePrintZReport(currentShift)} className="rounded-full border border-burgundy/30 bg-white px-4 py-2 text-sm font-bold text-burgundy transition hover:bg-burgundy/10">
                🖨️ طباعة Z-Report
              </button>
              <button onClick={() => setIsCloseConfirmOpen(true)} className="rounded-full bg-burgundy px-6 py-2 text-sm font-bold text-white transition hover:bg-[#650018]">
                🔒 إغلاق الوردية
              </button>
            </div>
          ) : (
            <button onClick={() => setModalType('OPEN')} className="rounded-full bg-emerald-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-emerald-700">
              🟢 فتح وردية
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-[2rem] border border-emerald-600/20 bg-emerald-50 p-6">
              <p className="text-sm font-bold text-emerald-800/60">💵 رصيد الدرج (الكاش)</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">{EGP(data.summary.cashDrawer)}</p>
              <p className="mt-2 text-xs text-emerald-700/60">هذا هو المبلغ المفترض تواجده في الدرج الآن</p>
            </div>
            <div className="rounded-[2rem] border border-blue-600/20 bg-blue-50 p-6">
              <p className="text-sm font-bold text-blue-800/60">💳 إيرادات البنك (فيزا / انستا باي)</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">{EGP(data.summary.instapayTotal)}</p>
              <p className="mt-2 text-xs text-blue-700/60">أموال إلكترونية (لا تؤثر على الدرج)</p>
            </div>
            <div className="rounded-[2rem] border border-burgundy/20 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-burgundy/60">💸 إجمالي المصروفات (كاش)</p>
              <p className="mt-2 text-3xl font-bold text-burgundy">{EGP(data.summary.expenses)}</p>
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button onClick={() => setModalType('EXPENSE')} className="flex-1 rounded-xl bg-burgundy/10 py-2 text-xs font-bold text-burgundy transition hover:bg-burgundy/20">
                    سحب مصروف -
                  </button>
                  <button onClick={() => setModalType('DEPOSIT')} className="flex-1 rounded-xl bg-emerald-600/10 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-600/20">
                    إيداع نقدية +
                  </button>
                </div>
                <button onClick={() => setModalType('TRANSFER')} className="w-full rounded-xl bg-indigo-50 border border-indigo-100 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100/50">
                  💸 تحويل نقدية إلى الخزينة الرئيسية
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="rounded-[1.5rem] border border-burgundy/10 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-burgundy/60">مبيعات اليوم (كاش)</p>
              <p className="mt-2 text-xl font-bold text-burgundy">{EGP(data.todaySummary.cashSales)}</p>
            </div>
            <div className="rounded-[1.5rem] border border-burgundy/10 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-burgundy/60">مبيعات اليوم (الكتروني)</p>
              <p className="mt-2 text-xl font-bold text-burgundy">{EGP(data.todaySummary.instapaySales)}</p>
            </div>
            <div className="rounded-[1.5rem] border border-burgundy/10 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-burgundy/60">مصروفات اليوم</p>
              <p className="mt-2 text-xl font-bold text-red-600">{EGP(data.todaySummary.expenses)}</p>
            </div>
            <div className="rounded-[1.5rem] border border-burgundy/10 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-burgundy/60">صافي الكاش المتوقع</p>
              <p className="mt-2 text-xl font-bold text-emerald-700">{EGP(data.todaySummary.netCashInSafe)}</p>
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-[2rem] border border-burgundy/10 bg-white flex flex-col">
            <div className="border-b border-burgundy/8 p-5">
              <h3 className="font-bold">آخر الورديات</h3>
            </div>
            <div className="overflow-auto p-5">
              {data.recentShifts.length === 0 ? (
                <p className="text-sm text-burgundy/40">لا توجد ورديات سابقة</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {data.recentShifts.map((shift) => {
                    const variance = Number(shift.variance || 0);
                    return (
                      <div key={shift._id} className="rounded-[1.25rem] border border-burgundy/10 bg-burgundy/5 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-burgundy">{shift.user?.name || 'غير معروف'}</p>
                          <div className="flex items-center gap-1.5">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${variance === 0 ? 'bg-emerald-100 text-emerald-700' : variance > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {variance === 0 ? 'ممتاز' : variance > 0 ? 'زيادة' : 'نقص'}
                            </span>
                            <button
                              onClick={() => handlePrintZReport(shift)}
                              title="طباعة تقرير الوردية"
                              className="rounded-full bg-white border border-burgundy/15 px-2 py-1 text-[10px] text-burgundy hover:bg-burgundy/10 transition"
                            >
                              🖨️
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1 text-xs text-burgundy/70">
                          <div className="flex justify-between"><span>افتتاح</span><span>{EGP(shift.openingBalance || 0)}</span></div>
                          <div className="flex justify-between"><span>إغلاق</span><span>{EGP(shift.closingBalance || 0)}</span></div>
                          <div className="flex justify-between"><span>متوقع</span><span>{EGP(shift.expectedCash || 0)}</span></div>
                          <div className="flex justify-between font-bold"><span>الفرق</span><span>{EGP(variance)}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="flex-1 overflow-hidden rounded-[2rem] border border-burgundy/10 bg-white flex flex-col">
            <div className="border-b border-burgundy/8 p-5">
              <h3 className="font-bold">حركات اليوم</h3>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b-2 border-burgundy/5 text-burgundy/50">
                    <th className="pb-3 font-semibold">الوقت</th>
                    <th className="pb-3 font-semibold">نوع العملية</th>
                    <th className="pb-3 font-semibold">التصنيف</th>
                    <th className="pb-3 font-semibold">طريقة الدفع</th>
                    <th className="pb-3 font-semibold">المبلغ</th>
                    <th className="pb-3 font-semibold">التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.length === 0 ? (
                    <tr><td colSpan="6" className="py-8 text-center text-burgundy/40">لا توجد حركات حتى الآن</td></tr>
                  ) : (
                    data.transactions.map((t) => (
                      <tr key={t._id} className="border-b border-burgundy/5 last:border-0 hover:bg-burgundy/5 transition">
                        <td className="py-4 font-mono text-xs">{new Date(t.createdAt).toLocaleTimeString('ar-EG')}</td>
                        <td className="py-4">
                          <span className={`rounded-full px-2 py-1 text-xs font-bold ${t.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {t.type === 'IN' ? 'داخل' : 'خارج'}
                          </span>
                        </td>
                        <td className="py-4">{t.category === 'Sale' ? 'مبيعات' : t.category === 'Refund' ? 'مرتجع' : t.category === 'Deposit' ? 'إيداع' : t.category === 'Safe Transfer' ? 'تحويل للخزينة' : t.category === 'Expense' ? 'مصروف' : 'أخرى'}</td>
                        <td className="py-4">{t.paymentMethod}</td>
                        <td className={`py-4 font-bold ${t.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>{EGP(t.amount)}</td>
                        <td className="py-4 text-xs text-burgundy/70">{t.description || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold">
              {modalType === 'EXPENSE' ? 'سحب مصروف' : modalType === 'DEPOSIT' ? 'إيداع نقدية' : modalType === 'TRANSFER' ? 'تحويل نقدية للخزينة الرئيسية' : modalType === 'OPEN' ? 'فتح وردية' : 'تقفيل الوردية'}
            </h3>
            
            {modalType === 'CLOSE' ? (
              <div className="mb-6">
                <p className="text-sm text-burgundy/70">أدخل المبلغ الذي تم عدّه فعلياً داخل الدرج، أو اضبط القيمة قبل التأكيد.</p>
                <div className="mt-4 rounded-xl bg-burgundy/5 p-4 text-center">
                  <p className="text-xs text-burgundy/60">المبلغ المتوقع في الدرج</p>
                  <p className="text-2xl font-bold">{EGP(currentShift?.expectedCash ?? data.summary.expectedCash)}</p>
                  <div className="mt-4">
                    <input
                      type="number"
                      min="0"
                      value={form.amount || currentShift?.expectedCash || data.summary.expectedCash}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full rounded-xl border border-burgundy/20 px-4 py-2 text-center"
                    />
                    <p className="mt-2 text-xs text-burgundy/60">المبلغ الذي ستؤكده عند تسليم الخزنة</p>
                  </div>
                  <div className="mt-3 rounded-xl border border-burgundy/10 bg-white px-3 py-2 text-sm">
                    <div className="flex items-center justify-between text-burgundy/70">
                      <span>الفرق</span>
                      <span className={`font-bold ${Number(form.amount || 0) - Number(currentShift?.expectedCash || data.summary.expectedCash) === 0 ? 'text-emerald-600' : Number(form.amount || 0) - Number(currentShift?.expectedCash || data.summary.expectedCash) > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                        {EGP((Number(form.amount || 0) - Number(currentShift?.expectedCash || data.summary.expectedCash))) }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form id="transaction-form" onSubmit={handleTransactionSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">{modalType === 'OPEN' ? 'رصيد افتتاحي (اختياري)' : 'المبلغ (كاش) *'}</label>
                  <input type="number" required min="1" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full rounded-xl border border-burgundy/20 px-4 py-2 outline-none focus:border-burgundy" />
                </div>
                {modalType === 'EXPENSE' && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">نوع المصروف *</label>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full rounded-xl border border-burgundy/20 px-4 py-2 outline-none focus:border-burgundy bg-white">
                      {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">السبب / التفاصيل</label>
                  <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder={modalType === 'EXPENSE' ? 'مثال: فاتورة كهرباء شهر مايو' : modalType === 'TRANSFER' ? 'مثال: تحويل نقدية نهاية الأسبوع للخزنة الرئيسية' : 'مثال: فكة للدرج'} className="w-full rounded-xl border border-burgundy/20 px-4 py-2 outline-none focus:border-burgundy" />
                </div>
              </form>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={() => setModalType(null)} className="flex-1 rounded-full border border-burgundy/20 py-2.5 text-sm font-bold transition hover:bg-burgundy/5">
                إلغاء
              </button>
              {modalType === 'CLOSE' ? (
                <button onClick={handleTransactionSubmit} className="flex-1 rounded-full bg-burgundy py-2.5 text-sm font-bold text-white transition hover:bg-[#650018]">
                  تأكيد التقفيل
                </button>
              ) : (
                <button form="transaction-form" type="submit" className="flex-1 rounded-full bg-burgundy py-2.5 text-sm font-bold text-white transition hover:bg-[#650018]">
                  حفظ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Close Shift Confirmation Modal */}
      <ConfirmModal
        isOpen={isCloseConfirmOpen}
        title="تأكيد إغلاق الوردية"
        message="هل أنت متأكد أنك تريد إغلاق الوردية الحالية؟ ستحتاج لعد النقود الفعلية في الدرج لإتمام العملية."
        confirmText="نعم، متابعة الإغلاق"
        onConfirm={() => {
          setIsCloseConfirmOpen(false);
          setModalType('CLOSE');
        }}
        onCancel={() => setIsCloseConfirmOpen(false)}
      />
    </div>
  );
}

export default CashierSafe;
