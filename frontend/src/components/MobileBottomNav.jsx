import { NavLink, useLocation } from 'react-router-dom';

export default function MobileBottomNav({
  isVisible = true,
  onOpenCart,
  onOpenFavorites,
  cartCount = 0,
  favoritesCount = 0,
  whatsappNumber = '201090048832'
}) {
  const location = useLocation();

  // Hide on dashboard/admin routes
  const isDashboard =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/cashier') ||
    location.pathname.startsWith('/employee');

  if (isDashboard) return null;

  const cleanPhone = String(whatsappNumber).replace(/[^0-9]/g, '');
  const greetingText = encodeURIComponent('أهلاً ModaPella، حابة استفسر عن تفاصيل الموديلات والتوصيل.');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${greetingText}`;

  return (
    <nav
      aria-label="شريط التنقل السريع للجوال"
      dir="rtl"
      className={`md:hidden fixed inset-x-3 sm:inset-x-6 z-40 max-w-[420px] mx-auto transition-all duration-500 ease-out transform ${
        isVisible
          ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto'
          : 'translate-y-24 opacity-0 scale-95 pointer-events-none'
      }`}
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.65rem)'
      }}
    >
      {/* ── Dynamic Floating Glass Capsule Dock ── */}
      <div className="relative bg-white/94 backdrop-blur-2xl rounded-[2.3rem] p-1.5 border border-stone-200/90 shadow-[0_16px_40px_-8px_rgba(40,20,25,0.2),0_4px_16px_rgba(0,0,0,0.06)] flex items-center justify-between gap-1 select-none">
        
        {/* Subtle Luxury Gloss Highlight Line */}
        <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-stone-300/60 to-transparent pointer-events-none" />

        {/* 1. الرئيسية (Home) */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `relative flex items-center justify-center transition-all duration-300 rounded-full cursor-pointer active:scale-92 ${
              isActive
                ? 'bg-burgundy text-white px-3.5 py-2 shadow-md shadow-burgundy/30'
                : 'text-stone-500 hover:text-burgundy hover:bg-stone-100/70 p-2.5'
            }`
          }
        >
          {({ isActive }) => (
            <div className="flex items-center gap-1.5">
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${
                  isActive ? 'stroke-white fill-white/10 scale-105' : 'stroke-current fill-none'
                }`}
                viewBox="0 0 24 24"
                strokeWidth={isActive ? 2.2 : 1.9}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              {isActive && (
                <span className="text-xs font-black tracking-wide whitespace-nowrap animate-fade-in">
                  الرئيسية
                </span>
              )}
            </div>
          )}
        </NavLink>

        {/* 2. المتجر (Shop) */}
        <NavLink
          to="/shop"
          className={({ isActive }) =>
            `relative flex items-center justify-center transition-all duration-300 rounded-full cursor-pointer active:scale-92 ${
              isActive
                ? 'bg-burgundy text-white px-3.5 py-2 shadow-md shadow-burgundy/30'
                : 'text-stone-500 hover:text-burgundy hover:bg-stone-100/70 p-2.5'
            }`
          }
        >
          {({ isActive }) => (
            <div className="flex items-center gap-1.5">
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${
                  isActive ? 'stroke-white fill-white/10 scale-105' : 'stroke-current fill-none'
                }`}
                viewBox="0 0 24 24"
                strokeWidth={isActive ? 2.2 : 1.9}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
              {isActive && (
                <span className="text-xs font-black tracking-wide whitespace-nowrap animate-fade-in">
                  المتجر
                </span>
              )}
            </div>
          )}
        </NavLink>

        {/* 3. المفضلة (Wishlist Drawer) */}
        <button
          type="button"
          onClick={onOpenFavorites}
          className="relative flex items-center justify-center p-2.5 rounded-full text-stone-500 hover:text-rose-600 hover:bg-rose-50/60 transition-all duration-300 active:scale-92 cursor-pointer"
          title="المفضلة"
          aria-label="قائمة المفضلة"
        >
          <div className="relative flex items-center justify-center">
            <svg
              className={`w-4 h-4 transition-colors ${
                favoritesCount > 0 ? 'fill-rose-500 stroke-rose-500' : 'fill-none stroke-current'
              }`}
              viewBox="0 0 24 24"
              strokeWidth={1.9}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            {favoritesCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                {favoritesCount}
              </span>
            )}
          </div>
        </button>

        {/* 4. السلة (Cart Drawer - Highlighted Accent) */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative flex items-center justify-center p-2.5 rounded-full text-stone-700 hover:text-burgundy hover:bg-burgundy/10 transition-all duration-300 active:scale-92 cursor-pointer"
          title="سلة المشتريات"
          aria-label="سلة المشتريات"
        >
          <div className="relative flex items-center justify-center">
            <svg className="w-4 h-4 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth={1.9}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-burgundy text-white text-[9px] font-black flex items-center justify-center shadow-xs animate-bounce-subtle">
                {cartCount}
              </span>
            )}
          </div>
        </button>

        {/* 5. واتساب (WhatsApp Direct Chat) */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex items-center justify-center p-2.5 rounded-full text-emerald-600 bg-emerald-50/70 hover:bg-emerald-100 transition-all duration-300 active:scale-92"
          title="تواصل معنا عبر واتساب"
          aria-label="تواصل عبر واتساب"
        >
          <div className="relative flex items-center justify-center">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.446L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436.002 9.858-4.419 9.862-9.86.002-2.636-1.023-5.112-2.885-6.978C16.582 1.9 14.116.877 11.478.875c-5.442 0-9.866 4.42-9.87 9.861a9.814 9.814 0 001.492 5.161l-1.018 3.714 3.812-.999c1.637.893 3.167 1.362 4.155 1.362zm10.963-7.405c-.247-.124-1.462-.72-1.687-.801-.225-.082-.388-.124-.55.125-.162.247-.631.801-.773.962-.143.162-.285.182-.532.058-.247-.124-1.043-.383-1.987-1.227-.734-.654-1.229-1.462-1.373-1.711-.143-.247-.015-.38.109-.503.111-.11.247-.285.37-.428.123-.143.165-.244.247-.409.082-.165.041-.309-.021-.433-.062-.124-.55-1.326-.753-1.815-.198-.479-.399-.413-.55-.421-.143-.008-.306-.01-.47-.01-.162 0-.427.061-.65.309-.225.247-.856.837-.856 2.037s.872 2.358.995 2.524c.123.165 1.716 2.62 4.156 3.673.58.25 1.033.4 1.385.512.583.185 1.114.159 1.533.096.467-.069 1.462-.598 1.666-1.173.205-.576.205-1.071.143-1.173-.062-.102-.224-.165-.471-.289z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
        </a>

      </div>
    </nav>
  );
}
