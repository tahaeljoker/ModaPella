import { useEffect, useState } from 'react';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';
import { exportToCSV } from '../../services/export';
import { Icon } from '../../components/Icon';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const EXPENSE_CATEGORIES = [
  'صرف رواتب',
  'نولون شحن',
  'إيجار',
  'انترنت ومرافق',
  'كهرباء ومياه',
  'صيانة وإصلاحات',
  'نظافة',
  'ضيافة',
  'دفع لمورد',
  'مسحوبات شخصية / جمعية',
  'مسحوبات شخصية',
  'أخرى'
];

const PAYOUT_TYPES = [
  'راتب شهري أساسي',
  'سلفة على الراتب',
  'مكافأة / عمولة مبيعات',
  'حافز إضافي / بدل',
  'مستحقات نهاية خدمة'
];

const SHIPPING_TYPES = [
  'نولون شحن بضاعة واردة (مورد/مصنع)',
  'شحن طلبيات لعملاء (شركة شحن/مندوب)'
];

const getCurrentMonthName = () => {
  return new Date().toLocaleDateString('ar-EG-u-nu-latn', { month: 'long', year: 'numeric' });
};

function CashierSafe() {
  const [data, setData] = useState({
    transactions: [],
    summary: {
      cashDrawer: 0,
      instapayTotal: 0,
      expenses: 0,
      generalExpenses: 0,
      salaries: 0,
      salariesCash: 0,
      salariesInstapay: 0,
      shipping: 0,
      shippingCash: 0,
      shippingInstapay: 0,
      rent: 0,
      rentCash: 0,
      rentInstapay: 0,
      personalWithdrawals: 0,
      expectedCash: 0
    },
    todaySummary: {
      cashSales: 0,
      instapaySales: 0,
      expenses: 0,
      generalExpenses: 0,
      salaries: 0,
      salariesCash: 0,
      salariesInstapay: 0,
      shipping: 0,
      shippingCash: 0,
      shippingInstapay: 0,
      rent: 0,
      rentCash: 0,
      rentInstapay: 0,
      personalWithdrawals: 0,
      netCashInSafe: 0
    },
    recentShifts: []
  });
  const [loading, setLoading] = useState(true);

  // Modal type: 'EXPENSE' | 'DEPOSIT' | 'TRANSFER' | 'CLOSE' | 'OPEN' | 'SALARY' | 'SHIPPING' | 'RENT'
  const [modalType, setModalType] = useState(null);
  const [employees, setEmployees] = useState([]);

  const defaultForm = () => ({
    amount: '',
    category: 'ضيافة',
    paymentMethod: 'Cash',
    description: '',
    // Salary specifics
    employeeId: '',
    employeeName: '',
    payoutType: 'راتب شهري أساسي',
    salaryMonth: getCurrentMonthName(),
    // Shipping specifics
    shippingCompany: '',
    shippingType: 'نولون شحن بضاعة واردة (مورد/مصنع)',
    trackingNumber: '',
    // Rent specifics
    rentPlace: 'إيجار المحل الرئيسي',
    rentMonth: getCurrentMonthName(),
    recipientName: ''
  });

  const [form, setForm] = useState(defaultForm());
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);
  const [reconcileCash, setReconcileCash] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSafe = () => {
    setLoading(true);
    api.get('/cashier/safe')
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadShift = () => {
    api.get('/cashier/shift/current')
      .then(r => setCurrentShift(r.data.shift))
      .catch(() => setCurrentShift(null));
  };

  const loadEmployees = () => {
    api.get('/employees')
      .then(res => setEmployees(res.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadSafe();
    loadShift();
    loadEmployees();
  }, []);

  const openModal = (type, categoryOverride) => {
    const init = defaultForm();
    if (type === 'SALARY') init.category = 'صرف رواتب';
    else if (type === 'SHIPPING') init.category = 'نولون شحن';
    else if (type === 'RENT') init.category = 'إيجار';
    else if (categoryOverride) init.category = categoryOverride;
    setForm(init);
    setModalType(type);
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (modalType === 'SALARY' || (modalType === 'EXPENSE' && form.category === 'صرف رواتب')) {
        const emp = employees.find(e => e._id === form.employeeId);
        const empName = emp ? emp.name : form.employeeName;
        const autoDesc = `${form.payoutType}: ${empName || 'موظف'} عن ${form.salaryMonth || 'الشهر الحالي'}${form.description ? ` (${form.description})` : ''}`;
        
        await api.post('/cashier/safe/transaction', {
          amount: Number(form.amount),
          type: 'OUT',
          category: 'صرف رواتب',
          paymentMethod: form.paymentMethod || 'Cash',
          description: autoDesc,
          employeeId: form.employeeId || undefined,
          metadata: {
            payoutType: form.payoutType,
            employeeName: empName,
            salaryMonth: form.salaryMonth
          }
        });
      } else if (modalType === 'SHIPPING' || (modalType === 'EXPENSE' && form.category === 'نولون شحن')) {
        const autoDesc = `نولون شحن: ${form.shippingType}${form.shippingCompany ? ` [${form.shippingCompany}]` : ''}${form.trackingNumber ? ` بوليصة #${form.trackingNumber}` : ''}${form.description ? ` - ${form.description}` : ''}`;
        
        await api.post('/cashier/safe/transaction', {
          amount: Number(form.amount),
          type: 'OUT',
          category: 'نولون شحن',
          paymentMethod: form.paymentMethod || 'Cash',
          description: autoDesc,
          metadata: {
            shippingType: form.shippingType,
            shippingCompany: form.shippingCompany,
            trackingNumber: form.trackingNumber
          }
        });
      } else if (modalType === 'RENT' || (modalType === 'EXPENSE' && form.category === 'إيجار')) {
        const autoDesc = `سداد إيجار المحل الرئيسي عن ${form.rentMonth || 'الشهر الحالي'}${form.recipientName ? ` - المستلم: ${form.recipientName}` : ''}${form.description ? ` (${form.description})` : ''}`;
        
        await api.post('/cashier/safe/transaction', {
          amount: Number(form.amount),
          type: 'OUT',
          category: 'إيجار',
          paymentMethod: form.paymentMethod || 'Cash',
          description: autoDesc,
          metadata: {
            rentPlace: 'إيجار المحل الرئيسي',
            rentMonth: form.rentMonth,
            recipientName: form.recipientName
          }
        });
      } else if (modalType === 'EXPENSE') {
        await api.post('/cashier/safe/transaction', {
          amount: Number(form.amount),
          type: 'OUT',
          category: form.category,
          paymentMethod: form.paymentMethod || 'Cash',
          description: form.description
        });
      } else if (modalType === 'DEPOSIT') {
        await api.post('/cashier/safe/transaction', {
          amount: Number(form.amount),
          type: 'IN',
          category: 'Deposit',
          paymentMethod: form.paymentMethod || 'Cash',
          description: form.description || 'إيداع نقدية في الدرج'
        });
      } else if (modalType === 'TRANSFER') {
        await api.post('/cashier/safe/transaction', {
          amount: Number(form.amount),
          type: 'OUT',
          category: 'Safe Transfer',
          paymentMethod: 'Cash',
          description: form.description || 'تحويل نقدية إلى الخزينة الرئيسية'
        });
      } else if (modalType === 'CLOSE') {
        if (!currentShift) return alert('لا يوجد وردية مفتوحة. افتح وردية أولاً.');
        const counted = Number(form.amount || data.summary?.cashDrawer || 0);
        await api.post('/cashier/shift/close', { countedCash: counted });
        setCurrentShift(null);
      } else if (modalType === 'OPEN') {
        const opening = Number(form.amount || 0);
        const res = await api.post('/cashier/shift/open', { openingBalance: opening });
        setCurrentShift(res.data);
      }
      setModalType(null);
      setForm(defaultForm());
      loadSafe();
      loadShift();
      alert('تم تنفيذ العملية وتحديث نقدية الخزنة بنجاح!');
    } catch (error) {
      alert(error.response?.data?.message || 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const headers = ['الوقت', 'نوع العملية', 'التصنيف', 'طريقة الدفع', 'المبلغ', 'التفاصيل'];
    const rows = data.transactions.map(t => [
      new Date(t.createdAt).toLocaleTimeString('ar-EG-u-nu-latn'),
      t.type === 'IN' ? 'داخل' : 'خارج',
      t.category === 'Sale' ? 'مبيعات' : t.category === 'Refund' ? 'مرتجع' : t.category === 'Deposit' ? 'إيداع' : t.category === 'Safe Transfer' ? 'تحويل للخزينة' : t.category,
      t.paymentMethod === 'Cash' ? 'كاش' : 'انستا باي',
      t.amount,
      t.description || ''
    ]);
    exportToCSV(`حركات_الخزنة_${new Date().toLocaleDateString('ar-EG-u-nu-latn')}`, headers, rows);
  };

  const handlePrintZReport = (shift) => {
    const shiftData = shift || currentShift;
    const now = new Date().toLocaleString('ar-EG-u-nu-latn');
    const openTime = shiftData?.createdAt ? new Date(shiftData.createdAt).toLocaleString('ar-EG-u-nu-latn') : '—';
    const cashSales = data.todaySummary?.grossCashSales ?? data.todaySummary?.cashSales ?? 0;
    const refundsCash = data.todaySummary?.refundsCash ?? data.todaySummary?.refunds ?? data.summary?.refunds ?? 0;
    const instapaySales = data.todaySummary?.grossInstapaySales ?? data.todaySummary?.instapaySales ?? 0;
    
    const salaries = data.todaySummary?.salariesCash || 0;
    const shipping = data.todaySummary?.shippingCash || 0;
    const rent = data.todaySummary?.rentCash || 0;
    const expenses = data.todaySummary?.expenses || 0;
    const generalExpenses = data.todaySummary?.generalExpenses ?? Math.max(0, expenses - salaries - shipping - rent);

    const personalWithdrawals = data.todaySummary?.personalWithdrawals || data.summary?.personalWithdrawals || 0;
    const supplierPayments = data.todaySummary?.supplierPayments || data.summary?.supplierPayments || 0;
    const openingBal = shiftData?.openingBalance || 0;
    const expectedCash = shiftData?.expectedCash ?? data.summary?.expectedCash ?? 0;
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
      <table class="invoice-print-table" style="font-size:12px; direction:rtl; width:100%;">
        <tbody>
          <tr><td>وقت الفتح</td><td style="text-align:left">${openTime}</td></tr>
          <tr><td>وقت الإغلاق</td><td style="text-align:left">${now}</td></tr>
          <tr><td colspan="2" style="padding-top:8px;font-weight:bold;background:#f7f0ec">الإيرادات والتحصيل</td></tr>
          <tr><td>مبيعات كاش محصلة (قبل المرتجع)</td><td style="text-align:left;color:#15803d;font-weight:bold">+ ${Number(cashSales).toLocaleString('en-US')} ج.م</td></tr>
          <tr><td>مبيعات إنستاباي / بنك</td><td style="text-align:left;color:#2563eb;font-weight:bold">${Number(instapaySales).toLocaleString('en-US')} ج.م</td></tr>
          <tr><td>إجمالي المبيعات المحصلة</td><td style="text-align:left;font-weight:bold">${Number(cashSales + instapaySales).toLocaleString('en-US')} ج.م</td></tr>
          <tr><td colspan="2" style="padding-top:8px;font-weight:bold;background:#f7f0ec">حركة الدرج النقدي (الكاش)</td></tr>
          <tr><td>رصيد الافتتاح (العهدة)</td><td style="text-align:left">${Number(openingBal).toLocaleString('en-US')} ج.م</td></tr>
          <tr><td>(+) كاش المبيعات المحصل</td><td style="text-align:left;color:#15803d">+ ${Number(cashSales).toLocaleString('en-US')} ج.م</td></tr>
          <tr><td>(-) مرتجعات مستردة نقداً</td><td style="text-align:left;color:#dc2626;font-weight:bold">- ${Number(refundsCash).toLocaleString('en-US')} ج.م</td></tr>
          ${salaries > 0 ? `<tr><td>(-) صرف رواتب وأجور</td><td style="text-align:left;color:#1d4ed8;font-weight:bold">- ${Number(salaries).toLocaleString('en-US')} ج.م</td></tr>` : ''}
          ${shipping > 0 ? `<tr><td>(-) نولون ومصاريف شحن</td><td style="text-align:left;color:#d97706;font-weight:bold">- ${Number(shipping).toLocaleString('en-US')} ج.م</td></tr>` : ''}
          ${rent > 0 ? `<tr><td>(-) سداد إيجار</td><td style="text-align:left;color:#7e22ce;font-weight:bold">- ${Number(rent).toLocaleString('en-US')} ج.م</td></tr>` : ''}
          ${generalExpenses > 0 ? `<tr><td>(-) مصاريف تشغيل أخرى</td><td style="text-align:left;color:#dc2626">- ${Number(generalExpenses).toLocaleString('en-US')} ج.م</td></tr>` : ''}
          ${personalWithdrawals > 0 ? `<tr><td>(-) مسحوبات شخصية / جمعية</td><td style="text-align:left;color:#9333ea;font-weight:bold">- ${Number(personalWithdrawals).toLocaleString('en-US')} ج.م</td></tr>` : ''}
          ${supplierPayments > 0 ? `<tr><td>(-) مدفوع لموردين كاش</td><td style="text-align:left;color:#d97706">- ${Number(supplierPayments).toLocaleString('en-US')} ج.م</td></tr>` : ''}
          <tr style="border-top:1px solid #000;font-weight:bold"><td>الكاش المتوقع في الدرج</td><td style="text-align:left">${Number(expectedCash).toLocaleString('en-US')} ج.م</td></tr>
          <tr><td>الكاش الفعلي (عند العد)</td><td style="text-align:left;font-weight:bold">${Number(countedCash).toLocaleString('en-US')} ج.م</td></tr>
          <tr><td>الفرق (عجز/زيادة)</td><td style="text-align:left;font-weight:bold;color:${variance === 0 ? '#15803d' : variance > 0 ? '#d97706' : '#dc2626'}">${variance >= 0 ? '+' : ''}${Number(variance).toLocaleString('en-US')} ج.م</td></tr>
        </tbody>
      </table>
      <div class="invoice-print-footer" style="text-align:center; margin-top:15px; font-size:11px;">
        ModaPella — تقرير تقفيل الوردية<br/>
        ${now}
      </div>
    `;
    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
  };

  return (
    <div className="flex flex-col gap-6 text-burgundy" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/50">كاشير</p>
          <h2 className="text-2xl font-bold">الخزنة والدرج النقدي (إدارة الأموال)</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.transactions.length > 0 && (
            <button
              onClick={handleExport}
              className="rounded-xl border border-burgundy/20 bg-white px-4 py-2 text-xs font-bold text-burgundy transition hover:bg-burgundy/5 shadow-xs"
            >
              تصدير حركات الخزنة
            </button>
          )}
          {currentShift ? (
            <div className="flex items-center gap-2">
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                وردية مفتوحة
              </div>
              <button
                onClick={() => handlePrintZReport(currentShift)}
                className="rounded-xl border border-burgundy/30 bg-white px-3.5 py-2 text-xs font-bold text-burgundy transition hover:bg-burgundy/10"
              >
                طباعة Z-Report
              </button>
              <button
                onClick={() => setIsCloseConfirmOpen(true)}
                className="rounded-xl bg-burgundy px-5 py-2 text-xs font-bold text-white transition hover:bg-[#650018]"
              >
                إغلاق الوردية
              </button>
            </div>
          ) : (
            <button
              onClick={() => openModal('OPEN')}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 shadow"
            >
              فتح وردية
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex py-20 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-[2rem] border border-emerald-600/20 bg-emerald-50 p-6">
              <p className="text-sm font-bold text-emerald-800/60"> رصيد الدرج (الكاش)</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">{EGP(data.summary.cashDrawer)}</p>
              <p className="mt-2 text-xs text-emerald-700/60">هذا هو المبلغ المفترض تواجده في الدرج الآن</p>
            </div>
            
            <div className="rounded-[2rem] border border-blue-600/20 bg-blue-50 p-6">
              <p className="text-sm font-bold text-blue-800/60"> رصيد إنستاباي الحالي (المفترض في البنك)</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">{EGP(data.summary?.instapayBalance ?? data.summary?.instapayTotal ?? 0)}</p>
              <p className="mt-2 text-xs text-blue-700/60">اليوم: {EGP(data.todaySummary?.instapaySales || 0)} | أموال إلكترونية بالبنك</p>
            </div>

            <div className="rounded-[2rem] border border-burgundy/20 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-burgundy/60"> إجمالي المصروفات (تشغيل، رواتب، نولون، إيجار)</p>
              <p className="mt-2 text-3xl font-bold text-burgundy">{EGP(data.summary.expenses)}</p>
              
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => openModal('SALARY')}
                  className="flex-1 rounded-xl bg-indigo-50 border border-indigo-200 py-1.5 px-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                >
                  صرف رواتب
                </button>
                <button
                  onClick={() => openModal('SHIPPING')}
                  className="flex-1 rounded-xl bg-amber-50 border border-amber-200 py-1.5 px-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
                >
                  نولون شحن
                </button>
                <button
                  onClick={() => openModal('RENT')}
                  className="flex-1 rounded-xl bg-purple-50 border border-purple-200 py-1.5 px-2 text-xs font-bold text-purple-800 transition hover:bg-purple-100"
                >
                  إيجار
                </button>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => openModal('EXPENSE')}
                  className="flex-1 rounded-xl bg-burgundy/10 py-1.5 text-xs font-bold text-burgundy transition hover:bg-burgundy/20"
                >
                  مصروف عام -
                </button>
                <button
                  onClick={() => openModal('DEPOSIT')}
                  className="flex-1 rounded-xl bg-emerald-600/10 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-600/20"
                >
                  إيداع نقدية +
                </button>
              </div>
            </div>
          </div>

          {/* Smart Cash Reconciliation Card */}
          {(() => {
            const expectedCash = data.summary?.cashDrawer || 0;
            const countedNum = reconcileCash === '' ? null : Number(reconcileCash);
            const diff = countedNum !== null ? countedNum - expectedCash : null;

            return (
              <div className="rounded-[2rem] border border-burgundy/15 bg-gradient-to-r from-[#FAF6F0] via-white to-[#FAF6F0] p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-burgundy/10 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                      ⚖️
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-burgundy">المطابقة الذكية لنقدية الدرج (جرد الكاش)</h3>
                        <span className="text-[10px] bg-burgundy/10 text-burgundy font-bold px-2.5 py-0.5 rounded-full">
                          مساعد الكاشير والإدارة
                        </span>
                      </div>
                      <p className="text-xs text-burgundy/60 mt-0.5">
                        اكتب المبلغ الفعلي الموجود في الدرج للتأكد من سلامة النقدية واكتشاف أي عجز أو زيادة فوراً
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-burgundy/20 shadow-xs">
                      <span className="text-xs font-bold text-burgundy/70">العد الفعلي:</span>
                      <input
                        type="number"
                        placeholder="المبلغ بالدرج..."
                        value={reconcileCash}
                        onChange={e => setReconcileCash(e.target.value)}
                        className="w-28 text-sm font-bold text-burgundy outline-none bg-transparent font-mono"
                      />
                      <span className="text-xs text-burgundy/50 font-bold">ج.م</span>
                    </div>

                    {reconcileCash !== '' && (
                      <button
                        type="button"
                        onClick={() => setReconcileCash('')}
                        className="text-xs text-burgundy/50 hover:text-burgundy px-2 py-1 font-bold"
                      >
                        إلغاء
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setReconcileCash(expectedCash.toString())}
                      className="text-xs bg-burgundy/10 hover:bg-burgundy/20 text-burgundy font-bold px-3 py-2 rounded-xl transition"
                      title="تعبئة تلقائية بالمبلغ المحسوب بالسيستم"
                    >
                      مطابقة بالرصيد الحالي
                    </button>
                  </div>
                </div>

                {countedNum !== null && (
                  <div className={`mt-4 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    diff === 0 
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900' 
                      : diff < 0 
                      ? 'bg-rose-50/90 border-rose-300 text-rose-900' 
                      : 'bg-blue-50/90 border-blue-300 text-blue-900'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {diff === 0 ? '✅' : diff < 0 ? '⚠️' : '❇️'}
                      </span>
                      <div>
                        <p className="text-xs font-bold">
                          {diff === 0 
                            ? 'الدرج مطابق تماماً! النقدية الفعلية مطابقة لحسابات السيستم بالقرش.' 
                            : diff < 0 
                            ? `يوجد عجز نقدية في الدرج بمقدار (${EGP(Math.abs(diff))})` 
                            : `يوجد زيادة نقدية في الدرج بمقدار (+${EGP(diff)})`}
                        </p>
                        <p className="text-[11px] opacity-80 mt-0.5 font-medium">
                          المتوقع بالسيستم: {EGP(expectedCash)} | الفعلي بالدرج: {EGP(countedNum)}
                        </p>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className={`text-lg font-black font-mono ${
                        diff === 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-blue-700'
                      }`}>
                        {diff === 0 ? '0 ج.م' : `${diff > 0 ? '+' : ''}${EGP(diff)}`}
                      </span>
                      <span className="block text-[10px] opacity-70 font-bold">فارق المطابقة</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Today KPI Breakdown */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-[1.5rem] border border-burgundy/10 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-burgundy/60">مبيعات اليوم (كاش)</p>
              <p className="mt-2 text-xl font-bold text-emerald-700">{EGP(data.todaySummary?.grossCashSales ?? data.todaySummary?.cashSales ?? 0)}</p>
              <p className="text-[10px] text-emerald-800/60 mt-1">الصافي بعد المرتجع: {EGP(data.todaySummary?.cashSales || 0)}</p>
            </div>
            
            <div className="rounded-[1.5rem] border border-burgundy/10 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-burgundy/60">مبيعات اليوم (إلكتروني)</p>
              <p className="mt-2 text-xl font-bold text-blue-700">{EGP(data.todaySummary?.grossInstapaySales ?? data.todaySummary?.instapaySales ?? 0)}</p>
              <p className="text-[10px] text-blue-800/60 mt-1">الصافي: {EGP(data.todaySummary?.instapaySales || 0)}</p>
            </div>

            {/* Salaries Today */}
            <div className="rounded-[1.5rem] border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
              <p className="text-xs font-semibold text-indigo-900/70">رواتب اليوم</p>
              <p className="mt-2 text-xl font-bold text-indigo-700">{EGP(data.todaySummary?.salaries || 0)}</p>
              <p className="text-[10px] text-indigo-700/60 mt-1">كاش: {EGP(data.todaySummary?.salariesCash || 0)}</p>
            </div>

            {/* Shipping Today */}
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
              <p className="text-xs font-semibold text-amber-900/70">نولون شحن اليوم</p>
              <p className="mt-2 text-xl font-bold text-amber-700">{EGP(data.todaySummary?.shipping || 0)}</p>
              <p className="text-[10px] text-amber-700/60 mt-1">كاش: {EGP(data.todaySummary?.shippingCash || 0)}</p>
            </div>

            {/* Rent Today */}
            <div className="rounded-[1.5rem] border border-purple-200 bg-purple-50/50 p-4 shadow-sm">
              <p className="text-xs font-semibold text-purple-900/70">إيجار اليوم</p>
              <p className="mt-2 text-xl font-bold text-purple-700">{EGP(data.todaySummary?.rent || 0)}</p>
              <p className="text-[10px] text-purple-700/60 mt-1">كاش: {EGP(data.todaySummary?.rentCash || 0)}</p>
            </div>

            <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-50/60 p-4 shadow-sm">
              <p className="text-xs font-semibold text-emerald-900/70">صافي الكاش المتوقع بالدرج</p>
              <p className="mt-2 text-xl font-bold text-emerald-700">{EGP(data.todaySummary?.netCashInSafe || data.summary?.cashDrawer || 0)}</p>
            </div>
          </div>

          {/* Shifts */}
          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-sm mb-3">آخر الورديات</h3>
            {data.recentShifts.length === 0 ? (
              <p className="text-xs text-burgundy/40">لا توجد ورديات سابقة مسجلة</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {data.recentShifts.map((shift) => {
                  const variance = Number(shift.variance || 0);
                  return (
                    <div key={shift._id} className="rounded-2xl border border-burgundy/10 bg-burgundy/5 p-3.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-burgundy">{shift.user?.name || 'غير معروف'}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${variance === 0 ? 'bg-emerald-100 text-emerald-700' : variance > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {variance === 0 ? 'مطابق' : variance > 0 ? `+${variance}` : `${variance}`}
                        </span>
                      </div>
                      <div className="mt-2.5 space-y-1 text-xs text-burgundy/70">
                        <div className="flex justify-between"><span>افتتاح</span><span>{EGP(shift.openingBalance || 0)}</span></div>
                        <div className="flex justify-between"><span>إغلاق</span><span>{EGP(shift.closingBalance || 0)}</span></div>
                        <div className="flex justify-between font-bold"><span>المتوقع</span><span>{EGP(shift.expectedCash || 0)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Transactions Table */}
          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-sm mb-4">حركات اليوم بالخزنة</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-burgundy/10 text-burgundy/60 font-bold">
                    <th className="pb-3 px-2">الوقت</th>
                    <th className="pb-3 px-2">نوع العملية</th>
                    <th className="pb-3 px-2">التصنيف</th>
                    <th className="pb-3 px-2">طريقة الدفع</th>
                    <th className="pb-3 px-2">المبلغ</th>
                    <th className="pb-3 px-2">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-burgundy/5">
                  {data.transactions.length === 0 ? (
                    <tr><td colSpan="6" className="py-8 text-center text-burgundy/40">لا توجد حركات بالخزنة حتى الآن اليوم</td></tr>
                  ) : (
                    data.transactions.map((t) => {
                      const cat = t.category || '';
                      const isSalary = cat === 'صرف رواتب' || cat === 'رواتب' || cat.includes('راتب');
                      const isShipping = cat === 'نولون شحن' || cat.includes('نولون') || cat === 'شحن';
                      const isRent = cat === 'إيجار' || cat === 'ايجار' || cat.includes('إيجار');

                      return (
                        <tr key={t._id} className="hover:bg-burgundy/5 transition">
                          <td className="py-3 px-2 font-mono text-xs">{new Date(t.createdAt).toLocaleTimeString('ar-EG-u-nu-latn')}</td>
                          <td className="py-3 px-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              {t.type === 'IN' ? 'داخل' : 'خارج'}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-semibold">
                            {isSalary ? (
                              <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                                💼 صرف رواتب
                              </span>
                            ) : isShipping ? (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                                🚚 نولون شحن
                              </span>
                            ) : isRent ? (
                              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                                🏢 إيجار
                              </span>
                            ) : (
                              <span>{t.category === 'Sale' ? 'مبيعات' : t.category === 'Refund' ? 'مرتجع' : t.category === 'Deposit' ? 'إيداع' : t.category === 'Safe Transfer' ? 'تحويل للخزينة' : t.category}</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${t.paymentMethod === 'Cash' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'}`}>
                              {t.paymentMethod === 'Cash' ? 'كاش (الدرج)' : 'إنستاباي / محفظة'}
                            </span>
                          </td>
                          <td className={`py-3 px-2 font-bold ${t.type === 'IN' ? 'text-emerald-700' : 'text-red-700'}`}>
                            {t.type === 'IN' ? '+' : '-'}{EGP(t.amount)}
                          </td>
                          <td className="py-3 px-2 text-burgundy/80 max-w-xs truncate">{t.description || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setModalType(null)}>
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl text-burgundy max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-burgundy/10 mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                {modalType === 'SALARY' && <span>💼 صرف رواتب / سلفة</span>}
                {modalType === 'SHIPPING' && <span>🚚 نولون شحن ومصاريف نقل</span>}
                {modalType === 'RENT' && <span>🏢 سداد إيجار</span>}
                {modalType === 'EXPENSE' && <span>سحب مصروف من الخزنة</span>}
                {modalType === 'DEPOSIT' && <span>إيداع نقدية في الدرج</span>}
                {modalType === 'TRANSFER' && <span>تحويل نقدية للخزينة الرئيسية</span>}
                {modalType === 'OPEN' && <span>فتح وردية جديدة</span>}
                {modalType === 'CLOSE' && <span>تقفيل الوردية</span>}
              </h3>
              <button onClick={() => setModalType(null)} className="text-burgundy/40 hover:text-burgundy font-bold text-sm">
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>
            
            {modalType === 'CLOSE' ? (
              <div className="space-y-4">
                <p className="text-xs text-burgundy/70">أدخل المبلغ الذي تم عدّه فعلياً داخل الدرج للتأكيد.</p>
                <div className="rounded-2xl bg-burgundy/5 p-4 text-center">
                  <p className="text-xs text-burgundy/60">المبلغ المتوقع في الدرج</p>
                  <p className="text-2xl font-black text-burgundy">{EGP(currentShift?.expectedCash ?? data.summary.expectedCash)}</p>
                  <div className="mt-4">
                    <input
                      type="number"
                      min="0"
                      value={form.amount || currentShift?.expectedCash || data.summary.expectedCash}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full rounded-xl border border-burgundy/20 px-4 py-2.5 text-center font-bold text-base"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setModalType(null)} className="flex-1 rounded-full border border-burgundy/20 py-2.5 text-xs font-bold">
                    إلغاء
                  </button>
                  <button onClick={handleTransactionSubmit} disabled={submitting} className="flex-1 rounded-full bg-burgundy py-2.5 text-xs font-bold text-white transition hover:bg-[#650018]">
                    {submitting ? 'جاري التقفيل...' : 'تأكيد التقفيل'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleTransactionSubmit} className="space-y-4">
                {/* Payment Method Selector */}
                {['SALARY', 'SHIPPING', 'RENT', 'EXPENSE', 'DEPOSIT'].includes(modalType) && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-burgundy/70">طريقة الدفع / المنفذ</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, paymentMethod: 'Cash' }))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${form.paymentMethod === 'Cash' ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs' : 'bg-white border-burgundy/20 text-burgundy/60'}`}
                      >
                        <Icon name="cash" className="w-4 h-4" />
                        <span>كاش من الدرج</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, paymentMethod: 'Instapay' }))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${form.paymentMethod === 'Instapay' ? 'bg-blue-100 border-blue-400 text-blue-900 shadow-xs' : 'bg-white border-burgundy/20 text-burgundy/60'}`}
                      >
                        <span>💳</span>
                        <span>إنستاباي / بنك</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Expense category dropdown */}
                {modalType === 'EXPENSE' && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-burgundy/60">نوع المصروف *</label>
                    <select
                      value={form.category}
                      onChange={e => setForm({...form, category: e.target.value})}
                      className="w-full rounded-xl border border-burgundy/20 px-3 py-2 text-xs font-bold outline-none focus:border-burgundy bg-white"
                    >
                      {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}

                {/* Salary Specifics */}
                {(modalType === 'SALARY' || (modalType === 'EXPENSE' && form.category === 'صرف رواتب')) && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-3">
                    <p className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                      <span>💼</span> تفاصيل صرف الراتب:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-indigo-950">الموظف المسجل</label>
                        <select
                          value={form.employeeId}
                          onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
                          className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-burgundy outline-none focus:border-indigo-500"
                        >
                          <option value="">-- اختر موظف من السيستم --</option>
                          {employees.map(emp => (
                            <option key={emp._id} value={emp._id}>{emp.name} {emp.phone ? `(${emp.phone})` : ''}</option>
                          ))}
                        </select>
                      </div>

                      {!form.employeeId && (
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-indigo-950">أو اسم الموظف يدوياً</label>
                          <input
                            type="text"
                            value={form.employeeName}
                            onChange={e => setForm(p => ({ ...p, employeeName: e.target.value }))}
                            placeholder="مثال: أحمد عبد الله"
                            className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-burgundy outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}

                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-indigo-950">نوع الصرف</label>
                        <select
                          value={form.payoutType}
                          onChange={e => setForm(p => ({ ...p, payoutType: e.target.value }))}
                          className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-burgundy outline-none focus:border-indigo-500"
                        >
                          {PAYOUT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-indigo-950">عن شهر / فترة</label>
                        <input
                          type="text"
                          value={form.salaryMonth}
                          onChange={e => setForm(p => ({ ...p, salaryMonth: e.target.value }))}
                          placeholder="مثال: شهر أكتوبر 2026"
                          className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-burgundy outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Shipping Specifics */}
                {(modalType === 'SHIPPING' || (modalType === 'EXPENSE' && form.category === 'نولون شحن')) && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                    <p className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                      <span>🚚</span> تفاصيل عملية الشحن والنولون:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[11px] font-bold text-amber-950">نوع الشحن</label>
                        <select
                          value={form.shippingType}
                          onChange={e => setForm(p => ({ ...p, shippingType: e.target.value }))}
                          className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-burgundy outline-none focus:border-amber-500"
                        >
                          {SHIPPING_TYPES.map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-amber-950">شركة الشحن / اسم السائق أو المندوب</label>
                        <input
                          type="text"
                          value={form.shippingCompany}
                          onChange={e => setForm(p => ({ ...p, shippingCompany: e.target.value }))}
                          placeholder="مثال: بوسطة، سيارة نقل..."
                          className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-burgundy outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-amber-950">رقم البوليصة / الشحنة (اختياري)</label>
                        <input
                          type="text"
                          value={form.trackingNumber}
                          onChange={e => setForm(p => ({ ...p, trackingNumber: e.target.value }))}
                          placeholder="مثال: #98421"
                          className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-burgundy outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Rent Specifics */}
                {(modalType === 'RENT' || (modalType === 'EXPENSE' && form.category === 'إيجار')) && (
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                        <span>🏢</span> سداد إيجار المحل الرئيسي
                      </p>
                      <span className="text-[10px] bg-purple-200/70 text-purple-900 font-bold px-2 py-0.5 rounded-lg">
                        المحل الرئيسي
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-purple-950">
                          مين اللي استلم إيجار المحل؟ (اسم المستلم / صاحب العقار) *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.recipientName}
                          onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))}
                          placeholder="اكتب اسم الشخص اللي استلم الإيجار (مثل: الحاج فلان / صاحب المحل)"
                          className="w-full rounded-xl border border-purple-200 bg-white px-3.5 py-2.5 text-xs font-bold text-burgundy outline-none focus:border-purple-500 shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-purple-950">عن شهر / فترة</label>
                        <input
                          type="text"
                          value={form.rentMonth}
                          onChange={e => setForm(p => ({ ...p, rentMonth: e.target.value }))}
                          placeholder="مثال: شهر أكتوبر 2026"
                          className="w-full rounded-xl border border-purple-200 bg-white px-3.5 py-2 text-xs font-bold text-burgundy outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">
                    {modalType === 'OPEN' ? 'رصيد افتتاحي (اختياري)' : 'المبلغ (ج.م) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.amount}
                    onChange={e => setForm({...form, amount: e.target.value})}
                    className="w-full rounded-xl border border-burgundy/20 px-4 py-2.5 outline-none focus:border-burgundy font-bold text-base"
                  />
                </div>

                {/* Details / Notes */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">السبب / التفاصيل</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                    placeholder="أي ملاحظات أو تفاصيل إضافية..."
                    className="w-full rounded-xl border border-burgundy/20 px-4 py-2 text-xs outline-none focus:border-burgundy"
                  />
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="flex-1 rounded-full border border-burgundy/20 py-2.5 text-xs font-bold transition hover:bg-burgundy/5"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-full bg-burgundy py-2.5 text-xs font-bold text-white transition hover:bg-[#650018] disabled:opacity-50"
                  >
                    {submitting ? 'جاري الحفظ...' : 'تأكيد وحفظ'}
                  </button>
                </div>
              </form>
            )}
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
