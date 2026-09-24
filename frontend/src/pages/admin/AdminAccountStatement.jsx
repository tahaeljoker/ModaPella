import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { exportToCSV } from '../../services/export';
import { Icon } from '../../components/Icon';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;
const SHORT_ID = (id) => id?.slice(-6).toUpperCase() || '------';
const TIME = (d) => new Date(d).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
const DATE = (d) => new Date(d).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' });

export default function AdminAccountStatement() {
  const [tab, setTab] = useState('all'); // 'all' | 'suppliers' | 'returns' | 'instapay' | 'safe' | 'expenses'
  const [period, setPeriod] = useState('current'); // 'today' | 'current' | 'previous' | 'all' | 'custom'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    summary: {},
    suppliersList: [],
    returnedOrders: [],
    statements: []
  });

  const loadStatements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('tab', tab);

      if (period === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        params.append('from', todayStr);
        params.append('to', todayStr);
      } else if (period === 'current') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        params.append('from', startOfMonth);
        params.append('to', endOfMonth);
      } else if (period === 'previous') {
        const now = new Date();
        const startOfPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        const endOfPrev = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        params.append('from', startOfPrev);
        params.append('to', endOfPrev);
      } else if (period === 'custom' && dateFrom && dateTo) {
        params.append('from', dateFrom);
        params.append('to', dateTo);
      }

      if (selectedSupplier && tab === 'suppliers') {
        params.append('supplierId', selectedSupplier);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const res = await api.get(`/reports/statements?${params.toString()}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load statements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatements();
  }, [tab, period, selectedSupplier]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    loadStatements();
  };

  const handleExportCSV = () => {
    if (!data.statements || data.statements.length === 0) return;
    const headers = ['التاريخ', 'القسم', 'نوع الحركة', 'البيان', 'الجهة / الطرف', 'وسيلة الدفع', 'المبلغ (ج.م)', 'رقم الإشارة'];
    const rows = data.statements.map(s => [
      new Date(s.date).toLocaleString('ar-EG-u-nu-latn'),
      s.section,
      s.type,
      s.description,
      s.partyName,
      s.paymentMethod,
      s.amount,
      s.reference
    ]);
    exportToCSV(`كشف_حساب_${tab}_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const handlePrintStatement = () => {
    const now = new Date().toLocaleString('ar-EG-u-nu-latn');
    let title = 'كشف حساب شامل';
    if (tab === 'suppliers') {
      const sObj = data.suppliersList?.find(s => s.supplier?._id === selectedSupplier);
      title = sObj ? `كشف حساب المورد: ${sObj.supplier?.name}` : 'كشف حساب الموردين العام';
    } else if (tab === 'returns') {
      title = 'كشف حساب المرتجعات والاستردادات';
    } else if (tab === 'instapay') {
      title = 'كشف حساب تحويلات إنستاباي الإلكترونية';
    } else if (tab === 'safe') {
      title = 'كشف حساب الدرج النقدي (الخزينة)';
    } else if (tab === 'expenses') {
      title = 'كشف حساب المصروفات والمسحوبات';
    }

    const printDiv = document.createElement('div');
    printDiv.id = 'invoice-print-root';
    printDiv.innerHTML = `
      <div style="font-family:Cairo,sans-serif; direction:rtl; padding:20px; color:#1e1e1e;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #7c0a12; padding-bottom:12px; margin-bottom:15px;">
          <div>
            <h1 style="color:#7c0a12; margin:0; font-size:22px;">ModaPella</h1>
            <p style="margin:4px 0 0; font-size:12px; color:#666;">نظام إدارة الحسابات المالية والتدقيق</p>
          </div>
          <div style="text-align:left;">
            <h3 style="margin:0; font-size:16px;">${title}</h3>
            <p style="margin:4px 0 0; font-size:11px; color:#888;">تاريخ التصدير: ${now}</p>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:11px; margin-top:10px;">
          <thead>
            <tr style="background:#7c0a12; color:#fff;">
              <th style="padding:6px; border:1px solid #ddd;">#</th>
              <th style="padding:6px; border:1px solid #ddd;">التاريخ</th>
              <th style="padding:6px; border:1px solid #ddd;">نوع الحركة</th>
              <th style="padding:6px; border:1px solid #ddd;">البيان والتفاصيل</th>
              <th style="padding:6px; border:1px solid #ddd;">الطرف</th>
              <th style="padding:6px; border:1px solid #ddd;">طريقة الدفع</th>
              <th style="padding:6px; border:1px solid #ddd; text-align:left;">المبلغ (ج.م)</th>
            </tr>
          </thead>
          <tbody>
            ${data.statements.map((s, idx) => `
              <tr style="background:${idx % 2 === 0 ? '#fff' : '#fcf9f8'};">
                <td style="padding:6px; border:1px solid #eee; text-align:center;">${idx + 1}</td>
                <td style="padding:6px; border:1px solid #eee;">${new Date(s.date).toLocaleDateString('ar-EG-u-nu-latn')} ${new Date(s.date).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' })}</td>
                <td style="padding:6px; border:1px solid #eee; font-weight:bold;">${s.type}</td>
                <td style="padding:6px; border:1px solid #eee;">${s.description} ${s.reference ? `(${s.reference})` : ''}</td>
                <td style="padding:6px; border:1px solid #eee;">${s.partyName || '—'}</td>
                <td style="padding:6px; border:1px solid #eee;">${s.paymentMethod || '—'}</td>
                <td style="padding:6px; border:1px solid #eee; text-align:left; font-weight:bold; color:${s.flow === 'OUT' || s.flow === 'DEBT_DECREASE' ? '#b91c1c' : '#15803d'};">
                  ${Number(s.amount).toLocaleString('en-US')} ج.م
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top:20px; border-top:1px solid #ddd; padding-top:10px; display:flex; justify-content:space-between; font-size:12px; font-weight:bold;">
          <span>إجمالي الحركات في الكشف: ${data.statements.length} حركة</span>
          <span>إجمالي المبالغ: ${EGP(data.statements.reduce((sum, s) => sum + s.amount, 0))}</span>
        </div>
        <div style="margin-top:30px; text-align:center; font-size:10px; color:#aaa;">
          تم استخراج هذا الكشف آلياً بواسطة نظام ModaPella للمحاسبة
        </div>
      </div>
    `;
    document.body.appendChild(printDiv);
    setTimeout(() => {
      window.print();
      document.body.removeChild(printDiv);
    }, 100);
  };

  const tabs = [
    { id: 'all', label: 'كشف شامل', icon: 'statement', desc: 'كل المعاملات المالية' },
    { id: 'suppliers', label: 'كشف حساب الموردين', icon: 'suppliers', desc: 'مشتريات، دفعات، مرتجعات لموردين' },
    { id: 'returns', label: 'كشف حساب المرتجعات', icon: 'returns', desc: 'كل مرتجعات الزبائن وتفاصيلها' },
    { id: 'instapay', label: 'كشف حساب إنستاباي', icon: 'lightning', desc: 'المقبوضات والمرتجعات الإلكترونية' },
    { id: 'safe', label: 'كشف حساب الدرج النقدي', icon: 'safe', desc: 'وارد ومنصرف النقدية بالدرج' },
    { id: 'expenses', label: 'المصروفات والمسحوبات', icon: 'expenses', desc: 'مصاريف التشغيل وسحوبات الشركاء' },
  ];

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-burgundy/50 font-bold">المالية والحسابات العامة</p>
          <h1 className="mt-1 text-2xl font-black text-burgundy flex items-center gap-2">
            <span>كشف حساب شامل ودقيق</span>
            <span className="text-xs font-bold bg-burgundy/10 text-burgundy px-2.5 py-0.5 rounded-full">دفتر الأستاذ العام</span>
          </h1>
          <p className="text-xs text-burgundy/60 mt-1">
            متابعة وتدقيق كشوف الحسابات التفصيلية للموردين، المرتجعات، إنستاباي، والدرج النقدي
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrintStatement}
            className="bg-burgundy text-white hover:bg-[#650018] font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <Icon name="print" className="w-4 h-4" />
            <span>طباعة كشف الحساب</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="border border-burgundy/20 bg-white hover:bg-burgundy/5 text-burgundy font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <Icon name="download" className="w-4 h-4" />
            <span>تصدير CSV</span>
          </button>
          <button
            type="button"
            onClick={loadStatements}
            className="border border-burgundy/20 bg-white hover:bg-burgundy/5 text-burgundy font-bold text-xs p-2 rounded-xl transition shadow-sm"
            title="تحديث البيانات"
          >
            <Icon name="refresh" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date & Period Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-burgundy/10 shadow-sm">
        {/* Quick Period Buttons */}
        <div className="flex flex-wrap rounded-xl border border-burgundy/15 bg-[#fcf9f8] p-1 text-xs font-semibold">
          {[
            { id: 'today', l: 'اليوم' },
            { id: 'current', l: 'الشهر الجاري' },
            { id: 'previous', l: 'الشهر السابق' },
            { id: 'all', l: 'كل الأوقات' },
            { id: 'custom', l: 'فترة مخصصة' }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`rounded-lg px-3 py-1.5 text-xs transition font-bold ${
                period === p.id ? 'bg-burgundy text-white shadow-sm' : 'text-burgundy/70 hover:text-burgundy'
              }`}
            >
              {p.l}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs if custom selected */}
        {period === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-burgundy/60 font-semibold">من:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="rounded-xl border border-burgundy/20 px-2.5 py-1 text-xs outline-none focus:border-burgundy"
            />
            <span className="text-burgundy/60 font-semibold">إلى:</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="rounded-xl border border-burgundy/20 px-2.5 py-1 text-xs outline-none focus:border-burgundy"
            />
            <button
              type="button"
              onClick={loadStatements}
              className="rounded-xl bg-burgundy px-3 py-1 text-white font-bold text-xs"
            >
              تطبيق
            </button>
          </div>
        )}

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px] max-w-sm">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم، الكود، البيان، أو الهاتف..."
            className="w-full rounded-xl border border-burgundy/20 bg-[#fcf9f8] px-3.5 py-1.5 pr-8 text-xs text-burgundy outline-none focus:border-burgundy"
          />
          <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-burgundy/40 text-xs">
            <Icon name="search" className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Primary KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Suppliers Balance */}
        <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-amber-900/70">مشتريات الموردين (الفترة)</p>
          <p className="text-xl font-black text-amber-800">{EGP(data.summary?.totalSuppliersPurchases || 0)}</p>
          <p className="text-[10px] text-amber-900/60">
            مسدد: {EGP(data.summary?.totalSuppliersPayments || 0)} | مرتجع: {EGP(data.summary?.totalSuppliersReturns || 0)}
          </p>
        </div>

        {/* Returns */}
        <div className="bg-rose-50/80 border border-rose-200 p-4 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-rose-900/70">المرتجعات المستردة</p>
            <Icon name="returns" className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-black text-rose-700">{EGP(data.summary?.totalReturnsAmount || 0)}</p>
          <p className="text-[10px] text-rose-900/60">
            كاش: {EGP(data.summary?.returnsCash || 0)} | إنستاباي: {EGP(data.summary?.returnsInstapay || 0)} ({data.summary?.returnsCount || 0} حركة)
          </p>
        </div>

        {/* Instapay Net */}
        <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-blue-900/70">صافي حركة إنستاباي</p>
          <p className="text-xl font-black text-blue-800">{EGP(data.summary?.netInstapay || 0)}</p>
          <p className="text-[10px] text-blue-900/60">
            مقبوضات: {EGP(data.summary?.totalInstapayIn || 0)} | خارج: -{EGP(data.summary?.totalInstapayOut || 0)}
          </p>
        </div>

        {/* Cash Safe Drawer */}
        <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-emerald-900/70">صافي نقدية الدرج (الكاش)</p>
          <p className="text-xl font-black text-emerald-800">{EGP(data.summary?.netSafeCash || 0)}</p>
          <p className="text-[10px] text-emerald-900/60">
            داخل كاش: {EGP(data.summary?.totalSafeCashIn || 0)} | خارج كاش: -{EGP(data.summary?.totalSafeCashOut || 0)}
          </p>
        </div>

        {/* Expenses & Withdrawals */}
        <div className="bg-purple-50/60 border border-purple-200 p-4 rounded-2xl shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-purple-900/70">المصروفات والمسحوبات</p>
          <p className="text-xl font-black text-purple-800">{EGP((data.summary?.totalExpenses || 0) + (data.summary?.totalPersonalWithdrawals || 0))}</p>
          <p className="text-[10px] text-purple-900/60">
            تشغيل: {EGP(data.summary?.totalExpenses || 0)} | مسحوبات: {EGP(data.summary?.totalPersonalWithdrawals || 0)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-burgundy/10 pb-2">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              tab === t.id
                ? 'bg-burgundy text-white shadow-sm'
                : 'text-burgundy/70 bg-white border border-burgundy/10 hover:bg-burgundy/5'
            }`}
          >
            {t.icon && <Icon name={t.icon} className="w-4 h-4" />}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Special Sub-header for Suppliers Tab: Supplier Picker */}
      {tab === 'suppliers' && (
        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-900">تصفية حسب مورد محدد:</span>
            <select
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
              className="rounded-xl border border-amber-300 bg-amber-50/50 px-3 py-1.5 text-xs font-bold text-amber-900 outline-none focus:border-amber-500"
            >
              <option value="">جميع الموردين ({data.suppliersList?.length || 0})</option>
              {data.suppliersList?.map(s => (
                <option key={s.supplier?._id} value={s.supplier?._id}>
                  {s.supplier?.name} (رصيد مستحق: {EGP(s.balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Balances Quick Grid */}
          <div className="flex flex-wrap gap-2 text-xs">
            {data.suppliersList?.slice(0, 4).map(s => (
              <div
                key={s.supplier?._id}
                onClick={() => setSelectedSupplier(selectedSupplier === s.supplier?._id ? '' : s.supplier?._id)}
                className={`cursor-pointer px-3 py-1 rounded-lg border text-[11px] font-bold transition ${
                  selectedSupplier === s.supplier?._id
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span>{s.supplier?.name}: </span>
                <span className="font-mono">{EGP(s.balance)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Special Sub-header for Returns Tab: Itemized List of Returned Orders */}
      {tab === 'returns' && data.returnedOrders?.length > 0 && (
        <div className="bg-rose-50/40 p-4 rounded-2xl border border-rose-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-rose-900">ملخص الفواتير والقطع المرتجعة خلال الفترة:</h3>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {data.returnedOrders.map(o => (
              <div key={o.id} className="bg-white p-3 rounded-xl border border-rose-200/80 shadow-xs space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-burgundy">{o.code}</span>
                  <span className="text-[10px] text-burgundy/50">{DATE(o.date)}</span>
                </div>
                <p className="text-[11px] font-semibold text-burgundy/80">العميل: {o.customerName} {o.customerPhone ? `(${o.customerPhone})` : ''}</p>
                <div className="text-[10px] bg-rose-50 text-rose-900 p-1.5 rounded-lg space-y-0.5">
                  {o.items?.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>• {it.name} ({it.size || '-'}/{it.color || '-'}) × {it.returnedQuantity}</span>
                      <span className="font-bold">{EGP(it.returnedQuantity * it.price)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-rose-100">
                  <span className="text-rose-800">طريقة الاسترداد: {o.paymentMethod === 'Instapay' ? 'إنستاباي' : 'كاش'}</span>
                  <span className="text-rose-700">{EGP(o.returnedAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statements Table */}
      <div className="overflow-hidden rounded-[2rem] border border-burgundy/10 bg-white shadow-sm">
        <div className="p-4 border-b border-burgundy/10 flex items-center justify-between">
          <h3 className="font-bold text-sm text-burgundy">
            سجل المعاملات والحركات ({data.statements?.length || 0})
          </h3>
          <span className="text-xs text-burgundy/50">مرتب من الأحدث للأقدم</span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
          </div>
        ) : !data.statements || data.statements.length === 0 ? (
          <div className="py-16 text-center text-burgundy/40 space-y-2">
            <Icon name="statement" className="w-12 h-12 mx-auto text-burgundy/30 mb-2" />
            <p className="text-sm font-bold">لا توجد حركات مسجلة مطابقة للبحث أو الفترة المختارة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-burgundy/5 text-burgundy font-bold text-[11px] border-b border-burgundy/10">
                <tr>
                  <th className="py-3 px-4">التاريخ والوقت</th>
                  <th className="py-3 px-4">القسم</th>
                  <th className="py-3 px-4">نوع الحركة</th>
                  <th className="py-3 px-4">البيان والتفاصيل</th>
                  <th className="py-3 px-4">الجهة / الطرف</th>
                  <th className="py-3 px-4">وسيلة الدفع / القناة</th>
                  <th className="py-3 px-4 text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-burgundy/5">
                {data.statements.map(s => {
                  const isOut = s.flow === 'OUT' || s.flow === 'DEBT_DECREASE';
                  const isSupplierPurchase = s.type === 'مشتريات بضاعة';

                  return (
                    <tr key={s.id} className="hover:bg-burgundy/[0.02] transition">
                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold block text-burgundy">{DATE(s.date)}</span>
                        <span className="text-[10px] text-burgundy/50">{TIME(s.date)}</span>
                      </td>

                      {/* Section */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-burgundy/70 bg-burgundy/5 px-2 py-0.5 rounded-lg text-[10px]">
                          {s.section}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`font-bold px-2.5 py-1 rounded-xl text-[10px] ${
                          s.typeColor === 'emerald'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.typeColor === 'rose'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : s.typeColor === 'amber'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {s.type}
                        </span>
                      </td>

                      {/* Description & Reference */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-semibold text-burgundy">{s.description}</p>
                        {s.reference && (
                          <span className="text-[10px] text-burgundy/40 font-mono">مرجع: {s.reference}</span>
                        )}
                        {s.itemsCount > 0 && (
                          <span className="text-[10px] text-amber-800 block">
                            ({s.itemsCount} صنف بضاعة)
                          </span>
                        )}
                      </td>

                      {/* Party */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-burgundy block">{s.partyName || '—'}</span>
                        {s.partyPhone && (
                          <span className="text-[10px] text-burgundy/40 block font-mono">{s.partyPhone}</span>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[11px] text-burgundy/80 font-medium">{s.paymentMethod || '—'}</span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        <span className={`text-sm font-black ${
                          isOut
                            ? 'text-rose-600'
                            : isSupplierPurchase
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}>
                          {isOut ? '-' : '+'} {EGP(s.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
