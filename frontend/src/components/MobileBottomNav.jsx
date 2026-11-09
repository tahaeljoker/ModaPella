import { NavLink, useLocation } from 'react-router-dom';

export default function MobileBottomNav({
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
      aria-label="التنقل السريع للجوال"
      dir="rtl"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-burgundy/10 shadow-[0_-4px_25px_rgba(0,0,0,0.07)] transition-transform duration-300"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.35rem)' }}
    >
      <div className="grid grid-cols-5 items-center h-14 px-1">
        {/* 1. الرئيسية */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 transition-all rounded-xl ${
              isActive
                ? 'text-burgundy font-black'
                : 'text-burgundy/60 hover:text-burgundy font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <svg className={`w-5 h-5 ${isActive ? 'stroke-burgundy fill-burgundy/15' : 'stroke-current'}`} viewBox="0 0 24 24" fill="none" strokeWidth={isActive ? 2.2 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              <span className="text-[10px] mt-0.5">الرئيسية</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-burgundy mt-0.5" />}
            </>
          )}
        </NavLink>

        {/* 2. المتجر */}
        <NavLink
          to="/shop"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 transition-all rounded-xl ${
              isActive
                ? 'text-burgundy font-black'
                : 'text-burgundy/60 hover:text-burgundy font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <svg className={`w-5 h-5 ${isActive ? 'stroke-burgundy fill-burgundy/15' : 'stroke-current'}`} viewBox="0 0 24 24" fill="none" strokeWidth={isActive ? 2.2 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
              <span className="text-[10px] mt-0.5">المتجر</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-burgundy mt-0.5" />}
            </>
          )}
        </NavLink>

        {/* 3. المفضلة (Favorites) */}
        <button
          type="button"
          onClick={onOpenFavorites}
          className="relative flex flex-col items-center justify-center py-1 text-burgundy/70 hover:text-rose-600 transition-all rounded-xl cursor-pointer"
          aria-label="فتح قائمة المفضلة"
        >
          <div className="relative">
            <svg className={`w-5 h-5 ${favoritesCount > 0 ? 'fill-rose-500 stroke-rose-500' : 'fill-none stroke-current'}`} viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            {favoritesCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[1rem] h-3.5 px-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                {favoritesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-medium">المفضلة</span>
        </button>

        {/* 4. السلة (Cart) */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative flex flex-col items-center justify-center py-1 text-burgundy/70 hover:text-burgundy transition-all rounded-xl cursor-pointer"
          aria-label="فتح سلة التسوق"
        >
          <div className="relative">
            <svg className="w-5 h-5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[1rem] h-3.5 px-0.5 rounded-full bg-burgundy text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-medium">السلة</span>
        </button>

        {/* 5. واتساب */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center py-1 text-emerald-600 hover:text-emerald-700 transition-all rounded-xl"
          aria-label="تواصل عبر واتساب"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.446L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436.002 9.858-4.419 9.862-9.86.002-2.636-1.023-5.112-2.885-6.978C16.582 1.9 14.116.877 11.478.875c-5.442 0-9.866 4.42-9.87 9.861a9.814 9.814 0 001.492 5.161l-1.018 3.714 3.812-.999c1.637.893 3.167 1.362 4.155 1.362zm10.963-7.405c-.247-.124-1.462-.72-1.687-.801-.225-.082-.388-.124-.55.125-.162.247-.631.801-.773.962-.143.162-.285.182-.532.058-.247-.124-1.043-.383-1.987-1.227-.734-.654-1.229-1.462-1.373-1.711-.143-.247-.015-.38.109-.503.111-.11.247-.285.37-.428.123-.143.165-.244.247-.409.082-.165.041-.309-.021-.433-.062-.124-.55-1.326-.753-1.815-.198-.479-.399-.413-.55-.421-.143-.008-.306-.01-.47-.01-.162 0-.427.061-.65.309-.225.247-.856.837-.856 2.037s.872 2.358.995 2.524c.123.165 1.716 2.62 4.156 3.673.58.25 1.033.4 1.385.512.583.185 1.114.159 1.533.096.467-.069 1.462-.598 1.666-1.173.205-.576.205-1.071.143-1.173-.062-.102-.224-.165-.471-.289z" />
          </svg>
          <span className="text-[10px] mt-0.5 font-bold">واتساب</span>
        </a>
      </div>
    </nav>
  );
}
