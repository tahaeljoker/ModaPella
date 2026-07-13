import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';

const sections = [
  {
    title: 'الرئيسية والتحليلات',
    items: [
      { to: '/admin', label: 'لوحة التحكم', icon: '📊', end: true },
      { to: '/admin/activities', label: 'سجل حركات النظام', icon: '📜' },
    ]
  },
  {
    title: 'إدارة المبيعات',
    items: [
      { to: '/admin/orders', label: 'الطلبات والفواتير', icon: '📋' },
      { to: '/admin/debts', label: 'ديون العملاء', icon: '💳' },
      { to: '/admin/employees', label: 'الموظفون والعمولات', icon: '👤' },
      { to: '/admin/customers', label: 'العملاء والولاء', icon: '👥' },
    ]
  },
  {
    title: 'المخزون والمشتريات',
    items: [
      { to: '/admin/products', label: 'المنتجات والمخزن', icon: '🛒' },
      { to: '/admin/inventory-count', label: 'جرد المخزون', icon: '📦' },
      { to: '/admin/suppliers', label: 'حسابات الموردين', icon: '🏭' },
      { to: '/admin/barcodes', label: 'ملصقات الباركود', icon: '🏷️' },
    ]
  },
  {
    title: 'النظام والموقع',
    items: [
      { to: '/admin/site', label: 'إعدادات الموقع', icon: '🎨' },
      { to: '/admin/users', label: 'مستخدمو النظام', icon: '🛡️' },
    ]
  }
];

function AdminLayout({ children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('modapella_user') || '{}');
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [firstTimeMsgOpen, setFirstTimeMsgOpen] = useState(false);

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
      const { data } = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('modapella_token');
      await axios.patch(`/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleDevPush = async () => {
    const title = window.prompt("AI Dev Push - Enter Title:");
    if (!title) return;
    const message = window.prompt("Enter Message:");
    if (!message) return;
    try {
      await axios.post('/api/notifications/dev-push', { title, message, type: 'feature' });
      fetchNotifications();
    } catch (error) {
      alert("Push failed: " + error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('modapella_token');
    localStorage.removeItem('modapella_role');
    localStorage.removeItem('modapella_user');
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-burgundy text-white shadow-md shadow-burgundy/25'
                        : 'text-burgundy/70 hover:bg-burgundy/8 hover:text-burgundy'
                    }`
                  }
                >
                  <span className="text-base">{item.icon}</span>
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
                onClick={() => setShowNotifs(!showNotifs)} 
                className="text-xl text-burgundy/60 hover:text-burgundy transition relative focus:outline-none"
                title="إشعارات النظام"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow">
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
                          onClick={() => !notif.isRead && markAsRead(notif._id)}
                          className={`p-2.5 rounded-xl text-xs transition cursor-pointer ${notif.isRead ? 'bg-gray-50 opacity-70' : 'bg-burgundy/5 border border-burgundy/10'}`}
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
          {/* Hidden AI Button */}
          <button onClick={handleDevPush} className="sr-only" aria-hidden="true">AI Push</button>
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
