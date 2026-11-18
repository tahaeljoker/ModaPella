import React, { useState, useRef } from 'react';

const CATEGORY_LABELS = {
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

const getProductIcon = () => (
  <svg className="w-5 h-5 text-burgundy/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

export default function POSProductCatalog({
  products = [],
  loading = false,
  cartCount = 0,
  onAddToCart,
  onOpenPriceCheck,
  unlinkedBarcode = null,
  onCloseUnlinkedBarcode,
  onLinkUnlinkedBarcode
}) {
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unlinkedSearch, setUnlinkedSearch] = useState('');

  const searchRef = useRef(null);

  const filtered = search.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
        (p.oldSku && p.oldSku.toLowerCase().includes(search.toLowerCase())) ||
        (CATEGORY_LABELS[p.category] || '').includes(search)
      )
    : [];

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSelectedSize(product.sizes?.[0] || product.variants?.[0]?.size || '');
    setSelectedColor(product.colors?.[0] || product.variants?.[0]?.color || '');
    setQuantity(1);
    setSearch('');
    setSearchFocused(false);
  };

  const availableSizes = selectedProduct
    ? (selectedProduct.variants?.length > 0
        ? [...new Set(selectedProduct.variants.map(v => v.size))]
        : selectedProduct.sizes || [])
    : [];

  const availableColors = selectedProduct
    ? (selectedProduct.variants?.length > 0
        ? [...new Set(
            selectedProduct.variants
              .filter(v => !selectedSize || v.size === selectedSize)
              .map(v => v.color)
          )]
        : selectedProduct.colors || [])
    : [];

  const availableStock = (() => {
    if (!selectedProduct) return 0;
    if (selectedProduct.variants?.length > 0 && selectedSize && selectedColor) {
      const v = selectedProduct.variants.find(v => v.size === selectedSize && v.color === selectedColor);
      return v ? v.stock : 0;
    }
    return selectedProduct.stock || 0;
  })();

  const combinedSupplierStock = selectedProduct
    ? products.filter(p => p.name.trim().toLowerCase() === selectedProduct.name.trim().toLowerCase()).reduce((s, p) => s + (p.stock || 0), 0)
    : 0;

  const handleAddCurrentToCart = () => {
    if (!selectedProduct) return;
    onAddToCart(selectedProduct, selectedSize, selectedColor, quantity, availableStock);
    setSelectedProduct(null);
    setSelectedSize('');
    setSelectedColor('');
    setQuantity(1);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F7F0EC] overflow-hidden">
      {/* Top: Search Bar */}
      <div className="bg-white border-b border-burgundy/10 px-6 py-4 flex flex-wrap justify-between items-center gap-2">
        <div>
          <p className="text-[10px] font-semibold text-burgundy/40 uppercase tracking-widest">
            البحث عن منتج أو باركود
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-1.5 rounded-full border border-red-100 flex items-center gap-1 shadow-sm hidden sm:flex">
            ⚠️ تذكير: انتبه للمنتجات غير القابلة للخصم
          </span>
          {onOpenPriceCheck && (
            <button
              type="button"
              onClick={onOpenPriceCheck}
              className="text-xs bg-burgundy/5 text-burgundy hover:bg-burgundy/10 px-3 py-1.5 rounded-full transition font-bold flex items-center gap-1 border border-burgundy/10 shadow-sm"
            >
              🔍 استعلام سريع عن الأسعار
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border-b border-burgundy/10 px-6 py-3">
        <div className="relative">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            placeholder="اسم المنتج، الكود (SKU)، أو الفئة..."
            className="w-full rounded-2xl border-2 border-burgundy/15 bg-[#F7F0EC] px-5 py-3.5 pr-12 text-sm text-burgundy placeholder-burgundy/30 outline-none transition-all focus:border-burgundy focus:bg-white focus:shadow-lg focus:shadow-burgundy/10"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">
            {loading ? '⏳' : '🔎'}
          </span>

          {/* Dropdown Results */}
          {searchFocused && search.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white rounded-2xl shadow-2xl border border-burgundy/10 overflow-hidden max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-5 py-4 text-sm text-burgundy/40 text-center">لا توجد نتائج</div>
              ) : (
                filtered.map(product => (
                  <button
                    key={product._id}
                    onMouseDown={() => handleSelectProduct(product)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-burgundy/5 transition border-b border-burgundy/5 last:border-0"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#F7F0EC] flex items-center justify-center text-xl flex-shrink-0 border border-burgundy/10 overflow-hidden">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        getProductIcon()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-burgundy truncate">{product.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-burgundy/50">{CATEGORY_LABELS[product.category] || product.category} {product.sku && `• ${product.sku}`}</p>
                        {product.allowDiscount === false && (
                          <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 font-bold">بلا خصم</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-burgundy">{EGP(product.price)}</p>
                      <p className="text-xs text-burgundy/40">مخزون: {product.stock}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Product Details or Empty State */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedProduct ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <div className="w-24 h-24 rounded-full bg-burgundy/8 flex items-center justify-center text-5xl">
              📦
            </div>
            <div>
              <h3 className="text-lg font-bold text-burgundy/40">ابحث عن منتج</h3>
              <p className="text-sm text-burgundy/30 mt-1">
                ابحث بالاسم أو امسح الباركود لإضافة منتج للفاتورة
              </p>
            </div>
            <div className="mt-4 flex gap-4">
              <div className="bg-white rounded-2xl px-5 py-3 text-center shadow-sm border border-burgundy/8">
                <p className="text-2xl font-bold text-burgundy">{products.length}</p>
                <p className="text-xs text-burgundy/40 mt-0.5">منتج متاح</p>
              </div>
              <div className="bg-white rounded-2xl px-5 py-3 text-center shadow-sm border border-burgundy/8">
                <p className="text-2xl font-bold text-burgundy">
                  {products.reduce((s, p) => s + (p.stock || 0), 0)}
                </p>
                <p className="text-xs text-burgundy/40 mt-0.5">قطعة بالمخزن</p>
              </div>
              <div className="bg-white rounded-2xl px-5 py-3 text-center shadow-sm border border-burgundy/8">
                <p className="text-2xl font-bold text-burgundy">{cartCount}</p>
                <p className="text-xs text-burgundy/40 mt-0.5">في الفاتورة</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-3xl shadow-sm border border-burgundy/10 overflow-hidden">
              <div className="flex gap-5 p-5 border-b border-burgundy/8">
                {selectedProduct.images?.[0] ? (
                  <img
                    src={selectedProduct.images[0]}
                    alt={selectedProduct.name}
                    className="w-28 h-28 rounded-2xl object-cover flex-shrink-0 shadow-md"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-burgundy/8 flex items-center justify-center text-4xl flex-shrink-0">
                    {getProductIcon()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="inline-block text-xs bg-burgundy/10 text-burgundy px-2.5 py-0.5 rounded-full font-medium mb-1.5">
                    {CATEGORY_LABELS[selectedProduct.category] || selectedProduct.category}
                  </span>
                  <h3 className="font-bold text-xl text-burgundy leading-tight">{selectedProduct.name}</h3>
                  {selectedProduct.sku && (
                    <p className="text-xs text-burgundy/40 mt-1 font-mono">{selectedProduct.sku}</p>
                  )}
                  {selectedProduct.supplier && (
                    <p className="text-xs text-burgundy/50 mt-0.5">🏢 {selectedProduct.supplier}</p>
                  )}
                  {selectedProduct.allowDiscount === false && (
                    <div className="mt-1.5">
                      <span className="inline-block text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 font-bold">
                        ⚠️ هذا المنتج غير خاضع للخصومات
                      </span>
                    </div>
                  )}

                  <div className="mt-3 bg-burgundy/5 px-3 py-2 rounded-xl border border-burgundy/10">
                    <p className="text-[10px] text-burgundy/60 font-semibold mb-0.5">📊 إحصائيات التوفر:</p>
                    <p className="text-xs text-burgundy font-bold">رصيد المورد الحالي: {selectedProduct.stock}</p>
                    {combinedSupplierStock > selectedProduct.stock && (
                      <p className="text-xs text-emerald-700 font-bold mt-0.5 pt-0.5 border-t border-burgundy/10">
                        الإجمالي (جميع الموردين لنفس الموديل): {combinedSupplierStock} قطعة
                      </p>
                    )}
                  </div>

                  <p className="mt-2 text-2xl font-extrabold text-burgundy">{EGP(selectedProduct.price)}</p>
                </div>
                <button
                  onClick={() => { setSelectedProduct(null); setSearch(''); }}
                  className="self-start p-1.5 rounded-xl hover:bg-burgundy/10 text-burgundy/40 hover:text-burgundy transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Sizes */}
                {availableSizes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-burgundy/50 uppercase tracking-wider mb-2">المقاس</p>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map(size => (
                        <button
                          key={size}
                          onClick={() => {
                            setSelectedSize(size);
                            if (selectedProduct.variants?.length > 0) {
                              const valid = selectedProduct.variants.filter(v => v.size === size).map(v => v.color);
                              if (!valid.includes(selectedColor)) setSelectedColor(valid[0] || '');
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                            selectedSize === size
                              ? 'border-burgundy bg-burgundy text-white shadow-md shadow-burgundy/25'
                              : 'border-burgundy/15 text-burgundy hover:border-burgundy/40'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colors */}
                {availableColors.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-burgundy/50 uppercase tracking-wider mb-2">اللون</p>
                    <div className="flex flex-wrap gap-2">
                      {availableColors.map(color => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                            selectedColor === color
                              ? 'border-burgundy bg-burgundy text-white shadow-md shadow-burgundy/25'
                              : 'border-burgundy/15 text-burgundy hover:border-burgundy/40'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity + Stock */}
                <div>
                  <p className="text-xs font-semibold text-burgundy/50 uppercase tracking-wider mb-2">الكمية</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-0 bg-[#F7F0EC] rounded-2xl border border-burgundy/15 overflow-hidden">
                      <button
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="w-11 h-11 flex items-center justify-center text-lg font-bold text-burgundy hover:bg-burgundy/10 transition"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        min={1}
                        max={availableStock}
                        onChange={e => setQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), availableStock))}
                        className="w-14 text-center font-bold text-burgundy bg-transparent outline-none text-lg"
                      />
                      <button
                        onClick={() => setQuantity(q => Math.min(q + 1, availableStock))}
                        className="w-11 h-11 flex items-center justify-center text-lg font-bold text-burgundy hover:bg-burgundy/10 transition"
                      >
                        +
                      </button>
                    </div>
                    <div className={`text-sm px-3 py-1.5 rounded-xl font-medium ${
                      availableStock === 0 ? 'bg-red-100 text-red-600' :
                      availableStock <= 5 ? 'bg-amber-50 text-amber-600' :
                      'bg-green-50 text-green-600'
                    }`}>
                      {availableStock === 0 ? '⚠️ نفد المخزون' : `✓ متوفر: ${availableStock}`}
                    </div>
                  </div>
                </div>

                {/* Add Button */}
                <button
                  onClick={handleAddCurrentToCart}
                  disabled={availableStock === 0 || quantity < 1}
                  className="w-full rounded-2xl bg-burgundy py-4 text-white font-bold text-base transition-all hover:bg-[#650018] hover:shadow-lg hover:shadow-burgundy/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ＋ إضافة للفاتورة — {EGP(selectedProduct.price * quantity)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unlinked Barcode Modal */}
      {unlinkedBarcode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onCloseUnlinkedBarcode}>
          <div className="w-full max-w-lg overflow-y-auto rounded-[2rem] bg-[#F7F0EC] p-6 shadow-2xl max-h-[85vh] text-burgundy text-right" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-burgundy/10 pb-3">
              <h3 className="text-lg font-bold">🔗 ربط الباركود المطبوع بالمنتج</h3>
              <button onClick={onCloseUnlinkedBarcode} className="text-sm font-bold text-burgundy/50 hover:text-burgundy">✕</button>
            </div>
            
            <div className="bg-white rounded-2xl p-4 border border-burgundy/10 mb-4 space-y-1">
              <p className="text-xs text-burgundy/60">الباركود المنسوخ من المسدس:</p>
              <p className="text-lg font-bold font-mono text-burgundy">{unlinkedBarcode}</p>
              <p className="text-[11px] text-burgundy/40">اختر المنتج من القائمة لربط هذا الباركود به فوراً في الداتابيز وإضافته للسلة:</p>
            </div>

            <input
              type="text"
              value={unlinkedSearch}
              onChange={e => setUnlinkedSearch(e.target.value)}
              placeholder="ابحث باسم المنتج أو الفئة لربطه..."
              autoFocus
              className="w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy mb-3"
            />

            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              {products
                .filter(p => !unlinkedSearch || p.name.toLowerCase().includes(unlinkedSearch.toLowerCase()) || (p.category || '').toLowerCase().includes(unlinkedSearch.toLowerCase()) || (p.sku || '').toLowerCase().includes(unlinkedSearch.toLowerCase()))
                .slice(0, 10)
                .map(p => (
                  <div
                    key={p._id}
                    onClick={() => onLinkUnlinkedBarcode(p)}
                    className="bg-white rounded-xl p-3 border border-burgundy/5 hover:border-burgundy/30 shadow-sm flex items-center justify-between cursor-pointer transition hover:bg-burgundy/5"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-burgundy">{p.name}</h4>
                      <p className="text-[10px] text-burgundy/40 font-mono">SKU الحالي: {p.sku || 'بدون'} | OldSKU: {p.oldSku || '—'}</p>
                    </div>
                    <button type="button" className="text-xs font-bold text-white bg-burgundy px-3 py-1.5 rounded-lg">🔗 ربط وإضافة</button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
