import { useEffect, useState } from 'react';
import api from '../../services/api';

const ROLE_AR = { admin: 'مدير', cashier: 'كاشير', manager: 'مشرف' };
const ROLE_COLOR = { admin: 'bg-burgundy/10 text-burgundy', cashier: 'bg-blue-100 text-blue-700', manager: 'bg-purple-100 text-purple-700' };

const emptyUser = { name: '', email: '', password: '', role: 'cashier' };

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyUser);
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3000);
  };

  const loadUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post('/admin/users', form);
      setForm(emptyUser);
      setShowForm(false);
      showToast('تم إضافة المستخدم بنجاح ✓');
      await loadUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'حدث خطأ', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async (id, currentlyActive) => {
    try {
      await api.patch(`/admin/users/${id}/toggle`);
      showToast(currentlyActive ? 'تم تعطيل الحساب ✓' : 'تم تفعيل الحساب ✓');
      await loadUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ هل تريد حذف هذا الحساب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      showToast('تم حذف الحساب نهائياً ✓');
      await loadUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const inputCls = 'w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none transition focus:border-burgundy';

  return (
    <div className="space-y-6 text-burgundy">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition ${toastType === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/50">إدارة</p>
          <h2 className="text-3xl font-bold">المستخدمون</h2>
          <p className="mt-1 text-sm text-burgundy/50">{users.length} حساب مسجّل</p>
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-burgundy px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#650018]">
          {showForm ? '× إغلاق' : '+ إضافة حساب'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold">إضافة حساب جديد</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">الاسم *</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="مثال: أحمد محمد" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">البريد الإلكتروني *</label>
                <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="مثال: ahmed@modapella.com" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">كلمة المرور *</label>
                <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} className={inputCls} required minLength={6} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">الدور *</label>
                <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} className={inputCls}>
                  <option value="cashier">كاشير</option>
                  <option value="manager">مشرف</option>
                  <option value="admin">مدير</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={formLoading}
              className="rounded-full bg-burgundy px-8 py-2.5 text-sm font-bold text-white transition hover:bg-[#650018] disabled:opacity-60">
              {formLoading ? 'جاري الإضافة...' : 'إضافة الحساب'}
            </button>
          </form>
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
        </div>
      ) : (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
          {users.length === 0 ? (
            <p className="py-12 text-center text-sm text-burgundy/50">لا يوجد مستخدمون بعد</p>
          ) : (
            <div className="divide-y divide-burgundy/8">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 bg-burgundy/5 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-burgundy/60">
                <span>المستخدم</span>
                <span className="text-center">الدور</span>
                <span className="text-center">الحالة</span>
                <span className="text-center">تاريخ الإضافة</span>
                <span className="text-center">الإجراءات</span>
              </div>
              {users.map((u) => (
                <div key={u._id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-6 py-4 transition ${u.active === false ? 'bg-slate-50 opacity-60' : 'hover:bg-burgundy/3'}`}>
                  <div>
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-burgundy/50">{u.email}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLE_COLOR[u.role] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_AR[u.role] || u.role}
                  </span>
                  {/* Active status badge */}
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${u.active === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                    {u.active === false ? '⛔ معطّل' : '✅ نشط'}
                  </span>
                  <p className="text-xs text-burgundy/50 whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString('ar-EG')}
                  </p>
                  {u.role !== 'admin' ? (
                    <div className="flex items-center gap-2">
                      {/* Toggle button */}
                      <button
                        type="button"
                        onClick={() => handleToggle(u._id, u.active !== false)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                          u.active === false
                            ? 'border border-emerald-300 text-emerald-600 hover:bg-emerald-500 hover:text-white'
                            : 'border border-amber-300 text-amber-600 hover:bg-amber-500 hover:text-white'
                        }`}
                      >
                        {u.active === false ? 'تفعيل' : 'تعطيل'}
                      </button>
                      {/* Delete button */}
                      <button type="button" onClick={() => handleDelete(u._id)}
                        className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500 hover:text-white">
                        حذف
                      </button>
                    </div>
                  ) : (
                    <span className="rounded-xl bg-burgundy/5 px-3 py-1.5 text-xs text-burgundy/40">مدير رئيسي</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
