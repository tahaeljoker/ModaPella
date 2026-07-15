import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const navItems = [
  { to: '/employee', label: 'استعلام الأسعار', icon: '🔎', end: true },
  { to: '/employee/tasks', label: 'مهام الجرد', icon: '📋' },
];

function EmployeeLayout({ children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('modapella_user') || '{}');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
      setUnreadCount(Array.isArray(data) ? data.filter(n => !n.isRead).length : 0);
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  };

  const handleNotifClick = (notif) => {
    setSelectedNotif(notif);
    setShowNotifs(false);
    if (!notif.isRead) markAsRead(notif._id);
  };

  const handleLogout = () => {
    localStorage.removeItem('modapella_token');
    localStorage.removeItem('modapella_role');
    localStorage.removeItem('modapella_user');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#F7F0EC]" dir="rtl">
      {/* Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 z-40 flex h-full w-60 flex-col border-l border-burgundy/10 bg-white shadow-lg transition-[right] duration-300 lg:right-0 ${isSidebarOpen ? 'right-0' : '-right-60'}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-burgundy/10 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-burgundy/50">حساب الموظف</p>
            <h1 className="mt-1 text-xl font-bold text-burgundy">ModaPella</h1>
          </div>
          <button className="lg:hidden text-burgundy/50 hover:text-burgundy" onClick={() => setIsSidebarOpen(false)}>✕</button>
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
                `relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-burgundy text-white shadow-md shadow-burgundy/25'
                    : 'text-burgundy/70 hover:bg-burgundy/8 hover:text-burgundy'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
              {/* Unread badge on tasks */}
              {item.to === '/employee/tasks' && unreadCount > 0 && (
                <span className="absolute left-3 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info & Notifications & Logout */}
        <div className="border-t border-burgundy/10 p-4 space-y-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="flex w-full items-center justify-between rounded-2xl bg-burgundy/5 px-3 py-2 text-sm transition hover:bg-burgundy/10"
            >
              <div className="text-right">
                <p className="text-xs text-burgundy/50">الموظف</p>
                <p className="font-semibold text-burgundy">{user.name || 'موظف'}</p>
              </div>
              <div className="relative">
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
            </button>

            {showNotifs && (
              <div className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl bg-white p-3 shadow-xl border border-burgundy/10 z-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-burgundy">إشعاراتي</h3>
                  <button onClick={() => setShowNotifs(false)} className="text-xs text-burgundy/50 hover:text-burgundy">إغلاق</button>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-center text-burgundy/40 py-4">لا توجد إشعارات</p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n._id}
                        onClick={() => handleNotifClick(n)}
                        className={`cursor-pointer rounded-xl p-2.5 text-xs transition hover:bg-burgundy/10 ${n.isRead ? 'bg-gray-50 opacity-70' : 'bg-burgundy/5 border border-burgundy/10'}`}
                      >
                        <div className="flex justify-between items-start mb-0.5">
                          <span className="font-bold text-burgundy">{n.title}</span>
                          {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1" />}
                        </div>
                        <p className="text-burgundy/70 text-[11px] leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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
      <main className="flex-1 lg:mr-60 flex flex-col p-4 sm:p-6 w-full min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm mb-6 border border-burgundy/10">
          <h2 className="text-lg font-bold text-burgundy">ModaPella — موظف</h2>
          <button className="text-burgundy focus:outline-none" onClick={() => setIsSidebarOpen(true)}>
            <div className="w-6 h-0.5 bg-burgundy mb-1.5" />
            <div className="w-6 h-0.5 bg-burgundy mb-1.5" />
            <div className="w-6 h-0.5 bg-burgundy" />
          </button>
        </div>

        {children}
      </main>

      {/* Notification Detail Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[2rem] bg-white shadow-2xl overflow-hidden">
            <div className="bg-burgundy p-5 text-white flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <h3 className="font-bold text-lg">{selectedNotif.title}</h3>
            </div>
            <div className="p-6 text-burgundy space-y-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedNotif.message}</p>
              <div className="pt-4 flex justify-between items-center border-t border-burgundy/10">
                <span className="text-[10px] text-burgundy/40 font-mono">
                  {new Date(selectedNotif.createdAt).toLocaleString('ar-EG-u-nu-latn')}
                </span>
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="rounded-xl bg-burgundy/10 px-5 py-2 text-xs font-bold text-burgundy transition hover:bg-burgundy hover:text-white"
                >
                  حسنًا، فهمت
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeLayout;
