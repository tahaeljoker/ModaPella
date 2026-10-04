import React, { useState, useEffect } from 'react';
import api from '../services/api';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const DEFAULT_CAT_AR = {
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

export default function CategoryAnalyticsModal({ initialCategory = null, onClose, onSelectProduct = null }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'all');
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'top_slow' | 'variants' | 'orders'

  const fetchCategoryData = (cat) => {
    setLoading(true);
    const url = cat && cat !== 'all' 
      ? `/admin/categories/analytics?category=${encodeURIComponent(cat)}`
      : '/admin/categories/analytics';

    api.get(url)
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        console.error('Failed to load category analytics:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategoryData(selectedCategory);
  }, [selectedCategory]);

  const categoriesList = data?.categories || [];
  const allProducts = data?.allProducts || [];
  const storeSummary = data?.storeSummary;
  const currentCategoryData = data?.selectedCategory || (selectedCategory === 'all' ? null : categoriesList.find(c => c.category === selectedCategory));

  const isAllView = selectedCategory === 'all' || !currentCategoryData;

  const getVelocityBadge = (velocity) => {
    if (!velocity) return null;
    const isFast = velocity.status === 'fast';
    const isDead = velocity.status === 'dead';
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
        isFast 
          ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30' 
          : isDead 
            ? 'bg-rose-500/15 text-rose-800 border border-rose-500/30' 
            : 'bg-amber-500/15 text-amber-800 border border-amber-500/30'
      }`}>
        {velocity.badge}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-sm" onClick={onClose} dir="rtl">
      <div 
        className="w-full max-w-5xl overflow-hidden rounded-[2.5rem] bg-[#FDFBF7] shadow-2xl border border-burgundy/15 max-h-[94vh] flex flex-col text-burgundy"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-burgundy/10 px-6 sm:px-8 py-5 bg-white gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-burgundy/10 flex items-center justify-center text-burgundy font-bold text-2xl shadow-inner">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-burgundy">
                  تتبع نشاط وأداء الأصناف والأقسام
                </h3>
                <span className="text-xs bg-burgundy/10 text-burgundy px-2.5 py-0.5 rounded-full font-bold">
                  {isAllView ? 'مقارنة شاملة' : (DEFAULT_CAT_AR[currentCategoryData?.category] || currentCategoryData?.category)}
                </span>
              </div>
              <p className="text-xs text-burgundy/60 mt-0.5">
                متابعة حركة كل قسم بالكامل (شميزات، دريسات، بلوزات...) لمعرفة الأقسام الرابحة والأصناف الراكدة
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-burgundy/5 hover:bg-burgundy/15 flex items-center justify-center text-burgundy/60 hover:text-burgundy transition font-bold self-end sm:self-center"
          >
            ✕
          </button>
        </div>

        {/* Category & Product Selector Section */}
        <div className="bg-[#FAF7F2] border-b border-burgundy/10 px-6 sm:px-8 py-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <label className="text-xs font-black text-burgundy shrink-0 flex items-center gap-1.5">
              <span>🎯</span>
              <span>اختر الصنف أو القسم لتتبع نشاطه:</span>
            </label>
            
            <div className="relative flex-1">
              <select
                value={selectedCategory}
                onChange={e => {
                  const val = e.target.value;
                  if (val.startsWith('prod_')) {
                    const pId = val.replace('prod_', '');
                    const prod = allProducts.find(p => p.id === pId);
                    if (prod && onSelectProduct) {
                      onClose();
                      onSelectProduct(prod);
                    }
                  } else {
                    setSelectedCategory(val);
                  }
                }}
                className="w-full rounded-2xl border-2 border-burgundy/25 bg-white px-4 py-2.5 text-sm font-black text-burgundy shadow-xs outline-none focus:border-burgundy focus:ring-2 focus:ring-burgundy/20 cursor-pointer"
              >
                <option value="all">🌟 كل الأقسام والأصناف (مقارنة شاملة وترتيب الأداء)</option>
                
                {categoriesList.length > 0 && (
                  <optgroup label="👔 تتبع قسم بالكامل (كل الموديلات التابعة له):">
                    {categoriesList.map(c => (
                      <option key={c.category} value={c.category}>
                        📁 قسم {c.labelAr || DEFAULT_CAT_AR[c.category] || c.category} ({c.productsCount} موديل · مخزون: {c.totalStock} قطعة)
                      </option>
                    ))}
                  </optgroup>
                )}

                {allProducts.length > 0 && (
                  <optgroup label="🏷️ أو اختر موديلاً بعينه:">
                    {allProducts.map(p => (
                      <option key={p.id} value={`prod_${p.id}`}>
                        👕 {p.name} {p.sku ? `(#${p.sku})` : ''} - [{DEFAULT_CAT_AR[p.category] || p.category}]
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            <span className="text-[11px] font-bold text-burgundy/50 shrink-0">أزرار سريعة للأقسام:</span>
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-burgundy text-white shadow-md'
                  : 'bg-white text-burgundy/80 hover:bg-burgundy/10 border border-burgundy/15'
              }`}
            >
              🌟 كل الأقسام
            </button>

            {categoriesList.map(c => {
              const catKey = c.category;
              const arName = c.labelAr || DEFAULT_CAT_AR[catKey] || catKey;
              const isSelected = selectedCategory.toLowerCase() === catKey.toLowerCase();
              return (
                <button
                  type="button"
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-burgundy text-white shadow-md'
                      : 'bg-white text-burgundy/80 hover:bg-burgundy/10 border border-burgundy/15'
                  }`}
                >
                  <span>{arName}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-burgundy/10 text-burgundy'
                  }`}>
                    {c.productsCount || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-[#FDFBF7]">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-burgundy/20 border-t-burgundy rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-burgundy/60">جاري تجميع وتحليل أداء القسم...</p>
            </div>
          ) : isAllView ? (
            /* ALL CATEGORIES COMPARATIVE DASHBOARD */
            <div className="space-y-6">
              {/* Store summary KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-2xl border border-burgundy/10 shadow-sm">
                  <p className="text-xs text-burgundy/60 font-semibold mb-1">إجمالي الأصناف المسجلة</p>
                  <p className="text-2xl font-black text-burgundy">{storeSummary?.totalCategories || categoriesList.length} <span className="text-xs font-normal">أقسام</span></p>
                  <p className="text-[11px] text-burgundy/50 mt-1">شميزات، دريسات، بلوزات...</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-burgundy/10 shadow-sm">
                  <p className="text-xs text-burgundy/60 font-semibold mb-1">إجمالي المبيعات المحققة</p>
                  <p className="text-2xl font-black text-burgundy">{EGP(storeSummary?.totalRevenue || 0)}</p>
                  <p className="text-[11px] text-emerald-700 font-bold mt-1">صافي القطع: {storeSummary?.netSold || 0} قطعة</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-burgundy/10 shadow-sm">
                  <p className="text-xs text-burgundy/60 font-semibold mb-1">صافي أرباح البضاعة (Gross Profit)</p>
                  <p className="text-2xl font-black text-emerald-700">{EGP(storeSummary?.grossProfit || 0)}</p>
                  <p className="text-[11px] text-burgundy/50 mt-1">هامش ربح إجمالي: {storeSummary?.profitMargin || 0}%</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-burgundy/10 shadow-sm">
                  <p className="text-xs text-burgundy/60 font-semibold mb-1">رأس المال المجمد في المخازن</p>
                  <p className="text-2xl font-black text-amber-700">{EGP(storeSummary?.stockValueCost || 0)}</p>
                  <p className="text-[11px] text-burgundy/50 mt-1">رصيد المخزون: {storeSummary?.totalStock || 0} قطعة</p>
                </div>
              </div>

              {/* Comparative Ranking Table */}
              <div className="bg-white rounded-3xl border border-burgundy/10 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-burgundy/10 flex items-center justify-between">
                  <h4 className="font-bold text-burgundy text-base flex items-center gap-2">
                    <span>🏆</span> جدول مقارنة وترتيب أداء الأقسام
                  </h4>
                  <span className="text-xs text-burgundy/50">اضغط على أي صنف لعرض تفاصيله بالكامل</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="bg-burgundy/5 text-burgundy/70 text-xs font-bold border-b border-burgundy/10">
                        <th className="py-3 px-4">الصنف / القسم</th>
                        <th className="py-3 px-4">عدد الموديلات</th>
                        <th className="py-3 px-4">المخزون الحالي</th>
                        <th className="py-3 px-4">القطع المباعة</th>
                        <th className="py-3 px-4">معدل الدوران</th>
                        <th className="py-3 px-4">إجمالي المبيعات</th>
                        <th className="py-3 px-4">صافي الربح</th>
                        <th className="py-3 px-4">هامش الربح</th>
                        <th className="py-3 px-4">حالة النشاط</th>
                        <th className="py-3 px-4 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-burgundy/5">
                      {categoriesList.map(c => {
                        const arName = c.labelAr || DEFAULT_CAT_AR[c.category] || c.category;
                        return (
                          <tr 
                            key={c.category} 
                            onClick={() => setSelectedCategory(c.category)}
                            className="hover:bg-burgundy/5 transition cursor-pointer group"
                          >
                            <td className="py-3.5 px-4 font-bold text-burgundy flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-burgundy/30 group-hover:bg-burgundy transition"></span>
                              <span className="text-base">{arName}</span>
                              <span className="text-xs text-burgundy/40 font-mono">({c.category})</span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold">{c.productsCount} موديلات</td>
                            <td className="py-3.5 px-4 font-bold text-amber-800">{c.totalStock} قطعة</td>
                            <td className="py-3.5 px-4 font-bold text-emerald-800">{c.netSold} قطعة</td>
                            <td className="py-3.5 px-4 font-bold">
                              <span className="bg-burgundy/10 text-burgundy px-2 py-0.5 rounded-full text-xs">
                                {c.sellThroughRate}%
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-burgundy">{EGP(c.totalRevenue)}</td>
                            <td className="py-3.5 px-4 font-bold text-emerald-700">{EGP(c.grossProfit)}</td>
                            <td className="py-3.5 px-4 font-semibold">{c.profitMargin}%</td>
                            <td className="py-3.5 px-4">{getVelocityBadge(c.velocity)}</td>
                            <td className="py-3.5 px-4 text-center">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedCategory(c.category); }}
                                className="text-xs bg-burgundy/10 hover:bg-burgundy hover:text-white text-burgundy font-bold px-3 py-1 rounded-xl transition"
                              >
                                عرض التفاصيل ←
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* SINGLE CATEGORY DEEP DIVE */
            <div className="space-y-6">
              {/* Category Velocity & Health Banner */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-burgundy/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-burgundy/10 flex items-center justify-center text-3xl shadow-inner">
                    👔
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-2xl font-black text-burgundy">
                        قسم {currentCategoryData.labelAr || DEFAULT_CAT_AR[currentCategoryData.category] || currentCategoryData.category}
                      </h4>
                      {getVelocityBadge(currentCategoryData.velocity)}
                    </div>
                    <p className="text-xs text-burgundy/70 mt-1 font-medium">
                      {currentCategoryData.velocity?.label}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-[#FAF7F2] p-3 rounded-2xl border border-burgundy/10 self-start md:self-auto">
                  <div className="text-center px-3 border-l border-burgundy/10">
                    <p className="text-[10px] text-burgundy/60 font-semibold">معدل السحب (Sell-Through)</p>
                    <p className="text-lg font-black text-burgundy">{currentCategoryData.sellThroughRate}%</p>
                  </div>
                  <div className="text-center px-3">
                    <p className="text-[10px] text-burgundy/60 font-semibold">الموديلات المسجلة</p>
                    <p className="text-lg font-black text-burgundy">{currentCategoryData.productsCount} موديل</p>
                  </div>
                </div>
              </div>

              {/* Detailed Financial & Inventory KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Sales */}
                <div className="bg-white p-4 rounded-2xl border border-burgundy/10 shadow-sm">
                  <p className="text-xs text-burgundy/60 font-semibold mb-1">إجمالي إيراد المبيعات</p>
                  <p className="text-2xl font-black text-burgundy">{EGP(currentCategoryData.totalRevenue)}</p>
                  <p className="text-[11px] text-burgundy/60 mt-1">
                    باعت: <strong>{currentCategoryData.netSold}</strong> قطعة (مرتجع: {currentCategoryData.unitsReturned})
                  </p>
                </div>

                {/* Gross Profit */}
                <div className="bg-white p-4 rounded-2xl border border-burgundy/10 shadow-sm">
                  <p className="text-xs text-burgundy/60 font-semibold mb-1">صافي أرباح القسم (Profit)</p>
                  <p className="text-2xl font-black text-emerald-700">{EGP(currentCategoryData.grossProfit)}</p>
                  <p className="text-[11px] text-emerald-700 font-bold mt-1">
                    هامش الربح التجاري: {currentCategoryData.profitMargin}%
                  </p>
                </div>

                {/* Remaining Stock Units */}
                <div className="bg-white p-4 rounded-2xl border border-burgundy/10 shadow-sm">
                  <p className="text-xs text-burgundy/60 font-semibold mb-1">المخزون المتبقي حالياً</p>
                  <p className="text-2xl font-black text-amber-700">{currentCategoryData.totalStock} <span className="text-xs font-normal">قطعة</span></p>
                  <p className="text-[11px] text-burgundy/60 mt-1">
                    إجمالي ما استُلم: {currentCategoryData.totalReceived} قطعة
                  </p>
                </div>

                {/* Capital Tied in Stock */}
                <div className="bg-white p-4 rounded-2xl border border-burgundy/10 shadow-sm">
                  <p className="text-xs text-burgundy/60 font-semibold mb-1">رأس المال المجمد (بالتكلفة)</p>
                  <p className="text-2xl font-black text-rose-700">{EGP(currentCategoryData.stockValueCost)}</p>
                  <p className="text-[11px] text-burgundy/60 mt-1">
                    القيمة البيعية المتوقعة: {EGP(currentCategoryData.stockValueRetail)}
                  </p>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex border-b border-burgundy/10 gap-2">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`pb-3 px-4 font-bold text-sm transition relative ${
                    activeTab === 'products'
                      ? 'text-burgundy border-b-2 border-burgundy'
                      : 'text-burgundy/50 hover:text-burgundy'
                  }`}
                >
                  👕 موديلات هذا القسم ({currentCategoryData.productsList?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('top_slow')}
                  className={`pb-3 px-4 font-bold text-sm transition relative ${
                    activeTab === 'top_slow'
                      ? 'text-burgundy border-b-2 border-burgundy'
                      : 'text-burgundy/50 hover:text-burgundy'
                  }`}
                >
                  ⚡ الأكثر مبيعاً مقابل الراكد
                </button>
                <button
                  onClick={() => setActiveTab('variants')}
                  className={`pb-3 px-4 font-bold text-sm transition relative ${
                    activeTab === 'variants'
                      ? 'text-burgundy border-b-2 border-burgundy'
                      : 'text-burgundy/50 hover:text-burgundy'
                  }`}
                >
                  🎨 إقبال المقاسات والألوان
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`pb-3 px-4 font-bold text-sm transition relative ${
                    activeTab === 'orders'
                      ? 'text-burgundy border-b-2 border-burgundy'
                      : 'text-burgundy/50 hover:text-burgundy'
                  }`}
                >
                  🧾 سجل الفواتير والمبيعات الأخيرة
                </button>
              </div>

              {/* Tab 1: Products list under this category */}
              {activeTab === 'products' && (
                <div className="bg-white rounded-3xl border border-burgundy/10 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead>
                        <tr className="bg-burgundy/5 text-burgundy/70 text-xs font-bold border-b border-burgundy/10">
                          <th className="py-3 px-4">الموديل</th>
                          <th className="py-3 px-4">كود SKU</th>
                          <th className="py-3 px-4">سعر التكلفة</th>
                          <th className="py-3 px-4">سعر البيع</th>
                          <th className="py-3 px-4">المخزون</th>
                          <th className="py-3 px-4">القطع المباعة</th>
                          <th className="py-3 px-4">إجمالي المبيعات</th>
                          <th className="py-3 px-4">صافي الربح</th>
                          <th className="py-3 px-4">معدل السحب</th>
                          <th className="py-3 px-4 text-center">إجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-burgundy/5">
                        {(currentCategoryData.productsList || []).map(p => (
                          <tr key={p.id} className="hover:bg-burgundy/5 transition">
                            <td className="py-3.5 px-4 font-bold text-burgundy">{p.name}</td>
                            <td className="py-3.5 px-4 font-mono text-xs text-burgundy/60">{p.sku || '-'}</td>
                            <td className="py-3.5 px-4 text-burgundy/70">{EGP(p.costPrice)}</td>
                            <td className="py-3.5 px-4 font-bold text-burgundy">{EGP(p.price)}</td>
                            <td className="py-3.5 px-4 font-bold text-amber-800">{p.stock} قطعة</td>
                            <td className="py-3.5 px-4 font-bold text-emerald-800">{p.netSold} قطعة</td>
                            <td className="py-3.5 px-4 font-bold">{EGP(p.totalRevenue)}</td>
                            <td className="py-3.5 px-4 font-bold text-emerald-700">{EGP(p.grossProfit)}</td>
                            <td className="py-3.5 px-4 font-semibold">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                p.sellThroughRate >= 45 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : p.isDead 
                                    ? 'bg-rose-100 text-rose-800' 
                                    : 'bg-amber-100 text-amber-800'
                              }`}>
                                {p.sellThroughRate}%
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {onSelectProduct && (
                                <button
                                  onClick={() => onSelectProduct(p)}
                                  className="text-xs bg-burgundy/10 hover:bg-burgundy hover:text-white text-burgundy font-bold px-3 py-1 rounded-xl transition"
                                >
                                  فحص الموديل 🔍
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Top vs Slow movers within category */}
              {activeTab === 'top_slow' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Sellers */}
                  <div className="bg-white rounded-3xl p-5 border border-emerald-500/20 shadow-sm">
                    <h5 className="font-black text-emerald-800 text-base mb-3 flex items-center gap-2">
                      <span>🚀</span> أكثر موديلات هذا القسم سحباً ومبيعاً
                    </h5>
                    <div className="space-y-3">
                      {(currentCategoryData.topProducts || []).length === 0 ? (
                        <p className="text-xs text-burgundy/50 py-4 text-center">لا توجد مبيعات مسجلة لهذا القسم بعد</p>
                      ) : (
                        currentCategoryData.topProducts.map((p, idx) => (
                          <div key={p.id} className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-500/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-bold text-burgundy text-sm">{p.name}</p>
                                <p className="text-[11px] text-burgundy/60">باع {p.netSold} قطعة · مبيعات: {EGP(p.totalRevenue)}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-xl">
                              ربح: {EGP(p.grossProfit)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Slow Movers / Dead Stock */}
                  <div className="bg-white rounded-3xl p-5 border border-rose-500/20 shadow-sm">
                    <h5 className="font-black text-rose-800 text-base mb-3 flex items-center gap-2">
                      <span>🛑</span> بضاعة راكدة داخل هذا القسم (محتاجة عروض)
                    </h5>
                    <div className="space-y-3">
                      {(currentCategoryData.slowProducts || []).length === 0 ? (
                        <p className="text-xs text-emerald-700 font-bold py-4 text-center">
                          🎉 ممتاز! لا يوجد بضاعة راكدة في هذا القسم ومعدل السحب متزن.
                        </p>
                      ) : (
                        currentCategoryData.slowProducts.map(p => (
                          <div key={p.id} className="p-3 rounded-2xl bg-rose-50/50 border border-rose-500/10 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-burgundy text-sm">{p.name}</p>
                              <p className="text-[11px] text-rose-800/80">
                                مخزون مركون: <strong>{p.stock} قطعة</strong> · تم سحب: {p.netSold} فقط ({p.sellThroughRate}%)
                              </p>
                            </div>
                            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-xl">
                              تجميد كاش: {EGP(p.stock * p.costPrice)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Sizes & Colors Demand */}
              {activeTab === 'variants' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sizes */}
                  <div className="bg-white rounded-3xl p-5 border border-burgundy/10 shadow-sm">
                    <h5 className="font-black text-burgundy text-base mb-3 flex items-center gap-2">
                      <span>📏</span> أكثر المقاسات طلباً في قسم {currentCategoryData.labelAr}
                    </h5>
                    {Object.keys(currentCategoryData.sizesBreakdown || {}).length === 0 ? (
                      <p className="text-xs text-burgundy/50 py-4 text-center">لا توجد بيانات مقاسات مفصلة</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(currentCategoryData.sizesBreakdown)
                          .sort((a, b) => b[1] - a[1])
                          .map(([size, count]) => (
                            <div key={size} className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F2]">
                              <span className="font-bold text-burgundy text-sm">مقاس: {size}</span>
                              <span className="font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-lg text-xs">
                                {count} قطعة مباعة
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Colors */}
                  <div className="bg-white rounded-3xl p-5 border border-burgundy/10 shadow-sm">
                    <h5 className="font-black text-burgundy text-base mb-3 flex items-center gap-2">
                      <span>🎨</span> أكثر الألوان طلباً في قسم {currentCategoryData.labelAr}
                    </h5>
                    {Object.keys(currentCategoryData.colorsBreakdown || {}).length === 0 ? (
                      <p className="text-xs text-burgundy/50 py-4 text-center">لا توجد بيانات ألوان مفصلة</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(currentCategoryData.colorsBreakdown)
                          .sort((a, b) => b[1] - a[1])
                          .map(([color, count]) => (
                            <div key={color} className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F2]">
                              <span className="font-bold text-burgundy text-sm">لون: {color}</span>
                              <span className="font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-lg text-xs">
                                {count} قطعة مباعة
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Recent Orders */}
              {activeTab === 'orders' && (
                <div className="bg-white rounded-3xl border border-burgundy/10 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-burgundy/10">
                    <h5 className="font-bold text-burgundy">آخر مبيعات وفواتير تضمنت هذا القسم</h5>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead>
                        <tr className="bg-burgundy/5 text-burgundy/70 text-xs font-bold border-b border-burgundy/10">
                          <th className="py-3 px-4">التاريخ</th>
                          <th className="py-3 px-4">العميل</th>
                          <th className="py-3 px-4">الموديلات المشتراة</th>
                          <th className="py-3 px-4">طريقة الدفع</th>
                          <th className="py-3 px-4">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-burgundy/5">
                        {(currentCategoryData.recentOrders || []).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-xs text-burgundy/50">لا توجد فواتير بعد</td>
                          </tr>
                        ) : (
                          currentCategoryData.recentOrders.map((ord, idx) => (
                            <tr key={idx} className="hover:bg-burgundy/5 transition">
                              <td className="py-3 px-4 text-xs font-medium text-burgundy/70">
                                {new Date(ord.date).toLocaleDateString('ar-EG')}
                              </td>
                              <td className="py-3 px-4 font-bold text-burgundy">
                                {ord.customerName}
                              </td>
                              <td className="py-3 px-4">
                                <div className="space-y-1">
                                  {ord.items.map((it, i) => (
                                    <div key={i} className="text-xs">
                                      <span className="font-bold">{it.name}</span>
                                      <span className="text-burgundy/60 mx-1">({it.size} - {it.color})</span>
                                      <span className="font-mono text-emerald-800">×{it.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-xs font-semibold">{ord.paymentMethod}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  ord.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {ord.status === 'Completed' ? 'مكتملة' : 'مرتجع'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-burgundy/10 px-6 sm:px-8 py-4 bg-white flex items-center justify-between">
          <div className="text-xs text-burgundy/60 flex items-center gap-2">
            <span>💡</span>
            <span>استخدم هذا التقرير لتوجيه ميزانية الشراء القادمة نحو الأقسام الأكثر طلباً والحد من البضاعة الراكدة.</span>
          </div>
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 rounded-2xl bg-burgundy text-white hover:bg-burgundy/90 text-sm font-bold transition shadow-md"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
}
