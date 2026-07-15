import { useEffect, useState } from 'react';
import api from '../../services/api';

const ROLE_AR = { admin: 'مدير', cashier: 'كاشير', manager: 'مشرف', employee: 'موظف جرد' };
const ROLE_COLOR = { admin: 'bg-burgundy/10 text-burgundy', cashier: 'bg-blue-100 text-blue-700', manager: 'bg-purple-100 text-purple-700', employee: 'bg-emerald-100 text-emerald-700' };

const emptyUser = { name: '', email: '', password: '', role: 'cashier', phone: '' };

// ── Change Password Mini-Modal ────────────────────────────────────────────────
function ChangePasswordModal({ user, onClose, onSuccess }) {
  const [newPass, setNewPass] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPass.length < 6) return setErr('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    setLoading(true); setErr('');
    try {
      await api.patch(`/admin/users/${user._id}/password`, { password: newPass });
      onSuccess(`✅ تم تغيير كلمة مرور ${user.name} بنجاح`);
      onClose();
    } catch (err) {
      setErr(err.response?.data?.message || 'حدث خطأ');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-[2rem] bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-burgundy px-6 py-4 text-white flex items-center gap-3">
          <span className="text-xl">🔐</span>
          <div>
            <p className="text-xs opacity-70 uppercase tracking-widest">تغيير كلمة المرور</p>
            <p className="font-bold">{user.name}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email display (read-only, helpful for admin) */}
          <div className="rounded-xl bg-burgundy/5 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-burgundy/40 uppercase tracking-widest">البريد الإلكتروني</p>
              <p className="text-sm font-semibold text-burgundy font-mono">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(user.email); }}
              className="text-[10px] rounded-lg border border-burgundy/20 px-2 py-1 text-burgundy/60 hover:bg-burgundy hover:text-white transition"
            >
              نسخ
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">كلمة المرور الجديدة *</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة..."
                minLength={6}
                required
                autoFocus
                dir="ltr"
                className="w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy pr-12"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-burgundy/40 hover:text-burgundy text-xs"
              >
                {show ? '🙈' : '👁️'}
              </button>
            </div>
            {newPass && newPass.length < 6 && (
              <p className="text-[10px] text-red-500 mt-1">يجب أن تكون 6 أحرف على الأقل</p>
            )}
          </div>

          {err && <p className="rounded-xl bg-red-50 px-4 py-2 text-xs text-red-600">{err}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || newPass.length < 6}
              className="flex-1 rounded-full bg-burgundy py-2.5 text-sm font-bold text-white hover:bg-[#650018] transition disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : '🔐 حفظ كلمة المرور'}
            </button>
            <button type="button" onClick={onClose} className="rounded-full border border-burgundy/20 px-5 py-2.5 text-sm text-burgundy hover:bg-burgundy/8 transition">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyUser);
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');
  const [changePwUser, setChangePwUser] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  const loadUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
    } finally { setFormLoading(false); }
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

  const copyEmail = (id, email) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const inputCls = 'w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none transition focus:border-burgundy';

  return (
    <div className="space-y-6 text-burgundy">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg ${toastType === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
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
                  <option value="employee">موظف جرد</option>
                  <option value="admin">مدير</option>
                </select>
              </div>
              {form.role === 'employee' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">رقم الواتساب (للإشعارات)</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className={inputCls}
                    placeholder="مثال: 01012345678"
                    dir="ltr"
                  />
                  <p className="mt-1 text-[10px] text-burgundy/40">يُستخدم لإرسال رسائل الجرد عبر واتساب</p>
                </div>
              )}
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
        <div className="space-y-3">
          {users.length === 0 ? (
            <div className="rounded-[2rem] border border-burgundy/10 bg-white py-16 text-center">
              <p className="text-4xl mb-3">👤</p>
              <p className="text-sm text-burgundy/50">لا يوجد مستخدمون بعد</p>
            </div>
          ) : users.map((u) => (
            <div key={u._id} className={`rounded-[1.5rem] border bg-white px-5 py-4 shadow-sm transition ${u.active === false ? 'opacity-60 border-burgundy/8' : 'border-burgundy/10 hover:border-burgundy/20'}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">

                {/* Left: name + email */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 ${ROLE_COLOR[u.role] || 'bg-gray-100 text-gray-600'}`}>
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-burgundy">{u.name}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${ROLE_COLOR[u.role] || 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_AR[u.role] || u.role}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${u.active === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                        {u.active === false ? '⛔ معطّل' : '✅ نشط'}
                      </span>
                    </div>

                    {/* Email row */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-burgundy/40 uppercase tracking-widest">📧</span>
                      <span className="text-xs font-mono font-semibold text-burgundy/70 bg-burgundy/5 px-2 py-0.5 rounded-lg">{u.email}</span>
                      <button
                        onClick={() => copyEmail(u._id, u.email)}
                        className="text-[10px] rounded-lg border border-burgundy/15 px-2 py-0.5 text-burgundy/50 hover:bg-burgundy hover:text-white transition"
                      >
                        {copiedId === u._id ? '✓ تم النسخ' : 'نسخ'}
                      </button>
                      {u.phone && (
                        <span className="text-[10px] text-burgundy/40">📱 {u.phone}</span>
                      )}
                    </div>

                    <p className="text-[10px] text-burgundy/30 mt-1">
                      أُضيف {new Date(u.createdAt).toLocaleDateString('ar-EG-u-nu-latn')}
                    </p>
                  </div>
                </div>

                {/* Right: action buttons */}
                {u.role !== 'admin' ? (
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Change password */}
                    <button
                      type="button"
                      onClick={() => setChangePwUser(u)}
                      className="rounded-xl border border-burgundy/20 bg-burgundy/5 px-3 py-1.5 text-xs font-bold text-burgundy hover:bg-burgundy hover:text-white transition"
                    >
                      🔐 تغيير الباسورد
                    </button>
                    {/* Toggle */}
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
                    {/* Delete */}
                    <button type="button" onClick={() => handleDelete(u._id)}
                      className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500 hover:text-white">
                      حذف
                    </button>
                  </div>
                ) : (
                  <span className="rounded-xl bg-burgundy/5 px-3 py-1.5 text-xs text-burgundy/40 shrink-0">مدير رئيسي</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Change Password Modal */}
      {changePwUser && (
        <ChangePasswordModal
          user={changePwUser}
          onClose={() => setChangePwUser(null)}
          onSuccess={(msg) => { showToast(msg); setChangePwUser(null); }}
        />
      )}
    </div>
  );
}

export default AdminUsers;
