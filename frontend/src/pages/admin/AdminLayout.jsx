import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Icon } from '../../components/Icon';

const sections = [
  {
    title: 'الرئيسية والتحليلات',
    items: [
      { to: '/admin', label: 'لوحة التحكم', icon: 'dashboard', end: true },
      { to: '/admin/activities', label: 'سجل حركات النظام', icon: 'activities' },
    ]
  },
  {
    title: 'إدارة المبيعات',
    items: [
      { to: '/admin/orders', label: 'الطلبات والفواتير', icon: 'orders' },
      { to: '/admin/debts', label: 'ديون العملاء', icon: 'debts' },
      { to: '/admin/employees', label: 'الموظفون والعمولات', icon: 'employee' },
      { to: '/admin/customers', label: 'العملاء والولاء', icon: 'customers' },
    ]
  },
  {
    title: 'المخزون والمشتريات',
    items: [
      { to: '/admin/products', label: 'المنتجات والمخزن', icon: 'products' },
      { to: '/admin/inventory-count', label: 'جرد المخزون', icon: 'inventory' },
      { to: '/admin/suppliers', label: 'حسابات الموردين', icon: 'suppliers' },
      { to: '/admin/barcodes', label: 'ملصقات الباركود', icon: 'barcodes' },
    ]
  },
  {
    title: 'النظام والموقع',
    items: [
      { to: '/admin/site', label: 'إعدادات الموقع', icon: 'site' },
      { to: '/admin/users', label: 'مستخدمو النظام', icon: 'users' },
    ]
  }
];

function AdminLayout({ children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('modapella_user') || '{}');
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [firstTimeMsgOpen, setFirstTimeMsgOpen] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const hasSeenIntro = localStorage.getItem('modapella_notif_intro');
    if (!hasSeenIntro) {
      setFirstTimeMsgOpen(true);
      localStorage.setItem('modapella_notif_intro', '1');
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('modapella_token');
      if (!token) return;
      const { data } = await api.get('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleNotificationClick = (notif) => {
    setSelectedNotification(notif);
    setShowNotifs(false);
    if (!notif.isRead) {
      markAsRead(notif._id);
    }
  };


  const handleBellClick = () => {
    const unreadNotifs = notifications.filter(n => !n.isRead);
    if (unreadNotifs.length > 0 && !showNotifs) {
      // If there are unread notifications, open the first one immediately as a modal!
      handleNotificationClick(unreadNotifs[0]);
    } else {
      setShowNotifs(!showNotifs);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('modapella_token');
    localStorage.removeItem('modapella_role');
    localStorage.removeItem('modapella_user');
    navigate('/login');
  };

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;

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
      <aside className={`fixed top-0 z-40 flex h-full w-64 flex-col border-l border-burgundy/10 bg-white shadow-lg transition-[right] duration-300 lg:right-0 ${isSidebarOpen ? 'right-0' : '-right-64'}`}>
        {/* Logo & Close Button */}
        <div className="flex items-center justify-between border-b border-burgundy/10 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-burgundy/50">لوحة إدارة</p>
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
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-1.5">
              <p className="px-4 text-[10px] font-extrabold uppercase tracking-[0.15em] text-burgundy/40">
                {section.title}
              </p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-burgundy text-white shadow-md shadow-burgundy/25'
                        : 'text-burgundy/70 hover:bg-burgundy/8 hover:text-burgundy'
                    }`
                  }
                >
                  <Icon name={item.icon} className="w-5 h-5 opacity-80" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User info + Notifications + logout */}
        <div className="border-t border-burgundy/10 p-4">
          <div className="mb-3 relative rounded-2xl bg-burgundy/5 px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-burgundy/50">تسجيل الدخول كـ</p>
              <p className="mt-0.5 text-sm font-semibold text-burgundy">{user.name || 'مدير'}</p>
              <p className="text-xs text-burgundy/60">{user.email || ''}</p>
            </div>
            
            <div className="relative">
              <button 
                onClick={handleBellClick} 
                className="text-xl text-burgundy/60 hover:text-burgundy transition relative focus:outline-none flex items-center justify-center p-1 rounded-full hover:bg-burgundy/5"
                title="إشعارات النظام"
              >
                <Icon name="bell" className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifs && (
                <div className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl bg-white p-3 shadow-xl border border-burgundy/10 z-50 overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-burgundy">تحديثات النظام</h3>
                    <button onClick={() => setShowNotifs(false)} className="text-xs text-burgundy/50 hover:text-burgundy">إغلاق</button>
                  </div>
                  
                  {firstTimeMsgOpen && (
                    <div className="mb-3 p-2 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-blue-800 leading-relaxed">
                      👋 <strong>مرحباً بك!</strong> هذه المساحة مخصصة للإشعارات التي يرسلها لك المهندس/المطور كـ AI لإطلاعك على الميزات والتحديثات الجديدة فور إضافتها.
                    </div>
                  )}

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-center text-burgundy/40 py-4">لا توجد إشعارات جديدة</p>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif._id} 
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-2.5 rounded-xl text-xs transition cursor-pointer hover:bg-burgundy/10 ${notif.isRead ? 'bg-gray-50 opacity-70' : 'bg-burgundy/5 border border-burgundy/10'}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-burgundy">{notif.title}</span>
                            {!notif.isRead && <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1"></span>}
                          </div>
                          <p className="text-burgundy/70 text-[11px] leading-relaxed">{notif.message}</p>
                          <p className="text-[9px] text-burgundy/40 mt-1.5">{new Date(notif.createdAt).toLocaleDateString('ar-EG')}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => navigate('/cashier')}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F7F0EC] px-4 py-2V5 text-sm font-bold text-burgundy transition hover:bg-burgundy/10"
          >
            <Icon name="sale" className="w-4 h-4" /> الذهاب للكاشير
          </button>
          <button
            type="button"
            onClick={() => setShowChangePw(true)}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-burgundy/20 px-4 py-2.5 text-sm font-bold text-burgundy/70 transition hover:bg-burgundy hover:text-white"
          >
            🔐 تغيير كلمة المرور
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

      {/* Main content — offset by sidebar width on large screens */}
      <main className="flex-1 lg:mr-64 p-4 sm:p-8 w-full min-w-0">
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm mb-6 border border-burgundy/10">
          <h2 className="text-lg font-bold text-burgundy">ModaPella Admin</h2>
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

      {/* Notification Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[2rem] bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-burgundy p-5 text-white flex items-center gap-3">
              <Icon name="star" className="w-5 h-5 text-amber-300" />
              <h3 className="font-bold text-lg">{selectedNotification.title}</h3>
            </div>
            <div className="p-6 text-burgundy space-y-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedNotification.message}</p>
              <div className="pt-4 flex justify-between items-center border-t border-burgundy/10">
                <span className="text-[10px] text-burgundy/40 font-mono">
                  {new Date(selectedNotification.createdAt).toLocaleString('ar-EG-u-nu-latn')}
                </span>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="rounded-xl bg-burgundy/10 px-5 py-2 text-xs font-bold text-burgundy transition hover:bg-burgundy hover:text-white"
                >
                  حسنًا، فهمت
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePw && (
        <LocalChangePasswordModal onClose={() => setShowChangePw(false)} />
      )}
    </div>
  );
}

// ─── Local Change Password Modal ─────────────────────────────────────────────
function LocalChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.newPassword.length < 6) {
      return setError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
    }
    if (form.newPassword !== form.confirmPassword) {
      return setError('كلمتا المرور الجديدتان غير متطابقتين');
    }
    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword
      });
      setSuccess('✅ تم تغيير كلمة المرور بنجاح');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none transition focus:border-burgundy';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-[2rem] bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-burgundy px-6 py-4 text-white flex items-center gap-3">
          <span className="text-xl">🔐</span>
          <div>
            <p className="font-bold">تغيير كلمة المرور</p>
            <p className="text-xs opacity-75">حساب المدير</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-burgundy/60">كلمة المرور الحالية *</label>
            <input
              type="password"
              required
              value={form.oldPassword}
              onChange={e => setForm(p => ({ ...p, oldPassword: e.target.value }))}
              className={inp}
              placeholder="••••••"
              dir="ltr"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-burgundy/60">كلمة المرور الجديدة *</label>
            <input
              type="password"
              required
              value={form.newPassword}
              onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
              className={inp}
              placeholder="•••••• (6 أحرف كحد أدنى)"
              dir="ltr"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-burgundy/60">تأكيد كلمة المرور الجديدة *</label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
              className={inp}
              placeholder="••••••"
              dir="ltr"
            />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          {success && <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg">{success}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-full bg-burgundy py-2.5 text-sm font-bold text-white hover:bg-[#650018] transition disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : '🔐 حفظ التغيير'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-burgundy/20 px-5 py-2.5 text-sm text-burgundy hover:bg-burgundy/10 transition"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminLayout;
