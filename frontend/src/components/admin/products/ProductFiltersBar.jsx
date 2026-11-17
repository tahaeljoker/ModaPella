import React from 'react';

export default function ProductFiltersBar({
  search,
  onSearchChange,
  filterSeason,
  onSeasonChange,
  filterSupplier,
  onSupplierChange,
  suppliersList = [],
  filterSize,
  onSizeChange,
  sizesList = [],
  filterCategory,
  onCategoryChange,
  categories = [],
  catAr = {},
  counts = {},
  onOpenCategoryAnalytics,
  onAdd
}) {
  return (
    <div className="space-y-3">
      {/* Season Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-burgundy/10 shadow-sm w-fit">
        <span className="text-xs font-bold text-burgundy/40 px-2">تصفية الموسم:</span>
        <button
          type="button"
          onClick={() => onSeasonChange('All')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            filterSeason === 'All'
              ? 'bg-burgundy text-white shadow-sm'
              : 'text-burgundy/60 hover:text-burgundy hover:bg-burgundy/5'
          }`}
        >
          الكل ({counts.total ?? 0})
        </button>
        <button
          type="button"
          onClick={() => onSeasonChange('summer')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            filterSeason === 'summer'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-amber-800 hover:bg-amber-50'
          }`}
        >
          صيفي ({counts.summer ?? 0})
        </button>
        <button
          type="button"
          onClick={() => onSeasonChange('winter')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            filterSeason === 'winter'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-sky-800 hover:bg-sky-50'
          }`}
        >
          شتوي ({counts.winter ?? 0})
        </button>
        <button
          type="button"
          onClick={() => onSeasonChange('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            filterSeason === 'all'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-purple-800 hover:bg-purple-50'
          }`}
        >
          طوال العام ({counts.allYear ?? 0})
        </button>
        <button
          type="button"
          onClick={() => onSeasonChange('archived')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            filterSeason === 'archived'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          المخزن بالمستودع ({counts.archived ?? 0})
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="بحث بالاسم أو الكود..."
          className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none transition focus:border-burgundy min-w-[180px] flex-1 shadow-sm"
        />

        {/* Supplier Filter */}
        <select
          value={filterSupplier}
          onChange={e => onSupplierChange(e.target.value)}
          className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy shadow-sm"
        >
          <option value="الكل">كل الموردين</option>
          {suppliersList.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Size Filter */}
        <select
          value={filterSize}
          onChange={e => onSizeChange(e.target.value)}
          className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy shadow-sm"
        >
          <option value="الكل">كل المقاسات</option>
          {sizesList.map(sz => (
            <option key={sz} value={sz}>{sz}</option>
          ))}
        </select>

        <div className="flex flex-wrap gap-1.5">
          {['All', ...categories].map(c => (
            <button
              key={c}
              onClick={() => onCategoryChange(c)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filterCategory === c
                  ? 'bg-burgundy text-white'
                  : 'border border-burgundy/20 text-burgundy hover:bg-burgundy/10'
              }`}
            >
              {c === 'All' ? 'الكل' : (catAr[c] || c)}
            </button>
          ))}
          {onOpenCategoryAnalytics && (
            <button
              type="button"
              onClick={() => onOpenCategoryAnalytics(filterCategory === 'All' ? 'all' : filterCategory)}
              className="rounded-full px-3.5 py-1.5 text-xs font-bold bg-amber-500/15 text-amber-900 border border-amber-500/30 hover:bg-amber-500/25 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title={`تحليل نشاط ومبيعات قسم ${catAr[filterCategory] || filterCategory} بالكامل`}
            >
              <span>📊</span>
              <span>{filterCategory === 'All' ? 'تتبع نشاط الأقسام' : `نشاط قسم ${catAr[filterCategory] || filterCategory}`}</span>
            </button>
          )}
        </div>

        {onAdd && (
          <div>
            <button
              onClick={onAdd}
              className="rounded-full bg-burgundy px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-burgundy/20 transition hover:bg-[#650018]"
            >
              + إضافة منتج
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
