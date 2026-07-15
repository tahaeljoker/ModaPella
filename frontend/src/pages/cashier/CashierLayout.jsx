import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const navItems = [
  { to: '/cashier', label: 'البيع', icon: '⚡', end: true },
  { to: '/cashier/returns', label: 'المرتجعات', icon: '🔄' },
  { to: '/cashier/today', label: 'سجل اليوم', icon: '📋' },
  { to: '/cashier/safe', label: 'الخزنة', icon: '💰' },
  { to: '/cashier/activities', label: 'حركات اليوم', icon: '📜' },
];

// ─── Main Layout ──────────────────────────────────────────────────────────────
function CashierLayout({ children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('modapella_user') || '{}');
  const role = localStorage.getItem('modapella_role');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('modapella_token');
    localStorage.removeItem('modapella_role');
    localStorage.removeItem('modapella_user');
    navigate('/login');
  };

  const handleAdminAccess = () => {
    navigate('/admin');
  };

  return (
    <div className="flex min-h-screen bg-[#F7F0EC]" dir="rtl">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed right-0 top-0 z-40 flex h-full w-60 flex-col border-l border-burgundy/10 bg-white shadow-lg transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Logo & Close Button */}
        <div className="flex items-center justify-between border-b border-burgundy/10 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-burgundy/50">نظام الكاشير</p>
            <h1 className="mt-1 text-xl font-bold text-burgundy">ModaPella</h1>
          </div>
          <button 
            className="lg:hidden text-burgundy/50 hover:text-burgundy"
            onClick={() => setIsSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setIsSidebarOpen(false)}
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
      <main className="flex-1 lg:mr-60 flex flex-col overflow-hidden p-4 sm:p-6 w-full">
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm mb-6 border border-burgundy/10">
          <h2 className="text-lg font-bold text-burgundy">ModaPella Cashier</h2>
          <button 
            className="text-burgundy focus:outline-none"
            onClick={() => setIsSidebarOpen(true)}
          >
            <div className="w-6 h-0.5 bg-burgundy mb-1.5"></div>
            <div className="w-6 h-0.5 bg-burgundy mb-1.5"></div>
            <div className="w-6 h-0.5 bg-burgundy"></div>
          </button>
        </div>

        {children}
      </main>
    </div>
  );
}

export default CashierLayout;
