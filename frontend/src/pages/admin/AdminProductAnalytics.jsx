import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const PERIOD_OPTIONS = [
  { id: 'all', label: 'كل الفترات' },
  { id: 'this_month', label: 'هذا الشهر' },
  { id: 'last_month', label: 'الشهر السابق' },
  { id: 'last_30_days', label: 'آخر 30 يوم' },
  { id: 'last_7_days', label: 'آخر 7 أيام' },
  { id: 'custom', label: 'تاريخ مخصص 📅' }
];

const CAT_AR = {
  Blazer: 'بليزر',
  Blouse: 'بلوزة',
  Chemise: 'شميز',
  Skirt: 'جيبة',
  Dress: 'فستان',
  Pantalon: 'بنطلون',
  'T-shirt': 'تيشيرت',
  Bag: 'شنطة',
  Cardigan: 'كاردن',
  Suit: 'سوت',
  Tonic: 'تونيك',
  Takem: 'طقم'
};

export default function AdminProductAnalytics() {
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const productId = routeId || searchParams.get('id') || searchParams.get('productId');

  // Time Period state
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustomInputs, setShowCustomInputs] = useState(false);

  // Global Store Analytics Data (Level 1: Statistics & Numbers)
  const [globalLoading, setGlobalLoading] = useState(true);
  const [categoriesData, setCategoriesData] = useState([]);
  const [periodInfo, setPeriodInfo] = useState(null);

  // Table Filters & Sorting for Global Directory
  const [tableSearch, setTableSearch] = useState('');
  const [tableCategory, setTableCategory] = useState('All');
  const [tableStatusFilter, setTableStatusFilter] = useState('all'); // 'all' | 'top_sellers' | 'dead_stock' | 'in_stock'
  const [tableSortBy, setTableSortBy] = useState('grossProfit'); // 'grossProfit' | 'netSold' | 'stock' | 'sellThroughRate'

  // Single Product Analytics Data (Level 2: Deep Dive into Selected Product)
  const [singleData, setSingleData] = useState(null);
  const [singleLoading, setSingleLoading] = useState(Boolean(productId));
  const [singleError, setSingleError] = useState(null);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'history' | 'suppliers'
  const [orderSearch, setOrderSearch] = useState('');

  // 1. Fetch Global Store Analytics (Overall Numbers & Statistics)
  const fetchGlobalAnalytics = useCallback((period = selectedPeriod, from = customFrom, to = customTo) => {
    setGlobalLoading(true);
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (period === 'custom' && from && to) {
      params.append('from', from);
      params.append('to', to);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';

    api.get(`/admin/categories/analytics${qs}`)
      .then(res => {
        if (res.data) {
          setCategoriesData(res.data.categories || []);
          setPeriodInfo(res.data.periodInfo || null);
        }
      })
      .catch(err => {
        console.error('Failed to load global category/product analytics:', err);
      })
      .finally(() => setGlobalLoading(false));
  }, [selectedPeriod, customFrom, customTo]);

  // 2. Fetch Single Product Analytics (when productId is selected)
  const fetchSingleProductAnalytics = useCallback((pId = productId, period = selectedPeriod, from = customFrom, to = customTo) => {
    if (!pId) {
      setSingleData(null);
      setSingleLoading(false);
      return;
    }

    setSingleLoading(true);
    setSingleError(null);

    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (period === 'custom' && from && to) {
      params.append('from', from);
      params.append('to', to);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';

    api.get(`/admin/products/${pId}/analytics${qs}`)
      .then(res => {
        if (res.data) {
          setSingleData(res.data);
        } else {
          setSingleError('لم يتم العثور على تقرير نشاط لهذا الصنف.');
        }
      })
      .catch(err => {
        console.error('Failed to load single product analytics:', err);
        setSingleError('تعذر جلب تفاصيل نشاط الصنف.');
      })
      .finally(() => setSingleLoading(false));
  }, [productId, selectedPeriod, customFrom, customTo]);

  // Initial & period-change effects
  useEffect(() => {
    fetchGlobalAnalytics(selectedPeriod, customFrom, customTo);
  }, [selectedPeriod]);

  useEffect(() => {
    if (productId) {
      fetchSingleProductAnalytics(productId, selectedPeriod, customFrom, customTo);
    } else {
      setSingleData(null);
      setSingleLoading(false);
    }
  }, [productId, selectedPeriod]);

  const handlePeriodChange = (periodId) => {
    if (periodId === 'custom') {
      setShowCustomInputs(true);
      setSelectedPeriod('custom');
    } else {
      setShowCustomInputs(false);
      setSelectedPeriod(periodId);
    }
  };

  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (!customFrom || !customTo) return;
    fetchGlobalAnalytics('custom', customFrom, customTo);
    if (productId) {
      fetchSingleProductAnalytics(productId, 'custom', customFrom, customTo);
    }
  };

  // Flatten and enrich all products list from categories data
  const allProducts = useMemo(() => {
    const list = [];
    (categoriesData || []).forEach(cat => {
      (cat.productsList || []).forEach(prod => {
        list.push({
          ...prod,
          category: cat.category,
          categoryAr: CAT_AR[cat.category] || cat.labelAr || cat.category
        });
      });
    });
    return list;
  }, [categoriesData]);

  // Calculate Global Storewide KPIs
  const globalSummary = useMemo(() => {
    let totalStock = 0;
    let stockValueCost = 0;
    let stockValueRetail = 0;
    let netSold = 0;
    let unitsReturned = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let grossProfit = 0;

    (categoriesData || []).forEach(c => {
      totalStock += Number(c.totalStock || 0);
      stockValueCost += Number(c.stockValueCost || 0);
      stockValueRetail += Number(c.stockValueRetail || 0);
      netSold += Number(c.netSold || 0);
      unitsReturned += Number(c.unitsReturned || 0);
      totalRevenue += Number(c.totalRevenue || 0);
      totalCost += Number(c.totalCost || 0);
      grossProfit += Number(c.grossProfit || 0);
    });

    const profitMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0;
    const totalReceived = totalStock + netSold;
    const overallSellThrough = totalReceived > 0 ? Math.round((netSold / totalReceived) * 1000) / 10 : 0;

    // Top Profit Products
    const topProfit = [...allProducts]
      .filter(p => p.netSold > 0 && p.grossProfit > 0)
      .sort((a, b) => b.grossProfit - a.grossProfit)
      .slice(0, 5);

    // Top Selling Products (by quantity)
    const topSold = [...allProducts]
      .filter(p => p.netSold > 0)
      .sort((a, b) => b.netSold - a.netSold)
      .slice(0, 5);

    // Dead Stock Alerts (has stock but low or zero sell through)
    const deadStock = [...allProducts]
      .filter(p => p.isDead || (p.stock > 0 && p.netSold === 0))
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 5);

    return {
      totalProducts: allProducts.length,
      totalStock,
      stockValueCost: Math.round(stockValueCost),
      stockValueRetail: Math.round(stockValueRetail),
      netSold,
      unitsReturned,
      totalRevenue: Math.round(totalRevenue),
      totalCost: Math.round(totalCost),
      grossProfit: Math.round(grossProfit),
      profitMargin,
      overallSellThrough,
      topProfit,
      topSold,
      deadStock
    };
  }, [categoriesData, allProducts]);

  // Filter & Sort table of products
  const filteredTableProducts = useMemo(() => {
    let prods = [...allProducts];

    // Filter by category
    if (tableCategory !== 'All') {
      prods = prods.filter(p => p.category === tableCategory);
    }

    // Filter by status
    if (tableStatusFilter === 'top_sellers') {
      prods = prods.filter(p => p.netSold > 0);
    } else if (tableStatusFilter === 'dead_stock') {
      prods = prods.filter(p => p.isDead || (p.stock > 0 && p.netSold === 0));
    } else if (tableStatusFilter === 'in_stock') {
      prods = prods.filter(p => p.stock > 0);
    }

    // Search query
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      prods = prods.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.categoryAr && p.categoryAr.includes(q))
      );
    }

    // Sort
    prods.sort((a, b) => {
      if (tableSortBy === 'grossProfit') return (b.grossProfit || 0) - (a.grossProfit || 0);
      if (tableSortBy === 'netSold') return (b.netSold || 0) - (a.netSold || 0);
      if (tableSortBy === 'stock') return (b.stock || 0) - (a.stock || 0);
      if (tableSortBy === 'sellThroughRate') return (b.sellThroughRate || 0) - (a.sellThroughRate || 0);
      return 0;
    });

    return prods;
  }, [allProducts, tableCategory, tableStatusFilter, tableSearch, tableSortBy]);

  // Unique categories list
  const uniqueCategories = useMemo(() => {
    const set = new Set();
    allProducts.forEach(it => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set);
  }, [allProducts]);

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Single Product Helpers
  const p = singleData?.product;
  const m = singleData?.metrics;
  const singlePeriodInfo = singleData?.periodInfo;

  // Breakdown of Sizes and Colors for single product
  const { singleSizesBreakdown, singleColorsBreakdown } = useMemo(() => {
    const sMap = {};
    const cMap = {};

    (singleData?.ordersSummary || []).forEach(item => {
      const netQty = Number(item.netQuantity || 0);
      if (netQty > 0) {
        if (item.size && item.size !== '-') {
          sMap[item.size] = (sMap[item.size] || 0) + netQty;
        }
        if (item.color && item.color !== '-') {
          cMap[item.color] = (cMap[item.color] || 0) + netQty;
        }
      }
    });

    const sArr = Object.entries(sMap).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);
    const cArr = Object.entries(cMap).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);

    return { singleSizesBreakdown: sArr, singleColorsBreakdown: cArr };
  }, [singleData?.ordersSummary]);

  // Filtered orders for single product tab
  const singleFilteredOrders = useMemo(() => {
    if (!singleData?.ordersSummary) return [];
    if (!orderSearch.trim()) return singleData.ordersSummary;
    const q = orderSearch.toLowerCase();
    return singleData.ordersSummary.filter(ord =>
      (ord.orderId && ord.orderId.toLowerCase().includes(q)) ||
      (ord.customerName && ord.customerName.toLowerCase().includes(q)) ||
      (ord.size && ord.size.toLowerCase().includes(q)) ||
      (ord.color && ord.color.toLowerCase().includes(q))
    );
  }, [singleData?.ordersSummary, orderSearch]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // VIEW 1: OVERALL STATISTICS & PERFORMANCE HUB (When no product is selected)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (!productId) {
    return (
      <div className="space-y-6 pb-20" dir="rtl">
        {/* Top Header Banner */}
        <div className="rounded-[2.5rem] bg-gradient-to-r from-burgundy via-[#681E2E] to-[#4A1521] p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold backdrop-blur-xs">
                <span>📊</span>
                <span>لوحة تقارير وتحليل نشاط المنتجات</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
                إحصائيات وأرقام نشاط جميع المنتجات
              </h1>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-medium">
                نظرة شاملة ودقيقة على مبيعات المحل، صافي الأرباح المحققة، وقيمة المخزون الحالي. يمكنك الضغط على أي صنف بالجدول لفحص تقريره الفردي المفصل.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-3 rounded-2xl bg-white text-burgundy font-black text-xs shadow-md hover:bg-[#FAF6EE] transition flex items-center gap-2 cursor-pointer"
              >
                <span>🖨️</span>
                <span>طباعة تقرير الإحصائيات</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/products')}
                className="px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-xs transition flex items-center gap-2 cursor-pointer"
              >
                <span>←</span>
                <span>كتالوج المنتجات والمخزن</span>
              </button>
            </div>
          </div>
        </div>

        {/* Time Period Filter Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-burgundy/10 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-burgundy/70 ml-1">تحديد فترة الإحصائيات:</span>
            {PERIOD_OPTIONS.map(opt => {
              const isActive = selectedPeriod === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handlePeriodChange(opt.id)}
                  className={`text-xs px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-burgundy text-white shadow-md shadow-burgundy/20'
                      : 'bg-burgundy/5 hover:bg-burgundy/10 text-burgundy border border-burgundy/10'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Form */}
          {showCustomInputs && (
            <form onSubmit={handleApplyCustom} className="flex items-center gap-2 flex-wrap bg-[#FAF6EE] p-2 rounded-2xl border border-burgundy/15">
              <span className="text-xs font-bold text-burgundy/70">من:</span>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl border border-burgundy/20 bg-white text-burgundy font-bold outline-none"
                required
              />
              <span className="text-xs font-bold text-burgundy/70">إلى:</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl border border-burgundy/20 bg-white text-burgundy font-bold outline-none"
                required
              />
              <button
                type="submit"
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
              >
                تطبيق
              </button>
            </form>
          )}
        </div>

        {/* 4 Major Storewide KPI Cards */}
        {globalLoading ? (
          <div className="min-h-[25vh] flex flex-col items-center justify-center gap-3 text-burgundy">
            <div className="w-10 h-10 border-4 border-burgundy/20 border-t-burgundy rounded-full animate-spin" />
            <p className="text-xs font-bold text-burgundy/70">جارٍ تجميع وحساب أرقام وإحصائيات المنتجات...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Gross Profit */}
              <div className="rounded-3xl bg-white p-5 border border-emerald-200/80 shadow-xs hover:shadow-md transition">
                <span className="text-xs font-bold text-emerald-800 block">صافي أرباح المنتجات بالفترة</span>
                <p className="text-3xl font-black text-emerald-700 mt-2">
                  {EGP(globalSummary.grossProfit)}
                </p>
                <div className="mt-2 text-xs text-emerald-700 font-bold flex items-center justify-between border-t border-emerald-100 pt-2">
                  <span>هامش الربح الإجمالي:</span>
                  <span className="bg-emerald-100 px-2 py-0.5 rounded-full">{globalSummary.profitMargin}%</span>
                </div>
              </div>

              {/* Card 2: Total Revenue */}
              <div className="rounded-3xl bg-white p-5 border border-burgundy/10 shadow-xs hover:shadow-md transition">
                <span className="text-xs font-bold text-burgundy/60 block">إجمالي مبيعات المنتجات</span>
                <p className="text-3xl font-black text-burgundy mt-2">
                  {EGP(globalSummary.totalRevenue)}
                </p>
                <div className="mt-2 text-xs text-burgundy/60 flex items-center justify-between border-t border-burgundy/5 pt-2">
                  <span>تكلفة البضاعة المباعة:</span>
                  <strong className="font-mono">{EGP(globalSummary.totalCost)}</strong>
                </div>
              </div>

              {/* Card 3: Net Units Sold */}
              <div className="rounded-3xl bg-white p-5 border border-burgundy/10 shadow-xs hover:shadow-md transition">
                <span className="text-xs font-bold text-burgundy/60 block">إجمالي القطع المباعة</span>
                <p className="text-3xl font-black text-burgundy mt-2">
                  {globalSummary.netSold} <span className="text-sm font-semibold text-burgundy/40">قطعة</span>
                </p>
                <div className="mt-2 text-xs text-burgundy/60 flex items-center justify-between border-t border-burgundy/5 pt-2">
                  <span>إجمالي المرتجعات:</span>
                  <strong className="text-rose-600 font-mono">{globalSummary.unitsReturned} قطعة</strong>
                </div>
              </div>

              {/* Card 4: Inventory Valuation */}
              <div className="rounded-3xl bg-white p-5 border border-burgundy/10 shadow-xs hover:shadow-md transition">
                <span className="text-xs font-bold text-burgundy/60 block">المخزون الحالي بالمحل</span>
                <p className="text-3xl font-black text-burgundy mt-2">
                  {globalSummary.totalStock} <span className="text-sm font-semibold text-burgundy/40">قطعة</span>
                </p>
                <div className="mt-2 text-xs text-burgundy/60 flex items-center justify-between border-t border-burgundy/5 pt-2">
                  <span>قيمته بالتكلفة:</span>
                  <strong className="font-mono text-emerald-800">{EGP(globalSummary.stockValueCost)}</strong>
                </div>
              </div>
            </div>

            {/* Two Intelligence Columns: Top Performers vs. Dead Stock Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Box 1: Top Profit Makers */}
              <div className="rounded-3xl bg-white p-6 border border-emerald-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏆</span>
                    <div>
                      <h3 className="font-black text-base text-emerald-950">أعلى الأصناف ربحية ومبيعاً</h3>
                      <p className="text-[11px] text-emerald-800/70 mt-0.5">الموديلات الأكثر مساهمة في أرباح المحل خلال {periodInfo?.label || 'الفترة'}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full">
                    توب 5
                  </span>
                </div>

                {globalSummary.topProfit.length === 0 ? (
                  <p className="text-xs text-center py-8 text-burgundy/40">لم تسجل مبيعات كافية في هذه الفترة بعد.</p>
                ) : (
                  <div className="space-y-2.5">
                    {globalSummary.topProfit.map((prod, idx) => (
                      <div
                        key={prod.id || idx}
                        className="flex items-center justify-between p-3 rounded-2xl bg-[#F7FAF8] hover:bg-emerald-50 border border-emerald-100/60 transition group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-900 font-black text-xs flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-burgundy truncate">{prod.name}</p>
                            <p className="text-[10px] text-burgundy/50 mt-0.5">
                              {prod.sku ? `#${prod.sku} · ` : ''}{prod.categoryAr} · <strong>{prod.netSold} قطعة مباعة</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-left font-mono flex-shrink-0">
                          <div>
                            <span className="text-xs font-black text-emerald-700 block">+{EGP(prod.grossProfit)}</span>
                            <span className="text-[10px] text-burgundy/50 block font-sans">إيراد: {EGP(prod.totalRevenue)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/products/${prod.id}/analytics`)}
                            className="text-[11px] font-bold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-700 hover:text-white px-2.5 py-1 rounded-xl shadow-xs transition cursor-pointer"
                            title="فحص تقرير هذا الصنف بالتفصيل"
                          >
                            فحص الصنف 📊
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Box 2: Dead Stock Alerts */}
              <div className="rounded-3xl bg-white p-6 border border-rose-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛑</span>
                    <div>
                      <h3 className="font-black text-base text-rose-950">تنبيهات البضاعة الراكدة</h3>
                      <p className="text-[11px] text-rose-800/70 mt-0.5">أصناف متوفرة بالمخزن وسرعة تصريفها ضعيفة وتحتاج تصفية</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-rose-100 text-rose-900 px-2.5 py-1 rounded-full">
                    سيولة محبوسة
                  </span>
                </div>

                {globalSummary.deadStock.length === 0 ? (
                  <p className="text-xs text-center py-8 text-emerald-700 font-bold">حركة المخزون ممتازة ولا توجد أصناف راكدة حالياً 🎉</p>
                ) : (
                  <div className="space-y-2.5">
                    {globalSummary.deadStock.map((prod, idx) => (
                      <div
                        key={prod.id || idx}
                        className="flex items-center justify-between p-3 rounded-2xl bg-[#FFF9F9] hover:bg-rose-50 border border-rose-100/60 transition group"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-burgundy truncate">{prod.name}</p>
                          <p className="text-[10px] text-rose-700 mt-0.5">
                            {prod.sku ? `#${prod.sku} · ` : ''}{prod.categoryAr} · <strong>سحب {prod.sellThroughRate}% فقط</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 text-left font-mono flex-shrink-0">
                          <div>
                            <span className="text-xs font-black text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-lg block text-center">
                              {prod.stock} قطعة متبقية
                            </span>
                            <span className="text-[10px] text-burgundy/50 block mt-0.5 font-sans">{EGP(prod.price)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/products/${prod.id}/analytics`)}
                            className="text-[11px] font-bold bg-white text-rose-800 border border-rose-300 hover:bg-rose-700 hover:text-white px-2.5 py-1 rounded-xl shadow-xs transition cursor-pointer"
                            title="فحص تقرير هذا الصنف"
                          >
                            فحص الصنف 📊
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Interactive Table of All Products */}
            <div className="bg-white rounded-3xl border border-burgundy/10 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-burgundy/5 pb-4">
                <div>
                  <h3 className="text-lg font-black text-burgundy flex items-center gap-2">
                    <span>📋</span>
                    <span>جدول أداء جميع الأصناف والموديلات ({filteredTableProducts.length})</span>
                  </h3>
                  <p className="text-xs text-burgundy/60 mt-0.5">
                    قارن بين أرباح كل موديل ومبيعاته، ثم اضغط على «فحص التقرير التفصيلي» لعرض فواتيره ومقاساته وسجل مخزونه.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Sorting dropdown */}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-burgundy">
                    <span>الترتيب حسب:</span>
                    <select
                      value={tableSortBy}
                      onChange={e => setTableSortBy(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-burgundy/20 bg-[#FAF7F2] text-burgundy font-bold text-xs outline-none"
                    >
                      <option value="grossProfit">الأعلى تحقيقاً للأرباح 💰</option>
                      <option value="netSold">الأكثر مبيعاً بالقطع 🛍️</option>
                      <option value="stock">الأعلى مخزوناً بالمحل 📦</option>
                      <option value="sellThroughRate">أعلى معدل تصريف %</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Filters row: Search + Category + Status */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 right-3.5 flex items-center text-burgundy/40 text-sm pointer-events-none">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، كود SKU، أو القسم..."
                    value={tableSearch}
                    onChange={e => setTableSearch(e.target.value)}
                    className="w-full text-xs font-bold pr-9 pl-3 py-2.5 rounded-xl border border-burgundy/20 bg-[#FAF7F2]/60 text-burgundy placeholder:text-burgundy/40 outline-none focus:border-burgundy focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Category Filter */}
                  <select
                    value={tableCategory}
                    onChange={e => setTableCategory(e.target.value)}
                    className="text-xs px-3 py-2 rounded-xl border border-burgundy/20 bg-white text-burgundy font-bold outline-none"
                  >
                    <option value="All">كل الأقسام</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>قسم {CAT_AR[cat] || cat}</option>
                    ))}
                  </select>

                  {/* Status Pills */}
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'top_sellers', label: 'المباع بالفترة' },
                    { id: 'dead_stock', label: 'الراكد فقط' },
                    { id: 'in_stock', label: 'متوفر بالمخزن' },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTableStatusFilter(f.id)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                        tableStatusFilter === f.id
                          ? 'bg-burgundy text-white shadow-xs'
                          : 'bg-burgundy/5 text-burgundy/70 hover:bg-burgundy/10'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products Table */}
              <div className="overflow-x-auto rounded-2xl border border-burgundy/10">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#F7F0EC] text-burgundy/80 font-bold border-b border-burgundy/10">
                    <tr>
                      <th className="px-4 py-3.5">الصنف</th>
                      <th className="px-3 py-3.5">القسم</th>
                      <th className="px-3 py-3.5 text-center">المخزون الحالي</th>
                      <th className="px-3 py-3.5 text-center">المباع بالفترة</th>
                      <th className="px-3 py-3.5">سعر البيع</th>
                      <th className="px-3 py-3.5">سعر التكلفة</th>
                      <th className="px-3 py-3.5">إجمالي الإيراد</th>
                      <th className="px-3 py-3.5">صافي الربح المحقق</th>
                      <th className="px-3 py-3.5 text-center">معدل التصريف</th>
                      <th className="px-4 py-3.5 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-burgundy/5">
                    {filteredTableProducts.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-xs text-burgundy/50">
                          لا توجد أصناف مطابقة لخيارات البحث أو الفلترة.
                        </td>
                      </tr>
                    ) : (
                      filteredTableProducts.map(prod => (
                        <tr key={prod.id} className="hover:bg-burgundy/2 transition">
                          {/* Name & SKU */}
                          <td className="px-4 py-3">
                            <p className="font-bold text-burgundy text-xs">{prod.name}</p>
                            {prod.sku && (
                              <span className="font-mono text-[10px] text-burgundy/60 bg-burgundy/5 px-1.5 py-0.5 rounded">
                                #{prod.sku}
                              </span>
                            )}
                          </td>

                          {/* Category */}
                          <td className="px-3 py-3 text-burgundy/70 font-medium">
                            {prod.categoryAr}
                          </td>

                          {/* Stock */}
                          <td className="px-3 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              prod.stock === 0
                                ? 'bg-rose-100 text-rose-800'
                                : prod.stock <= 5
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}>
                              {prod.stock} قطعة
                            </span>
                          </td>

                          {/* Net Sold */}
                          <td className="px-3 py-3 text-center font-bold text-burgundy">
                            {prod.netSold > 0 ? (
                              <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                {prod.netSold} قطعة
                              </span>
                            ) : (
                              <span className="text-burgundy/40">0</span>
                            )}
                          </td>

                          {/* Selling Price */}
                          <td className="px-3 py-3 font-bold text-burgundy font-mono">
                            {EGP(prod.price)}
                          </td>

                          {/* Cost Price */}
                          <td className="px-3 py-3 text-burgundy/60 font-mono">
                            {prod.costPrice ? EGP(prod.costPrice) : '—'}
                          </td>

                          {/* Revenue */}
                          <td className="px-3 py-3 font-mono font-bold text-burgundy">
                            {EGP(prod.totalRevenue || 0)}
                          </td>

                          {/* Gross Profit */}
                          <td className="px-3 py-3 font-mono">
                            <span className={`font-black ${
                              prod.grossProfit > 0 ? 'text-emerald-700' : 'text-burgundy/50'
                            }`}>
                              +{EGP(prod.grossProfit || 0)}
                            </span>
                            {prod.profitMargin > 0 && (
                              <span className="text-[10px] text-emerald-600 block">
                                ({prod.profitMargin}%)
                              </span>
                            )}
                          </td>

                          {/* Sell Through */}
                          <td className="px-3 py-3 text-center">
                            <span className={`font-mono text-xs font-bold ${
                              prod.sellThroughRate >= 40
                                ? 'text-emerald-700'
                                : prod.sellThroughRate === 0
                                ? 'text-burgundy/40'
                                : 'text-amber-700'
                            }`}>
                              {prod.sellThroughRate}%
                            </span>
                          </td>

                          {/* Action Button: View Details */}
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/products/${prod.id}/analytics`)}
                              className="px-3 py-1.5 rounded-xl bg-burgundy hover:bg-burgundy/90 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
                              title="عرض تقرير الصنف التفصيلي"
                            >
                              <span>📊</span>
                              <span>تفاصيل الصنف</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // VIEW 2: SINGLE PRODUCT DETAILED REPORT (When a product is selected)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (singleLoading && !singleData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-burgundy" dir="rtl">
        <div className="w-12 h-12 border-4 border-burgundy/20 border-t-burgundy rounded-full animate-spin" />
        <p className="text-base font-bold text-burgundy/80">جارٍ إعداد وتحليل تقرير الصنف التفصيلي...</p>
      </div>
    );
  }

  if (singleError || !p) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4" dir="rtl">
        <div className="text-5xl">⚠️</div>
        <h3 className="text-xl font-bold text-burgundy">{singleError || 'المنتج غير موجود'}</h3>
        <p className="text-sm text-burgundy/60">تأكد من صحة الصنف أو اختر صنفاً آخر من لوحة الإحصائيات العامة.</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/admin/products/analytics')}
            className="px-6 py-2.5 bg-burgundy text-white font-bold rounded-xl shadow hover:bg-burgundy/90 transition"
          >
            ← العودة للإحصائيات والأرقام العامة
          </button>
          <button
            onClick={() => navigate('/admin/products')}
            className="px-5 py-2.5 bg-burgundy/10 text-burgundy font-bold rounded-xl hover:bg-burgundy/20 transition"
          >
            كتالوج المنتجات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      {/* Top Breadcrumb & Controls (Hidden in Print) */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-burgundy/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-burgundy/60 font-semibold mb-1">
            <Link to="/admin" className="hover:underline">الإدارة</Link>
            <span>›</span>
            <Link to="/admin/products/analytics" className="hover:underline">إحصائيات المنتجات</Link>
            <span>›</span>
            <span className="text-burgundy font-bold">{p.name}</span>
          </div>
          <h1 className="text-2xl font-black text-burgundy flex items-center gap-2">
            <span>📊</span>
            <span>تقرير الأداء الشامل للصنف: {p.name}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Back to Overall Stats button */}
          <button
            type="button"
            onClick={() => navigate('/admin/products/analytics')}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-burgundy/5 text-burgundy border border-burgundy/20 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="الرجوع للوحة الأرقام والإحصائيات العامة لجميع الأصناف"
          >
            <span>←</span>
            <span>العودة للإحصائيات والأرقام العامة</span>
          </button>

          {/* Quick Product Switcher */}
          {allProducts.length > 0 && (
            <div className="relative min-w-[200px]">
              <select
                value={p.id || productId}
                onChange={(e) => navigate(`/admin/products/${e.target.value}/analytics`)}
                className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-burgundy/20 bg-white text-burgundy shadow-xs outline-none focus:border-burgundy cursor-pointer"
              >
                <option disabled value="">🔄 التبديل لصنف آخر...</option>
                {allProducts.map(prod => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name} {prod.sku ? `(#${prod.sku})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-burgundy/5 text-burgundy border border-burgundy/20 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="طباعة التقرير أو حفظه بصيغة PDF"
          >
            <span>🖨️</span>
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Main Product Hero Header */}
      <div className="rounded-[2.5rem] bg-gradient-to-r from-white via-[#FDFBF7] to-[#FAF6EE] p-6 sm:p-8 border border-burgundy/15 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-burgundy/10 text-burgundy flex items-center justify-center text-3xl sm:text-4xl shadow-inner flex-shrink-0">
            {p.images && p.images.length > 0 ? (
              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover rounded-3xl" />
            ) : (
              '🏷️'
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-black text-burgundy">{p.name}</h2>
              {p.sku && (
                <span className="font-mono text-xs bg-burgundy/10 px-3 py-1 rounded-xl text-burgundy font-black shadow-xs">
                  كود SKU: #{p.sku}
                </span>
              )}
              {singlePeriodInfo && (
                <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full font-bold shadow-xs">
                  📅 {singlePeriodInfo.label}
                </span>
              )}
            </div>
            <p className="text-sm text-burgundy/70 flex items-center gap-3 flex-wrap font-medium">
              <span>القسم: <strong className="text-burgundy">{CAT_AR[p.category] || p.category}</strong></span>
              {p.supplier && <span>· المورد: <strong className="text-burgundy">{p.supplier}</strong></span>}
              <span>· الحالة: <strong className="text-emerald-700">نشط بالكتالوج</strong></span>
            </p>
          </div>
        </div>

        {/* Pricing & Unit Margin Pill */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-burgundy/10 shadow-sm self-start lg:self-auto font-mono text-center">
          <div className="px-3">
            <span className="text-[11px] text-burgundy/50 block font-sans">سعر البيع</span>
            <span className="text-base font-black text-burgundy">{EGP(p.effectivePrice || p.price)}</span>
          </div>
          <div className="h-8 w-px bg-burgundy/10" />
          <div className="px-3">
            <span className="text-[11px] text-burgundy/50 block font-sans">سعر التكلفة</span>
            <span className="text-base font-black text-burgundy/70">{EGP(p.costPrice || 0)}</span>
          </div>
          <div className="h-8 w-px bg-burgundy/10" />
          <div className="px-3">
            <span className="text-[11px] text-emerald-700 font-sans block">الربح في القطعة</span>
            <span className="text-base font-black text-emerald-700">
              +{EGP((p.effectivePrice || p.price) - (p.costPrice || 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Time Period Filter Bar */}
      <div className="print:hidden bg-white p-4 sm:p-5 rounded-3xl border border-burgundy/10 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-burgundy/70 ml-1">تحديد فترة التقرير:</span>
          {PERIOD_OPTIONS.map(opt => {
            const isActive = selectedPeriod === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePeriodChange(opt.id)}
                className={`text-xs px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-burgundy text-white shadow-md shadow-burgundy/20'
                    : 'bg-burgundy/5 hover:bg-burgundy/10 text-burgundy border border-burgundy/10'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Custom Range Form */}
        {showCustomInputs && (
          <form onSubmit={handleApplyCustom} className="flex items-center gap-2 flex-wrap bg-[#FAF6EE] p-2 rounded-2xl border border-burgundy/15">
            <span className="text-xs font-bold text-burgundy/70">من:</span>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-burgundy/20 bg-white text-burgundy font-bold outline-none"
              required
            />
            <span className="text-xs font-bold text-burgundy/70">إلى:</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-burgundy/20 bg-white text-burgundy font-bold outline-none"
              required
            />
            <button
              type="submit"
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
            >
              تطبيق الفترة
            </button>
          </form>
        )}
      </div>

      {/* Velocity & Stock Health Banner */}
      <div className={`p-5 rounded-3xl border flex flex-wrap items-center justify-between gap-4 shadow-sm ${
        m.velocity.status === 'fast'
          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
          : m.velocity.status === 'dead'
          ? 'bg-rose-50/80 border-rose-300 text-rose-950'
          : m.velocity.status === 'empty'
          ? 'bg-slate-100 border-slate-300 text-slate-800'
          : 'bg-amber-50/80 border-amber-300 text-amber-950'
      }`}>
        <div className="flex items-center gap-4">
          <span className="text-3xl">{m.velocity.badge.split(' ')[0]}</span>
          <div>
            <h4 className="font-black text-base">{m.velocity.badge}</h4>
            <p className="text-xs opacity-85 mt-0.5">{m.velocity.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-left font-mono">
          <div>
            <span className="text-xs block opacity-75 font-sans">معدل التصريف (Sell-through)</span>
            <span className="text-xl font-black">{m.sellThroughRate}%</span>
          </div>
          <div className="h-8 w-px bg-current opacity-20" />
          <div>
            <span className="text-xs block opacity-75 font-sans">المخزون الحالي</span>
            <span className="text-xl font-black">{m.currentStock} قطعة</span>
          </div>
        </div>
      </div>

      {/* KPI 4 Cards Grid for single product */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Net Sold */}
        <div className="rounded-3xl bg-white p-5 border border-burgundy/10 shadow-sm">
          <span className="text-xs font-bold text-burgundy/60 block">صافي المباع في الفترة</span>
          <p className="text-3xl font-black text-burgundy mt-2">
            {m.netSold} <span className="text-sm font-semibold text-burgundy/40">قطعة</span>
          </p>
          <div className="mt-2 text-xs text-burgundy/60 flex items-center justify-between border-t border-burgundy/5 pt-2">
            <span>مبيعات: <strong>{m.unitsSoldGross}</strong></span>
            <span>مرتجع: <strong className="text-rose-600">{m.unitsReturned}</strong></span>
          </div>
        </div>

        {/* Card 2: Current Stock */}
        <div className="rounded-3xl bg-white p-5 border border-burgundy/10 shadow-sm">
          <span className="text-xs font-bold text-burgundy/60 block">المخزون الفعلي بالمحل</span>
          <p className="text-3xl font-black text-burgundy mt-2">
            {m.currentStock} <span className="text-sm font-semibold text-burgundy/40">قطعة</span>
          </p>
          <div className="mt-2 text-xs text-emerald-700 flex items-center justify-between border-t border-burgundy/5 pt-2">
            <span>إجمالي التوريدات:</span>
            <strong>{m.totalReceived} قطعة</strong>
          </div>
        </div>

        {/* Card 3: Gross Profit */}
        <div className="rounded-3xl bg-white p-5 border border-burgundy/10 shadow-sm">
          <span className="text-xs font-bold text-burgundy/60 block">صافي أرباح الصنف بالفترة</span>
          <p className={`text-3xl font-black mt-2 ${m.grossProfit > 0 ? 'text-emerald-700' : m.grossProfit < 0 ? 'text-rose-600' : 'text-burgundy/60'}`}>
            {EGP(m.grossProfit)}
          </p>
          <div className="mt-2 text-xs text-emerald-600 font-bold flex items-center justify-between border-t border-burgundy/5 pt-2">
            <span>هامش الربح:</span>
            <span>{m.profitMargin}%</span>
          </div>
        </div>

        {/* Card 4: Total Revenue */}
        <div className="rounded-3xl bg-white p-5 border border-burgundy/10 shadow-sm">
          <span className="text-xs font-bold text-burgundy/60 block">إجمالي إيراد المبيعات</span>
          <p className="text-3xl font-black text-burgundy mt-2">
            {EGP(m.totalRevenue)}
          </p>
          <div className="mt-2 text-xs text-burgundy/50 flex items-center justify-between border-t border-burgundy/5 pt-2">
            <span>تكلفة البضاعة COGS:</span>
            <strong>{EGP(m.totalCost)}</strong>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row: Demands + Variants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box 1: Sizes & Colors breakdown */}
        <div className="rounded-3xl bg-white p-6 border border-burgundy/10 shadow-sm space-y-5">
          <h3 className="font-black text-base text-burgundy flex items-center gap-2 border-b border-burgundy/5 pb-3">
            <span>🎨</span>
            <span>إقبال المقاسات والألوان (الأكثر طلباً)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Sizes */}
            <div>
              <h4 className="text-xs font-bold text-burgundy/60 mb-2">توزيع المقاسات المباعة:</h4>
              {singleSizesBreakdown.length === 0 ? (
                <p className="text-xs text-burgundy/40 py-4 text-center">لا توجد تفاصيل مقاسات مسجلة بالفترة</p>
              ) : (
                <div className="space-y-2">
                  {singleSizesBreakdown.map((item, idx) => {
                    const percent = m.netSold > 0 ? Math.round((item.qty / m.netSold) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-burgundy">
                          <span>مقاس: {item.name}</span>
                          <span>{item.qty} قطعة ({percent}%)</span>
                        </div>
                        <div className="w-full bg-burgundy/5 rounded-full h-2 overflow-hidden">
                          <div className="bg-burgundy h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Colors */}
            <div>
              <h4 className="text-xs font-bold text-burgundy/60 mb-2">توزيع الألوان المباعة:</h4>
              {singleColorsBreakdown.length === 0 ? (
                <p className="text-xs text-burgundy/40 py-4 text-center">لا توجد تفاصيل ألوان مسجلة بالفترة</p>
              ) : (
                <div className="space-y-2">
                  {singleColorsBreakdown.map((item, idx) => {
                    const percent = m.netSold > 0 ? Math.round((item.qty / m.netSold) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-burgundy">
                          <span>لون: {item.name}</span>
                          <span>{item.qty} قطعة ({percent}%)</span>
                        </div>
                        <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-emerald-600 h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Box 2: Inventory Variants Stock Balance */}
        <div className="rounded-3xl bg-white p-6 border border-burgundy/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-burgundy/5 pb-3">
            <h3 className="font-black text-base text-burgundy flex items-center gap-2">
              <span>📦</span>
              <span>رصيد مقاسات وألوان المخزون المتبقية</span>
            </h3>
            <span className="text-xs text-burgundy/50 font-bold">المجموع: {m.currentStock} قطعة</span>
          </div>

          {(p.variants || []).length === 0 ? (
            <div className="py-8 text-center text-xs text-burgundy/50">
              هذا المنتج ليس له تنويعات مقاسات أو ألوان مسجلة بالمخزن، الرصيد المباشر: {m.currentStock} قطعة.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[220px]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-burgundy/5 text-burgundy/60 font-bold border-b border-burgundy/10">
                    <th className="px-3 py-2">المقاس</th>
                    <th className="px-3 py-2">اللون</th>
                    <th className="px-3 py-2 text-center">المخزون المتبقي</th>
                    <th className="px-3 py-2 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-burgundy/5">
                  {p.variants.map((v, i) => (
                    <tr key={i} className="hover:bg-burgundy/3">
                      <td className="px-3 py-2 font-bold text-burgundy">{v.size}</td>
                      <td className="px-3 py-2 font-medium">{v.color}</td>
                      <td className="px-3 py-2 text-center font-bold text-burgundy">{v.stock} قطعة</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.stock === 0 ? 'bg-red-100 text-red-700' : v.stock <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {v.stock === 0 ? 'نفد' : v.stock <= 3 ? 'منخفض' : 'متوفر'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-3xl border border-burgundy/10 p-2 shadow-sm flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-burgundy text-white shadow-sm'
                : 'text-burgundy/60 hover:text-burgundy hover:bg-burgundy/5'
            }`}
          >
            📋 فواتير المبيعات المرتبطة ({singleData?.ordersSummary?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-burgundy text-white shadow-sm'
                : 'text-burgundy/60 hover:text-burgundy hover:bg-burgundy/5'
            }`}
          >
            📜 سجل حركات المخزون والتوريد ({singleData?.stockHistory?.length || 0})
          </button>
          {singleData?.supplierHistory?.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('suppliers')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'suppliers'
                  ? 'bg-burgundy text-white shadow-sm'
                  : 'text-burgundy/60 hover:text-burgundy hover:bg-burgundy/5'
              }`}
            >
              🚚 فواتير التوريد من الموردين ({singleData.supplierHistory.length})
            </button>
          )}
        </div>

        {activeTab === 'orders' && (
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="بحث في فواتير الصنف (عميل، رقم، مقاس...)"
              value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)}
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-burgundy/20 bg-burgundy/5 text-burgundy font-semibold outline-none focus:border-burgundy"
            />
          </div>
        )}
      </div>

      {/* Tab 1: Orders Table */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-burgundy/10 shadow-sm overflow-hidden">
          {singleFilteredOrders.length === 0 ? (
            <div className="py-16 text-center text-xs text-burgundy/50 space-y-2">
              <p className="font-bold text-sm">لا توجد فواتير بيع مسجلة لهذا الصنف في {singlePeriodInfo?.label || 'الفترة المحددة'}.</p>
              {selectedPeriod !== 'all' && (
                <p className="text-burgundy/40">اختر "كل الفترات" لعرض الفواتير السابقة للمنتج.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F7F0EC] text-burgundy/70 font-bold border-b border-burgundy/10">
                  <tr>
                    <th className="px-4 py-3.5">رقم الفاتورة</th>
                    <th className="px-4 py-3.5">التاريخ والوقت</th>
                    <th className="px-4 py-3.5">العميل</th>
                    <th className="px-4 py-3.5">المقاس واللون</th>
                    <th className="px-4 py-3.5">الكمية المباعة</th>
                    <th className="px-4 py-3.5">سعر البيع</th>
                    <th className="px-4 py-3.5">سعر التكلفة</th>
                    <th className="px-4 py-3.5">صافي الربح</th>
                    <th className="px-4 py-3.5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-burgundy/5">
                  {singleFilteredOrders.map((item, idx) => (
                    <tr key={idx} className="hover:bg-burgundy/2 transition">
                      <td className="px-4 py-3 font-mono font-black text-burgundy">
                        #{item.orderId?.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-burgundy/70">
                        {new Date(item.date).toLocaleDateString('ar-EG-u-nu-latn', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 font-bold text-burgundy">{item.customerName}</td>
                      <td className="px-4 py-3 text-burgundy/70 font-medium">
                        {item.size} · {item.color}
                      </td>
                      <td className="px-4 py-3 font-black text-burgundy">
                        {item.netQuantity} قطعة
                        {item.returnedQuantity > 0 && (
                          <span className="text-red-500 mr-1 text-[10px]">(مرتجع {item.returnedQuantity})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-burgundy">{EGP(item.price)}</td>
                      <td className="px-4 py-3 text-burgundy/60">{EGP(item.costPrice)}</td>
                      <td className="px-4 py-3 font-black text-emerald-700">+{EGP(item.profit)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
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
        <div className="bg-white rounded-3xl border border-burgundy/10 shadow-sm overflow-hidden">
          {(singleData?.stockHistory || []).length === 0 ? (
            <div className="py-16 text-center text-xs text-burgundy/50">
              لا توجد حركات مخزون مسجلة لهذا الصنف في {singlePeriodInfo?.label || 'الفترة المحددة'}.
            </div>
          ) : (
            <div className="divide-y divide-burgundy/6">
              {singleData.stockHistory.map((h, i) => {
                const isPlus = h.quantityChanged > 0;
                return (
                  <div key={i} className="p-4 flex items-center justify-between text-xs hover:bg-burgundy/2 transition">
                    <div className="flex items-center gap-3.5">
                      <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-xs ${
                        isPlus ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isPlus ? `+${h.quantityChanged}` : h.quantityChanged}
                      </span>
                      <div>
                        <p className="font-bold text-burgundy text-sm">{h.changeType}</p>
                        <p className="text-[11px] text-burgundy/60 mt-0.5">
                          {h.notes || 'حركة نظام'} {h.performedBy ? `· بواسطة: ${h.performedBy.name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-xs text-burgundy/70 block">
                        الرصيد: {h.previousStock} → <strong className="text-burgundy font-black">{h.newStock}</strong>
                      </span>
                      <span className="text-[10px] text-burgundy/40">
                        {new Date(h.createdAt).toLocaleDateString('ar-EG-u-nu-latn', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
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
        <div className="bg-white rounded-3xl border border-burgundy/10 shadow-sm overflow-hidden">
          {(!singleData?.supplierHistory || singleData.supplierHistory.length === 0) ? (
            <div className="py-16 text-center text-xs text-burgundy/50">
              لا توجد فواتير توريد مسجلة لهذا الصنف.
            </div>
          ) : (
            <div className="divide-y divide-burgundy/6">
              {singleData.supplierHistory.map((stx, i) => (
                <div key={i} className="p-4 flex items-center justify-between text-xs hover:bg-burgundy/2 transition">
                  <div>
                    <p className="font-bold text-burgundy text-sm">فاتورة توريد #{stx.invoiceNumber || stx._id?.slice(-6)}</p>
                    <p className="text-[11px] text-burgundy/60 mt-0.5">
                      المورد: {stx.supplier?.name || 'مورد عام'} {stx.notes ? `· ${stx.notes}` : ''}
                    </p>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-sm font-black text-burgundy block">{EGP(stx.totalAmount)}</span>
                    <span className="text-[10px] text-burgundy/40">
                      {new Date(stx.date || stx.createdAt).toLocaleDateString('ar-EG-u-nu-latn', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
