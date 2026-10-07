import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Icon } from '../../components/Icon';
import AdCampaignTracker from '../../components/AdCampaignTracker';
import SocialAdCreator from '../../components/SocialAdCreator';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const STATUS_AR = { Pending: 'معلق ', Completed: 'مكتمل ', Returned: 'مرتجع/ملغي ' };
const STATUS_COLOR = {
 Pending: 'bg-amber-100 text-amber-800 border-amber-300',
 Completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
 Returned: 'bg-red-100 text-red-800 border-red-300',
};

function AdminSiteSettings() {
 const [searchParams, setSearchParams] = useSearchParams();
 const tabFromUrl = searchParams.get('tab');
 const [config, setConfig] = useState(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [toast, setToast] = useState('');
 const [activeTab, setActiveTab] = useState(tabFromUrl || 'appearance');
 const [stats, setStats] = useState(null);

 useEffect(() => {
  if (tabFromUrl && tabFromUrl !== activeTab) {
   setActiveTab(tabFromUrl);
  }
 }, [tabFromUrl]);

 const handleTabChange = (tab) => {
  setActiveTab(tab);
  setSearchParams({ tab });
 };

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

 // Coupons state
 const [coupons, setCoupons] = useState([]);
 const [couponsLoading, setCouponsLoading] = useState(false);
 const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
 const [couponForm, setCouponForm] = useState({
  code: '',
  discountType: 'percentage',
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscount: '',
  expiryDate: '',
  usageLimit: '',
  description: ''
 });
 const [savingCoupon, setSavingCoupon] = useState(false);

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
  if (activeTab === 'coupons') loadCoupons();
 }, [activeTab]);

 const loadCoupons = async () => {
  try {
   setCouponsLoading(true);
   const res = await api.get('/coupons');
   setCoupons(res.data || []);
  } catch (err) {
   console.error(err);
   showToast('فشل تحميل الكوبونات');
  } finally {
   setCouponsLoading(false);
  }
 };

 const handleToggleCouponActive = async (coupon) => {
  try {
   await api.put(`/coupons/${coupon._id}`, { active: !coupon.active });
   setCoupons(prev => prev.map(c => c._id === coupon._id ? { ...c, active: !c.active } : c));
   showToast(coupon.active ? 'تم إيقاف الكود' : 'تم تفعيل الكود بنجاح');
  } catch (err) {
   showToast('حدث خطأ أثناء تعديل الكود');
  }
 };

 const handleDeleteCoupon = async (id) => {
  if (!window.confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
  try {
   await api.delete(`/coupons/${id}`);
   setCoupons(prev => prev.filter(c => c._id !== id));
   showToast('تم حذف الكود بنجاح');
  } catch (err) {
   showToast('فشل حذف الكود');
  }
 };

 const handleCreateCoupon = async (e) => {
  e.preventDefault();
  setSavingCoupon(true);
  try {
   const res = await api.post('/coupons', {
    code: couponForm.code,
    discountType: couponForm.discountType,
    discountValue: Number(couponForm.discountValue),
    minOrderAmount: Number(couponForm.minOrderAmount) || 0,
    maxDiscount: couponForm.maxDiscount ? Number(couponForm.maxDiscount) : null,
    expiryDate: couponForm.expiryDate || null,
    usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : null,
    description: couponForm.description
   });
   setCoupons(prev => [res.data.coupon, ...prev]);
   setIsCouponModalOpen(false);
   setCouponForm({
    code: '',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscount: '',
    expiryDate: '',
    usageLimit: '',
    description: ''
   });
   showToast('تم إنشاء كود الخصم بنجاح! 🎉');
  } catch (err) {
   showToast(err.response?.data?.message || 'فشل إنشاء الكود');
  } finally {
   setSavingCoupon(false);
  }
 };

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
 showToast('تم حفظ الإعدادات بنجاح ');
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
 showToast(res.data.published ? 'الموقع منشور الآن ' : 'الموقع موقوف مؤقتاً');
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
 showToast('تم إضافة الفئة بنجاح ');
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
 showToast('تم حذف الفئة ');
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
 showToast('تم تعديل اسم الفئة ');
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
 showToast('تم تحديث حالة الطلب بنجاح ');
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
 <div style="text-align:center;font-weight:bold;font-size:15px;margin-bottom:3px">ModaPella </div>
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

  <div style="border-top:1px dashed #000;margin-top:8px;padding-top:5px;text-align:right;font-size:8px;line-height:1.35;color:#000">
    <div style="font-weight:bold;text-align:center;margin-bottom:2px;font-size:8.5px">سياسة الاستبدال والاسترجاع:</div>
    <div>• الاستبدال والاسترجاع خلال [ 14 يوماً] من تاريخ الشراء.</div>
    <div>• يشترط وجود الفاتورة الأصلية، وأن تكون البضاعة بحالتها الأصلية وغير مستخدمة وفي غلافها.</div>
    <div>• البضائع المُخفضة أو التالفة بسبب سوء الاستخدام لا تُرد ولا تُستبدل.</div>
    <div>• يتم إرجاع المبلغ بنفس طريقة الدفع الأصلية.</div>
  </div>

 <div style="text-align:center;margin-top:10px;font-size:9px;color:#666">
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
 onClick={() => handleTabChange('appearance')}
 className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${activeTab === 'appearance' ? 'border-burgundy text-burgundy bg-burgundy/5 rounded-t-xl' : 'border-transparent text-burgundy/60 hover:text-burgundy'}`}
 >
 <Icon name="site" className="w-4 h-4" /> المظهر والواجهة
 </button>
 <button
 onClick={() => handleTabChange('announcement')}
 className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${activeTab === 'announcement' ? 'border-burgundy text-burgundy bg-burgundy/5 rounded-t-xl' : 'border-transparent text-burgundy/60 hover:text-burgundy'}`}
 >
 <span>شريط الإعلانات الترويجي</span>
 {config?.announcementBarActive && (
 <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
 )}
 </button>
 <button
 onClick={() => handleTabChange('coupons')}
 className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${activeTab === 'coupons' ? 'border-burgundy text-burgundy bg-burgundy/5 rounded-t-xl' : 'border-transparent text-burgundy/60 hover:text-burgundy'}`}
 >
 <span>كوبونات الخصم</span>
 {coupons.filter(c => c.active).length > 0 && (
 <span className="bg-burgundy/10 text-burgundy rounded-full text-[10px] px-2 py-0.5 font-mono font-bold">
 {coupons.filter(c => c.active).length}
 </span>
 )}
 </button>
 <button
 onClick={() => handleTabChange('orders')}
 className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition relative flex items-center gap-1.5 ${activeTab === 'orders' ? 'border-burgundy text-burgundy bg-burgundy/5 rounded-t-xl' : 'border-transparent text-burgundy/60 hover:text-burgundy'}`}
 >
 <Icon name="orders" className="w-4 h-4" /> طلبات الأونلاين
 {orders.filter(o => o.status === 'Pending').length > 0 && (
 <span className="absolute -top-1 -left-1 bg-red-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-mono">
 {orders.filter(o => o.status === 'Pending').length}
 </span>
 )}
 </button>
 <button
 onClick={() => handleTabChange('categories')}
 className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${activeTab === 'categories' ? 'border-burgundy text-burgundy bg-burgundy/5 rounded-t-xl' : 'border-transparent text-burgundy/60 hover:text-burgundy'}`}
 >
 <Icon name="inventory" className="w-4 h-4" /> فئات وأقسام الموقع
 </button>
 <button
 onClick={() => handleTabChange('traffic')}
 className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${activeTab === 'traffic' ? 'border-burgundy text-burgundy bg-burgundy/5 rounded-t-xl' : 'border-transparent text-burgundy/60 hover:text-burgundy'}`}
 >
 <span>مصادر الإعلانات (Ad Tracker)</span>
 </button>
 <button
 onClick={() => handleTabChange('creator')}
 className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${activeTab === 'creator' ? 'border-burgundy text-burgundy bg-burgundy/5 rounded-t-xl' : 'border-transparent text-burgundy/60 hover:text-burgundy'}`}
 >
 <span>مولد بوسترات الإعلانات</span>
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

 {/* Announcement Bar Link Banner */}
 <div className="rounded-[2rem] border border-burgundy/10 bg-burgundy/5 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
 <div>
 <h4 className="text-sm font-bold flex items-center gap-2 text-burgundy">
 <span>📢</span> شريط الإعلانات الترويجي (أعلى الموقع)
 </h4>
 <p className="text-xs text-burgundy/60 mt-0.5">يمكنك التحكم بألوانه، نصوصه الجاهزة، روابطه وتفعيله فوراً من التبويب المخصص</p>
 </div>
 <button
 type="button"
 onClick={() => handleTabChange('announcement')}
 className="px-4 py-2 bg-burgundy text-white text-xs font-bold rounded-xl hover:bg-[#650018] transition shrink-0"
 >
 إدارة شريط الإعلانات 📢 ←
 </button>
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

 {activeTab === 'announcement' && config && (
 <form onSubmit={handleSave} className="space-y-6">
 {/* Live Preview Card */}
 <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm space-y-3">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <h3 className="text-base font-bold flex items-center gap-2">
 <span>👀</span> معاينة مباشرة لشريط الإعلان أعلى الموقع
 </h3>
 <span className="text-xs text-burgundy/50">كما يظهر للعملاء في أعلى كل صفحات المتجر</span>
 </div>

 <div className="pt-2">
 {config.announcementBarActive && config.announcementBar ? (
 <div
 className={`py-2.5 px-4 text-center text-xs sm:text-sm font-semibold rounded-2xl shadow-sm flex items-center justify-between transition-all ${
 config.announcementBarBg === 'emerald'
 ? 'bg-emerald-700 text-white'
 : config.announcementBarBg === 'dark'
 ? 'bg-[#1a1215] text-amber-200'
 : config.announcementBarBg === 'amber'
 ? 'bg-amber-600 text-white'
 : 'bg-burgundy text-white'
 }`}
 >
 <div className="flex-1 flex items-center justify-center gap-2">
 <span className="inline-block animate-pulse">📢</span>
 <span>{config.announcementBar}</span>
 {config.announcementBarLink && (
 <span className="text-[11px] underline opacity-90 mr-1">تصفحي الآن ←</span>
 )}
 </div>
 <span className="text-xs opacity-75 mr-2">✕</span>
 </div>
 ) : (
 <div className="py-4 text-center text-xs text-burgundy/50 bg-beige/10 rounded-2xl border border-dashed border-burgundy/20">
 ⚠️ شريط الإعلانات معطّل حالياً ولن يظهر للزوار على الموقع
 </div>
 )}
 </div>
 </div>

 {/* Announcement Controls Card */}
 <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm space-y-6">
 {/* Toggle active switch */}
 <div className="flex items-center justify-between border-b border-burgundy/10 pb-4">
 <div>
 <h4 className="text-sm font-bold text-burgundy">تفعيل شريط الإعلانات الترويجي</h4>
 <p className="text-xs text-burgundy/60 mt-0.5">عند تفعيله يظهر فوراً في أعلى جميع صفحات الموقع لجميع الزوار على الموبايل والكمبيوتر</p>
 </div>
 <button
 type="button"
 onClick={() => setConfig({ ...config, announcementBarActive: !config.announcementBarActive })}
 className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
 config.announcementBarActive ? 'bg-emerald-600' : 'bg-gray-300'
 }`}
 >
 <span
 className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
 config.announcementBarActive ? 'translate-x-1' : 'translate-x-6'
 }`}
 />
 </button>
 </div>

 {/* Preset Quick Templates */}
 <div>
 <label className="block text-xs font-bold text-burgundy/80 mb-2">نماذج إعلانية سريعة وجاهزة (اضغط للاختيار والتطبيق الفوري):</label>
 <div className="flex flex-wrap gap-2">
 {[
 '🚚 شحن مجاني لجميع محافظات مصر بمناسبة الافتتاح 🌸',
 '🔥 كود خصم 15% على جميع الفساتين | استخدمي كود: MODA15',
 '✨ تشكيلة الصيف الجديدة وصلت الآن | اطلبي والدفع عند الاستلام',
 '⚡ كود خصم خاص للمتابعين الجدد: WELCOME10 🎟️',
 ].map((preset, idx) => (
 <button
 key={idx}
 type="button"
 onClick={() => setConfig({ ...config, announcementBar: preset })}
 className="text-xs bg-burgundy/5 hover:bg-burgundy/10 text-burgundy font-medium px-3 py-1.5 rounded-xl border border-burgundy/15 transition text-right cursor-pointer"
 >
 {preset}
 </button>
 ))}
 </div>
 </div>

 {/* Announcement text */}
 <div>
 <div className="flex justify-between items-center mb-1">
 <label className="block text-xs font-bold text-burgundy/80">نص الإعلان أو العرض الترويجي</label>
 <span className="text-[11px] text-burgundy/50 font-mono">{(config.announcementBar || '').length} حرف</span>
 </div>
 <input
 name="announcementBar"
 value={config.announcementBar || ''}
 onChange={handleChange}
 placeholder="مثال: شحن سريع لجميع المحافظات والدفع عند الاستلام 🛍️"
 className={inputCls}
 />
 </div>

 {/* Banner Color Picker */}
 <div>
 <label className="block text-xs font-bold text-burgundy/80 mb-2">لون الشريط الترويجي</label>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {[
 { id: 'burgundy', label: 'العنابي الملكي', cls: 'bg-burgundy text-white' },
 { id: 'emerald', label: 'الأخضر الزمردي', cls: 'bg-emerald-700 text-white' },
 { id: 'amber', label: 'الذهبي / البرونزي', cls: 'bg-amber-600 text-white' },
 { id: 'dark', label: 'الأسود الفاخر', cls: 'bg-[#1a1215] text-amber-200' },
 ].map(color => (
 <button
 key={color.id}
 type="button"
 onClick={() => setConfig({ ...config, announcementBarBg: color.id })}
 className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
 (config.announcementBarBg || 'burgundy') === color.id
 ? 'ring-2 ring-burgundy shadow-md font-extrabold'
 : 'opacity-70 hover:opacity-100'
 } ${color.cls}`}
 >
 <span>{(config.announcementBarBg || 'burgundy') === color.id ? '✓' : '●'}</span>
 <span>{color.label}</span>
 </button>
 ))}
 </div>
 </div>

 {/* Target Link */}
 <div>
 <label className="block text-xs font-bold text-burgundy/80 mb-1">رابط التحويل عند النقر (اختياري)</label>
 <input
 name="announcementBarLink"
 value={config.announcementBarLink || ''}
 onChange={handleChange}
 placeholder="مثال: /shop أو /collections"
 className={inputCls}
 dir="ltr"
 />
 <p className="mt-1 text-[11px] text-burgundy/50">اتركه فارغاً إذا كنت لا ترغب بجعل شريط الإعلان قابلاً للضغط</p>
 </div>

 {/* Social Proof Toggle */}
 <div className="pt-4 border-t border-burgundy/10 flex items-center justify-between">
 <div>
 <h4 className="text-sm font-bold text-burgundy flex items-center gap-1.5">
 إشعارات الشراء الحي والدليل الاجتماعي (Social Proof Popups)
 </h4>
 <p className="text-xs text-burgundy/60 mt-0.5">نافذة صغيرة أنيقة تظهر أسفل الشاشة للزوار لإشعارهم بالطلبات المؤكدة لزيادة الثقة والمبيعات</p>
 </div>
 <button
 type="button"
 onClick={() => setConfig({ ...config, socialProofActive: config.socialProofActive === false ? true : false })}
 className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
 config.socialProofActive !== false ? 'bg-emerald-600' : 'bg-gray-300'
 }`}
 >
 <span
 className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
 config.socialProofActive !== false ? 'translate-x-1' : 'translate-x-6'
 }`}
 />
 </button>
 </div>

 {/* Save Button */}
 <div className="pt-4 border-t border-burgundy/10 flex justify-end">
 <button
 type="submit"
 disabled={saving}
 className="rounded-full bg-burgundy px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-[#650018] transition disabled:opacity-50 cursor-pointer"
 >
 {saving ? 'جاري الحفظ...' : 'حفظ تعديلات شريط الإعلانات'}
 </button>
 </div>
 </div>
 </form>
 )}

 {activeTab === 'categories' && config && (
 <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-start">
 {/* Current Categories List */}
 <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
 <h3 className="mb-4 text-lg font-bold"> فئات الملابس النشطة على الموقع</h3>
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
 تعديل الاسم
 </button>
 <button
 onClick={() => handleDeleteCategory(cat.key)}
 className="rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100"
 >
 حذف
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
 <h3 className="mb-4 text-lg font-bold"> إضافة فئة جديدة للموقع</h3>
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
 تحديث القائمة
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
 const waTemplate = (config?.whatsappMessageTemplate || 'أهلاً بكِ يا أ/ *{{name}}* في ModaPella \n\nتم تسجيل طلبكِ رقم *#{{id}}* بنجاح بقيمة *{{amount}} ج.م*.\n\nمن فضلكِ قومي بتحويل المبلغ عبر Instapay لتأكيد الطلب! ')
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
 {order.trafficSource?.source && order.trafficSource.source !== 'Direct' && (
 <span className="rounded-full bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 text-[10px] font-bold">
 {order.trafficSource.source === 'Instagram' ? 'إنستغرام' :
 order.trafficSource.source === 'TikTok' ? 'تيك توك' :
 order.trafficSource.source === 'Facebook' ? 'فيسبوك' :
 order.trafficSource.source === 'WhatsApp / Share' ? 'شير أصدقاء' : order.trafficSource.source}
 </span>
 )}
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
 <p className="font-bold text-sm text-burgundy border-b border-burgundy/5 pb-2"> بيانات العميل والشحن</p>
 <p><span className="font-semibold text-burgundy/60">الاسم:</span> {order.customerName}</p>
 <p><span className="font-semibold text-burgundy/60">رقم الهاتف:</span> <span className="font-mono">{order.customerPhone}</span></p>
 <p><span className="font-semibold text-burgundy/60">عنوان الشحن:</span> {[order.governorate, order.shippingAddress].filter(Boolean).join(' - ') || order.notes || 'لم يتم تحديده'}</p>
 </div>

 <div className="bg-white rounded-2xl p-4 border border-burgundy/5 shadow-sm space-y-2 text-xs flex flex-col justify-between">
 <div>
 <p className="font-bold text-sm text-burgundy border-b border-burgundy/5 pb-2">طريقة الدفع</p>
 {order.paymentMethod === 'Cash' ? (
   <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
     <p className="font-bold">💵 الدفع عند الاستلام (COD)</p>
     <p className="text-[11px] text-amber-700 mt-0.5">تحصيل المبلغ نقداً عند تسليم ومعاينة الطلب.</p>
   </div>
 ) : (
   <div>
     <p className="font-semibold text-burgundy/80 mt-1">📱 تحويل عبر Instapay</p>
     {order.paymentScreenshot ? (
       <p className="text-emerald-700 font-semibold mt-1">✓ قام العميل برفع صورة إثبات الدفع</p>
     ) : (
       <p className="text-burgundy/50 mt-1">لم يتم رفع صورة إثبات دفع بعد</p>
     )}
   </div>
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
 عرض الصورة بالحجم الكامل
 </button>
 )}
 </div>
 </div>

 {/* Order Items list */}
 <div className="bg-white rounded-2xl p-4 border border-burgundy/5 shadow-sm space-y-3">
 <p className="font-bold text-xs text-burgundy/60"> المنتجات المطلوبة</p>
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
 تواصل واتساب لتأكيد الدفع
 </a>
 
 <button
 onClick={() => handlePrintInvoice(order)}
 className="rounded-xl border border-burgundy bg-white px-4 py-2 text-xs font-bold text-burgundy hover:bg-burgundy/5 transition"
 >
 طباعة الفاتورة
 </button>

 {order.status === 'Pending' && (
 <>
 <button
 onClick={() => handleOrderStatusChange(order._id, 'Completed')}
 className="rounded-xl bg-burgundy hover:bg-[#650018] px-4 py-2 text-xs font-bold text-white transition"
 >
 موافقة وتأكيد شحن
 </button>
 <button
 onClick={() => {
 if (window.confirm('هل أنت متأكد من إلغاء هذا الطلب وإعادة الكميات للمخزن؟')) {
 handleOrderStatusChange(order._id, 'Returned');
 }
 }}
 className="rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
 >
 إلغاء الطلب
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
 {saving ? 'جاري الحفظ...' : ' حفظ قالب الرسالة'}
 </button>
 </div>
 )}

 {activeTab === 'coupons' && (
  <div className="space-y-6">
   {/* Header & Add Button */}
   <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-burgundy/10 shadow-sm">
    <div>
     <h3 className="font-bold text-lg text-burgundy flex items-center gap-2">
      <span>🎟️</span>
      <span>كوبونات وأكواد الخصم الترويجية</span>
     </h3>
     <p className="text-xs text-burgundy/60 mt-0.5">
      أنشئ كوبونات لحملات إعلانات السوشيال ميديا وتيك توك والإنفلونسرز
     </p>
    </div>
    <button
     type="button"
     onClick={() => setIsCouponModalOpen(true)}
     className="rounded-full bg-burgundy hover:bg-[#650018] text-white px-5 py-2.5 text-xs font-bold shadow-md transition flex items-center gap-1.5 active:scale-95"
    >
     <span>+</span>
     <span>إنشاء كود خصم جديد</span>
    </button>
   </div>

   {/* Coupons List */}
   {couponsLoading ? (
    <div className="flex h-40 items-center justify-center">
     <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
    </div>
   ) : coupons.length === 0 ? (
    <div className="rounded-[2rem] border border-burgundy/10 bg-white p-12 text-center text-sm text-burgundy/50 shadow-sm space-y-3">
     <span className="text-4xl block">🎟️</span>
     <p className="font-bold text-base text-burgundy">لا توجد أي كوبونات خصم مسجلة حتى الآن</p>
     <p className="text-xs text-burgundy/60 max-w-sm mx-auto">
      اضغط على "إنشاء كود خصم جديد" لإضافة أول كود للترويج للمتجر (مثل: MODA10 لخصم 10%).
     </p>
     <button
      type="button"
      onClick={() => setIsCouponModalOpen(true)}
      className="mt-2 rounded-full border border-burgundy bg-burgundy/5 hover:bg-burgundy hover:text-white px-6 py-2 text-xs font-bold text-burgundy transition"
     >
      + إنشاء أول كود الآن
     </button>
    </div>
   ) : (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
     {coupons.map((coupon) => (
      <div 
       key={coupon._id}
       className={`rounded-3xl border p-5 bg-white shadow-sm flex flex-col justify-between transition-all duration-200 ${
        coupon.active ? 'border-burgundy/15 hover:border-burgundy/30' : 'border-gray-200 opacity-60 bg-gray-50'
       }`}
      >
       <div className="space-y-3">
        {/* Top Row: Code Badge & Status */}
        <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-burgundy text-white font-mono font-extrabold text-sm tracking-wider shadow-sm">
           {coupon.code}
          </span>
         </div>
         <button
          type="button"
          onClick={() => handleToggleCouponActive(coupon)}
          className={`px-3 py-1 rounded-full text-[11px] font-bold border transition ${
           coupon.active 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' 
            : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
          }`}
         >
          {coupon.active ? 'مفعّل ✓' : 'معطّل ✕'}
         </button>
        </div>

        {/* Discount Value */}
        <div className="pt-1">
         <p className="text-2xl font-black text-burgundy">
          {coupon.discountType === 'percentage' 
           ? `${coupon.discountValue}% خصم` 
           : `${coupon.discountValue} ج.م خصم مباشر`}
         </p>
         {coupon.description && (
          <p className="text-xs text-burgundy/70 mt-0.5">{coupon.description}</p>
         )}
        </div>

        {/* Specs & Rules */}
        <div className="rounded-2xl bg-[#FAF5F2] p-3 text-xs space-y-1.5 border border-burgundy/5 text-burgundy/80">
         <div className="flex justify-between">
          <span className="text-burgundy/60">الحد الأدنى للطلب:</span>
          <span className="font-bold">{coupon.minOrderAmount ? `${coupon.minOrderAmount} ج.م` : 'بدون حد أدنى'}</span>
         </div>
         {coupon.maxDiscount && (
          <div className="flex justify-between">
           <span className="text-burgundy/60">الحد الأقصى للخصم:</span>
           <span className="font-bold">{coupon.maxDiscount} ج.م</span>
          </div>
         )}
         <div className="flex justify-between">
          <span className="text-burgundy/60">مرات الاستخدام:</span>
          <span className="font-bold font-mono">
           {coupon.timesUsed} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : '(غير محدود)'}
          </span>
         </div>
         <div className="flex justify-between">
          <span className="text-burgundy/60">تاريخ الانتهاء:</span>
          <span className="font-bold">
           {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString('ar-EG') : 'دائم بدون انتهاء'}
          </span>
         </div>
        </div>
       </div>

       {/* Footer actions */}
       <div className="pt-4 mt-3 border-t border-burgundy/10 flex items-center justify-between">
        <button
         type="button"
         onClick={() => {
          navigator.clipboard.writeText(coupon.code);
          showToast(`تم نسخ الكود: ${coupon.code}`);
         }}
         className="text-xs text-burgundy/70 hover:text-burgundy font-semibold flex items-center gap-1"
        >
         <span>📋</span>
         <span>نسخ الكود</span>
        </button>
        <button
         type="button"
         onClick={() => handleDeleteCoupon(coupon._id)}
         className="text-xs text-red-600 hover:text-red-800 font-bold transition"
        >
         حذف الكود
        </button>
       </div>
      </div>
     ))}
    </div>
   )}

   {/* Create Coupon Modal */}
   {isCouponModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsCouponModalOpen(false)}>
     <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()} dir="rtl">
      <div className="flex items-center justify-between border-b border-burgundy/10 pb-3">
       <h4 className="font-bold text-base text-burgundy flex items-center gap-2">
        <span>🎟️</span>
        <span>إنشاء كود خصم ترويجي جديد</span>
       </h4>
       <button type="button" onClick={() => setIsCouponModalOpen(false)} className="text-burgundy/50 hover:text-burgundy text-lg font-bold">✕</button>
      </div>

      <form onSubmit={handleCreateCoupon} className="space-y-3.5">
       <div>
        <label className="block text-xs font-bold text-burgundy mb-1">كود الخصم (بالحروف الإنجليزية والأرقام) *</label>
        <input
         type="text"
         required
         placeholder="مثال: MODA10 أو SALE20"
         value={couponForm.code}
         onChange={(e) => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))}
         className="w-full h-11 px-3.5 rounded-xl border border-burgundy/20 font-mono text-sm uppercase text-burgundy outline-none focus:border-burgundy"
        />
       </div>

       <div className="grid grid-cols-2 gap-3">
        <div>
         <label className="block text-xs font-bold text-burgundy mb-1">نوع الخصم *</label>
         <select
          value={couponForm.discountType}
          onChange={(e) => setCouponForm(p => ({ ...p, discountType: e.target.value }))}
          className="w-full h-11 px-3 rounded-xl border border-burgundy/20 text-xs sm:text-sm text-burgundy outline-none focus:border-burgundy"
         >
          <option value="percentage">نسبة مئوية (%)</option>
          <option value="fixed">مبلغ ثابت (ج.م)</option>
         </select>
        </div>

        <div>
         <label className="block text-xs font-bold text-burgundy mb-1">
          {couponForm.discountType === 'percentage' ? 'نسبة الخصم (%) *' : 'قيمة الخصم (ج.م) *'}
         </label>
         <input
          type="number"
          required
          min="1"
          max={couponForm.discountType === 'percentage' ? '100' : '10000'}
          value={couponForm.discountValue}
          onChange={(e) => setCouponForm(p => ({ ...p, discountValue: e.target.value }))}
          className="w-full h-11 px-3.5 rounded-xl border border-burgundy/20 text-sm text-burgundy outline-none focus:border-burgundy"
         />
        </div>
       </div>

       <div className="grid grid-cols-2 gap-3">
        <div>
         <label className="block text-xs font-bold text-burgundy mb-1">الحد الأدنى للطلب (ج.م)</label>
         <input
          type="number"
          min="0"
          placeholder="0 = بدون حد أدنى"
          value={couponForm.minOrderAmount}
          onChange={(e) => setCouponForm(p => ({ ...p, minOrderAmount: e.target.value }))}
          className="w-full h-11 px-3.5 rounded-xl border border-burgundy/20 text-sm text-burgundy outline-none focus:border-burgundy"
         />
        </div>

        {couponForm.discountType === 'percentage' && (
         <div>
          <label className="block text-xs font-bold text-burgundy mb-1">الحد الأقصى للخصم (ج.م)</label>
          <input
           type="number"
           min="1"
           placeholder="اختياري (مثلاً: 200)"
           value={couponForm.maxDiscount}
           onChange={(e) => setCouponForm(p => ({ ...p, maxDiscount: e.target.value }))}
           className="w-full h-11 px-3.5 rounded-xl border border-burgundy/20 text-sm text-burgundy outline-none focus:border-burgundy"
          />
         </div>
        )}
       </div>

       <div className="grid grid-cols-2 gap-3">
        <div>
         <label className="block text-xs font-bold text-burgundy mb-1">الحد الأقصى للاستخدام</label>
         <input
          type="number"
          min="1"
          placeholder="اختياري (مثلاً أول 100 طلب)"
          value={couponForm.usageLimit}
          onChange={(e) => setCouponForm(p => ({ ...p, usageLimit: e.target.value }))}
          className="w-full h-11 px-3.5 rounded-xl border border-burgundy/20 text-sm text-burgundy outline-none focus:border-burgundy"
         />
        </div>

        <div>
         <label className="block text-xs font-bold text-burgundy mb-1">تاريخ الانتهاء</label>
         <input
          type="date"
          value={couponForm.expiryDate}
          onChange={(e) => setCouponForm(p => ({ ...p, expiryDate: e.target.value }))}
          className="w-full h-11 px-3 rounded-xl border border-burgundy/20 text-xs sm:text-sm text-burgundy outline-none focus:border-burgundy"
         />
        </div>
       </div>

       <div>
        <label className="block text-xs font-bold text-burgundy mb-1">وصف أو ملاحظة (اختياري)</label>
        <input
         type="text"
         placeholder="مثال: كود حملة إنستجرام مع ياسمين"
         value={couponForm.description}
         onChange={(e) => setCouponForm(p => ({ ...p, description: e.target.value }))}
         className="w-full h-11 px-3.5 rounded-xl border border-burgundy/20 text-xs sm:text-sm text-burgundy outline-none focus:border-burgundy"
        />
       </div>

       <div className="pt-2 flex gap-3">
        <button
         type="button"
         onClick={() => setIsCouponModalOpen(false)}
         className="flex-1 rounded-2xl border border-burgundy/20 py-3 text-xs font-semibold text-burgundy hover:bg-burgundy/5"
        >
         إلغاء
        </button>
        <button
         type="submit"
         disabled={savingCoupon}
         className="flex-1 rounded-2xl bg-burgundy hover:bg-[#650018] text-white py-3 text-xs font-bold shadow-md transition disabled:opacity-50"
        >
         {savingCoupon ? 'جاري الإنشاء...' : 'حفظ ونشر الكود'}
        </button>
       </div>
      </form>
     </div>
    </div>
   )}
  

 {/* ━━━━━━ Ad Traffic Attribution Tab ━━━━━━ */}
 {activeTab === 'traffic' && (
   <AdCampaignTracker orders={orders} />
 )}

 {/* ━━━━━━ Social Media Ad Story Creator Tab ━━━━━━ */}
 {activeTab === 'creator' && (
   <SocialAdCreator />
 )}
</div>
 )}
 </div>
 );
}

export default AdminSiteSettings;
