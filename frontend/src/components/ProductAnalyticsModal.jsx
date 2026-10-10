import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const PERIOD_OPTIONS = [
  { id: 'all', label: 'كل الفترات' },
  { id: 'this_month', label: 'هذا الشهر' },
  { id: 'last_month', label: 'الشهر السابق' },
  { id: 'last_30_days', label: 'آخر 30 يوم' },
  { id: 'last_7_days', label: 'آخر 7 أيام' },
  { id: 'custom', label: 'تاريخ مخصص 📅' }
];

export default function ProductAnalyticsModal({ product, onClose, onOpenCategoryAnalytics }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'history' | 'suppliers'
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustomInputs, setShowCustomInputs] = useState(false);

  const productId = product?._id || product?.id;

  const loadAnalytics = useCallback((period = selectedPeriod, from = customFrom, to = customTo) => {
    if (!productId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (period === 'custom' && from && to) {
      params.append('from', from);
      params.append('to', to);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    api.get(`/admin/products/${productId}/analytics${qs}`)
      .then(res => setData(res.data))
      .catch(err => {
        console.error('Failed to load product analytics:', err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [productId, selectedPeriod, customFrom, customTo]);

  useEffect(() => {
    loadAnalytics(selectedPeriod, customFrom, customTo);
  }, [productId, selectedPeriod]);

  const handlePeriodChange = (periodId) => {
    if (periodId === 'custom') {
      setShowCustomInputs(true);
      setSelectedPeriod('custom');
    } else {
      setShowCustomInputs(false);
      setSelectedPeriod(periodId);
      loadAnalytics(periodId);
    }
  };

  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (!customFrom || !customTo) return;
    loadAnalytics('custom', customFrom, customTo);
  };

  const p = data?.product || product;
  const m = data?.metrics;
  const periodInfo = data?.periodInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm" onClick={onClose} dir="rtl">
      <div 
        className="w-full max-w-4xl overflow-hidden rounded-[2.5rem] bg-[#FDFBF7] shadow-2xl border border-burgundy/15 max-h-[94vh] flex flex-col text-burgundy"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-burgundy/10 px-6 sm:px-8 py-5 bg-white gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-burgundy/10 flex items-center justify-center text-burgundy font-bold text-xl shadow-inner flex-shrink-0">
              🏷️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-burgundy">{p?.name}</h3>
                {p?.sku && (
                  <span className="font-mono text-xs bg-burgundy/10 px-2 py-0.5 rounded-lg text-burgundy font-bold">
                    #{p.sku}
                  </span>
                )}
                {periodInfo && (
                  <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 rounded-full font-bold">
                    📅 {periodInfo.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-burgundy/60 mt-0.5">
                الفئة: <strong>{p?.category}</strong> {p?.supplier ? `· المورد: ${p.supplier}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onOpenCategoryAnalytics && p?.category && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCategoryAnalytics(p.category);
                }}
                className="text-xs bg-burgundy/10 hover:bg-burgundy hover:text-white text-burgundy font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="عرض أداء ومبيعات هذا القسم بالكامل"
              >
                <span>📊</span>
                <span>نشاط قسم {p.category} ←</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="w-9 h-9 rounded-full bg-burgundy/5 hover:bg-burgundy/15 flex items-center justify-center text-burgundy/60 hover:text-burgundy transition font-bold cursor-pointer"
              title="إغلاق"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="bg-[#F7F2EC] px-6 sm:px-8 py-3 border-b border-burgundy/10 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-burgundy/70 ml-1">تحديد الفترة:</span>
            {PERIOD_OPTIONS.map(opt => {
              const isActive = selectedPeriod === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handlePeriodChange(opt.id)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-burgundy text-white shadow-sm'
                      : 'bg-white hover:bg-burgundy/10 text-burgundy/80 border border-burgundy/10'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Form */}
          {showCustomInputs && (
            <form onSubmit={handleApplyCustom} className="flex items-center gap-2 flex-wrap bg-white px-3 py-1.5 rounded-xl border border-burgundy/20 shadow-xs">
              <span className="text-[11px] font-bold text-burgundy/70">من:</span>
              <input 
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border border-burgundy/20 bg-burgundy/5 text-burgundy font-semibold outline-none focus:border-burgundy"
                required
              />
              <span className="text-[11px] font-bold text-burgundy/70">إلى:</span>
              <input 
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border border-burgundy/20 bg-burgundy/5 text-burgundy font-semibold outline-none focus:border-burgundy"
                required
              />
              <button 
                type="submit"
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg transition shadow-xs cursor-pointer"
              >
                تطبيق
              </button>
            </form>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
              <p className="text-xs text-burgundy/60 font-semibold">جارٍ تحليل أداء وحركة الصنف للفترة المحددة...</p>
            </div>
          ) : !m ? (
            <div className="py-12 text-center text-sm text-burgundy/50">تعذر تحميل بيانات النشاط لهذا المنتج.</div>
          ) : (
            <>
              {/* Velocity Banner */}
              <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                m.velocity.status === 'fast' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : m.velocity.status === 'dead' 
                  ? 'bg-rose-50 border-rose-200 text-rose-900' 
                  : m.velocity.status === 'empty'
                  ? 'bg-slate-100 border-slate-300 text-slate-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{m.velocity.badge.split(' ')[0]}</span>
                  <div>
                    <h4 className="font-bold text-sm">{m.velocity.badge}</h4>
                    <p className="text-xs opacity-80 mt-0.5">{m.velocity.label}</p>
                  </div>
                </div>
                <div className="text-left font-mono">
                  <span className="text-xs block opacity-75">معدل التصريف في الفترة</span>
                  <span className="text-lg font-bold">{m.sellThroughRate}%</span>
                </div>
              </div>

              {/* Zero-sales notice for filtered period */}
              {m.netSold === 0 && selectedPeriod !== 'all' && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <span className="text-base">ℹ️</span>
                    <span>لم تسجل أي مبيعات لهذا الصنف خلال <strong>{periodInfo?.label || 'الفترة المحددة'}</strong>.</span>
                  </div>
                  {data?.lifetimeOrdersCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handlePeriodChange('all')}
                      className="bg-burgundy text-white hover:bg-burgundy/90 px-3 py-1.5 rounded-xl font-bold transition shadow-xs flex-shrink-0 cursor-pointer"
                    >
                      عرض نشاط كل الفترات ({data.lifetimeOrdersCount} فاتورة) ←
                    </button>
                  )}
                </div>
              )}

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                {/* 1. Net Sold */}
                <div className="p-4 rounded-2xl bg-white border border-burgundy/10 shadow-sm">
                  <span className="text-xs font-semibold text-burgundy/60 block">صافي المباع في الفترة</span>
                  <span className="text-2xl font-bold text-burgundy mt-1 block">
                    {m.netSold} <span className="text-xs font-normal text-burgundy/50">قطعة</span>
                  </span>
                  <span className="text-[11px] text-burgundy/50 mt-1 block">
                    مبيعات: {m.unitsSoldGross} | مرتجع: {m.unitsReturned}
                  </span>
                </div>

                {/* 2. Stock Balance */}
                <div className="p-4 rounded-2xl bg-white border border-burgundy/10 shadow-sm">
                  <span className="text-xs font-semibold text-burgundy/60 block">المخزون الفعلي الحالي</span>
                  <span className="text-2xl font-bold text-burgundy mt-1 block">
                    {m.currentStock} <span className="text-xs font-normal text-burgundy/50">قطعة</span>
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
                    إجمالي التوريد: {m.totalReceived} قطعة
                  </span>
                </div>

                {/* 3. Gross Profit */}
                <div className="p-4 rounded-2xl bg-white border border-burgundy/10 shadow-sm">
                  <span className="text-xs font-semibold text-burgundy/60 block">صافي أرباح الصنف بالفترة</span>
                  <span className={`text-2xl font-bold mt-1 block ${m.grossProfit > 0 ? 'text-emerald-700' : m.grossProfit < 0 ? 'text-rose-600' : 'text-burgundy/60'}`}>
                    {EGP(m.grossProfit)}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
                    هامش الربح: {m.profitMargin}%
                  </span>
                </div>

                {/* 4. Total Revenue */}
                <div className="p-4 rounded-2xl bg-white border border-burgundy/10 shadow-sm">
                  <span className="text-xs font-semibold text-burgundy/60 block">إجمالي إيراد المبيعات</span>
                  <span className="text-2xl font-bold text-burgundy mt-1 block">
                    {EGP(m.totalRevenue)}
                  </span>
                  <span className="text-[11px] text-burgundy/50 mt-1 block">
                    تكلفة البضاعة COGS: {EGP(m.totalCost)}
                  </span>
                </div>
              </div>

              {/* Price Details Bar */}
              <div className="p-3.5 bg-burgundy/5 rounded-2xl border border-burgundy/10 flex flex-wrap items-center justify-between text-xs font-medium gap-2">
                <div>
                  سعر البيع المعروض: <strong className="text-burgundy font-bold text-sm">{EGP(p?.effectivePrice || p?.price)}</strong>
                </div>
                <div>
                  سعر التكلفة (الجملة): <strong className="text-burgundy/80 font-bold">{EGP(p?.costPrice || 0)}</strong>
                </div>
                <div>
                  الربح التقديري في القطعة: <strong className="text-emerald-700 font-bold">+{EGP((p?.effectivePrice || p?.price) - (p?.costPrice || 0))}</strong>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="border-b border-burgundy/10 pb-2 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'orders' 
                      ? 'bg-burgundy text-white shadow-sm' 
                      : 'text-burgundy/60 hover:text-burgundy hover:bg-burgundy/5'
                  }`}
                >
                  📋 فواتير المبيعات المرتبطة ({data.ordersSummary?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'history' 
                      ? 'bg-burgundy text-white shadow-sm' 
                      : 'text-burgundy/60 hover:text-burgundy hover:bg-burgundy/5'
                  }`}
                >
                  📜 سجل حركات المخزون ({data.stockHistory?.length || 0})
                </button>
                {data.supplierHistory?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('suppliers')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === 'suppliers' 
                        ? 'bg-burgundy text-white shadow-sm' 
                        : 'text-burgundy/60 hover:text-burgundy hover:bg-burgundy/5'
                    }`}
                  >
                    🚚 فواتير التوريد من الموردين ({data.supplierHistory.length})
                  </button>
                )}
              </div>

              {/* Tab 1: Orders Summary */}
              {activeTab === 'orders' && (
                <div>
                  {data.ordersSummary?.length === 0 ? (
                    <div className="py-10 text-center text-xs text-burgundy/60 bg-white rounded-2xl border border-dashed border-burgundy/15 space-y-2">
                      <p className="font-bold">لا توجد فواتير بيع مسجلة لهذا الصنف خلال {periodInfo?.label || 'الفترة المحددة'}.</p>
                      {selectedPeriod !== 'all' && (
                        <p className="text-[11px] text-burgundy/40">جرب اختيار فترة أخرى أو "كل الفترات" لعرض الفواتير السابقة.</p>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-burgundy/10 bg-white">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-[#F7F0EC] text-burgundy/60 font-bold border-b border-burgundy/10">
                          <tr>
                            <th className="px-4 py-3">رقم الفاتورة</th>
                            <th className="px-4 py-3">التاريخ</th>
                            <th className="px-4 py-3">العميل</th>
                            <th className="px-4 py-3">المقاس واللون</th>
                            <th className="px-4 py-3">الكمية المباعة</th>
                            <th className="px-4 py-3">سعر البيع</th>
                            <th className="px-4 py-3">التكلفة</th>
                            <th className="px-4 py-3">صافي الربح</th>
                            <th className="px-4 py-3">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-burgundy/5">
                          {data.ordersSummary.map((item, idx) => (
                            <tr key={idx} className="hover:bg-burgundy/3">
                              <td className="px-4 py-2.5 font-mono font-bold text-burgundy">
                                #{item.orderId?.slice(-6).toUpperCase()}
                              </td>
                              <td className="px-4 py-2.5 text-burgundy/70">
                                {new Date(item.date).toLocaleDateString('ar-EG-u-nu-latn', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-4 py-2.5 font-medium">{item.customerName}</td>
                              <td className="px-4 py-2.5 text-burgundy/70">{item.size} · {item.color}</td>
                              <td className="px-4 py-2.5 font-bold">
                                {item.netQuantity} قطعة
                                {item.returnedQuantity > 0 && (
                                  <span className="text-red-500 mr-1 text-[10px]">(مرتجع {item.returnedQuantity})</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 font-bold text-burgundy">{EGP(item.price)}</td>
                              <td className="px-4 py-2.5 text-burgundy/60">{EGP(item.costPrice)}</td>
                              <td className="px-4 py-2.5 font-bold text-emerald-700">+{EGP(item.profit)}</td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {item.status === 'Completed' ? 'مكتمل' : 'مرتجع'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Stock History */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  {data.stockHistory?.length === 0 ? (
                    <div className="py-8 text-center text-xs text-burgundy/50 bg-white rounded-2xl border border-dashed border-burgundy/15">
                      لا توجد حركات مخزون مسجلة في {periodInfo?.label || 'هذه الفترة'}.
                    </div>
                  ) : (
                    <div className="divide-y divide-burgundy/6 bg-white rounded-2xl border border-burgundy/10 overflow-hidden">
                      {data.stockHistory.map((h, i) => {
                        const isPlus = h.quantityChanged > 0;
                        return (
                          <div key={i} className="p-3.5 flex items-center justify-between text-xs hover:bg-burgundy/2 transition">
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                                isPlus ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {isPlus ? `+${h.quantityChanged}` : h.quantityChanged}
                              </span>
                              <div>
                                <p className="font-bold text-burgundy">{h.changeType}</p>
                                <p className="text-[11px] text-burgundy/50 mt-0.5">
                                  {h.notes || 'حركة نظام'} {h.performedBy ? `· بواسطة: ${h.performedBy.name}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="text-left font-mono">
                              <span className="text-[11px] text-burgundy/60 block">
                                الرصيد: {h.previousStock} → <strong>{h.newStock}</strong>
                              </span>
                              <span className="text-[10px] text-burgundy/40">
                                {new Date(h.createdAt).toLocaleDateString('ar-EG-u-nu-latn', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Supplier History */}
              {activeTab === 'suppliers' && (
                <div className="space-y-3">
                  {(!data.supplierHistory || data.supplierHistory.length === 0) ? (
                    <div className="py-8 text-center text-xs text-burgundy/50 bg-white rounded-2xl border border-dashed border-burgundy/15">
                      لا توجد فواتير توريد مسجلة لهذا الصنف.
                    </div>
                  ) : (
                    <div className="divide-y divide-burgundy/6 bg-white rounded-2xl border border-burgundy/10 overflow-hidden">
                      {data.supplierHistory.map((stx, i) => (
                        <div key={i} className="p-3.5 flex items-center justify-between text-xs hover:bg-burgundy/2 transition">
                          <div>
                            <p className="font-bold text-burgundy">فاتورة توريد #{stx.invoiceNumber || stx._id?.slice(-6)}</p>
                            <p className="text-[11px] text-burgundy/60 mt-0.5">
                              المورد: {stx.supplier?.name || 'مورد عام'} {stx.notes ? `· ${stx.notes}` : ''}
                            </p>
                          </div>
                          <div className="text-left font-mono">
                            <span className="text-xs font-bold text-burgundy block">{EGP(stx.totalAmount)}</span>
                            <span className="text-[10px] text-burgundy/40">
                              {new Date(stx.date || stx.createdAt).toLocaleDateString('ar-EG-u-nu-latn', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
