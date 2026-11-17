import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { isDiscountActive } from '../../../utils/discount';
import { renderBarcodeDataUrl } from '../../../utils/barcode';

export const DEFAULT_CATEGORIES = [
  'Blazer', 'Blouse', 'Chemise', 'Skirt', 'Dress', 'Pantalon',
  'T-shirt', 'Bag', 'Cardigan', 'Suit', 'Tonic', 'Takem'
];

export const DEFAULT_CAT_AR = {
  Blazer: 'بليزر', Blouse: 'بلوزة', Chemise: 'شميز', Skirt: 'جيبة',
  Dress: 'فستان', Pantalon: 'بنطلون', 'T-shirt': 'تيشيرت', Bag: 'شنطة',
  Cardigan: 'كاردن', Suit: 'سوت', Tonic: 'تونيك', Takem: 'طقم'
};

export function printBarcode(product) {
  if (!product.sku) return alert('هذا المنتج ليس له كود (SKU) بعد');
  const dataUrl = renderBarcodeDataUrl(product.sku, { width: 2, height: 40, margin: 6 });
  if (!dataUrl) return alert('تعذر إنشاء باركود لهذا الكود');
  const win = window.open('', '_blank', 'width=400,height=300');
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"/><title>باركود - ${product.sku}</title>
  <style>@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  @page { size: 40mm 30mm; margin: 0; }
  body {
    font-family: 'Cairo', Arial, sans-serif;
    background: #fff;
    width: 40mm;
    height: 28.5mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.8mm 1.2mm;
    overflow: hidden;
    direction: rtl;
    margin: 0 auto;
    box-sizing: border-box;
  }
  .brand {
    font-size: 7.5px;
    font-weight: 900;
    color: #000;
    line-height: 1;
    margin-bottom: 0.5px;
    text-align: center;
    width: 100%;
  }
  .name {
    font-size: 6.8px;
    color: #000;
    max-width: 96%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1;
    margin-bottom: 1px;
    text-align: center;
    width: 100%;
  }
  .barcode-wrapper {
    width: 96%;
    height: 12mm;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0.5px auto;
    overflow: visible;
  }
  .barcode-wrapper img {
    max-width: 98%;
    height: 12mm;
    object-fit: contain;
    image-rendering: pixelated;
    display: block;
    margin: 0 auto;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    width: 96%;
    align-items: center;
    line-height: 1;
    margin-top: 1px;
    box-sizing: border-box;
  }
  .sku {
    font-family: monospace;
    font-size: 8.5px;
    font-weight: 900;
    color: #000;
    white-space: nowrap;
    text-align: right;
    letter-spacing: 0.5px;
  }
  .price {
    font-size: 8.5px;
    font-weight: 900;
    color: #000;
    white-space: nowrap;
    text-align: left;
  }
  @media print {
    body { padding: 0.8mm 1.2mm; }
  }
  </style></head>
  <body>
  <div class="brand">ModaPella</div>
  <div class="name">${product.name}</div>
  <div class="barcode-wrapper"><img src="${dataUrl}" alt="${product.sku}" /></div>
  <div class="footer">
    <span class="sku">${product.sku}</span>
    <span class="price">${Number(isDiscountActive(product) ? product.discountPrice : product.price).toLocaleString('en-US')} ج.م</span>
  </div>
  </body></html>`);
  win.document.close(); win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

export function useAdminProducts() {
  const [products, setProducts] = useState([]);
  const [siteConfig, setSiteConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [catAr, setCatAr] = useState(DEFAULT_CAT_AR);
  const [toast, setToast] = useState('');

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/products?includeOffSeason=true');
      setProducts(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.get('/admin/site-config');
      if (res?.data) setSiteConfig(res.data);
      if (res?.data?.categories && res.data.categories.length > 0) {
        const cats = res.data.categories.map(c => c.key);
        const mapAr = {};
        res.data.categories.forEach(c => {
          mapAr[c.key] = c.nameAr;
        });
        setCategories(cats);
        setCatAr(mapAr);
      }
    } catch (err) {
      console.error('Failed to load site config categories:', err);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    fetchConfig();
  }, [loadProducts, fetchConfig]);

  const handleAddCategory = async (key, nameAr) => {
    try {
      const resConfig = await api.get('/admin/site-config');
      const currentCats = resConfig.data?.categories || [];
      if (currentCats.some(c => c.key.toLowerCase() === key.toLowerCase())) {
        alert('هذه الفئة موجودة بالفعل!');
        return key;
      }
      const newCats = [...currentCats, { key, nameAr }];
      const res = await api.put('/admin/site-config', { categories: newCats });
      if (res.data && res.data.categories) {
        const cats = res.data.categories.map(c => c.key);
        const mapAr = {};
        res.data.categories.forEach(c => {
          mapAr[c.key] = c.nameAr;
        });
        setCategories(cats);
        setCatAr(mapAr);
      }
      showToast('تم إضافة الفئة الجديدة بنجاح');
      return key;
    } catch (err) {
      console.error(err);
      alert('فشل إضافة الفئة الجديدة');
      return null;
    }
  };

  const handleRenameCategory = async (oldCategory, newCategory, newNameAr) => {
    try {
      const res = await api.put('/admin/categories/rename', { oldCategory, newCategory, newNameAr });
      await fetchConfig();
      await loadProducts();
      showToast(res.data?.message || 'تم تحديث اسم الفئة بنجاح');
      return res.data;
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'فشل تحديث الفئة');
      throw err;
    }
  };

  const handleSave = async (payload) => {
    try {
      if (payload._id) {
        await api.put(`/admin/products/${payload._id}`, payload);
        showToast('تم تحديث المنتج بنجاح');
      } else {
        await api.post('/admin/products', payload);
        showToast('تم إضافة المنتج بنجاح');
      }
      await loadProducts();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'خطأ غير معروف';
      alert(`فشل الحفظ: ${msg}`);
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/products/${id}`);
      showToast('تمت الأرشفة بنجاح');
      await loadProducts();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'فشل الأرشفة');
      throw err;
    }
  };

  const handleBulkSeason = async (action, productIds, extra = {}) => {
    if (!productIds || productIds.length === 0) return;
    try {
      const res = await api.post('/admin/products/bulk-season', {
        action,
        productIds,
        ...extra
      });
      showToast(res.data?.message || 'تم تنفيذ العملية بنجاح');
      await loadProducts();
      return res.data;
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'فشل تنفيذ العملية');
      throw err;
    }
  };

  const handleSetWebsiteSeason = async (targetSeason) => {
    try {
      const res = await api.post('/admin/products/bulk-season', {
        action: 'setWebsiteSeason',
        season: targetSeason
      });
      showToast(res.data?.message || 'تم تحديث موسم المتجر أونلاين');
      setSiteConfig(prev => ({ ...prev, websiteSeason: targetSeason }));
      return res.data;
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'فشل تحديث موسم المتجر أونلاين');
      throw err;
    }
  };

  const handleConfirmSeasonSwitch = async (targetSeason) => {
    if (!targetSeason) return;
    try {
      const res = await api.post('/admin/products/bulk-season', {
        action: 'switchActiveSeason',
        targetSeason
      });
      showToast(res.data?.message || 'تم تبديل الموسم بنجاح');
      await loadProducts();
      return res.data;
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'فشل تبديل الموسم');
      throw err;
    }
  };

  return {
    products,
    loading,
    siteConfig,
    setSiteConfig,
    categories,
    catAr,
    toast,
    showToast,
    loadProducts,
    fetchConfig,
    handleAddCategory,
    handleRenameCategory,
    handleSave,
    handleDelete,
    handleBulkSeason,
    handleSetWebsiteSeason,
    handleConfirmSeasonSwitch,
    printBarcode
  };
}
