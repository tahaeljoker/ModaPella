import { useEffect, useState } from 'react';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';

const TASK_STATUS = {
  pending:   { label: 'معلق',       color: 'bg-amber-100 text-amber-700',   icon: '⏳' },
  submitted: { label: 'تم التسليم', color: 'bg-blue-100 text-blue-700',    icon: '📤' },
  accepted:  { label: 'مقبول',      color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  rejected:  { label: 'مرفوض',     color: 'bg-red-100 text-red-700',       icon: '❌' },
};

// ─── WhatsApp Notification Helper ─────────────────────────────────────────────
function buildWhatsAppLink(phone, employeeName, taskTitle, siteUrl) {
  if (!phone) return null;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const intlPhone = cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone;
  const msg = encodeURIComponent(
    `🎠 *تنبيه جرد جديد من ModaPella* 📦\n\nيا *${employeeName}*، تم تكليفك بمهمة جرد جديدة في النظام:\n📌 *المهمة:* ${taskTitle}\n🔗 *رابط التسليم:* ${siteUrl}\n\nبرجاء الدخول وتسجيل الكميات الفعلية وتسليمها للمراجعة.`
  );
  return `https://wa.me/${intlPhone}?text=${msg}`;
}

// ─── Admin: Inventory Tasks Panel ─────────────────────────────────────────────
function InventoryTasksPanel() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', employeeId: '', productIds: [] });
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');
  const [reviewTask, setReviewTask] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [whatsappLink, setWhatsappLink] = useState(null);
  const [whatsappTaskTitle, setWhatsappTaskTitle] = useState('');
  // Product picker state
  const [productSearch, setProductSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [taskFilter, setTaskFilter] = useState('all');

  const showToast = (msg, type = 'success') => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 4000);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tasksRes, usersRes, prodsRes] = await Promise.all([
        api.get('/inventory-tasks'),
        api.get('/admin/users'),
        api.get('/products?limit=500'),
      ]);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
      const empUsers = (usersRes.data || []).filter(u => u.role === 'employee' && u.active !== false);
      setEmployees(empUsers);
      const prods = Array.isArray(prodsRes.data) ? prodsRes.data : prodsRes.data?.products || [];
      setProducts(prods);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.title || !form.employeeId || form.productIds.length === 0) {
      return showToast('يرجى تحديد عنوان الموظف والمنتجات', 'error');
    }
    setFormLoading(true);
    try {
      // Build items from selected products (one row per variant)
      const items = [];
      form.productIds.forEach(pid => {
        const p = products.find(x => x._id === pid);
        if (!p) return;
        if (p.variants && p.variants.length > 0) {
          p.variants.forEach(v => items.push({
            product: p._id,
            productName: p.name,
            sku: p.sku || '',
            size: v.size || '',
            color: v.color || '',
            systemStock: v.stock,
          }));
        } else {
          items.push({ product: p._id, productName: p.name, sku: p.sku || '', size: '', color: '', systemStock: p.stock });
        }
      });

      const { data: newTask } = await api.post('/inventory-tasks', {
        title: form.title,
        employee: form.employeeId,
        items,
      });

      // Build WhatsApp link for the admin to send
      const emp = employees.find(e => e._id === form.employeeId);
      const siteUrl = window.location.origin + '/login';
      const waLink = emp?.phone ? buildWhatsAppLink(emp.phone, emp.name, form.title, siteUrl) : null;
      setWhatsappLink(waLink);
      setWhatsappTaskTitle(form.title);

      setForm({ title: '', employeeId: '', productIds: [] });
      setCreating(false);
      showToast('✅ تم إنشاء التكليف بنجاح');
      await loadAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'حدث خطأ', 'error');
    } finally { setFormLoading(false); }
  };

  const handleReview = async (taskId, status) => {
    try {
      await api.put(`/inventory-tasks/${taskId}/review`, { status, adminNotes: reviewNotes });
      setReviewTask(null);
      setReviewNotes('');
      showToast(status === 'accepted' ? '✅ تم قبول الجرد وإدراجه في الجرد الرئيسي' : '❌ تم رفض الجرد وإشعار الموظف');
      await loadAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const toggleProduct = (pid) => {
    setForm(prev => ({
      ...prev,
      productIds: prev.productIds.includes(pid)
        ? prev.productIds.filter(x => x !== pid)
        : [...prev.productIds, pid],
    }));
  };

  // Select/deselect all visible products (after filter)
  const selectAllVisible = (visibleIds) => {
    const allSelected = visibleIds.every(id => form.productIds.includes(id));
    if (allSelected) {
      setForm(p => ({ ...p, productIds: p.productIds.filter(id => !visibleIds.includes(id)) }));
    } else {
      setForm(p => ({ ...p, productIds: [...new Set([...p.productIds, ...visibleIds])] }));
    }
  };

  // Select by category shortcut
  const selectByCategory = (cat) => {
    const catIds = products.filter(p => p.category === cat).map(p => p._id);
    const allSelected = catIds.every(id => form.productIds.includes(id));
    if (allSelected) {
      setForm(p => ({ ...p, productIds: p.productIds.filter(id => !catIds.includes(id)) }));
    } else {
      setForm(p => ({ ...p, productIds: [...new Set([...p.productIds, ...catIds])] }));
    }
  };

  // Unique categories from products
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
  const CAT_AR = { Blazer: 'بليزر', Blouse: 'بلوزة', Chemise: 'شميز', Skirt: 'جيبة', Dress: 'فستان', Pantalon: 'بنطلون', 'T-shirt': 'تيشيرت', Bag: 'شنطة', Cardigan: 'كاردن', Suit: 'سوت', Tonic: 'تونيك', Takem: 'طقم', all: 'الكل' };

  // Filtered products for picker
  const filteredProducts = products.filter(p => {
    const matchCat = activeCat === 'all' || p.category === activeCat;
    const q = productSearch.trim().toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  const filteredIds = filteredProducts.map(p => p._id);
  const allVisibleSelected = filteredIds.length > 0 && filteredIds.every(id => form.productIds.includes(id));

  const inputCls = 'w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none transition focus:border-burgundy';

  return (
    <div className="space-y-6 text-burgundy">
      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg ${toastType === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>{toast}</div>
      )}

      {/* WhatsApp CTA after creation */}
      {whatsappLink && (
        <div className="rounded-[2rem] bg-[#25D366]/10 border border-[#25D366]/30 p-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <p className="font-bold text-emerald-800">📤 إرسال التكليف للموظف على الواتساب</p>
            <p className="text-sm text-emerald-700/80 mt-0.5">التكليف: "{whatsappTaskTitle}" — الرسالة جاهزة، فقط اضغط إرسال في الواتساب</p>
          </div>
          <div className="flex gap-3">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#1da851] transition"
            >
              <span className="text-lg">💬</span> إرسال على واتساب
            </a>
            <button onClick={() => setWhatsappLink(null)} className="text-xs text-emerald-700/60 hover:text-emerald-800">إغلاق</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-burgundy/50">إسناد مهام الجرد للموظفين ومراجعة الجردات المستلمة</p>
        </div>
        <button
          onClick={() => { setCreating(true); setWhatsappLink(null); }}
          className="rounded-full bg-burgundy px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-burgundy/20 transition hover:bg-[#650018]"
        >
          + تكليف جديد
        </button>
      </div>

      {/* Create Task Form */}
      {creating && (
        <div className="rounded-[2rem] border border-burgundy/15 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-burgundy text-lg">إنشاء تكليف جرد جديد</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">عنوان التكليف *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="مثال: جرد فئة الفساتين" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">الموظف المكلَّف *</label>
              <select value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} className={inputCls}>
                <option value="">اختر موظفاً...</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.name} {emp.phone ? `(${emp.phone})` : ''}</option>
                ))}
              </select>
              {employees.length === 0 && <p className="text-xs text-red-500 mt-1">لا يوجد حسابات موظفين. أضف حساباً بدور "موظف جرد" من صفحة المستخدمين.</p>}
            </div>
          </div>

          {/* Smart Product Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-burgundy/60">اختر المنتجات المطلوب جردها *</label>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-burgundy/50">{form.productIds.length} منتج مختار</span>
                {form.productIds.length > 0 && (
                  <button type="button" onClick={() => setForm(p => ({ ...p, productIds: [] }))} className="text-[10px] text-red-500 hover:text-red-700 font-bold border border-red-200 rounded-lg px-2 py-0.5 hover:bg-red-50 transition">
                    مسح الكل ✕
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {categories.map(cat => {
                const catProductIds = cat === 'all' ? products.map(p => p._id) : products.filter(p => p.category === cat).map(p => p._id);
                const selectedInCat = catProductIds.filter(id => form.productIds.includes(id)).length;
                const totalInCat = catProductIds.length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCat(cat)}
                    className={`relative rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      activeCat === cat ? 'bg-burgundy text-white shadow-sm' : 'bg-[#F7F0EC] text-burgundy/70 hover:bg-burgundy/15'
                    }`}
                  >
                    {CAT_AR[cat] || cat}
                    {selectedInCat > 0 && (
                      <span className={`mr-1 text-[10px] font-bold ${activeCat === cat ? 'text-white/80' : 'text-burgundy'}`}>
                        ({selectedInCat}/{totalInCat})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search + Select All bar */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder="🔍 بحث باسم المنتج أو الكود..."
                className="flex-1 rounded-xl border border-burgundy/20 bg-white px-3 py-2 text-sm text-burgundy outline-none focus:border-burgundy"
              />
              <button
                type="button"
                onClick={() => selectAllVisible(filteredIds)}
                disabled={filteredIds.length === 0}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition whitespace-nowrap ${
                  allVisibleSelected
                    ? 'border-burgundy bg-burgundy text-white'
                    : 'border-burgundy/30 text-burgundy hover:bg-burgundy hover:text-white'
                } disabled:opacity-40`}
              >
                {allVisibleSelected ? '✓ إلغاء الكل' : '☑ اختيار الكل'}
              </button>
              {activeCat !== 'all' && (
                <button
                  type="button"
                  onClick={() => selectByCategory(activeCat)}
                  title={`اختيار كل فئة ${CAT_AR[activeCat] || activeCat} دفعة واحدة`}
                  className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-500 hover:text-white transition whitespace-nowrap"
                >
                  ✦ كل {CAT_AR[activeCat] || activeCat}
                </button>
              )}
            </div>

            {/* Product List */}
            <div className="max-h-64 overflow-y-auto rounded-2xl border border-burgundy/15 bg-[#F7F0EC] p-2 space-y-0.5">
              {filteredProducts.length === 0 ? (
                <p className="text-center text-xs text-burgundy/40 py-8">لا توجد منتجات تطابق البحث</p>
              ) : filteredProducts.map(p => {
                const isSelected = form.productIds.includes(p._id);
                const stock = p.variants?.length > 0 ? p.variants.reduce((s, v) => s + v.stock, 0) : (p.stock ?? 0);
                return (
                  <label
                    key={p._id}
                    className={`flex items-center gap-3 cursor-pointer rounded-xl px-3 py-2.5 transition group ${
                      isSelected ? 'bg-burgundy text-white shadow-sm' : 'hover:bg-burgundy/8 text-burgundy'
                    }`}
                  >
                    <input type="checkbox" checked={isSelected} onChange={() => toggleProduct(p._id)} className="accent-white shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      {p.sku && <p className={`text-[10px] font-mono ${isSelected ? 'text-white/60' : 'text-burgundy/40'}`}>{p.sku}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${
                        isSelected ? 'bg-white/20 text-white' :
                        stock === 0 ? 'bg-red-100 text-red-600' : 'bg-burgundy/8 text-burgundy'
                      }`}>
                        {stock} قطعة
                      </span>
                      {p.variants?.length > 0 && (
                        <p className={`text-[9px] mt-0.5 ${isSelected ? 'text-white/50' : 'text-burgundy/40'}`}>{p.variants.length} متغير</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {form.productIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <p className="w-full text-xs text-burgundy/50 mb-1">المنتجات المختارة:</p>
                {form.productIds.map(pid => {
                  const p = products.find(x => x._id === pid);
                  if (!p) return null;
                  return (
                    <span key={pid} className="inline-flex items-center gap-1.5 rounded-full bg-burgundy/10 border border-burgundy/20 px-2.5 py-1 text-xs font-semibold text-burgundy">
                      {p.name}
                      <button type="button" onClick={() => toggleProduct(pid)} className="text-burgundy/40 hover:text-red-600 text-xs leading-none">&times;</button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={formLoading} className="rounded-xl bg-burgundy px-6 py-2.5 text-sm font-bold text-white hover:bg-[#650018] transition disabled:opacity-60">
              {formLoading ? 'جاري الإرسال...' : 'إنشاء التكليف'}
            </button>
            <button onClick={() => setCreating(false)} className="rounded-xl border border-burgundy/20 px-4 py-2.5 text-sm text-burgundy hover:bg-burgundy/8 transition">إلغاء</button>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
      ) : tasks.length === 0 ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white py-20 text-center">
          <p className="text-5xl mb-3">📋</p>
          <p className="text-lg font-semibold text-burgundy/40">لا توجد تكاليف جرد بعد</p>
          <p className="text-sm text-burgundy/30 mt-1">أنشئ تكليفاً جديداً وابدأ التنسيق مع موظفيك</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const si = TASK_STATUS[task.status] || TASK_STATUS.pending;
            const totalItems = task.items?.length || 0;
            const counted = task.items?.filter(i => i.countedStock !== null).length || 0;
            return (
              <div key={task._id} className="rounded-[1.5rem] border border-burgundy/10 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-burgundy">{task.title}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${si.color}`}>{si.icon} {si.label}</span>
                    </div>
                    <div className="flex items-center flex-wrap gap-3 mt-1 text-xs text-burgundy/50">
                      <span>👤 {task.employee?.name}</span>
                      <span>{DATE(task.createdAt)}</span>
                      <span>{totalItems} صنف</span>
                      {task.status === 'submitted' && <span className="text-blue-600 font-bold">{counted}/{totalItems} عُدّ</span>}
                    </div>
                    {task.status === 'rejected' && task.adminNotes && (
                      <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-1.5">{task.adminNotes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* WhatsApp re-send */}
                    {task.employee?.phone && ['pending', 'rejected'].includes(task.status) && (
                      <a
                        href={buildWhatsAppLink(task.employee.phone, task.employee.name, task.title, window.location.origin + '/login')}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="إرسال تذكير على الواتساب"
                        className="rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-[#25D366] hover:text-white transition"
                      >
                        💬 واتساب
                      </a>
                    )}
                    {/* Review button */}
                    {task.status === 'submitted' && (
                      <button
                        onClick={() => { setReviewTask(task); setReviewNotes(''); }}
                        className="rounded-xl bg-burgundy text-white px-4 py-2 text-xs font-bold hover:bg-[#650018] transition"
                      >
                        🔍 مراجعة
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white shadow-2xl overflow-hidden">
            <div className="bg-burgundy p-5 text-white">
              <h3 className="font-bold text-lg">مراجعة جرد الموظف</h3>
              <p className="text-sm opacity-70 mt-0.5">{reviewTask.title} — {reviewTask.employee?.name}</p>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Items comparison */}
              <div className="space-y-2">
                {reviewTask.items.map(item => {
                  const variance = item.countedStock !== null ? item.countedStock - item.systemStock : null;
                  return (
                    <div key={item._id} className={`rounded-xl px-4 py-2.5 text-sm flex items-center justify-between gap-3 ${
                      variance === null ? 'bg-burgundy/5' : variance === 0 ? 'bg-emerald-50' : variance > 0 ? 'bg-blue-50' : 'bg-red-50'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-burgundy truncate">{item.productName}</p>
                        {(item.size || item.color) && <p className="text-xs text-burgundy/50">{item.size} {item.color}</p>}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold shrink-0">
                        <span className="text-burgundy/50">النظام: {item.systemStock}</span>
                        <span className="text-burgundy">الموظف: {item.countedStock ?? '—'}</span>
                        {variance !== null && (
                          <span className={variance === 0 ? 'text-emerald-600' : variance > 0 ? 'text-blue-600' : 'text-red-600'}>
                            {variance > 0 ? `+${variance}` : variance}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-burgundy/60 uppercase tracking-wide">ملاحظات (في حالة الرفض)</label>
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-burgundy/20 bg-[#F7F0EC] px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy resize-none"
                  placeholder="اكتب سبب الرفض أو ملاحظاتك للموظف..."
                />
              </div>
            </div>
            <div className="p-5 border-t border-burgundy/10 flex gap-3">
              <button
                onClick={() => handleReview(reviewTask._id, 'accepted')}
                className="flex-1 rounded-xl bg-emerald-500 text-white py-2.5 text-sm font-bold hover:bg-emerald-600 transition"
              >
                ✅ قبول ودمج مع الجرد الرئيسي
              </button>
              <button
                onClick={() => handleReview(reviewTask._id, 'rejected')}
                className="flex-1 rounded-xl bg-red-500 text-white py-2.5 text-sm font-bold hover:bg-red-600 transition"
              >
                ❌ رفض
              </button>
              <button onClick={() => setReviewTask(null)} className="rounded-xl border border-burgundy/20 px-4 text-sm text-burgundy hover:bg-burgundy/8 transition">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;
const DATE = (d) => new Date(d).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });

const CATEGORIES = ['Blazer', 'Blouse', 'Chemise', 'Skirt', 'Dress', 'Pantalon', 'T-shirt', 'Bag', 'Cardigan', 'Suit', 'Tonic', 'Takem'];
const CAT_AR = { Blazer: 'بليزر', Blouse: 'بلوزة', Chemise: 'شميز', Skirt: 'جيبة', Dress: 'فستان', Pantalon: 'بنطلون', 'T-shirt': 'تيشيرت', Bag: 'شنطة', Cardigan: 'كاردن', Suit: 'سوت', Tonic: 'تونيك', Takem: 'طقم' };

// ─── Active Count Session ──────────────────────────────────────────────────────
function CountSession({ count: initialCount, onFinish }) {
  const [count, setCount] = useState(initialCount);
  const [items, setItems] = useState(initialCount.items.map(i => ({ ...i, _counted: i.countedStock ?? '' })));
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyConfirm, setApplyConfirm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all | counted | uncounted | diff
  const [filterCat, setFilterCat] = useState('All');

  const updateCounted = (id, val) => {
    setItems(prev => prev.map(i => i._id === id ? { ...i, _counted: val } : i));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = items.map(i => ({ _id: i._id, countedStock: i._counted === '' ? null : Number(i._counted) }));
      const r = await api.put(`/inventory/counts/${count._id}`, { items: payload });
      setCount(r.data);
      alert('✅ تم حفظ الجرد كمسودة');
    } catch (e) { alert('فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await api.post(`/inventory/counts/${count._id}/apply`);
      onFinish();
    } catch (e) { alert(e.response?.data?.message || 'فشل التطبيق'); }
    finally { setApplying(false); setApplyConfirm(false); }
  };

  const handlePrintAuditReport = () => {
    const itemsHTML = filtered.map(item => {
      const counted = item._counted !== '' ? Number(item._counted) : null;
      const variance = counted !== null ? counted - item.systemStock : null;
      const varianceVal = variance !== null ? variance * (item.costPrice || 0) : 0;
      return `
        <tr style="border-bottom: 1px solid #f0e8e8">
          <td style="padding:10px 8px">${item.productName}</td>
          <td style="padding:10px 8px">${item.size || '—'}</td>
          <td style="padding:10px 8px">${item.color || '—'}</td>
          <td style="padding:10px 8px">${item.systemStock}</td>
          <td style="padding:10px 8px">${counted !== null ? counted : 'لم يُعدّ'}</td>
          <td style="padding:10px 8px;font-weight:bold;color:${variance === 0 ? '#1a0509' : variance > 0 ? '#2563eb' : '#dc2626'}">
            ${variance === null ? '—' : variance > 0 ? `+${variance}` : variance}
          </td>
          <td style="padding:10px 8px;font-weight:bold;color:${varianceVal === 0 ? '#1a0509' : varianceVal > 0 ? '#2563eb' : '#dc2626'}">
            ${variance === null ? '—' : `${Number(varianceVal).toLocaleString('en-US')} ج.م`}
          </td>
        </tr>
      `;
    }).join('');

    const totalValLoss = items.reduce((s, item) => {
      if (item._counted === '') return s;
      const variance = Number(item._counted) - item.systemStock;
      return s + (variance * (item.costPrice || 0));
    }, 0);

    const printDiv = document.createElement('div');
    printDiv.id = 'audit-print-root';
    printDiv.innerHTML = `
      <div style="direction:rtl;text-align:right;font-family:Cairo,sans-serif;padding:32px;color:#1a0509;max-width:800px;margin:auto">
        <h1 style="color:#7C0A12;text-align:center;margin:0;font-size:26px;font-weight:bold">ModaPella</h1>
        <p style="text-align:center;color:#888;font-size:13px;margin:4px 0 24px;letter-spacing:1px">تقرير جرد المخزون والتدقيق المالي</p>
        
        <div style="border-bottom:2px solid #7C0A12;padding-bottom:12px;margin-bottom:20px;font-size:13px;line-height:2">
          <p style="margin:4px 0"><strong>اسم جلسة الجرد:</strong> ${count.label}</p>
          <p style="margin:4px 0"><strong>تاريخ البدء:</strong> ${new Date(count.createdAt).toLocaleString('ar-EG-u-nu-latn')}</p>
          ${count.appliedAt ? `<p style="margin:4px 0"><strong>تاريخ التطبيق:</strong> ${new Date(count.appliedAt).toLocaleString('ar-EG-u-nu-latn')}</p>` : ''}
          <p style="margin:4px 0"><strong>حالة الجلسة:</strong> ${count.status === 'applied' ? '✅ تم التطبيق وتحديث الأرصدة' : '📝 مسودة جرد معلقة'}</p>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:16px">
          <thead>
            <tr style="background:#f7f0ec;color:#7C0A12">
              <th style="padding:10px 8px;border:1px solid #e0c9c9;text-align:right">المنتج</th>
              <th style="padding:10px 8px;border:1px solid #e0c9c9;text-align:right">المقاس</th>
              <th style="padding:10px 8px;border:1px solid #e0c9c9;text-align:right">اللون</th>
              <th style="padding:10px 8px;border:1px solid #e0c9c9;text-align:right">النظام</th>
              <th style="padding:10px 8px;border:1px solid #e0c9c9;text-align:right">العد الفعلي</th>
              <th style="padding:10px 8px;border:1px solid #e0c9c9;text-align:right">الفرق (قطعة)</th>
              <th style="padding:10px 8px;border:1px solid #e0c9c9;text-align:right">الفرق بالتكلفة</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div style="margin-top:24px;border-top:2px solid #7C0A12;padding-top:16px;font-size:14px;font-weight:bold;line-height:2">
          <p style="margin:4px 0">إجمالي الأصناف المجرودة: ${countedCount} / ${items.length}</p>
          <p style="margin:4px 0">إجمالي فروقات المخزون: ${totalVariance > 0 ? '+' : ''}${totalVariance} قطعة</p>
          <p style="margin:4px 0;color:${totalValLoss === 0 ? '#1a0509' : totalValLoss > 0 ? '#15803d' : '#dc2626'}">
            القيمة المالية الإجمالية للفروقات (سعر التكلفة): ${totalValLoss > 0 ? '+' : ''}${Number(totalValLoss).toLocaleString('en-US')} ج.م
          </p>
        </div>

        <div style="margin-top:48px;text-align:center;font-size:11px;color:#b58f96;border-top:1px dashed #ccc;padding-top:16px">
          تم استخراج هذا التقرير وتوثيقه عبر نظام إدارة المخزون ModaPella 🎠
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #audit-print-root, #audit-print-root * { visibility: visible; }
        #audit-print-root { position: absolute; left: 0; top: 0; width: 100%; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
    document.head.removeChild(style);
  };

  const handleAutoFillSystem = () => {
    if (window.confirm('هل تريد ملء كل المنتجات غير المجرودة لتطابق كميات السيستم الحالية؟')) {
      setItems(prev => prev.map(i => i._counted === '' ? { ...i, _counted: String(i.systemStock) } : i));
    }
  };

  const handleResetCounted = () => {
    if (window.confirm('هل أنت متأكد من تصفير وإزالة جميع أرقام الجرد التي أدخلتها؟')) {
      setItems(prev => prev.map(i => ({ ...i, _counted: '' })));
    }
  };

  const filtered = items.filter(i => {
    const ms = !search || 
               i.productName.toLowerCase().includes(search.toLowerCase()) ||
               (i.size && i.size.toLowerCase().includes(search.toLowerCase())) ||
               (i.color && i.color.toLowerCase().includes(search.toLowerCase())) ||
               (i.sku && i.sku.toLowerCase().includes(search.toLowerCase())) ||
               (i.supplier && i.supplier.toLowerCase().includes(search.toLowerCase()));
    
    const mc = filterCat === 'All' || i.productCategory === filterCat;
    
    const counted = i._counted !== '';
    const diff = counted && Number(i._counted) !== i.systemStock;

    if (filterStatus === 'counted') return ms && mc && counted;
    if (filterStatus === 'uncounted') return ms && mc && !counted;
    if (filterStatus === 'diff') return ms && mc && diff;
    return ms && mc;
  });

  const countedCount = items.filter(i => i._counted !== '').length;
  const diffCount = items.filter(i => i._counted !== '' && Number(i._counted) !== i.systemStock).length;
  const totalVariance = items.reduce((s, i) => {
    if (i._counted === '') return s;
    return s + (Number(i._counted) - i.systemStock);
  }, 0);

  const totalVarianceCost = items.reduce((s, i) => {
    if (i._counted === '') return s;
    const diff = Number(i._counted) - i.systemStock;
    return s + (diff * (i.costPrice || 0));
  }, 0);

  return (
    <div className="space-y-5">
      {/* Session Header */}
      <div className="rounded-[2rem] bg-burgundy text-white p-6 shadow-lg shadow-burgundy/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs opacity-70 uppercase tracking-widest">
              {count.status === 'applied' ? '📦 تقرير جرد مؤرشف' : '🛠️ جلسة جرد نشطة'}
            </p>
            <h3 className="text-xl font-bold mt-1">{count.label}</h3>
            <p className="text-xs opacity-60 mt-0.5">{DATE(count.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-70">{countedCount} / {items.length} تم عدّها</p>
            <p className={`text-lg font-extrabold mt-1 ${diffCount > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
              {diffCount > 0 ? `⚠️ ${diffCount} فرق` : '✅ لا فروقات'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          {count.status === 'applied' ? (
            <>
              <button onClick={handlePrintAuditReport} className="flex-1 rounded-xl bg-white/20 hover:bg-white/30 py-2.5 text-sm font-bold transition">
                🖨️ طباعة تقرير الجرد التفصيلي
              </button>
              <button onClick={onFinish} className="flex-1 rounded-xl border border-white/30 hover:bg-white/10 py-2.5 text-sm font-bold transition text-white">
                🔙 العودة للسجل
              </button>
            </>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-white/20 hover:bg-white/30 py-2.5 text-sm font-bold transition disabled:opacity-50">
                {saving ? 'جاري الحفظ...' : '💾 حفظ مسودة الجرد'}
              </button>
              <button onClick={() => setApplyConfirm(true)} className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2.5 text-sm font-bold transition text-white shadow-lg shadow-emerald-500/20">
                ✅ تطبيق الجرد على المخزون
              </button>
              <button onClick={onFinish} className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 transition">
                إلغاء
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="w-full bg-burgundy/10 rounded-full h-2.5">
        <div className="bg-burgundy h-2.5 rounded-full transition-all duration-500" style={{ width: `${(countedCount / items.length) * 100}%` }} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 بحث بالاسم، المقاس، اللون، الباركود..."
            className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2 text-sm text-burgundy outline-none focus:border-burgundy min-w-[200px]" />
          
          {/* Category Filter */}
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2 text-sm text-burgundy outline-none focus:border-burgundy">
            <option value="All">كل الأصناف / الفئات</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{CAT_AR[c]}</option>
            ))}
          </select>

          <div className="flex rounded-2xl border border-burgundy/20 bg-white overflow-hidden">
            {[{ id: 'all', l: 'الكل' }, { id: 'uncounted', l: '⬜ لم تُعدّ' }, { id: 'counted', l: '✅ تم العد' }, { id: 'diff', l: '⚠️ فيها فرق' }].map(f => (
              <button key={f.id} onClick={() => setFilterStatus(f.id)}
                className={`px-3 py-2 text-xs font-semibold transition ${filterStatus === f.id ? 'bg-burgundy text-white' : 'text-burgundy/60 hover:bg-burgundy/8'}`}>{f.l}</button>
            ))}
          </div>
        </div>

        {count.status !== 'applied' && (
          <div className="flex gap-2">
            <button onClick={handleAutoFillSystem} className="rounded-xl bg-amber-500/10 border border-amber-300 px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-500 hover:text-white transition">
              🪄 ملء الباقي كالمطابق للسيستم
            </button>
            <button onClick={handleResetCounted} className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-500 hover:text-white transition">
              🔄 تصفير المدخلات
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-3 text-xs text-burgundy/50 items-center">
        <span>{filtered.length} صنف معروض</span>
        {totalVariance !== 0 && (
          <>
            <span className={`font-bold px-3 py-1 rounded-xl ${totalVariance > 0 ? 'bg-[#2563eb10] text-[#2563eb]' : 'bg-red-50 text-red-600'}`}>
              فرق الكميات: {totalVariance > 0 ? '+' : ''}{totalVariance} قطعة
            </span>
            <span className={`font-bold px-3 py-1 rounded-xl ${totalVarianceCost > 0 ? 'bg-[#2563eb10] text-[#2563eb]' : 'bg-red-50 text-red-600'}`}>
              فرق القيمة المالية بالتكلفة: {totalVarianceCost > 0 ? '+' : ''}{EGP(totalVarianceCost)}
            </span>
          </>
        )}
      </div>

      {/* Items Table */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2fr_0.6fr_0.6fr_0.8fr_0.8fr_1fr_1fr_1fr] gap-3 bg-[#F7F0EC] px-5 py-3 text-xs font-bold uppercase tracking-wide text-burgundy/50 border-b border-burgundy/8">
          <span>المنتج</span><span>المقاس</span><span>اللون</span><span>السعر</span><span>السيستم</span><span>العد الفعلي</span><span>الفرق (قطع)</span><span>فرق التكلفة</span>
        </div>
        <div className="divide-y divide-burgundy/6">
          {filtered.map(item => {
            const counted = item._counted !== '' ? Number(item._counted) : null;
            const variance = counted !== null ? counted - item.systemStock : null;
            const varianceCost = variance !== null ? variance * (item.costPrice || 0) : null;
            const rowClass = variance === null ? '' : variance === 0 ? 'bg-emerald-50/30' : variance > 0 ? 'bg-blue-50/30' : 'bg-red-50/30';
            return (
              <div key={item._id} className={`grid sm:grid-cols-[2fr_0.6fr_0.6fr_0.8fr_0.8fr_1fr_1fr_1fr] items-center gap-3 px-5 py-3 transition hover:bg-burgundy/3 ${rowClass}`}>
                <div>
                  <p className="font-semibold text-sm text-burgundy">{item.productName}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-burgundy/40 mt-0.5 font-semibold">
                    <span className="bg-burgundy/5 text-burgundy px-1.5 py-0.5 rounded font-mono">{item.sku || 'بدون كود'}</span>
                    {item.supplier && <span>· 🏭 {item.supplier}</span>}
                    <span>· {CAT_AR[item.productCategory] || item.productCategory}</span>
                  </div>
                </div>
                <p className="text-sm text-burgundy/60 font-semibold">{item.size || '—'}</p>
                <p className="text-sm text-burgundy/60 font-semibold">{item.color || '—'}</p>
                <p className="text-sm text-burgundy font-bold">{EGP(item.price)}</p>
                <span className="rounded-full bg-burgundy/8 px-3 py-1 text-sm font-bold text-burgundy w-fit">{item.systemStock}</span>
                <input
                  type="number"
                  min="0"
                  value={item._counted}
                  onChange={e => updateCounted(item._id, e.target.value)}
                  placeholder="أدخل..."
                  disabled={count.status === 'applied'}
                  className={`w-24 rounded-xl border border-burgundy/20 px-3 py-1.5 text-center text-sm font-bold text-burgundy outline-none focus:border-burgundy focus:shadow-sm ${count.status === 'applied' ? 'bg-burgundy/5 opacity-80 cursor-not-allowed' : 'bg-white'}`}
                />
                <span className={`text-sm font-bold w-fit px-3 py-1 rounded-full ${
                  variance === null ? 'text-burgundy/30' :
                  variance === 0 ? 'bg-emerald-100 text-emerald-700' :
                  variance > 0 ? 'bg-blue-100 text-blue-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {variance === null ? '—' : variance > 0 ? `+${variance}` : variance}
                </span>
                <span className={`text-sm font-bold ${
                  varianceCost === null ? 'text-burgundy/30' :
                  varianceCost === 0 ? 'text-burgundy/40' :
                  varianceCost > 0 ? 'text-[#2563eb]' :
                  'text-red-700'
                }`}>
                  {varianceCost === null ? '—' : varianceCost === 0 ? '—' : EGP(varianceCost)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmModal
        isOpen={applyConfirm}
        title="تأكيد تطبيق الجرد"
        message="سيتم تحديث مخزون كل المنتجات بالكميات المُدخلة. هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد؟"
        confirmText="نعم، تطبيق الجرد"
        onConfirm={handleApply}
        onCancel={() => setApplyConfirm(false)}
      />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
function AdminInventoryCount() {
  const [tab, setTab] = useState('counts'); // 'counts' | 'tasks'
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [toast, setToast] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadCounts = async () => {
    setLoading(true);
    try { const r = await api.get('/inventory/counts'); setCounts(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCounts(); }, []);

  const handleCreate = async () => {
    try {
      const r = await api.post('/inventory/count/new', { label: label || `جرد ${new Date().toLocaleDateString('ar-EG-u-nu-latn')}` });
      setActiveCount(r.data);
      setCreating(false);
      setLabel('');
      showToast('✅ تم إنشاء جلسة الجرد');
    } catch (e) { alert('فشل الإنشاء'); }
  };

  const handleOpenCount = async (count) => {
    // reload full count (works for drafts and applied sessions)
    const r = await api.get(`/inventory/counts/${count._id}`);
    setActiveCount(r.data);
  };

  const handleDeleteCount = async () => {
    await api.delete(`/inventory/counts/${deleteId}`);
    showToast('✅ تم حذف الجرد'); setDeleteId(null); await loadCounts();
  };

  if (activeCount) {
    return <CountSession count={activeCount} onFinish={() => { setActiveCount(null); loadCounts(); }} />;
  }

  return (
    <div className="space-y-6 text-burgundy">
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">الإدارة</p>
          <h2 className="text-2xl font-bold">📦 الجرد</h2>
          <p className="text-sm text-burgundy/50 mt-0.5">إدارة جرد المخزون وتكاليف الموظفين</p>
        </div>
        {tab === 'counts' && (
          <button onClick={() => setCreating(true)} className="rounded-full bg-burgundy px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-burgundy/20 transition hover:bg-[#650018]">
            + جرد جديد
          </button>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex rounded-2xl border border-burgundy/15 bg-white overflow-hidden w-fit">
        {[{ id: 'counts', label: '📦 جردات المخزون' }, { id: 'tasks', label: '👤 تكاليف الموظفين' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-semibold transition ${
              tab === t.id ? 'bg-burgundy text-white' : 'text-burgundy/60 hover:bg-burgundy/8'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Employee Tasks Tab */}
      {tab === 'tasks' && <InventoryTasksPanel />}

      {/* Create new count */}
      {creating && (
        <div className="rounded-[2rem] border border-burgundy/15 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-burgundy mb-4">إنشاء جلسة جرد جديدة</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={`جرد ${new Date().toLocaleDateString('ar-EG-u-nu-latn')}`}
              className="flex-1 rounded-xl border border-burgundy/20 bg-[#F7F0EC] px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy"
            />
            <button onClick={handleCreate} className="rounded-xl bg-burgundy px-5 py-2.5 text-sm font-bold text-white hover:bg-[#650018] transition">إنشاء</button>
            <button onClick={() => setCreating(false)} className="rounded-xl border border-burgundy/20 px-4 py-2.5 text-sm text-burgundy hover:bg-burgundy/8 transition">إلغاء</button>
          </div>
          <p className="text-xs text-burgundy/40 mt-2">سيتم جلب جميع المنتجات مع مخزونها الحالي تلقائياً</p>
        </div>
      )}

      {/* Previous counts */}
      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
      ) : counts.length === 0 ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white py-20 text-center">
          <p className="text-5xl mb-3">📦</p>
          <p className="text-lg font-semibold text-burgundy/40">لم يتم إجراء أي جرد بعد</p>
          <p className="text-sm text-burgundy/30 mt-1">أنشئ جلسة جرد جديدة للبدء</p>
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-burgundy/60 mb-3">سجل الجردات السابقة</h3>
          <div className="space-y-3">
            {counts.map(count => {
              const totalItems = count.items?.length || 0;
              const countedItems = count.items?.filter(i => i.countedStock !== null).length || 0;
              const diffItems = count.items?.filter(i => i.countedStock !== null && i.countedStock !== i.systemStock).length || 0;
              return (
                <div key={count._id} className="rounded-[1.5rem] border border-burgundy/10 bg-white px-5 py-4 shadow-sm flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-burgundy">{count.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${count.status === 'applied' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {count.status === 'applied' ? '✅ مطبّق' : '📝 مسودة'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-burgundy/50">
                      <span>{DATE(count.createdAt)}</span>
                      <span>{countedItems}/{totalItems} عُدّت</span>
                      {diffItems > 0 && <span className="text-amber-600">⚠️ {diffItems} فرق</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenCount(count)} className={`rounded-xl px-4 py-2 text-xs font-bold transition ${count.status === 'applied' ? 'border border-burgundy/20 text-burgundy hover:bg-burgundy/5' : 'bg-burgundy text-white hover:bg-[#650018]'}`}>
                      {count.status === 'applied' ? '🔍 عرض التقرير' : 'فتح الجرد'}
                    </button>
                    {count.status !== 'applied' && (
                      <button onClick={() => setDeleteId(count._id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500 hover:text-white transition">حذف</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmModal isOpen={!!deleteId} title="حذف الجرد" message="هل أنت متأكد من حذف جلسة الجرد؟" onConfirm={handleDeleteCount} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

export default AdminInventoryCount;
