import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Icon } from '../../components/Icon';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const STATUS_AR = { Pending: 'معلق ⏳', Completed: 'مكتمل ✓', Returned: 'مرتجع/ملغي ✕' };
const STATUS_COLOR = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-300',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Returned: 'bg-red-100 text-red-800 border-red-300',
};

function AdminSiteSettings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('appearance'); // 'appearance' | 'categories' | 'orders' | 'stats' | 'whatsapp'
  const [stats, setStats] = useState(null);

  // Categories management state
  const [newCatKey, setNewCatKey] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [editingCatKey, setEditingCatKey] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Online orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState('All'); // 'All' | 'Pending' | 'Completed' | 'Returned'
  const [expandedOrder, setExpandedOrder] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/site-config');
      setConfig(res.data);
    } catch (err) {
      console.error(err);
      showToast('فشل تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const loadOnlineOrders = async () => {
    try {
      setOrdersLoading(true);
      const res = await api.get('/orders');
      const online = res.data.filter(o => o.type === 'Online');
      setOrders(online);
    } catch (err) {
      console.error(err);
      showToast('فشل تحميل الطلبات أونلاين');
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/orders');
      const online = (res.data || []).filter(o => o.type === 'Online');
      const today = new Date(); today.setHours(0,0,0,0);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const todayOrders = online.filter(o => new Date(o.createdAt) >= today);
      const monthOrders = online.filter(o => new Date(o.createdAt) >= thisMonth);
      const completed = online.filter(o => o.status === 'Completed');
      const pending = online.filter(o => o.status === 'Pending');
      const monthRevenue = monthOrders.filter(o => o.status === 'Completed').reduce((s, o) => s + (o.totalAmount || 0), 0);
      // Most ordered product
      const productCounts = {};
      online.forEach(o => (o.items || []).forEach(item => { productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity; }));
      const topProduct = Object.entries(productCounts).sort((a,b) => b[1]-a[1])[0];
      setStats({ total: online.length, todayCount: todayOrders.length, monthCount: monthOrders.length, completed: completed.length, pending: pending.length, monthRevenue, topProduct });
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') loadOnlineOrders();
    if (activeTab === 'stats') loadStats();
  }, [activeTab]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/admin/site-config', config);
      setConfig(res.data);
      showToast('تم حفظ الإعدادات بنجاح ✓');
    } catch (err) {
      showToast('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    try {
      const updatedConfig = { ...config, published: !config.published };
      const res = await api.put('/admin/site-config', updatedConfig);
      setConfig(res.data);
      showToast(res.data.published ? 'الموقع منشور الآن ✓' : 'الموقع موقوف مؤقتاً');
    } catch (err) {
      console.error(err);
      showToast('فشل تعديل حالة النشر');
    }
  };

  // Categories management handlers
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatKey.trim() || !newCatName.trim()) return;

    const exists = config.categories?.some(c => c.key.toLowerCase() === newCatKey.trim().toLowerCase());
    if (exists) {
      showToast('هذه الفئة موجودة بالفعل!');
      return;
    }

    const updatedCategories = [...(config.categories || []), { key: newCatKey.trim(), nameAr: newCatName.trim() }];
    try {
      setSaving(true);
      const res = await api.put('/admin/site-config', { ...config, categories: updatedCategories });
      setConfig(res.data);
      setNewCatKey('');
      setNewCatName('');
      showToast('تم إضافة الفئة بنجاح ✓');
    } catch (err) {
      showToast('فشل إضافة الفئة');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (key) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الفئة من الموقع؟ لن يتأثر مخزون المنتجات ولكن الفئة ستختفي من واجهة الموقع.')) return;
    const updatedCategories = config.categories.filter(c => c.key !== key);
    try {
      setSaving(true);
      const res = await api.put('/admin/site-config', { ...config, categories: updatedCategories });
      setConfig(res.data);
      showToast('تم حذف الفئة ✓');
    } catch (err) {
      showToast('فشل حذف الفئة');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditCategory = (cat) => {
    setEditingCatKey(cat.key);
    setEditingCatName(cat.nameAr);
  };

  const handleSaveEditCategory = async (key) => {
    if (!editingCatName.trim()) return;
    const updatedCategories = config.categories.map(c => c.key === key ? { ...c, nameAr: editingCatName.trim() } : c);
    try {
      setSaving(true);
      const res = await api.put('/admin/site-config', { ...config, categories: updatedCategories });
      setConfig(res.data);
      setEditingCatKey(null);
      showToast('تم تعديل اسم الفئة ✓');
    } catch (err) {
      showToast('فشل تعديل الفئة');
    } finally {
      setSaving(false);
    }
  };

  // Orders status changer
  const handleOrderStatusChange = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}`, { status: newStatus });
      showToast('تم تحديث حالة الطلب بنجاح ✓');
      loadOnlineOrders();
    } catch (err) {
      console.error(err);
      showToast('فشل تحديث حالة الطلب');
    }
  };

  // Order reprint handler
  const handlePrintInvoice = (order) => {
    const shortId = order._id?.toString().slice(-6).toUpperCase() || '------';
    const dateStr = new Date(order.createdAt).toLocaleString('ar-EG-u-nu-latn');
    const itemsHTML = order.items.map(item => `
      <div style="display:flex;justify-content:space-between;margin:4px 0;font-size:13px">
        <span>${item.name} ${item.size ? `(${item.size})` : ''} ${item.color ? `(${item.color})` : ''} x${item.quantity}</span>
        <span>${(item.price * item.quantity).toLocaleString('en-US')} ج.م</span>
      </div>
    `).join('');

    const printDiv = document.createElement('div');
    printDiv.id = 'receipt-reprint-root';
    printDiv.innerHTML = `
      <div style="direction:rtl;text-align:right;font-family:Cairo,sans-serif;padding:15px;width:58mm;font-size:12px;color:#000;line-height:1.4">
        <div style="text-align:center;font-weight:bold;font-size:15px;margin-bottom:3px">ModaPella 🎠</div>
        <div style="text-align:center;margin-bottom:12px;font-size:9px;color:#444">فاتورة متجر أونلاين</div>
        
        <div style="border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:8px;font-size:10px">
          <div><strong>رقم الطلب:</strong> #${shortId}</div>
          <div><strong>التاريخ:</strong> ${dateStr}</div>
          <div><strong>العميل:</strong> ${order.customerName || order.customer?.name || 'عميل أونلاين'}</div>
          <div><strong>الهاتف:</strong> ${order.customerPhone || order.customer?.phone || '-'}</div>
          ${order.notes ? `<div><strong>العنوان/ملاحظات:</strong> ${order.notes}</div>` : ''}
        </div>

        <div style="border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:8px">
          ${itemsHTML}
        </div>

        <div style="font-weight:bold;font-size:12px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:3px">
            <span>الإجمالي:</span>
            <span>${order.totalAmount.toLocaleString('en-US')} ج.م</span>
          </div>
        </div>

        <div style="text-align:center;margin-top:20px;font-size:9px;color:#666">
          شكراً لتسوقكم معنا! ModaPella
        </div>
      </div>
    `;

    document.body.appendChild(printDiv);
    setTimeout(() => {
      window.print();
      document.body.removeChild(printDiv);
    }, 100);
  };

  const filteredOrders = orderFilter === 'All' ? orders : orders.filter(o => o.status === orderFilter);

  const inputCls = 'w-full rounded-xl border border-burgundy/20 bg-white px-4 py-3 text-sm text-burgundy outline-none transition focus:border-burgundy';

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/50">لوحة التحكم</p>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Icon name="site" className="w-8 h-8 text-burgundy" /> إدارة الموقع والمتجر
          </h2>
          <p className="mt-1 text-sm text-burgundy/60">التحكم بنشر الموقع، الأقسام، واستلام طلبات الأونلاين</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`rounded-full px-4 py-2 text-sm font-semibold border flex items-center gap-1.5 ${config?.published ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${config?.published ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            {config?.published ? 'الموقع منشور للعامة' : 'وضع الصيانة مفعل'}
          </div>
          <button type="button" onClick={handlePublishToggle}
            className="rounded-full border border-burgundy bg-white px-5 py-2 text-sm font-bold text-burgundy transition hover:bg-burgundy hover:text-white shadow-sm">
            {config?.published ? 'تفعيل وضع الصيانة' : 'نشر الموقع الآن'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-burgundy/10 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('appearance')}
          className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${activeTab === 'appearance' ? 'border-burgundy text-burgundy bg-burgundy/5 rounded-t-xl' : 'border-transparent text-burgundy/60 hover:text-burgundy'}`}
        >
          <Icon name="site" className="w-4 h-4" /> المظهر والمحتوى
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${activeTab === 'categories' ? 'border-burgundy text-burgundy bg-burgundy/5 rounded-t-xl' : 'border-transparent text-burgundy/60 hover:text-burgundy'}`}
        >
          <Icon name="inventory" className="w-4 h-4" /> الفئات
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition relative flex items-center gap-1.5 ${activeTab === 'orders' ? 'border-burgundy text-burgundy bg-burgundy/5 rounded-t-xl' : 'border-transparent text-burgundy/60 hover:text-burgundy'}`}
        >
          <Icon name="orders" className="w-4 h-4" /> الطلبات
          {orders.filter(o => o.status === 'Pending').length > 0 && (
            <span className="absolute -top-1 -left-1 bg-red-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-mono">
              {orders.filter(o => o.status === 'Pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'appearance' && config && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Hero Section */}
          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">قسم الواجهة الرئيسية (Hero Section)</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-burgundy/60">العنوان الرئيسي للموقع</label>
                <input name="heroTitle" value={config.heroTitle || ''} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-burgundy/60">النص التوضيحي المساعد</label>
                <textarea name="heroSubtitle" value={config.heroSubtitle || ''} onChange={handleChange} className={`${inputCls} min-h-[80px]`} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-burgundy/60">نص الزر الرئيسي</label>
                  <input name="heroCtaLabel" value={config.heroCtaLabel || ''} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-burgundy/60">رابط الزر الرئيسي</label>
                  <input name="heroCtaLink" value={config.heroCtaLink || ''} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-burgundy/60">نص الزر الثانوي</label>
                  <input name="secondaryCtaLabel" value={config.secondaryCtaLabel || ''} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-burgundy/60">رابط الزر الثانوي</label>
                  <input name="secondaryCtaLink" value={config.secondaryCtaLink || ''} onChange={handleChange} className={inputCls} />
                </div>
              </div>
            </div>
          </div>

          {/* Featured Section */}
          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">قسم المجموعات والمنتجات المميزة</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-burgundy/60">عنوان قسم المعروضات</label>
                <input name="featuredTitle" value={config.featuredTitle || ''} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-burgundy/60">وصف قسم المعروضات</label>
                <input name="featuredSubtitle" value={config.featuredSubtitle || ''} onChange={handleChange} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Announcement Bar */}
          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-lg font-bold flex items-center gap-1.5">
              <Icon name="announcement" className="w-5 h-5" /> شريط الإعلان (أعلى الموقع)
            </h3>
            <p className="mb-4 text-xs text-burgundy/50">اتركه فارغاً لإخفائه. مثال: عرض خاص هذا الأسبوع 🌸</p>
            <input name="announcementBar" value={config.announcementBar || ''} onChange={handleChange} className={inputCls} placeholder="اكتب إعلانك هنا..." />
          </div>

          {/* Store Info */}
          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold flex items-center gap-1.5">
              <Icon name="store" className="w-5 h-5" /> معلومات المحل
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-burgundy/60">عنوان المحل</label>
                <input name="storeAddress" value={config.storeAddress || ''} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-burgundy/60">رقم هاتف المحل</label>
                <input name="storePhone" value={config.storePhone || ''} onChange={handleChange} className={inputCls} dir="ltr" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-burgundy/60">نص "عن المحل" في الصفحة الرئيسية</label>
                <textarea name="aboutText" value={config.aboutText || ''} onChange={handleChange} className={`${inputCls} min-h-[80px]`} />
              </div>
            </div>
          </div>

          {/* WhatsApp Number */}
          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold flex items-center gap-1.5">
              <Icon name="whatsapp" className="w-5 h-5 text-[#25D366]" /> رقم الواتساب العائم للزباين
            </h3>
            <div>
              <label className="mb-1 block text-xs font-semibold text-burgundy/60">رقم الواتساب (مع رمز الدولة بدون + — مثل: 201090048832)</label>
              <input type="text" name="whatsappNumber" value={config.whatsappNumber || ''} onChange={handleChange} className={inputCls} dir="ltr" />
            </div>
          </div>

          {/* Maintenance Message */}
          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold flex items-center gap-1.5">
              <Icon name="maintenance" className="w-5 h-5" /> رسالة وضع الصيانة
            </h3>
            <div>
              <label className="mb-1 block text-xs font-semibold text-burgundy/60">الرسالة التي تظهر للزوار عند تفعيل وضع الصيانة</label>
              <textarea name="maintenanceMessage" value={config.maintenanceMessage || ''} onChange={handleChange} className={`${inputCls} min-h-[80px]`} />
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full rounded-full bg-burgundy py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#650018] disabled:opacity-60">
            {saving ? 'جاري الحفظ...' : 'حفظ جميع الإعدادات'}
          </button>
        </form>
      )}

      {activeTab === 'categories' && config && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-start">
          {/* Current Categories List */}
          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">📁 فئات الملابس النشطة على الموقع</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-burgundy/10 bg-burgundy/5">
                    <th className="py-3 px-4 font-semibold">الكود الإنجليزي (Key)</th>
                    <th className="py-3 px-4 font-semibold">الاسم بالعربي (في الموقع)</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-burgundy/5">
                  {config.categories?.map((cat) => (
                    <tr key={cat.key} className="hover:bg-burgundy/3">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-burgundy/80">{cat.key}</td>
                      <td className="py-3 px-4">
                        {editingCatKey === cat.key ? (
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            className="rounded-lg border border-burgundy/35 px-3 py-1 text-xs outline-none focus:border-burgundy"
                          />
                        ) : (
                          <span className="font-semibold">{cat.nameAr}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-2">
                          {editingCatKey === cat.key ? (
                            <>
                              <button
                                onClick={() => handleSaveEditCategory(cat.key)}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-emerald-700"
                              >
                                حفظ
                              </button>
                              <button
                                onClick={() => setEditingCatKey(null)}
                                className="rounded-lg border border-burgundy/20 px-3 py-1 text-xs font-bold text-burgundy transition hover:bg-burgundy/10"
                              >
                                إلغاء
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEditCategory(cat)}
                                className="rounded-lg border border-burgundy/25 px-2.5 py-1 text-xs font-bold text-burgundy/70 hover:bg-burgundy/10"
                              >
                                ✏️ تعديل الاسم
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.key)}
                                className="rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100"
                              >
                                🗑️ حذف
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Category Form */}
          <div className="rounded-[2rem] border border-burgundy/10 bg-[#F7F0EC] p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">➕ إضافة فئة جديدة للموقع</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-burgundy/60">رمز الفئة بالإنجليزي (مثل: Blazer, Skirt)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardigan"
                  value={newCatKey}
                  onChange={(e) => setNewCatKey(e.target.value)}
                  className="w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-burgundy/60">اسم الفئة بالعربي (مثل: كاردن، جيبة)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: كاردن"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-burgundy py-3 text-sm font-bold text-white transition hover:bg-[#650018] shadow"
              >
                {saving ? 'جاري الإضافة...' : 'إضافة الفئة للموقع'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Order Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-burgundy/10 shadow-sm">
            <div className="flex gap-2">
              {['All', 'Pending', 'Completed', 'Returned'].map((status) => (
                <button
                  key={status}
                  onClick={() => setOrderFilter(status)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${orderFilter === status ? 'bg-burgundy text-white' : 'border border-burgundy/20 text-burgundy hover:bg-burgundy/5'}`}
                >
                  {status === 'All' ? 'كل الطلبات الأونلاين' : STATUS_AR[status]}
                </button>
              ))}
            </div>
            <button
              onClick={loadOnlineOrders}
              className="text-xs text-burgundy hover:underline flex items-center gap-1 font-bold"
            >
              🔄 تحديث القائمة
            </button>
          </div>

          {/* Orders List */}
          {ordersLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-[2rem] border border-burgundy/10 bg-white p-12 text-center text-sm text-burgundy/50 shadow-sm">
              لا توجد أي طلبات مطابقة للفلاتر الحالية.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const isExpanded = expandedOrder === order._id;
                const shortId = order._id?.toString().slice(-6).toUpperCase();
                const waTemplate = (config?.whatsappMessageTemplate || 'أهلاً بكِ يا أ/ *{{name}}* في ModaPella 🎠✨\n\nتم تسجيل طلبكِ رقم *#{{id}}* بنجاح بقيمة *{{amount}} ج.م*.\n\nمن فضلكِ قومي بتحويل المبلغ عبر Instapay لتأكيد الطلب! 🌸')
                  .replace('{{name}}', order.customerName || 'عميلتنا')
                  .replace('{{id}}', shortId)
                  .replace('{{amount}}', order.totalAmount);
                const rawPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');
                const waPhone = rawPhone.startsWith('0') ? '2' + rawPhone : rawPhone;
                const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(waTemplate)}`;

                return (
                  <div key={order._id} className="rounded-2xl border border-burgundy/10 bg-white shadow-sm overflow-hidden transition-all duration-300">
                    <div
                      className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 cursor-pointer hover:bg-burgundy/3"
                      onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm sm:text-base">
                            طلب من: <span className="text-burgundy">{order.customerName}</span>
                          </p>
                          <span className="rounded bg-burgundy/8 px-1.5 py-0.5 font-mono text-[10px] text-burgundy/60">
                            #{shortId}
                          </span>
                        </div>
                        <p className="text-[11px] text-burgundy/50">
                          {new Date(order.createdAt).toLocaleString('ar-EG-u-nu-latn')}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${STATUS_COLOR[order.status]}`}>
                          {STATUS_AR[order.status]}
                        </span>
                        <p className="text-base sm:text-lg font-bold text-burgundy">{EGP(order.totalAmount)}</p>
                        <span className="text-burgundy/40 text-xs">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-burgundy/8 bg-[#F7F0EC]/20 p-6 space-y-4">
                        {/* Customer Information Card */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="bg-white rounded-2xl p-4 border border-burgundy/5 shadow-sm space-y-2 text-xs">
                            <p className="font-bold text-sm text-burgundy border-b border-burgundy/5 pb-2">📋 بيانات العميل والشحن</p>
                            <p><span className="font-semibold text-burgundy/60">الاسم:</span> {order.customerName}</p>
                            <p><span className="font-semibold text-burgundy/60">رقم الهاتف:</span> <span className="font-mono">{order.customerPhone}</span></p>
                            <p><span className="font-semibold text-burgundy/60">عنوان الشحن:</span> {order.notes || 'لم يتم تحديده'}</p>
                          </div>

                          <div className="bg-white rounded-2xl p-4 border border-burgundy/5 shadow-sm space-y-2 text-xs flex flex-col justify-between">
                            <div>
                              <p className="font-bold text-sm text-burgundy border-b border-burgundy/5 pb-2">🖼️ إثبات التحويل (Instapay)</p>
                              {order.paymentScreenshot ? (
                                <p className="text-emerald-700 font-semibold mt-1">✅ قام العميل برفع صورة إثبات الدفع</p>
                              ) : (
                                <p className="text-burgundy/50 mt-1">❌ لم يتم رفع صورة إثبات دفع</p>
                              )}
                            </div>
                            {order.paymentScreenshot && (
                              <button
                                type="button"
                                onClick={() => {
                                  const win = window.open();
                                  win.document.write(`<iframe src="${order.paymentScreenshot}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                }}
                                className="mt-2 w-full rounded-xl bg-burgundy/5 border border-burgundy/10 text-burgundy py-1.5 text-xs font-bold transition hover:bg-burgundy/10"
                              >
                                🔍 عرض الصورة بالحجم الكامل
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Order Items list */}
                        <div className="bg-white rounded-2xl p-4 border border-burgundy/5 shadow-sm space-y-3">
                          <p className="font-bold text-xs text-burgundy/60">🛍️ المنتجات المطلوبة</p>
                          <div className="divide-y divide-burgundy/5">
                            {order.items?.map((item, i) => (
                              <div key={i} className="py-2.5 flex justify-between text-xs sm:text-sm">
                                <div>
                                  <span className="font-semibold text-burgundy">{item.name}</span>
                                  <span className="text-xs text-burgundy/50 mr-2">
                                    {item.size ? `(مقاس: ${item.size})` : ''} {item.color ? `(لون: ${item.color})` : ''}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-burgundy/70">
                                  {item.quantity} × {EGP(item.price)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-burgundy/10 flex justify-between font-bold text-sm text-burgundy">
                            <span>إجمالي الفاتورة:</span>
                            <span>{EGP(order.totalAmount)}</span>
                          </div>
                        </div>

                        {/* Order Actions */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm"
                          >
                            💬 تواصل واتساب لتأكيد الدفع
                          </a>
                          
                          <button
                            onClick={() => handlePrintInvoice(order)}
                            className="rounded-xl border border-burgundy bg-white px-4 py-2 text-xs font-bold text-burgundy hover:bg-burgundy/5 transition"
                          >
                            🖨️ طباعة الفاتورة
                          </button>

                          {order.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleOrderStatusChange(order._id, 'Completed')}
                                className="rounded-xl bg-burgundy hover:bg-[#650018] px-4 py-2 text-xs font-bold text-white transition"
                              >
                                ✓ موافقة وتأكيد شحن
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('هل أنت متأكد من إلغاء هذا الطلب وإعادة الكميات للمخزن؟')) {
                                    handleOrderStatusChange(order._id, 'Returned');
                                  }
                                }}
                                className="rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                              >
                                ✕ إلغاء الطلب
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ━━━━━━ Stats Tab ━━━━━━ */}
      {activeTab === 'stats' && (
        <div className="space-y-5">
          {!stats ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'إجمالي الطلبات أونلاين', value: stats.total, icon: 'orders', color: 'bg-burgundy/5' },
                  { label: 'طلبات اليوم', value: stats.todayCount, icon: 'today', color: 'bg-blue-50' },
                  { label: 'طلبات هذا الشهر', value: stats.monthCount, icon: 'month', color: 'bg-violet-50' },
                  { label: 'مبيعات الشهر المكتملة', value: `${Number(stats.monthRevenue).toLocaleString('en-US')} ج.م`, icon: 'revenue', color: 'bg-emerald-50' },
                ].map((card) => (
                  <div key={card.label} className={`rounded-[2rem] border border-burgundy/10 ${card.color} p-5 shadow-sm flex flex-col gap-2`}>
                    <Icon name={card.icon} className="w-8 h-8 text-burgundy opacity-85" />
                    <p className="text-2xl font-extrabold text-burgundy">{card.value}</p>
                    <p className="text-xs text-burgundy/60 leading-relaxed">{card.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[2rem] border border-burgundy/10 bg-white p-5 shadow-sm">
                  <p className="text-xs text-burgundy/50 mb-1">طلبات معلقة بانتظار التأكيد</p>
                  <p className="text-3xl font-extrabold text-amber-600">{stats.pending}</p>
                  <div className="mt-2 h-2 rounded-full bg-amber-100 overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: stats.total ? `${(stats.pending/stats.total)*100}%` : '0%' }} />
                  </div>
                </div>
                <div className="rounded-[2rem] border border-burgundy/10 bg-white p-5 shadow-sm">
                  <p className="text-xs text-burgundy/50 mb-1">طلبات مكتملة ومسلّمة</p>
                  <p className="text-3xl font-extrabold text-emerald-600">{stats.completed}</p>
                  <div className="mt-2 h-2 rounded-full bg-emerald-100 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: stats.total ? `${(stats.completed/stats.total)*100}%` : '0%' }} />
                  </div>
                </div>
                <div className="rounded-[2rem] border border-burgundy/10 bg-white p-5 shadow-sm">
                  <p className="text-xs text-burgundy/50 mb-2">أكثر منتج مطلوب</p>
                  {stats.topProduct ? (
                    <>
                      <p className="font-bold text-burgundy text-sm leading-snug">{stats.topProduct[0]}</p>
                      <p className="text-xs text-burgundy/50 mt-1">تم طلبه {stats.topProduct[1]} مرة</p>
                    </>
                  ) : (
                    <p className="text-sm text-burgundy/40">لا توجد بيانات بعد</p>
                  )}
                </div>
              </div>

              <div className="text-center pt-2">
                <button onClick={loadStats} className="text-xs text-burgundy/50 hover:text-burgundy underline transition flex items-center gap-1 mx-auto font-bold">
                  <Icon name="refresh" className="w-3.5 h-3.5" /> تحديث الإحصائيات
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ━━━━━━ WhatsApp Template Tab ━━━━━━ */}
      {activeTab === 'whatsapp' && config && (
        <div className="space-y-5">
          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-lg font-bold flex items-center gap-1.5">
              <Icon name="whatsapp" className="w-5 h-5 text-[#25D366]" /> قالب رسالة الواتساب عند الطلب
            </h3>
            <p className="mb-4 text-xs text-burgundy/60 leading-relaxed">
              الرسالة دي بتتبعت للعميل تلقائياً لما بتضغط على زر تواصل واتساب في طلبها.<br />
              استخدم الكلمات التالية وسيتم استبدالها تلقائياً:
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {['{{name}}', '{{id}}', '{{amount}}'].map(tag => (
                <span key={tag} className="rounded-full bg-burgundy/10 px-3 py-1 text-xs font-mono font-bold text-burgundy cursor-pointer hover:bg-burgundy/20"
                  onClick={() => setConfig(p => ({ ...p, whatsappMessageTemplate: (p.whatsappMessageTemplate || '') + tag }))}>
                  {tag}
                </span>
              ))}
              <span className="text-xs text-burgundy/40 self-center">← اضغط لإضافة المتغير للرسالة</span>
            </div>
            <textarea
              name="whatsappMessageTemplate"
              value={config.whatsappMessageTemplate || ''}
              onChange={handleChange}
              className={`${inputCls} min-h-[160px] font-mono text-xs leading-relaxed`}
              dir="rtl"
            />
            <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs">
              <p className="font-bold text-emerald-800 mb-1">معاينة الرسالة:</p>
              <p className="text-emerald-700 whitespace-pre-line leading-relaxed">
                {(config.whatsappMessageTemplate || '')
                  .replace('{{name}}', 'فاطمة محمد')
                  .replace('{{id}}', 'ABC123')
                  .replace('{{amount}}', '350')}
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full bg-burgundy py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#650018] disabled:opacity-60"
          >
            {saving ? 'جاري الحفظ...' : '💾 حفظ قالب الرسالة'}
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminSiteSettings;
