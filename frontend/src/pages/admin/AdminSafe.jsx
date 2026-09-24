import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';
import { Icon } from '../../components/Icon';
import { exportToCSV } from '../../services/export';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const EXPENSE_CATEGORIES = [
  'مسحوبات شخصية / جمعية',
  'مسحوبات شخصية',
  'انترنت ومرافق',
  'صيانة وإصلاحات',
  'دفع لمورد',
  'كهرباء ومياه',
  'نظافة',
  'ضيافة',
  'أخرى'
];

function AdminSafe() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    transactions: [],
    summary: { cashDrawer: 0, instapayTotal: 0, expenses: 0, personalWithdrawals: 0, supplierPayments: 0, refunds: 0, debtCollections: 0, expectedCash: 0 },
    todaySummary: { cashSales: 0, instapaySales: 0, debtSalesRemaining: 0, totalSales: 0, expenses: 0, personalWithdrawals: 0, supplierPayments: 0, netCashInSafe: 0 },
    recentShifts: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'shifts' | 'audit'

  const [modalType, setModalType] = useState(null); // 'EXPENSE' | 'DEPOSIT' | 'TRANSFER' | 'CLOSE' | 'OPEN'
  const [form, setForm] = useState({ amount: '', category: 'ضيافة', description: '' });
  const [currentShift, setCurrentShift] = useState(null);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

  // Smart audit state
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState(null);

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
        if (!currentShift) return alert('لا يوجد وردية مفتوحة حالياً.');
        const counted = Number(form.amount || data.summary.cashDrawer || 0);
        await api.post('/cashier/shift/close', { countedCash: counted });
        setCurrentShift(null);
      } else if (modalType === 'OPEN') {
        const opening = Number(form.amount || 0);
        const res = await api.post('/cashier/shift/open', { openingBalance: opening });
        setCurrentShift(res.data);
      }
      setModalType(null);
      setForm({ amount: '', category: 'ضيافة', description: '' });
      loadSafe();
      loadShift();
    } catch (error) {
      alert(error.response?.data?.message || 'حدث خطأ أثناء تنفيذ العملية');
    }
  };

  const handleExport = () => {
    const headers = ['الوقت', 'نوع العملية', 'التصنيف', 'طريقة الدفع', 'المبلغ', 'المسؤول', 'التفاصيل'];
    const rows = data.transactions.map(t => [
      new Date(t.createdAt).toLocaleTimeString('ar-EG-u-nu-latn'),
      t.type === 'IN' ? 'داخل' : 'خارج',
      t.category === 'Sale' ? 'مبيعات' : t.category === 'Refund' ? 'مرتجع' : t.category === 'Deposit' ? 'إيداع' : t.category === 'Safe Transfer' ? 'تحويل للخزينة' : t.category === 'Expense' ? 'مصروف' : t.category,
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
    const cashSales = data.todaySummary?.cashSales || 0;
    const instapaySales = data.todaySummary?.instapaySales || 0;
    const expenses = data.todaySummary?.expenses || 0;
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
            <tr><td style="padding:4px 0;">مبيعات نقدية (كاش):</td><td style="text-align:left; font-weight:bold; color:green;">+ ${EGP(cashSales)}</td></tr>
            <tr><td style="padding:4px 0;">مرتجعات مستردة (اليوم):</td><td style="text-align:left; font-weight:bold; color:#b91c1c;">- ${EGP(data.todaySummary?.refunds || data.summary?.refunds || 0)}</td></tr>
            <tr><td style="padding:4px 0;">مبيعات إلكترونية (إنستاباي):</td><td style="text-align:left; font-weight:bold;">${EGP(instapaySales)}</td></tr>
            <tr><td style="padding:4px 0;">مصروفات تشغيل الخزنة:</td><td style="text-align:left; font-weight:bold; color:red;">- ${EGP(expenses)}</td></tr>
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

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-burgundy/50">النظام المالي</p>
          <h2 className="text-2xl font-black text-burgundy">الخزنة والدرج الرئيسي (إدارة المحل)</h2>
          <p className="text-xs text-burgundy/60 mt-1">
            متابعة دقيقة لحركة نقدية الدرج، الإيداعات، المصروفات، والورديات لحظة بلحظة.
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
                onClick={() => setModalType('CLOSE')}
                className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
              >
                تقفيل الوردية (Z-Report)
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setModalType('OPEN')}
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
            onClick={loadSafe}
            className="border border-burgundy/20 bg-white hover:bg-burgundy/5 text-burgundy font-bold text-xs p-2 rounded-xl transition shadow-sm"
            title="تحديث البيانات"
          >
            <Icon name="refresh" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context Banner: this page = CRUD operations, statements page = detail view */}
      <div className="flex items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 text-emerald-800">
          <Icon name="safe" className="w-4 h-4 shrink-0" />
          <p className="text-xs font-semibold">هذه الصفحة لإدارة الخزنة (إضافة مصروف، فتح/تقفيل وردية، إيداع). للتفاصيل المحاسبية الكاملة لحركة الدرج، اضغط كشف الحساب.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/statements?tab=safe')}
          className="shrink-0 text-xs font-bold text-emerald-700 border border-emerald-300 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
        >
          <Icon name="statement" className="w-3.5 h-3.5" />
          <span>كشف حساب الدرج</span>
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
          <p className="text-[11px] font-bold text-burgundy/60">مصاريف التشغيل</p>
          <p className="text-xl font-black text-rose-700">{EGP(data.summary?.expenses || 0)}</p>
          <p className="text-[10px] text-burgundy/40">صيانة، ضيافة، مرافق</p>
        </div>

        {/* Personal Withdrawals */}
        <div className="bg-white border border-burgundy/10 p-4 rounded-2xl shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-purple-900/70">مسحوبات شخصية / جمعية</p>
          <p className="text-xl font-black text-purple-800">{EGP(data.summary?.personalWithdrawals || 0)}</p>
          <p className="text-[10px] text-purple-900/40">مستبعدة من أرباح التشغيل</p>
        </div>

        {/* Supplier Payments from Safe */}
        <div className="bg-white border border-burgundy/10 p-4 rounded-2xl shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-amber-900/70">مدفوعات الموردين (الدرج)</p>
          <p className="text-xl font-black text-amber-800">{EGP(data.summary?.supplierPayments || 0)}</p>
          <p className="text-[10px] text-amber-900/40">خرجت من نقدية المحل</p>
        </div>

                {/* Returns / Refunds */}
        <div className="bg-rose-50 border border-rose-200/80 text-rose-900 p-4 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-rose-800">مرتجعات اليوم</p>
            <Icon name="returns" className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-black text-rose-700">{EGP(data.todaySummary?.refunds ?? data.summary?.refunds ?? 0)}</p>
          <p className="text-[10px] text-rose-800/70">كاش: {EGP(data.todaySummary?.refundsCash || 0)} | إنستاباي: {EGP(data.todaySummary?.refundsInstapay || 0)}</p>
        </div>

        {/* Debt Collections */}
        <div className="bg-white border border-burgundy/10 p-4 rounded-2xl shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-emerald-900/70">تحصيلات ديون</p>
          <p className="text-xl font-black text-emerald-700">{EGP(data.summary?.debtCollections || 0)}</p>
          <p className="text-[10px] text-emerald-900/40">نقدية محصلة من عملاء</p>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-2.5 bg-burgundy/3 p-3.5 rounded-2xl border border-burgundy/10">
        <span className="text-xs font-bold text-burgundy/70 ml-2">إجراءات سريعة:</span>
        <button
          type="button"
          onClick={() => { setForm({ amount: '', category: 'ضيافة', description: '' }); setModalType('EXPENSE'); }}
          className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
        >
          <Icon name="expenses" className="w-4 h-4" />
          <span>صرف مصروف</span>
        </button>

        <button
          type="button"
          onClick={() => { setForm({ amount: '', category: 'Deposit', description: '' }); setModalType('DEPOSIT'); }}
          className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
        >
          <Icon name="cash" className="w-4 h-4" />
          <span>إيداع نقدية بالدرج</span>
        </button>

        <button
          type="button"
          onClick={() => { setForm({ amount: '', category: 'Safe Transfer', description: '' }); setModalType('TRANSFER'); }}
          className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
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
                {data.transactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-burgundy/40 text-sm">
                      لا توجد حركات مسجلة في الخزنة اليوم حتى الآن.
                    </td>
                  </tr>
                ) : (
                  data.transactions.map((t) => (
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
                        {t.category === 'Sale' ? 'مبيعات' : t.category === 'Refund' ? 'مرتجع' : t.category === 'Deposit' ? 'إيداع نقدية' : t.category === 'Safe Transfer' ? 'تحويل خزينة' : t.category === 'DebtPayment' ? 'سداد دين' : t.category}
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
                      <td className="py-3 px-4 text-burgundy/70 max-w-xs truncate">
                        {t.description || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
                يفحص النظام حركات الخزنة لاكتشاف أي سداد لمورد أو مسحوبات شخصية سُجلت بالخطأ كمصروف تشغيلي، مما يصحح أرباح المحل.
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
          <div className="w-full max-w-md rounded-[2rem] bg-[#F7F0EC] p-7 shadow-2xl text-burgundy" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-burgundy/10">
              <h3 className="text-lg font-bold flex items-center gap-2">
                {modalType === 'EXPENSE' && <><Icon name="expenses" className="w-5 h-5 text-rose-600" /><span>صرف مصروف من الدرج</span></>}
                {modalType === 'DEPOSIT' && <><Icon name="cash" className="w-5 h-5 text-emerald-600" /><span>إيداع نقدية في الدرج</span></>}
                {modalType === 'TRANSFER' && <><Icon name="refresh" className="w-5 h-5 text-blue-600" /><span>تحويل نقدية للخزينة الرئيسية</span></>}
                {modalType === 'OPEN' && <><Icon name="unlock" className="w-5 h-5 text-emerald-600" /><span>فتح وردية جديدة</span></>}
                {modalType === 'CLOSE' && <><Icon name="lock" className="w-5 h-5 text-rose-600" /><span>تقفيل الوردية الحالية</span></>}
              </h3>
              <button onClick={() => setModalType(null)} className="text-burgundy/40 hover:text-burgundy font-bold text-sm"><Icon name="close" className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="mt-4 space-y-4">
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

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-burgundy/70">
                  {modalType === 'OPEN' && 'رصيد البداية (العهدة الافتتاحية ج.م)'}
                  {modalType === 'CLOSE' && 'النقدية المحصية فعلياً بالدرج (ج.م)'}
                  {(modalType === 'EXPENSE' || modalType === 'DEPOSIT' || modalType === 'TRANSFER') && 'المبلغ (ج.م) *'}
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder={modalType === 'CLOSE' ? String(data.summary?.cashDrawer || 0) : '0.00'}
                  className="w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm font-bold text-burgundy outline-none focus:border-burgundy"
                />
              </div>

              {(modalType === 'EXPENSE' || modalType === 'DEPOSIT' || modalType === 'TRANSFER') && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-burgundy/70">الوصف / ملاحظات</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="سبب الحركة أو التفاصيل..."
                    className="w-full rounded-xl border border-burgundy/20 bg-white px-3 py-2 text-xs text-burgundy outline-none focus:border-burgundy"
                  />
                </div>
              )}

              <div className="flex gap-2.5 pt-3 border-t border-burgundy/10">
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-burgundy py-2.5 text-xs font-bold text-white transition hover:bg-[#650018]"
                >
                  {modalType === 'CLOSE' ? 'تأكيد التقفيل' : 'تأكيد وحفظ'}
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
