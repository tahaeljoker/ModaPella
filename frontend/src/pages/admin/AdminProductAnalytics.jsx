import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import CategoryAnalyticsModal from '../../components/CategoryAnalyticsModal';

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

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(productId));
  const [error, setError] = useState(null);
  const [allProductsList, setAllProductsList] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Time Period state
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustomInputs, setShowCustomInputs] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'history' | 'suppliers'
  const [orderSearch, setOrderSearch] = useState('');

  // Hub Search & Filter state (when no product is selected)
  const [hubSearch, setHubSearch] = useState('');
  const [hubCategory, setHubCategory] = useState('All');
  const [hubStockFilter, setHubStockFilter] = useState('all'); // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Fetch all products once for quick product switching dropdown & Hub list
  useEffect(() => {
    setLoadingProducts(true);
    api.get('/products?includeOffSeason=true')
      .then(res => {
        if (Array.isArray(res.data)) {
          setAllProductsList(res.data);
        }
      })
      .catch(err => console.warn('Could not load products for switcher:', err.message))
      .finally(() => setLoadingProducts(false));
  }, []);

  // Fetch product analytics
  const loadAnalytics = useCallback((period = selectedPeriod, from = customFrom, to = customTo) => {
    if (!productId) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (period === 'custom' && from && to) {
      params.append('from', from);
      params.append('to', to);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';

    api.get(`/admin/products/${productId}/analytics${qs}`)
      .then(res => {
        if (res.data) {
          setData(res.data);
        } else {
          setError('لم يتم العثور على بيانات نشاط لهذا الصنف.');
        }
      })
      .catch(err => {
        console.error('Failed to load product analytics:', err);
        setError('تعذر جلب تقرير نشاط المنتج من الخادم.');
      })
      .finally(() => setLoading(false));
  }, [productId, selectedPeriod, customFrom, customTo]);

  useEffect(() => {
    if (productId) {
      loadAnalytics(selectedPeriod, customFrom, customTo);
    } else {
      setLoading(false);
      setData(null);
    }
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

  const p = data?.product;
  const m = data?.metrics;
  const periodInfo = data?.periodInfo;

  // Breakdown of Sizes and Colors from ordersSummary
  const { sizesBreakdown, colorsBreakdown } = useMemo(() => {
    const sMap = {};
    const cMap = {};

    (data?.ordersSummary || []).forEach(item => {
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

    return { sizesBreakdown: sArr, colorsBreakdown: cArr };
  }, [data?.ordersSummary]);

  // Filtered orders inside tab
  const filteredOrders = useMemo(() => {
    if (!data?.ordersSummary) return [];
    if (!orderSearch.trim()) return data.ordersSummary;
    const q = orderSearch.toLowerCase();
    return data.ordersSummary.filter(ord =>
      (ord.orderId && ord.orderId.toLowerCase().includes(q)) ||
      (ord.customerName && ord.customerName.toLowerCase().includes(q)) ||
      (ord.size && ord.size.toLowerCase().includes(q)) ||
      (ord.color && ord.color.toLowerCase().includes(q))
    );
  }, [data?.ordersSummary, orderSearch]);

  // Filter products for the Hub (when no productId is selected)
  const filteredHubProducts = useMemo(() => {
    return allProductsList.filter(prod => {
      // Category filter
      if (hubCategory !== 'All' && prod.category !== hubCategory) {
        return false;
      }
      // Stock filter
      if (hubStockFilter === 'out_of_stock' && prod.stock > 0) return false;
      if (hubStockFilter === 'low_stock' && (prod.stock === 0 || prod.stock > 5)) return false;
      if (hubStockFilter === 'in_stock' && prod.stock <= 0) return false;

      // Search filter
      if (hubSearch.trim()) {
        const q = hubSearch.toLowerCase().trim();
        const matchName = prod.name && prod.name.toLowerCase().includes(q);
        const matchSku = prod.sku && prod.sku.toLowerCase().includes(q);
        const matchCat = prod.category && (prod.category.toLowerCase().includes(q) || (CAT_AR[prod.category] || '').includes(q));
        return matchName || matchSku || matchCat;
      }

      return true;
    });
  }, [allProductsList, hubCategory, hubStockFilter, hubSearch]);

  const uniqueCategories = useMemo(() => {
    const set = new Set();
    allProductsList.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [allProductsList]);

  const handlePrint = () => {
    window.print();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: PRODUCT SELECTION & SEARCH HUB (No product selected yet)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!productId) {
    return (
      <div className="space-y-6 pb-20" dir="rtl">
        {/* Top Hero Banner */}
        <div className="rounded-[2.5rem] bg-gradient-to-r from-burgundy via-[#681E2E] to-[#4A1521] p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold backdrop-blur-xs">
                <span>📊</span>
                <span>لوحة تقارير ونشاط الأصناف</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                مركز تتبع وتحليل نشاط المنتجات
              </h1>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed font-medium">
                اختر أي صنف أو ابحث عنه لعرض تقرير نشاطه الشامل: المبيعات، هوامش الربح الصافية، المقاسات الأكثر طلباً، وسجل المخزون والتوريدات.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-white text-burgundy font-black text-sm shadow-lg hover:bg-[#FAF6EE] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>📈</span>
                <span>تحليلات الأقسام (شميزات، دريسات...)</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/products')}
                className="px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm backdrop-blur-xs transition flex items-center gap-2 cursor-pointer"
              >
                <span>←</span>
                <span>العودة للمخزن والمنتجات</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter & Search Bar */}
        <div className="bg-white rounded-3xl p-5 border border-burgundy/10 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 right-3.5 flex items-center text-burgundy/40 text-lg pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                placeholder="ابحث باسم الموديل أو كود SKU أو القسم..."
                value={hubSearch}
                onChange={e => setHubSearch(e.target.value)}
                className="w-full text-sm font-bold pr-11 pl-4 py-3 rounded-2xl border border-burgundy/20 bg-[#FAF7F2]/50 text-burgundy placeholder:text-burgundy/40 outline-none focus:border-burgundy focus:bg-white transition"
              />
              {hubSearch && (
                <button
                  type="button"
                  onClick={() => setHubSearch('')}
                  className="absolute inset-y-0 left-3 flex items-center text-xs font-bold text-burgundy/40 hover:text-burgundy"
                >
                  مسح
                </button>
              )}
            </div>

            {/* Stock Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-burgundy/70 ml-1">حالة المخزون:</span>
              {[
                { id: 'all', label: 'الكل' },
                { id: 'in_stock', label: 'متوفر بالمخزن' },
                { id: 'low_stock', label: 'مخزون منخفض (≤ 5)' },
                { id: 'out_of_stock', label: 'نافد (0)' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setHubStockFilter(f.id)}
                  className={`text-xs px-3.5 py-2 rounded-xl font-bold transition cursor-pointer ${
                    hubStockFilter === f.id
                      ? 'bg-burgundy text-white shadow-xs'
                      : 'bg-burgundy/5 text-burgundy/70 hover:bg-burgundy/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-burgundy/5">
            <span className="text-xs font-black text-burgundy/70 ml-1 flex-shrink-0">الأقسام:</span>
            <button
              type="button"
              onClick={() => setHubCategory('All')}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold flex-shrink-0 transition cursor-pointer ${
                hubCategory === 'All'
                  ? 'bg-burgundy text-white shadow-xs'
                  : 'bg-burgundy/5 text-burgundy/70 hover:bg-burgundy/10'
              }`}
            >
              كل الأقسام ({allProductsList.length})
            </button>
            {uniqueCategories.map(cat => {
              const count = allProductsList.filter(it => it.category === cat).length;
              const label = CAT_AR[cat] || cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setHubCategory(cat)}
                  className={`text-xs px-3.5 py-1.5 rounded-xl font-bold flex-shrink-0 transition cursor-pointer ${
                    hubCategory === cat
                      ? 'bg-burgundy text-white shadow-xs'
                      : 'bg-burgundy/5 text-burgundy/70 hover:bg-burgundy/10'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Products Grid */}
        {loadingProducts ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 text-burgundy">
            <div className="w-10 h-10 border-4 border-burgundy/20 border-t-burgundy rounded-full animate-spin" />
            <p className="text-sm font-bold text-burgundy/70">جارٍ تحميل قائمة المنتجات...</p>
          </div>
        ) : filteredHubProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-dashed border-burgundy/20 text-center space-y-3">
            <span className="text-4xl block">🔍</span>
            <h3 className="text-base font-bold text-burgundy">لم يتم العثور على أي منتج يطابق خيارات البحث</h3>
            <p className="text-xs text-burgundy/60">جرب كتابة اسم مختلف أو تغيير فلتر القسم ومستوى المخزون.</p>
            <button
              type="button"
              onClick={() => { setHubSearch(''); setHubCategory('All'); setHubStockFilter('all'); }}
              className="text-xs font-bold text-burgundy bg-burgundy/10 px-4 py-2 rounded-xl hover:bg-burgundy hover:text-white transition"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredHubProducts.map(prod => {
              const img = prod.images && prod.images.length > 0 ? prod.images[0] : null;
              const catName = CAT_AR[prod.category] || prod.category;
              const profitPerItem = (prod.effectivePrice || prod.price || 0) - (prod.costPrice || 0);

              return (
                <div
                  key={prod._id}
                  className="rounded-3xl bg-white border border-burgundy/10 shadow-xs hover:shadow-md hover:border-burgundy/30 transition-all duration-200 p-4 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    {/* Top image & badges */}
                    <div className="relative aspect-square rounded-2xl bg-[#F7F0EC] overflow-hidden flex items-center justify-center border border-burgundy/5">
                      {img ? (
                        <img
                          src={img}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <span className="text-4xl text-burgundy/40">👗</span>
                      )}

                      {/* Category Badge */}
                      <span className="absolute top-2.5 right-2.5 text-[11px] font-bold bg-white/90 backdrop-blur-xs text-burgundy px-2.5 py-1 rounded-full shadow-xs">
                        {catName}
                      </span>

                      {/* Stock Pill */}
                      <span className={`absolute bottom-2.5 right-2.5 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs ${
                        prod.stock === 0
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : prod.stock <= 5
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}>
                        {prod.stock === 0 ? 'نفد المخزون' : `${prod.stock} قطعة بالمحل`}
                      </span>
                    </div>

                    {/* Product Name & SKU */}
                    <div>
                      <h3 className="font-black text-sm text-burgundy line-clamp-1 group-hover:text-burgundy/80 transition" title={prod.name}>
                        {prod.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-burgundy/60">
                        {prod.sku && <span className="font-mono bg-burgundy/5 px-2 py-0.5 rounded text-burgundy font-bold">#{prod.sku}</span>}
                        {prod.supplier && <span className="truncate">مورد: {prod.supplier}</span>}
                      </div>
                    </div>

                    {/* Price and Margin */}
                    <div className="bg-[#FAF7F2] p-2.5 rounded-2xl border border-burgundy/5 flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-burgundy/50 block font-sans">سعر البيع</span>
                        <strong className="text-burgundy font-black">{EGP(prod.effectivePrice || prod.price)}</strong>
                      </div>
                      <div className="h-6 w-px bg-burgundy/10" />
                      <div className="text-left">
                        <span className="text-[10px] text-emerald-700 block font-sans">مكسب القطعة</span>
                        <strong className="text-emerald-700 font-black">+{EGP(profitPerItem)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Open Analytics Button */}
                  <div className="mt-4 pt-3 border-t border-burgundy/5">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/products/${prod._id}/analytics`)}
                      className="w-full py-2.5 rounded-xl bg-burgundy hover:bg-burgundy/90 text-white font-bold text-xs shadow-xs hover:shadow transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>📊</span>
                      <span>عرض تقرير النشاط والتحليلات</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Category Modal if opened */}
        {isCategoryModalOpen && (
          <CategoryAnalyticsModal
            initialCategory="all"
            onClose={() => setIsCategoryModalOpen(false)}
            onSelectProduct={(pr) => {
              setIsCategoryModalOpen(false);
              navigate(`/admin/products/${pr._id || pr.id}/analytics`);
            }}
          />
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: LOADING OR ERROR STATE
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-burgundy" dir="rtl">
        <div className="w-12 h-12 border-4 border-burgundy/20 border-t-burgundy rounded-full animate-spin" />
        <p className="text-base font-bold text-burgundy/80">جارٍ إعداد وتحليل التقرير الشامل لحركة ونشاط الموديل...</p>
      </div>
    );
  }

  if (error || !p) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4" dir="rtl">
        <div className="text-5xl">⚠️</div>
        <h3 className="text-xl font-bold text-burgundy">{error || 'المنتج غير موجود'}</h3>
        <p className="text-sm text-burgundy/60">تأكد من صحة رابط الصنف أو اختر صنفاً آخر من قائمة المنتجات.</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/admin/products/analytics')}
            className="px-6 py-2.5 bg-burgundy text-white font-bold rounded-xl shadow hover:bg-burgundy/90 transition"
          >
            اختيار صنف آخر من القائمة 🔍
          </button>
          <button
            onClick={() => navigate('/admin/products')}
            className="px-5 py-2.5 bg-burgundy/10 text-burgundy font-bold rounded-xl hover:bg-burgundy/20 transition"
          >
            العودة للمخزن والمنتجات
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 3: FULL COMPREHENSIVE PRODUCT ANALYTICS DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-16" dir="rtl">
      {/* Top Breadcrumb & Controls (Hidden in Print) */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-burgundy/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-burgundy/60 font-semibold mb-1">
            <Link to="/admin" className="hover:underline">الإدارة</Link>
            <span>›</span>
            <Link to="/admin/products" className="hover:underline">المنتجات والمخزون</Link>
            <span>›</span>
            <Link to="/admin/products/analytics" className="hover:underline">تتبع نشاط المنتجات</Link>
            <span>›</span>
            <span className="text-burgundy font-bold">{p.name}</span>
          </div>
          <h1 className="text-2xl font-black text-burgundy flex items-center gap-2">
            <span>📊</span>
            <span>تقرير الأداء الشامل ونشاط الصنف</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Product Switcher */}
          {allProductsList.length > 0 && (
            <div className="relative min-w-[220px]">
              <select
                value={p.id || productId}
                onChange={(e) => navigate(`/admin/products/${e.target.value}/analytics`)}
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-burgundy/20 bg-white text-burgundy shadow-xs outline-none focus:border-burgundy cursor-pointer"
              >
                <option disabled value="">🔄 التبديل لصنف آخر...</option>
                {allProductsList.map(prod => (
                  <option key={prod._id} value={prod._id}>
                    {prod.name} {prod.sku ? `(#${prod.sku})` : ''} - [{CAT_AR[prod.category] || prod.category}]
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Browse all products button */}
          <button
            type="button"
            onClick={() => navigate('/admin/products/analytics')}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-burgundy/5 text-burgundy border border-burgundy/20 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="تصفح قائمة كل الأصناف"
          >
            <span>🔍</span>
            <span>اختيار صنف آخر</span>
          </button>

          {/* Action Buttons */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-burgundy/5 text-burgundy border border-burgundy/20 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="طباعة التقرير أو حفظه بصيغة PDF"
          >
            <span>🖨️</span>
            <span>طباعة التقرير</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="px-4 py-2.5 rounded-xl bg-burgundy/10 hover:bg-burgundy hover:text-white text-burgundy font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>←</span>
            <span>العودة للمخزن</span>
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
              {periodInfo && (
                <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full font-bold shadow-xs">
                  📅 {periodInfo.label}
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

      {/* Time Period Filter Bar (Hidden in Print) */}
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

      {/* Notice when 0 sales in selected period */}
      {m.netSold === 0 && selectedPeriod !== 'all' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">ℹ️</span>
            <span>لم تسجل أي حركة بيع لهذا الصنف خلال <strong>{periodInfo?.label || 'هذه الفترة'}</strong>.</span>
          </div>
          {data?.lifetimeOrdersCount > 0 && (
            <button
              type="button"
              onClick={() => handlePeriodChange('all')}
              className="bg-burgundy text-white hover:bg-burgundy/90 px-4 py-2 rounded-xl font-bold transition shadow-xs flex-shrink-0 cursor-pointer"
            >
              عرض سجل كل الفترات ({data.lifetimeOrdersCount} فاتورة) ←
            </button>
          )}
        </div>
      )}

      {/* KPI 4 Cards Grid */}
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

      {/* Visual Analytics Row: Sizes & Colors Demands + Variants Table */}
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
              {sizesBreakdown.length === 0 ? (
                <p className="text-xs text-burgundy/40 py-4 text-center">لا توجد تفاصيل مقاسات مسجلة بالفترة</p>
              ) : (
                <div className="space-y-2">
                  {sizesBreakdown.map((item, idx) => {
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
              {colorsBreakdown.length === 0 ? (
                <p className="text-xs text-burgundy/40 py-4 text-center">لا توجد تفاصيل ألوان مسجلة بالفترة</p>
              ) : (
                <div className="space-y-2">
                  {colorsBreakdown.map((item, idx) => {
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
            📋 فواتير المبيعات المرتبطة ({data?.ordersSummary?.length || 0})
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
            📜 سجل حركات المخزون والتوريد ({data?.stockHistory?.length || 0})
          </button>
          {data?.supplierHistory?.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('suppliers')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'suppliers'
                  ? 'bg-burgundy text-white shadow-sm'
                  : 'text-burgundy/60 hover:text-burgundy hover:bg-burgundy/5'
              }`}
            >
              🚚 فواتير التوريد من الموردين ({data.supplierHistory.length})
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
          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-xs text-burgundy/50 space-y-2">
              <p className="font-bold text-sm">لا توجد فواتير بيع مسجلة لهذا الصنف في {periodInfo?.label || 'الفترة المحددة'}.</p>
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
                  {filteredOrders.map((item, idx) => (
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
          {(data?.stockHistory || []).length === 0 ? (
            <div className="py-16 text-center text-xs text-burgundy/50">
              لا توجد حركات مخزون مسجلة لهذا الصنف في {periodInfo?.label || 'الفترة المحددة'}.
            </div>
          ) : (
            <div className="divide-y divide-burgundy/6">
              {data.stockHistory.map((h, i) => {
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
          {(!data?.supplierHistory || data.supplierHistory.length === 0) ? (
            <div className="py-16 text-center text-xs text-burgundy/50">
              لا توجد فواتير توريد مسجلة لهذا الصنف.
            </div>
          ) : (
            <div className="divide-y divide-burgundy/6">
              {data.supplierHistory.map((stx, i) => (
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
