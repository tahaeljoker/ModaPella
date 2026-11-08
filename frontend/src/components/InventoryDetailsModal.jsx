import { useState, useMemo, useEffect } from 'react';
import api from '../services/api';

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

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

export default function InventoryDetailsModal({
  isOpen,
  onClose,
  initialProducts = null,
  title = 'تفاصيل واشتقاق حساب المخزون والبضاعة'
}) {
  const [products, setProducts] = useState(initialProducts || []);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'categories' | 'seasons' | 'list'
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'display' | 'archived' | 'out'

  useEffect(() => {
    if (isOpen) {
      if (initialProducts && initialProducts.length > 0) {
        setProducts(initialProducts);
      } else {
        setLoading(true);
        api.get('/products?includeOffSeason=true')
          .then((res) => {
            setProducts(Array.isArray(res?.data) ? res.data : []);
          })
          .catch((err) => {
            console.error('Failed to load inventory breakdown products:', err);
          })
          .finally(() => setLoading(false));
      }
    }
  }, [isOpen, initialProducts]);

  // Comprehensive Metrics Calculation
  const stats = useMemo(() => {
    const list = Array.isArray(products) ? products : [];

    // Unique Product Models
    const totalModels = list.length;
    const displayModels = list.filter(p => !p.isSeasonArchived).length;
    const archivedModels = list.filter(p => Boolean(p.isSeasonArchived)).length;
    const inStockModels = list.filter(p => (p.stock || 0) > 0).length;
    const outOfStockModels = list.filter(p => (p.stock || 0) === 0).length;
    const lowStockModels = list.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 5).length;

    // Physical Pieces (Units)
    const totalPieces = list.reduce((s, p) => s + Number(p.stock || 0), 0);
    const displayPieces = list.filter(p => !p.isSeasonArchived).reduce((s, p) => s + Number(p.stock || 0), 0);
    const archivedPieces = list.filter(p => Boolean(p.isSeasonArchived)).reduce((s, p) => s + Number(p.stock || 0), 0);

    // Valuations
    const totalRetailValue = list.reduce((s, p) => s + (Number(p.stock || 0) * Number(p.price || 0)), 0);
    const totalCostValue = list.reduce((s, p) => s + (Number(p.stock || 0) * Number(p.costPrice || 0)), 0);
    const potentialProfit = Math.max(0, totalRetailValue - totalCostValue);

    // Seasons Breakdown
    const summer = list.filter(p => p.season === 'summer');
    const winter = list.filter(p => p.season === 'winter');
    const allYear = list.filter(p => !p.season || p.season === 'all');

    const seasonStats = {
      summer: {
        models: summer.length,
        pieces: summer.reduce((s, p) => s + Number(p.stock || 0), 0),
        displayPieces: summer.filter(p => !p.isSeasonArchived).reduce((s, p) => s + Number(p.stock || 0), 0),
        archivedPieces: summer.filter(p => p.isSeasonArchived).reduce((s, p) => s + Number(p.stock || 0), 0),
      },
      winter: {
        models: winter.length,
        pieces: winter.reduce((s, p) => s + Number(p.stock || 0), 0),
        displayPieces: winter.filter(p => !p.isSeasonArchived).reduce((s, p) => s + Number(p.stock || 0), 0),
        archivedPieces: winter.filter(p => p.isSeasonArchived).reduce((s, p) => s + Number(p.stock || 0), 0),
      },
      allYear: {
        models: allYear.length,
        pieces: allYear.reduce((s, p) => s + Number(p.stock || 0), 0),
        displayPieces: allYear.filter(p => !p.isSeasonArchived).reduce((s, p) => s + Number(p.stock || 0), 0),
        archivedPieces: allYear.filter(p => p.isSeasonArchived).reduce((s, p) => s + Number(p.stock || 0), 0),
      }
    };

    // Category Breakdown
    const catMap = {};
    list.forEach(p => {
      const catKey = p.category || 'أخرى';
      if (!catMap[catKey]) {
        catMap[catKey] = {
          key: catKey,
          nameAr: DEFAULT_CAT_AR[catKey] || catKey,
          models: 0,
          totalPieces: 0,
          displayPieces: 0,
          archivedPieces: 0,
          value: 0
        };
      }
      catMap[catKey].models += 1;
      const stk = Number(p.stock || 0);
      catMap[catKey].totalPieces += stk;
      if (p.isSeasonArchived) {
        catMap[catKey].archivedPieces += stk;
      } else {
        catMap[catKey].displayPieces += stk;
      }
      catMap[catKey].value += stk * Number(p.price || 0);
    });

    const categoryList = Object.values(catMap).sort((a, b) => b.totalPieces - a.totalPieces);

    return {
      totalModels,
      displayModels,
      archivedModels,
      inStockModels,
      outOfStockModels,
      lowStockModels,
      totalPieces,
      displayPieces,
      archivedPieces,
      totalRetailValue,
      totalCostValue,
      potentialProfit,
      seasonStats,
      categoryList
    };
  }, [products]);

  // Filtered product items for inspection
  const filteredProducts = useMemo(() => {
    let list = products || [];
    if (filterType === 'display') {
      list = list.filter(p => !p.isSeasonArchived);
    } else if (filterType === 'archived') {
      list = list.filter(p => Boolean(p.isSeasonArchived));
    } else if (filterType === 'out') {
      list = list.filter(p => (p.stock || 0) === 0);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, filterType, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col border border-burgundy/15 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-burgundy/10 bg-[#FAF7F5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-burgundy/10 text-burgundy flex items-center justify-center font-bold text-base">
              📊
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-burgundy">{title}</h3>
              <p className="text-[11px] text-burgundy/60 font-semibold">
                كشف إحصائي شفاف يوضح كيف تم حساب عدد الموديلات والقطع وتوزيعها بين المحل والمستودع
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-rose-50 text-burgundy/60 hover:text-rose-600 flex items-center justify-center transition border border-burgundy/10 text-sm font-bold cursor-pointer"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2.5 bg-white border-b border-burgundy/10 flex items-center gap-2 shrink-0 overflow-x-auto scrollbar-none">
          {[
            { id: 'summary', label: 'الموجز والاشتقاق الأساسي' },
            { id: 'categories', label: `حسب الأقسام (${stats.categoryList.length})` },
            { id: 'seasons', label: 'التوزيع الموسمي' },
            { id: 'list', label: `قائمة المنتجات (${products.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-burgundy text-white shadow-xs'
                  : 'bg-[#FAF7F5] text-burgundy/70 hover:bg-burgundy/10 hover:text-burgundy'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-burgundy">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-burgundy/20 border-t-burgundy rounded-full animate-spin mx-auto" />
              <p className="text-xs text-burgundy/60 font-semibold">جاري جرد وتدقيق بيانات المخزون...</p>
            </div>
          ) : (
            <>
              {/* Golden Clarification Banner */}
              <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-50 via-white to-amber-50 border border-amber-300/60 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs sm:text-sm">
                  <span>💡</span>
                  <span>توضيح مهم: ما الفرق بين "عدد المنتجات" و"إجمالي القطع"؟</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-xs leading-relaxed text-burgundy/80">
                  <div className="bg-white/80 rounded-xl p-3 border border-amber-200">
                    <strong className="text-burgundy font-black block mb-1">
                      1. عدد المنتجات (الموديلات / الأصناف): {stats.totalModels} موديل
                    </strong>
                    <span>
                      هو عدد الستايلات أو التصاميم المختلفة المسجلة في السيستم (مثلاً: بلوزة لافندار = منتج واحد، فستان سواريه = منتج واحد).
                    </span>
                  </div>
                  <div className="bg-white/80 rounded-xl p-3 border border-amber-200">
                    <strong className="text-burgundy font-black block mb-1">
                      2. إجمالي القطع (الوحدات الفعلية بالمخزن): {stats.totalPieces.toLocaleString()} قطعة
                    </strong>
                    <span>
                      هو مجموع كل حبة ملابس حقيقية متوفرة في المحل أو المستودع بجميع مقاساتها وألوانها (مثلاً: الموديل منه 10 قطع بالمقاسات).
                    </span>
                  </div>
                </div>
              </div>

              {/* Tab 1: Summary */}
              {activeTab === 'summary' && (
                <div className="space-y-4">
                  {/* Big KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white rounded-2xl p-4 border border-burgundy/15 shadow-xs">
                      <span className="text-[11px] font-bold text-burgundy/60 block">إجمالي الموديلات</span>
                      <span className="text-2xl font-black text-burgundy mt-1 block">{stats.totalModels}</span>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        منها {stats.inStockModels} متوفر و {stats.outOfStockModels} نفد
                      </span>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-burgundy/15 shadow-xs">
                      <span className="text-[11px] font-bold text-burgundy/60 block">إجمالي عدد القطع</span>
                      <span className="text-2xl font-black text-burgundy mt-1 block">{stats.totalPieces.toLocaleString()}</span>
                      <span className="text-[10px] text-burgundy/60 font-semibold">بكل المقاسات والألوان</span>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/40 shadow-xs">
                      <span className="text-[11px] font-bold text-emerald-800 block">معروض بالصالة للبيع</span>
                      <span className="text-2xl font-black text-emerald-700 mt-1 block">{stats.displayPieces.toLocaleString()}</span>
                      <span className="text-[10px] text-emerald-800/80 font-semibold">
                        موزعة على {stats.displayModels} موديل جاهز
                      </span>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-purple-200 bg-purple-50/40 shadow-xs">
                      <span className="text-[11px] font-bold text-purple-800 block">مخزن بالمستودع (موسمي)</span>
                      <span className="text-2xl font-black text-purple-700 mt-1 block">{stats.archivedPieces.toLocaleString()}</span>
                      <span className="text-[10px] text-purple-800/80 font-semibold">
                        موزعة على {stats.archivedModels} موديل مؤجل
                      </span>
                    </div>
                  </div>

                  {/* Location & Floor Split Detailed Card */}
                  <div className="rounded-2xl border border-burgundy/10 bg-[#FAF7F5] p-4 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-burgundy/70 flex items-center justify-between">
                      <span>🏪 تفصيل تواجد البضاعة (معروض vs مخزن بالمستودع)</span>
                      <span className="text-[11px] text-burgundy/50 font-normal">
                        نسبة المعروض: {stats.totalPieces > 0 ? Math.round((stats.displayPieces / stats.totalPieces) * 100) : 0}%
                      </span>
                    </h4>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${stats.totalPieces > 0 ? (stats.displayPieces / stats.totalPieces) * 100 : 0}%` }}
                        className="bg-emerald-600 h-full transition-all duration-500"
                        title="معروض بالصالة"
                      />
                      <div
                        style={{ width: `${stats.totalPieces > 0 ? (stats.archivedPieces / stats.totalPieces) * 100 : 0}%` }}
                        className="bg-purple-600 h-full transition-all duration-500"
                        title="مخزن بالمستودع"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 pt-1">
                      <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-800">✅ البضاعة المعروضة بصالة المحل</span>
                          <span className="text-sm font-black text-emerald-700">{stats.displayPieces} قطعة</span>
                        </div>
                        <p className="text-[11px] text-burgundy/60 leading-relaxed">
                          هذه هي البضاعة الجاهزة للبيع فوراً على الكاشير وللعملاء داخل المحل والمتجر الأونلاين.
                        </p>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-purple-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-800">📦 البضاعة المخزنة بالمستودع</span>
                          <span className="text-sm font-black text-purple-700">{stats.archivedPieces} قطعة</span>
                        </div>
                        <p className="text-[11px] text-burgundy/60 leading-relaxed">
                          بضاعة مؤجلة لموسم آخر تم تخزينها لحمايتها من الخلط، ولا تظهر للمتصفحين إلا بعد إلغاء أرشفتها.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Evaluation Summary */}
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-burgundy/10 shadow-xs">
                      <span className="text-[11px] font-bold text-burgundy/50 block">القيمة الإجمالية بسعر البيع</span>
                      <span className="text-lg font-black text-burgundy mt-1 block">{EGP(stats.totalRetailValue)}</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-burgundy/10 shadow-xs">
                      <span className="text-[11px] font-bold text-burgundy/50 block">القيمة الإجمالية بسعر التكلفة</span>
                      <span className="text-lg font-black text-burgundy/80 mt-1 block">{EGP(stats.totalCostValue)}</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xs">
                      <span className="text-[11px] font-bold text-emerald-800 block">إجمالي الربح المتوقع للبضاعة</span>
                      <span className="text-lg font-black text-emerald-700 mt-1 block">{EGP(stats.potentialProfit)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Categories Breakdown Table */}
              {activeTab === 'categories' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-burgundy/70">جدول توزيع المخزون التفصيلي حسب كل قسم</h4>
                    <span className="text-[11px] text-burgundy/50">مرتب من الأكثر رصيداً إلى الأقل</span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-burgundy/10 bg-white">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#FAF7F5] border-b border-burgundy/10 text-burgundy/70 font-bold">
                        <tr>
                          <th className="py-3 px-4">القسم</th>
                          <th className="py-3 px-3 text-center">عدد الموديلات</th>
                          <th className="py-3 px-3 text-center">معروض بالمحل</th>
                          <th className="py-3 px-3 text-center">مخزن بالمستودع</th>
                          <th className="py-3 px-3 text-center">إجمالي القطع</th>
                          <th className="py-3 px-3 text-center">القيمة التقديرية</th>
                          <th className="py-3 px-3 text-center">النسبة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-burgundy/5">
                        {stats.categoryList.map(cat => {
                          const pct = stats.totalPieces > 0 ? Math.round((cat.totalPieces / stats.totalPieces) * 100) : 0;
                          return (
                            <tr key={cat.key} className="hover:bg-burgundy/5 transition">
                              <td className="py-2.5 px-4 font-bold text-burgundy">
                                {cat.nameAr} <span className="text-[10px] text-burgundy/40 font-mono">({cat.key})</span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-burgundy/80">{cat.models}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-emerald-50/40">{cat.displayPieces}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-purple-700 bg-purple-50/40">{cat.archivedPieces}</td>
                              <td className="py-2.5 px-3 text-center font-black text-burgundy">{cat.totalPieces}</td>
                              <td className="py-2.5 px-3 text-center font-semibold text-burgundy/80">{EGP(cat.value)}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded-full bg-burgundy/5 text-burgundy text-[10px] font-bold">
                                  {pct}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Seasons Breakdown */}
              {activeTab === 'seasons' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-burgundy/70">توزيع البضاعة حسب تصنيف الموسم</h4>
                  <div className="grid sm:grid-cols-3 gap-3.5">
                    {/* Summer */}
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900">☀️ بضاعة صيفية</span>
                        <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          {stats.seasonStats.summer.models} موديل
                        </span>
                      </div>
                      <span className="text-2xl font-black text-amber-900 block">
                        {stats.seasonStats.summer.pieces.toLocaleString()} <span className="text-xs font-medium">قطعة</span>
                      </span>
                      <div className="text-[11px] text-amber-900/80 pt-1 space-y-1 border-t border-amber-200">
                        <div className="flex justify-between">
                          <span>معروض بالمحل:</span>
                          <strong>{stats.seasonStats.summer.displayPieces} قطعة</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>مخزن بالمستودع:</span>
                          <strong>{stats.seasonStats.summer.archivedPieces} قطعة</strong>
                        </div>
                      </div>
                    </div>

                    {/* Winter */}
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/30 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-900">❄️ بضاعة شتوية</span>
                        <span className="text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                          {stats.seasonStats.winter.models} موديل
                        </span>
                      </div>
                      <span className="text-2xl font-black text-sky-900 block">
                        {stats.seasonStats.winter.pieces.toLocaleString()} <span className="text-xs font-medium">قطعة</span>
                      </span>
                      <div className="text-[11px] text-sky-900/80 pt-1 space-y-1 border-t border-sky-200">
                        <div className="flex justify-between">
                          <span>معروض بالمحل:</span>
                          <strong>{stats.seasonStats.winter.displayPieces} قطعة</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>مخزن بالمستودع:</span>
                          <strong>{stats.seasonStats.winter.archivedPieces} قطعة</strong>
                        </div>
                      </div>
                    </div>

                    {/* All Year */}
                    <div className="rounded-2xl border border-purple-200 bg-purple-50/30 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-900">✨ طوال العام</span>
                        <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                          {stats.seasonStats.allYear.models} موديل
                        </span>
                      </div>
                      <span className="text-2xl font-black text-purple-900 block">
                        {stats.seasonStats.allYear.pieces.toLocaleString()} <span className="text-xs font-medium">قطعة</span>
                      </span>
                      <div className="text-[11px] text-purple-900/80 pt-1 space-y-1 border-t border-purple-200">
                        <div className="flex justify-between">
                          <span>معروض بالمحل:</span>
                          <strong>{stats.seasonStats.allYear.displayPieces} قطعة</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>مخزن بالمستودع:</span>
                          <strong>{stats.seasonStats.allYear.archivedPieces} قطعة</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Product Items List */}
              {activeTab === 'list' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ابحث بالاسم أو الباركود SKU..."
                      className="rounded-xl border border-burgundy/20 bg-[#FAF7F5] px-3.5 py-1.5 text-xs text-burgundy outline-none w-full sm:w-64 focus:border-burgundy focus:bg-white"
                    />
                    <div className="flex items-center gap-1">
                      {[
                        { id: 'all', label: 'الكل' },
                        { id: 'display', label: 'معروض فقط' },
                        { id: 'archived', label: 'مستودع فقط' },
                        { id: 'out', label: 'نفد (0)' },
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFilterType(f.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            filterType === f.id
                              ? 'bg-burgundy text-white'
                              : 'bg-burgundy/5 text-burgundy/70 hover:bg-burgundy/10'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-2xl border border-burgundy/10 divide-y divide-burgundy/5 bg-white">
                    {filteredProducts.slice(0, 80).map((p) => (
                      <div key={p._id} className="p-3 flex items-center justify-between hover:bg-[#FAF7F5] transition text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.stock === 0 ? 'bg-red-500' : p.stock <= 5 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <div className="min-w-0">
                            <span className="font-bold text-burgundy block truncate">{p.name}</span>
                            <span className="text-[10px] text-burgundy/50 block">
                              {DEFAULT_CAT_AR[p.category] || p.category} • SKU: {p.sku || 'بدون'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.isSeasonArchived ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {p.isSeasonArchived ? 'مخزن بالمستودع' : 'معروض بالمحل'}
                          </span>
                          <span className="font-extrabold text-burgundy min-w-[50px] text-left">
                            {p.stock} قطعة
                          </span>
                        </div>
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="py-8 text-center text-xs text-burgundy/40">
                        لا توجد منتجات مطابقة لهذا البحث
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-burgundy/10 bg-[#FAF7F5] flex items-center justify-between shrink-0">
          <span className="text-xs text-burgundy/60 font-semibold">
            إجمالي المحتوى المحسوب: <strong>{stats.totalModels} موديل</strong> ({stats.totalPieces.toLocaleString()} قطعة)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-burgundy hover:bg-[#680017] text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
}
