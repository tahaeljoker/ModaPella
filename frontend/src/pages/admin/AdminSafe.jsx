import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';
import { Icon } from '../../components/Icon';
import { exportToCSV } from '../../services/export';

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

function AdminSafe() {
  const navigate = useNavigate();
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
      supplierPayments: 0,
      refunds: 0,
      debtCollections: 0,
      expectedCash: 0
    },
    todaySummary: {
      cashSales: 0,
      instapaySales: 0,
      debtSalesRemaining: 0,
      totalSales: 0,
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
      supplierPayments: 0,
      netCashInSafe: 0
    },
    recentShifts: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'shifts' | 'audit'
  const [categoryFilter, setCategoryFilter] = useState('all'); // Filter for transactions list

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
  const [currentShift, setCurrentShift] = useState(null);

  // Smart audit state
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [healing, setHealing] = useState(false);

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

  const loadSmartAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await api.get('/cashier/safe/smart-audit');
      setAuditData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
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
        if (!currentShift) return alert('لا يوجد وردية مفتوحة حالياً.');
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
      alert('تم تنفيذ وتسجيل العملية بنجاح وتحديث أرصدة الخزنة فورياً!');
    } catch (error) {
      alert(error.response?.data?.message || 'حدث خطأ أثناء تنفيذ العملية');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHealRecords = async () => {
    if (!window.confirm('هل تريد تشغيل المعالجة الذكية لإصلاح وتحديث فواتير الموردين ومصروفات الخزنة وحذف أي حركات مكررة؟')) return;
    setHealing(true);
    try {
      const res = await api.post('/admin/heal-records');
      const r = res.data.report || {};
      alert(`تمت المعالجة المحاسبية بنجاح!\n` +
        `• حركات فواتير الشميزات القديمة المحذوفة لمنع التكرار: ${r.oldChemiseTransactionsCleaned || 0}\n` +
        `• حركات مصروفات مكررة تم حذفها (زجاج المحل): ${r.duplicateGlassExpensesCleaned || 0}\n` +
        `• حركات تم تصحيح تصنيفها لمصروفات تشغيل: ${r.expensesReclassified || 0}\n` +
        `• فاتورة الشميز 148 تم تثبيتها في حساب المورد: ${r.chemiseBillsLinked || 0}\n` +
        `• تنشيط وفك أرشفة الشميز 148: ${r.chemiseActivated || 0}`);
      loadSafe();
      loadShift();
    } catch (err) {
      alert(`فشلت عملية المعالجة: ${err.response?.data?.message || err.response?.data?.error || err.message}`);
    } finally {
      setHealing(false);
    }
  };

  const handleExport = () => {
    const headers = ['الوقت', 'نوع العملية', 'التصنيف', 'طريقة الدفع', 'المبلغ', 'المسؤول', 'التفاصيل'];
    const rows = data.transactions.map(t => [
      new Date(t.createdAt).toLocaleTimeString('ar-EG-u-nu-latn'),
      t.type === 'IN' ? 'داخل' : 'خارج',
      t.category === 'Sale' ? 'مبيعات' : t.category === 'Refund' ? 'مرتجع' : t.category === 'Deposit' ? 'إيداع' : t.category === 'Safe Transfer' ? 'تحويل للخزينة' : t.category,
      t.paymentMethod === 'Cash' ? 'كاش' : 'انستا باي / محفظة',
      t.amount,
      t.user?.name || '—',
      t.description || ''
    ]);
    exportToCSV(`خزنة_الأدمن_${new Date().toLocaleDateString('ar-EG-u-nu-latn')}`, headers, rows);
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
      <div class="invoice-print-header" style="text-align:center; font-family:Cairo,sans-serif; direction:rtl; padding:15px;">
        <h2 style="margin:0; color:#7c0a12; font-size:18px;">ModaPella</h2>
        <h4 style="margin:4px 0; font-size:14px;">تقرير تقفيل الخزنة والوردية (Z-Report)</h4>
        <p style="font-size:11px; color:#666; margin:2px 0;">${now}</p>
        <hr style="border:none; border-top:1px dashed #ccc; margin:10px 0;"/>
        <table style="width:100%; font-size:12px; border-collapse:collapse; text-align:right;">
          <tbody>
            <tr><td style="padding:4px 0;">وقت الفتح:</td><td style="text-align:left; font-weight:bold;">${openTime}</td></tr>
            <tr><td style="padding:4px 0;">الكاشير / المسؤول:</td><td style="text-align:left; font-weight:bold;">${shiftData?.user?.name || 'الإدارة'}</td></tr>
            <tr style="border-top:1px solid #eee;"><td style="padding:4px 0;">رصيد البداية (العهدة):</td><td style="text-align:left; font-weight:bold;">${EGP(openingBal)}</td></tr>
            <tr><td style="padding:4px 0;">مبيعات نقدية (كاش محصل):</td><td style="text-align:left; font-weight:bold; color:green;">+ ${EGP(cashSales)}</td></tr>
            <tr><td style="padding:4px 0;">مرتجعات مستردة نقداً (اليوم):</td><td style="text-align:left; font-weight:bold; color:#b91c1c;">- ${EGP(refundsCash)}</td></tr>
            <tr><td style="padding:4px 0;">مبيعات إلكترونية (إنستاباي):</td><td style="text-align:left; font-weight:bold;">${EGP(instapaySales)}</td></tr>
            ${salaries > 0 ? `<tr><td style="padding:4px 0;">صرف رواتب وأجور (من الدرج):</td><td style="text-align:left; font-weight:bold; color:#1d4ed8;">- ${EGP(salaries)}</td></tr>` : ''}
            ${shipping > 0 ? `<tr><td style="padding:4px 0;">نولون شحن ومصاريف نقل:</td><td style="text-align:left; font-weight:bold; color:#d97706;">- ${EGP(shipping)}</td></tr>` : ''}
            ${rent > 0 ? `<tr><td style="padding:4px 0;">سداد إيجار (من الدرج):</td><td style="text-align:left; font-weight:bold; color:#7e22ce;">- ${EGP(rent)}</td></tr>` : ''}
            ${generalExpenses > 0 ? `<tr><td style="padding:4px 0;">مصروفات تشغيل أخرى:</td><td style="text-align:left; font-weight:bold; color:red;">- ${EGP(generalExpenses)}</td></tr>` : ''}
            <tr><td style="padding:4px 0;">إجمالي المصروفات التشغيلية:</td><td style="text-align:left; font-weight:bold; color:red;">- ${EGP(expenses)}</td></tr>
            <tr><td style="padding:4px 0;">مدفوعات الموردين من الدرج:</td><td style="text-align:left; font-weight:bold; color:red;">- ${EGP(supplierPayments)}</td></tr>
            <tr><td style="padding:4px 0;">مسحوبات شخصية / جمعيات:</td><td style="text-align:left; font-weight:bold; color:purple;">- ${EGP(personalWithdrawals)}</td></tr>
            <tr style="border-top:2px solid #333; font-size:13px; font-weight:bold;">
              <td style="padding:6px 0;">النقدية المتوقعة بالدرج:</td>
              <td style="text-align:left;">${EGP(expectedCash)}</td>
            </tr>
            <tr style="font-size:13px; font-weight:bold;">
              <td style="padding:4px 0;">النقدية الفعلية المحصية:</td>
              <td style="text-align:left;">${EGP(countedCash)}</td>
            </tr>
            <tr style="border-top:1px dashed #aaa; font-weight:bold;">
              <td style="padding:6px 0;">الفارق / العجز أو الزيادة:</td>
              <td style="text-align:left; color:${variance === 0 ? 'green' : variance > 0 ? 'blue' : 'red'};">
                ${variance === 0 ? 'مطابق تماماً (0 ج.م)' : (variance > 0 ? `زيادة +${EGP(variance)}` : `عجز ${EGP(variance)}`)}
              </td>
            </tr>
          </tbody>
        </table>
        <hr style="border:none; border-top:1px dashed #ccc; margin:15px 0;"/>
        <p style="font-size:10px; color:#888;">ModaPella Management System</p>
      </div>
    `;
    document.body.appendChild(printDiv);
    setTimeout(() => {
      window.print();
      document.body.removeChild(printDiv);
    }, 100);
  };

  // Filter transactions
  const filteredTransactions = (data.transactions || []).filter(t => {
    if (categoryFilter === 'all') return true;
    const cat = (t.category || '').toLowerCase();
    if (categoryFilter === 'sales') return cat === 'sale' || cat.includes('مبيع');
    if (categoryFilter === 'salaries') return cat === 'صرف رواتب' || cat === 'رواتب' || cat.includes('راتب');
    if (categoryFilter === 'shipping') return cat === 'نولون شحن' || cat.includes('نولون') || cat === 'شحن';
    if (categoryFilter === 'rent') return cat === 'إيجار' || cat === 'ايجار' || cat.includes('إيجار') || cat.includes('ايجار');
    if (categoryFilter === 'expenses') return t.type === 'OUT' && cat !== 'refund' && cat !== 'sale' && !cat.includes('راتب') && !cat.includes('نولون') && !cat.includes('إيجار') && !cat.includes('ايجار') && !cat.includes('مورد');
    if (categoryFilter === 'refunds') return cat === 'refund' || cat.includes('مرتجع');
    if (categoryFilter === 'deposits') return t.type === 'IN' && cat !== 'sale';
    return true;
  });

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-burgundy/50">النظام المالي</p>
          <h2 className="text-2xl font-black text-burgundy">الخزنة والدرج الرئيسي (إدارة المحل)</h2>
          <p className="text-xs text-burgundy/60 mt-1">
            متابعة دقيقة لحركة نقدية الدرج، الرواتب، النولون، الإيجار، والمصروفات لحظة بلحظة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentShift ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                الوردية مفتوحة ({currentShift.user?.name || 'أدمن'})
              </span>
              <button
                type="button"
                onClick={() => openModal('CLOSE')}
                className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
              >
                تقفيل الوردية (Z-Report)
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openModal('OPEN')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
            >
              + فتح وردية جديدة
            </button>
          )}

          <button
            type="button"
            onClick={() => handlePrintZReport()}
            className="bg-burgundy text-white hover:bg-[#650018] font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-sm flex items-center gap-1"
          >
            طباعة كشف
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="border border-burgundy/20 bg-white hover:bg-burgundy/5 text-burgundy font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-sm"
          >
            تصدير CSV
          </button>
          <button
            type="button"
            onClick={handleHealRecords}
            disabled={healing}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            title="إصلاح فواتير الموردين وحذف أي تكرار للمصروفات"
          >
            <Icon name="check" className="w-4 h-4" />
            <span>{healing ? 'جاري المعالجة...' : 'تسوية ذكية للخزنة والموردين'}</span>
          </button>
          <button
            type="button"
            onClick={loadSafe}
            className="border border-burgundy/20 bg-white hover:bg-burgundy/5 text-burgundy font-bold text-xs p-2 rounded-xl transition shadow-sm"
            title="تحديث البيانات"
          >
            <Icon name="refresh" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context Banner */}
      <div className="flex items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 text-emerald-800">
          <Icon name="safe" className="w-4 h-4 shrink-0" />
          <p className="text-xs font-semibold">إدارة عمليات الخزنة المباشرة (رواتب، نولون، إيجار، مصروفات). يتم الخصم فورياً والتأثير على الدرج والمطابقة المحاسبية.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/statements?tab=safe')}
          className="shrink-0 text-xs font-bold text-emerald-700 border border-emerald-300 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
        >
          <Icon name="statement" className="w-3.5 h-3.5" />
          <span>كشف حساب الدرج التفصيلي</span>
        </button>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Cash Drawer */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-4 rounded-2xl shadow-md space-y-1">
          <p className="text-[11px] font-bold opacity-80">نقدية الدرج الحالية</p>
          <p className="text-xl font-black">{EGP(data.summary?.cashDrawer || 0)}</p>
          <p className="text-[10px] opacity-75">الكاش الفعلي بالدرج الآن</p>
        </div>

        {/* Instapay / Digital */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-md space-y-1">
          <p className="text-[11px] font-bold opacity-80">رصيد إنستاباي المفترض (الآن)</p>
          <p className="text-xl font-black">{EGP(data.summary?.instapayBalance ?? data.summary?.instapayTotal ?? 0)}</p>
          <p className="text-[10px] opacity-75">تحويلات اليوم: {EGP(data.todaySummary?.instapaySales || 0)}</p>
        </div>

        {/* Expenses */}
        <div className="bg-white border border-burgundy/10 p-4 rounded-2xl shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-burgundy/60">إجمالي مصاريف اليوم</p>
          <p className="text-xl font-black text-rose-700">{EGP(data.todaySummary?.expenses || data.summary?.expenses || 0)}</p>
          <p className="text-[10px] text-burgundy/50">تشغيل + رواتب + نولون + إيجار</p>
        </div>

        {/* Salaries Today */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200/80 p-4 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-indigo-900">رواتب اليوم</p>
            <span className="text-xs">💼</span>
          </div>
          <p className="text-xl font-black text-indigo-800">{EGP(data.todaySummary?.salaries || 0)}</p>
          <p className="text-[10px] text-indigo-700/70">كاش: {EGP(data.todaySummary?.salariesCash || 0)} | إلكتروني: {EGP(data.todaySummary?.salariesInstapay || 0)}</p>
        </div>

        {/* Shipping Today */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 p-4 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-amber-900">نولون شحن اليوم</p>
            <span className="text-xs">🚚</span>
          </div>
          <p className="text-xl font-black text-amber-800">{EGP(data.todaySummary?.shipping || 0)}</p>
          <p className="text-[10px] text-amber-700/70">كاش: {EGP(data.todaySummary?.shippingCash || 0)} | إلكتروني: {EGP(data.todaySummary?.shippingInstapay || 0)}</p>
        </div>

        {/* Rent Today */}
        <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-200/80 p-4 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-purple-900">إيجار اليوم</p>
            <span className="text-xs">🏢</span>
          </div>
          <p className="text-xl font-black text-purple-800">{EGP(data.todaySummary?.rent || 0)}</p>
          <p className="text-[10px] text-purple-700/70">كاش: {EGP(data.todaySummary?.rentCash || 0)} | إلكتروني: {EGP(data.todaySummary?.rentInstapay || 0)}</p>
        </div>

        {/* Personal Withdrawals */}
        <div className="bg-white border border-burgundy/10 p-4 rounded-2xl shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-purple-900/70">مسحوبات شخصية</p>
          <p className="text-xl font-black text-purple-800">{EGP(data.summary?.personalWithdrawals || 0)}</p>
          <p className="text-[10px] text-purple-900/40">مستبعدة من أرباح التشغيل</p>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="flex flex-wrap items-center gap-2 bg-[#F7F0EC]/80 p-3.5 rounded-2xl border border-burgundy/10 shadow-xs">
        <span className="text-xs font-bold text-burgundy/70 ml-2">إجراءات الخزنة السريعة:</span>
        
        {/* 1. صرف رواتب */}
        <button
          type="button"
          onClick={() => openModal('SALARY')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
        >
          <Icon name="salary" className="w-4 h-4" />
          <span>صرف رواتب</span>
        </button>

        {/* 2. نولون شحن */}
        <button
          type="button"
          onClick={() => openModal('SHIPPING')}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
        >
          <Icon name="shipping" className="w-4 h-4" />
          <span>نولون شحن</span>
        </button>

        {/* 3. سداد إيجار */}
        <button
          type="button"
          onClick={() => openModal('RENT')}
          className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
        >
          <Icon name="rent" className="w-4 h-4" />
          <span>سداد إيجار</span>
        </button>

        {/* 4. مصروف عام */}
        <button
          type="button"
          onClick={() => openModal('EXPENSE')}
          className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
        >
          <Icon name="expenses" className="w-4 h-4" />
          <span>صرف مصروف تشغيل</span>
        </button>

        {/* 5. إيداع نقدية */}
        <button
          type="button"
          onClick={() => openModal('DEPOSIT')}
          className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
        >
          <Icon name="cash" className="w-4 h-4" />
          <span>إيداع نقدية بالدرج</span>
        </button>

        {/* 6. تحويل للخزينة */}
        <button
          type="button"
          onClick={() => openModal('TRANSFER')}
          className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
        >
          <Icon name="refresh" className="w-4 h-4" />
          <span>تحويل للخزينة الرئيسية</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-burgundy/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'transactions' ? 'bg-burgundy text-white shadow-sm' : 'text-burgundy/60 hover:text-burgundy hover:bg-burgundy/5'}`}
        >
          حركات اليوم ({data.transactions?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shifts')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'shifts' ? 'bg-burgundy text-white shadow-sm' : 'text-burgundy/60 hover:text-burgundy hover:bg-burgundy/5'}`}
        >
          سجل الورديات السابقة ({data.recentShifts?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('audit'); if (!auditData) loadSmartAudit(); }}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${activeTab === 'audit' ? 'bg-burgundy text-white shadow-sm' : 'text-burgundy/60 hover:text-burgundy hover:bg-burgundy/5'}`}
        >
          <Icon name="search" className="w-4 h-4" />
          <span>التدقيق المحاسبي الذكي</span>
        </button>
      </div>

      {/* Tab 1: Transactions Table */}
      {activeTab === 'transactions' && (
        <div className="space-y-3">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-burgundy/50 font-bold text-[11px] ml-1">تصفية العرض:</span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'salaries', label: 'رواتب' },
              { id: 'shipping', label: 'نولون شحن' },
              { id: 'rent', label: 'إيجار' },
              { id: 'sales', label: 'مبيعات' },
              { id: 'expenses', label: 'مصاريف أخرى' },
              { id: 'refunds', label: 'مرتجعات' },
              { id: 'deposits', label: 'إيداعات' }
            ].map(pill => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setCategoryFilter(pill.id)}
                className={`px-3 py-1 rounded-lg font-bold transition text-xs ${categoryFilter === pill.id ? 'bg-burgundy text-white shadow-xs' : 'bg-white border border-burgundy/15 text-burgundy/70 hover:bg-burgundy/5'}`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-burgundy/10 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F7F0EC]/60 font-bold text-burgundy/70 border-b border-burgundy/10">
                  <tr>
                    <th className="py-3 px-4">الوقت</th>
                    <th className="py-3 px-4">النوع</th>
                    <th className="py-3 px-4">التصنيف</th>
                    <th className="py-3 px-4">طريقة الدفع</th>
                    <th className="py-3 px-4">المبلغ</th>
                    <th className="py-3 px-4">المسؤول</th>
                    <th className="py-3 px-4">التفاصيل والوصف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-burgundy/5">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-burgundy/40 text-sm">
                        لا توجد حركات مسجلة تطابق التصفية الحالية.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => {
                      const cat = t.category || '';
                      const isSalary = cat === 'صرف رواتب' || cat === 'رواتب' || cat.includes('راتب');
                      const isShipping = cat === 'نولون شحن' || cat.includes('نولون') || cat === 'شحن';
                      const isRent = cat === 'إيجار' || cat === 'ايجار' || cat.includes('إيجار');

                      return (
                        <tr key={t._id} className="hover:bg-burgundy/[0.02] transition">
                          <td className="py-3 px-4 text-burgundy/60 font-mono">
                            {new Date(t.createdAt).toLocaleTimeString('ar-EG-u-nu-latn')}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${t.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {t.type === 'IN' ? 'داخل (+)' : 'خارج (-)'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-burgundy">
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
                                🏢 سداد إيجار
                              </span>
                            ) : t.category === 'Sale' ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                مبيعات
                              </span>
                            ) : t.category === 'Refund' ? (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                مرتجع
                              </span>
                            ) : t.category === 'Deposit' ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                إيداع نقدية
                              </span>
                            ) : t.category === 'Safe Transfer' ? (
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                تحويل خزينة
                              </span>
                            ) : (
                              <span>{t.category}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${t.paymentMethod === 'Cash' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'}`}>
                              {t.paymentMethod === 'Cash' ? 'كاش (الدرج)' : 'إنستاباي / محفظة'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-extrabold text-sm">
                            <span className={t.type === 'IN' ? 'text-emerald-700' : 'text-rose-700'}>
                              {t.type === 'IN' ? '+' : '-'}{EGP(t.amount)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-burgundy/70">
                            {t.user?.name || '—'}
                          </td>
                          <td className="py-3 px-4 text-burgundy/80 max-w-sm">
                            <div className="font-medium">{t.description || '—'}</div>
                            {t.employee && (
                              <div className="text-[10px] text-indigo-700 font-bold mt-0.5">
                                الموظف: {t.employee.name} {t.employee.phone ? `(${t.employee.phone})` : ''}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Shifts History */}
      {activeTab === 'shifts' && (
        <div className="rounded-2xl border border-burgundy/10 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F7F0EC]/60 font-bold text-burgundy/70 border-b border-burgundy/10">
                <tr>
                  <th className="py-3 px-4">وقت الفتح</th>
                  <th className="py-3 px-4">وقت الإغلاق</th>
                  <th className="py-3 px-4">الموظف / الكاشير</th>
                  <th className="py-3 px-4">رصيد البداية</th>
                  <th className="py-3 px-4">النقدية المحصية</th>
                  <th className="py-3 px-4">المتوقع</th>
                  <th className="py-3 px-4">الفارق (عجز/زيادة)</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-burgundy/5">
                {data.recentShifts?.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-burgundy/40 text-sm">
                      لا توجد ورديات سابقة مغلقة مسجلة في النظام.
                    </td>
                  </tr>
                ) : (
                  data.recentShifts.map((s) => {
                    const diff = (s.closingBalance || 0) - (s.expectedCash || 0);
                    return (
                      <tr key={s._id} className="hover:bg-burgundy/[0.02] transition">
                        <td className="py-3 px-4 text-burgundy/60 font-mono">
                          {new Date(s.createdAt).toLocaleString('ar-EG-u-nu-latn')}
                        </td>
                        <td className="py-3 px-4 text-burgundy/60 font-mono">
                          {s.closedAt ? new Date(s.closedAt).toLocaleString('ar-EG-u-nu-latn') : '—'}
                        </td>
                        <td className="py-3 px-4 font-bold text-burgundy">
                          {s.user?.name || '—'}
                        </td>
                        <td className="py-3 px-4 font-semibold">{EGP(s.openingBalance || 0)}</td>
                        <td className="py-3 px-4 font-bold text-burgundy">{EGP(s.closingBalance || 0)}</td>
                        <td className="py-3 px-4 font-bold text-burgundy/70">{EGP(s.expectedCash || 0)}</td>
                        <td className="py-3 px-4 font-extrabold">
                          <span className={diff === 0 ? 'text-emerald-700' : diff > 0 ? 'text-blue-700' : 'text-rose-700'}>
                            {diff === 0 ? 'مطابق' : diff > 0 ? `+${EGP(diff)} زيادة` : `${EGP(diff)} عجز`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handlePrintZReport(s)}
                            className="bg-burgundy/10 hover:bg-burgundy hover:text-white text-burgundy px-3 py-1 rounded-lg text-xs font-bold transition"
                          >
                            طباعة Z-Report
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Smart Audit */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-burgundy/10">
            <div>
              <h3 className="font-bold text-sm text-burgundy">التدقيق المحاسبي الذكي لمصروفات الخزنة</h3>
              <p className="text-xs text-burgundy/60 mt-0.5">
                يفحص النظام حركات الخزنة لاكتشاف أي سداد لمورد أو مسحوبات شخصية أو بنود رواتب ونولون وإيجار سُجلت بشكل غير دقيق.
              </p>
            </div>
            <button
              type="button"
              onClick={loadSmartAudit}
              disabled={auditLoading}
              className="bg-burgundy text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#650018] transition disabled:opacity-50"
            >
              {auditLoading ? 'جاري الفحص...' : 'إعادة الفحص الآن'}
            </button>
          </div>

          {auditLoading ? (
            <div className="py-12 text-center text-burgundy/40 text-sm">جاري تدقيق حركات الخزنة...</div>
          ) : !auditData || auditData.warnings?.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-8 rounded-2xl text-center">
              <Icon name="check" className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-sm">الخزنة مطابقة محاسبياً 100%!</p>
              <p className="text-xs text-emerald-700/80 mt-1">لم يتم العثور على أي مصروفات مصنفة بشكل خاطئ أو تؤثر سلباً على أرباح المحل.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs">تم العثور على {auditData.warningsCount} حركة تحتاج تصحيح تصنيف!</p>
                  <p className="text-[11px] text-amber-800/80">تصحيح هذه الحركات سيضيف لصافي أرباح المحل {EGP(auditData.potentialProfitGain)}</p>
                </div>
              </div>

              <div className="space-y-2">
                {auditData.warnings.map((w) => (
                  <div key={w.id} className="bg-white border border-rose-100 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-rose-700">{w.title}</p>
                      <p className="text-xs text-burgundy/80 mt-0.5">{w.description || 'بدون وصف'} — <span className="font-bold text-burgundy">{EGP(w.amount)}</span></p>
                      <p className="text-[10px] text-burgundy/50 mt-1">{new Date(w.date).toLocaleString('ar-EG-u-nu-latn')} بواسطة: {w.user}</p>
                    </div>
                    <div className="text-left">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await api.put(`/cashier/safe/transaction/${w.id}/category`, { category: w.suggestedCategory });
                            alert('تم تصحيح التصنيف بنجاح!');
                            loadSmartAudit();
                            loadSafe();
                          } catch (e) {
                            alert(e.response?.data?.message || 'فشل التصحيح');
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
                      >
                        تصحيح إلى: {w.suggestedCategory}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Modals */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setModalType(null)}>
          <div className="w-full max-w-lg rounded-[2rem] bg-[#F7F0EC] p-6 sm:p-7 shadow-2xl text-burgundy max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-burgundy/10">
              <h3 className="text-lg font-bold flex items-center gap-2">
                {modalType === 'SALARY' && <><Icon name="salary" className="w-5 h-5 text-indigo-600" /><span>صرف رواتب / سلفة موظف</span></>}
                {modalType === 'SHIPPING' && <><Icon name="shipping" className="w-5 h-5 text-amber-600" /><span>صرف نولون شحن ومصاريف نقل</span></>}
                {modalType === 'RENT' && <><Icon name="rent" className="w-5 h-5 text-purple-600" /><span>سداد إيجار المحل / المقرات</span></>}
                {modalType === 'EXPENSE' && <><Icon name="expenses" className="w-5 h-5 text-rose-600" /><span>صرف مصروف من الخزنة</span></>}
                {modalType === 'DEPOSIT' && <><Icon name="cash" className="w-5 h-5 text-emerald-600" /><span>إيداع نقدية في الدرج</span></>}
                {modalType === 'TRANSFER' && <><Icon name="refresh" className="w-5 h-5 text-blue-600" /><span>تحويل نقدية للخزينة الرئيسية</span></>}
                {modalType === 'OPEN' && <><Icon name="unlock" className="w-5 h-5 text-emerald-600" /><span>فتح وردية جديدة</span></>}
                {modalType === 'CLOSE' && <><Icon name="lock" className="w-5 h-5 text-rose-600" /><span>تقفيل الوردية الحالية</span></>}
              </h3>
              <button onClick={() => setModalType(null)} className="text-burgundy/40 hover:text-burgundy font-bold text-sm">
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="mt-4 space-y-4">
              {/* Payment Method Selector for Outflow/Inflow actions */}
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
                      <span>كاش من الدرج (النقدية)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, paymentMethod: 'Instapay' }))}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${form.paymentMethod === 'Instapay' ? 'bg-blue-100 border-blue-400 text-blue-900 shadow-xs' : 'bg-white border-burgundy/20 text-burgundy/60'}`}
                    >
                      <span>💳</span>
                      <span>إنستاباي / محفظة بنكية</span>
                    </button>
                  </div>
                </div>
              )}

              {/* General Expense Category Selector */}
              {modalType === 'EXPENSE' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-burgundy/70">فئة المصروف</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full rounded-xl border border-burgundy/20 bg-white px-3 py-2.5 text-xs text-burgundy font-bold outline-none focus:border-burgundy"
                  >
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {/* --- 1. SALARY SPECIFIC FIELDS --- */}
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

              {/* --- 2. SHIPPING SPECIFIC FIELDS --- */}
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
                        placeholder="مثال: بوسطة، سيارة نقل، أ/ محمد"
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

              {/* --- 3. RENT SPECIFIC FIELDS --- */}
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

              {/* Amount input */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-burgundy/70">
                  {modalType === 'OPEN' && 'رصيد البداية (العهدة الافتتاحية ج.م)'}
                  {modalType === 'CLOSE' && 'النقدية المحصية فعلياً بالدرج (ج.م)'}
                  {!['OPEN', 'CLOSE'].includes(modalType) && 'المبلغ المطلوب صرفه / إيداعه (ج.م) *'}
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder={modalType === 'CLOSE' ? String(data.summary?.cashDrawer || 0) : '0.00'}
                  className="w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-base font-bold text-burgundy outline-none focus:border-burgundy"
                />
              </div>

              {/* Description / Notes */}
              {!['OPEN', 'CLOSE'].includes(modalType) && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-burgundy/70">ملاحظات إضافية</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="أي تفاصيل أو ملاحظات أخرى..."
                    className="w-full rounded-xl border border-burgundy/20 bg-white px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
                  />
                </div>
              )}

              {/* Safe Impact Summary Box */}
              {!['OPEN', 'CLOSE'].includes(modalType) && (
                <div className="rounded-xl border border-burgundy/10 bg-white p-3 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-burgundy/60 font-medium">
                    <span>التأثير المالي على الخزنة:</span>
                    <span className="font-bold text-burgundy">
                      {form.paymentMethod === 'Cash' ? 'خصم مباشر من نقدية الدرج الكاش' : 'خصم من رصيد إنستاباي / البنك'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-burgundy/60">النقدية الحالية بالدرج:</span>
                    <span className="font-bold text-emerald-700">{EGP(data.summary?.cashDrawer || 0)}</span>
                  </div>
                  {form.amount && Number(form.amount) > 0 && form.paymentMethod === 'Cash' && modalType !== 'DEPOSIT' && (
                    <div className="flex items-center justify-between pt-1 border-t border-burgundy/5 text-rose-700 font-bold">
                      <span>الرصيد المتوقع بعد العملية:</span>
                      <span>{EGP(Math.max(0, (data.summary?.cashDrawer || 0) - Number(form.amount)))}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2.5 pt-3 border-t border-burgundy/10">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-full bg-burgundy py-2.5 text-xs font-bold text-white transition hover:bg-[#650018] disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ والتسجيل...' : (modalType === 'CLOSE' ? 'تأكيد التقفيل' : 'تأكيد وحفظ في الخزنة')}
                </button>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="rounded-full border border-burgundy/20 px-5 py-2.5 text-xs font-semibold text-burgundy hover:bg-burgundy/10 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSafe;
