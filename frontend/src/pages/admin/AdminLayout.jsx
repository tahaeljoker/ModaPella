import { NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  { to: '/admin', label: 'لوحة التحكم', icon: '📊', end: true },
  { to: '/admin/products', label: 'المنتجات والمخزون', icon: '🛒' },
  { to: '/admin/orders', label: 'الطلبات', icon: '📋' },
  { to: '/admin/customers', label: 'العملاء', icon: '👥' },
  { to: '/admin/employees', label: 'الموظفون', icon: '👤' },
  { to: '/admin/suppliers', label: 'الموردون', icon: '🏾' },
  { to: '/admin/inventory-count', label: 'الجرد', icon: '📦' },
  { to: '/admin/barcodes', label: 'ملصقات الباركود', icon: '🏷️' },
  { to: '/admin/site', label: 'إعدادات الموقع', icon: '🎨' },
  { to: '/admin/users', label: 'المستخدمون', icon: '🛡️' },
];

function AdminLayout({ children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('modapella_user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('modapella_token');
    localStorage.removeItem('modapella_role');
    localStorage.removeItem('modapella_user');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#F7F0EC]" dir="rtl">
      {/* Sidebar */}
      <aside className="fixed right-0 top-0 z-40 flex h-full w-64 flex-col border-l border-burgundy/10 bg-white shadow-lg">
        {/* Logo */}
        <div className="border-b border-burgundy/10 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-burgundy/50">لوحة إدارة</p>
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
        </nav>

        {/* User info + logout */}
        <div className="border-t border-burgundy/10 p-4">
          <div className="mb-3 rounded-2xl bg-burgundy/5 px-3 py-2">
            <p className="text-xs text-burgundy/50">تسجيل الدخول كـ</p>
            <p className="mt-0.5 text-sm font-semibold text-burgundy">{user.name || 'مدير'}</p>
            <p className="text-xs text-burgundy/60">{user.email || ''}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/cashier')}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F7F0EC] px-4 py-2 text-sm font-bold text-burgundy transition hover:bg-burgundy/10"
          >
            <span>⚡</span> الذهاب للكاشير
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl border border-burgundy/20 px-4 py-2 text-sm font-medium text-burgundy/70 transition hover:bg-burgundy hover:text-white"
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main content — offset by sidebar width */}
      <main className="mr-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
