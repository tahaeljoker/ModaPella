import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const navItems = [
  { to: '/cashier', label: 'البيع', icon: '⚡', end: true },
  { to: '/cashier/returns', label: 'المرتجعات', icon: '🔄' },
  { to: '/cashier/today', label: 'سجل اليوم', icon: '📋' },
  { to: '/cashier/safe', label: 'الخزنة', icon: '💰' },
];

// ─── Admin Password Modal ─────────────────────────────────────────────────────
function AdminPasswordModal({ onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const user = JSON.parse(localStorage.getItem('modapella_user') || '{}');
      // Verify by re-logging in with the same email
      await api.post('/auth/login', { email: user.email, password });
      onSuccess();
    } catch (err) {
      setError('كلمة المرور غير صحيحة. حاول مرة أخرى.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-burgundy/10">
          <span className="text-3xl">🔐</span>
        </div>
        <h3 className="text-center text-xl font-bold text-burgundy">تأكيد الدخول</h3>
        <p className="mt-2 text-center text-sm text-burgundy/60">
          ادخل كلمة مرور المدير للوصول إلى لوحة الإدارة
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور..."
              className="w-full rounded-xl border border-burgundy/20 bg-[#F7F0EC] px-4 py-3 text-center text-burgundy outline-none transition focus:border-burgundy"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              <span>❌</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-burgundy/20 py-2.5 text-sm font-medium text-burgundy/70 transition hover:bg-burgundy/5"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 rounded-full bg-burgundy py-2.5 text-sm font-bold text-white transition hover:bg-[#650018] disabled:opacity-50"
            >
              {loading ? '...' : 'دخول'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
function CashierLayout({ children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('modapella_user') || '{}');
  const role = localStorage.getItem('modapella_role');
  const [showAdminModal, setShowAdminModal] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('modapella_token');
    localStorage.removeItem('modapella_role');
    localStorage.removeItem('modapella_user');
    navigate('/login');
  };

  const handleAdminAccess = () => {
    setShowAdminModal(true);
  };

  const handleAdminConfirmed = () => {
    setShowAdminModal(false);
    navigate('/admin');
  };

  return (
    <div className="flex min-h-screen bg-[#F7F0EC]" dir="rtl">
      {/* Sidebar */}
      <aside className="fixed right-0 top-0 z-40 flex h-full w-60 flex-col border-l border-burgundy/10 bg-white shadow-lg">
        {/* Logo */}
        <div className="border-b border-burgundy/10 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-burgundy/50">نظام الكاشير</p>
          <h1 className="mt-1 text-xl font-bold text-burgundy">ModaPella</h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-burgundy text-white shadow-md shadow-burgundy/25'
                    : 'text-burgundy/70 hover:bg-burgundy/8 hover:text-burgundy'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {/* Admin link — only for admin role, requires password */}
          {role === 'admin' && (
            <>
              <div className="mx-2 my-3 border-t border-burgundy/10" />
              <button
                type="button"
                onClick={handleAdminAccess}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-burgundy/50 transition hover:bg-burgundy/8 hover:text-burgundy"
              >
                <span className="text-lg">🖥️</span>
                لوحة الإدارة
                <span className="mr-auto rounded-full bg-burgundy/10 px-1.5 py-0.5 text-[9px] font-bold text-burgundy/60">🔒</span>
              </button>
            </>
          )}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-burgundy/10 p-4">
          <div className="mb-3 rounded-2xl bg-burgundy/5 px-3 py-2">
            <p className="text-xs text-burgundy/50">تسجيل الدخول كـ</p>
            <p className="mt-0.5 text-sm font-semibold text-burgundy">{user.name || 'كاشير'}</p>
            <p className="text-xs text-burgundy/60">{user.email || ''}</p>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              role === 'admin' ? 'bg-burgundy/15 text-burgundy' :
              role === 'manager' ? 'bg-purple-100 text-purple-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {role === 'admin' ? '👑 مدير' : role === 'manager' ? '🔑 مشرف' : '🧾 كاشير'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl border border-burgundy/20 px-4 py-2 text-sm font-medium text-burgundy/70 transition hover:bg-burgundy hover:text-white"
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="mr-60 flex-1 flex flex-col overflow-hidden p-6">
        {children}
      </main>

      {/* Admin Password Modal */}
      {showAdminModal && (
        <AdminPasswordModal
          onClose={() => setShowAdminModal(false)}
          onSuccess={handleAdminConfirmed}
        />
      )}
    </div>
  );
}

export default CashierLayout;
