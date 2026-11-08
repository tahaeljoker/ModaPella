import { useContext, useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate, Link, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import CartContext from './context/CartContext';
import { initTrafficTracking } from './utils/trafficTracker';
import LandingPage from './pages/LandingPage';
import PaymentPage from './pages/PaymentPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import CollectionsPage from './pages/CollectionsPage';
import CartPage from './pages/CartPage';
import api from './services/api';
import ProductDetailsPage from './pages/ProductDetailsPage';
import OutfitterPage from './pages/OutfitterPage';
import LookbookPage from './pages/LookbookPage';
import LoginPage from './pages/LoginPage';
import CategoryPage from './pages/CategoryPage';
import ProtectedRoute from './components/ProtectedRoute';
import Footer from './components/Footer';
import Logo from './components/Logo';
import useRevealOnScroll from './hooks/useRevealOnScroll';
import SocialProofPopup from './components/SocialProofPopup';
import WhatsAppWidget from './components/WhatsAppWidget';
import CompareContext, { CompareProvider } from './context/CompareContext';
import OutfitComparisonBar from './components/OutfitComparisonBar';
import OutfitComparisonModal from './components/OutfitComparisonModal';
import ScrollRestoration from './components/ScrollRestoration';
import { resolveImageUrl } from './utils/imageUrl';
import StorefrontSearchModal from './components/StorefrontSearchModal';
import { getCachedStorefrontProducts, setCachedStorefrontProducts } from './services/storefrontCache';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminProducts from './pages/admin/AdminProducts';
import AdminProductAnalytics from './pages/admin/AdminProductAnalytics';
import AdminOrders from './pages/admin/AdminOrders';
import AdminSiteSettings from './pages/admin/AdminSiteSettings';
import AdminLookbook from './pages/admin/AdminLookbook';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBarcodeLabels from './pages/admin/AdminBarcodeLabels';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminSuppliers from './pages/admin/AdminSuppliers';
import AdminInventoryCount from './pages/admin/AdminInventoryCount';
import AdminActivities from './pages/admin/AdminActivities';
import AdminDebts from './pages/admin/AdminDebts';
import AdminMonthlyReports from './pages/admin/AdminMonthlyReports';
import AdminSafe from './pages/admin/AdminSafe';
import AdminAccountStatement from './pages/admin/AdminAccountStatement';
import AdminFinancialCenter from './pages/admin/AdminFinancialCenter';
import AdminUpdates from './pages/admin/AdminUpdates';

// Cashier Pages
import CashierLayout from './pages/cashier/CashierLayout';
import CashierPOS from './pages/cashier/CashierPOS';
import CashierReturns from './pages/cashier/CashierReturns';
import CashierToday from './pages/cashier/CashierToday';
import CashierSafe from './pages/cashier/CashierSafe';
import CashierActivities from './pages/cashier/CashierActivities';

// Employee Pages
import EmployeeLayout from './pages/employee/EmployeeLayout';
import EmployeePriceCheck from './pages/employee/EmployeePriceCheck';
import EmployeeInventoryTasks from './pages/employee/EmployeeInventoryTasks';
import EmployeeFinances from './pages/employee/EmployeeFinances';

const navItem = (label, to) => (
 <NavLink
 to={to}
 className={({ isActive }) =>
 `px-4 py-2 rounded-lg transition ${isActive ? 'bg-burgundy text-white' : 'text-burgundy/80 hover:text-burgundy'}`
 }
 >
 {label}
 </NavLink>
);

function AppContent() {
 const { cart, removeItem, updateQuantity, total } = useContext(CartContext);
  const { compareItems, setIsCompareOpen, setCompareEnabled } = useContext(CompareContext);
 const location = useLocation();
 const navigate = useNavigate();
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
 const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
 const [storefrontProducts, setStorefrontProducts] = useState(() => getCachedStorefrontProducts() || []);
 const [prevCartLength, setPrevCartLength] = useState(cart.length);
 const [whatsappNumber, setWhatsappNumber] = useState('201090048832');
 const [siteConfig, setSiteConfig] = useState(null);

 useEffect(() => {
   if (isSearchModalOpen && (!storefrontProducts || storefrontProducts.length === 0)) {
     api.get('/products?context=storefront')
       .then((res) => {
         const active = (res.data || []).filter((p) => (p.stock ?? 0) > 0);
         setStorefrontProducts(active);
         setCachedStorefrontProducts(active);
       })
       .catch(console.error);
   }
 }, [isSearchModalOpen]);

  useEffect(() => {
    initTrafficTracking();
  }, []);
 const [isBannerDismissed, setIsBannerDismissed] = useState(false);

 // Trigger drawer cart open when items are added
 useEffect(() => {
 if (cart.length > prevCartLength) {
 setIsCartDrawerOpen(true);
 }
 setPrevCartLength(cart.length);
 }, [cart.length]);

 useEffect(() => {
 console.log("%cDeveloped by Taha Anas ", "color: #7c0a12; font-size: 16px; font-weight: bold;");
 console.log("%cWhatsApp: +201143632650", "color: #25D366; font-size: 12px; font-weight: bold;");

 api.get('/admin/site-config')
 .then(res => {
 if (res.data) {
 setSiteConfig(res.data);
 if (res.data.whatsappNumber) {
 setWhatsappNumber(res.data.whatsappNumber);
 }
 if (res.data.features?.productComparison !== undefined) {
 setCompareEnabled(res.data.features.productComparison);
 }
 }
 })
 .catch(console.error);
 }, []);
 
 // Don't show public header/footer on admin or cashier routes
 const isDashboard = location.pathname.startsWith('/admin') || location.pathname.startsWith('/cashier') || location.pathname.startsWith('/employee');

 return (
 <div className="min-h-screen bg-[#fcf9f8] text-burgundy">
 <ScrollRestoration />
 {/* Global Top Announcement Bar */}
 {!isDashboard && !isBannerDismissed && siteConfig?.announcementBarActive && siteConfig?.announcementBar && (
 <div
 className={`py-2 px-4 text-center text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-sm flex items-center justify-between relative ${
 siteConfig.announcementBarBg === 'emerald'
 ? 'bg-emerald-700 text-white'
 : siteConfig.announcementBarBg === 'dark'
 ? 'bg-[#1a1215] text-amber-200'
 : siteConfig.announcementBarBg === 'amber'
 ? 'bg-amber-600 text-white'
 : 'bg-burgundy text-white'
 }`}
 dir="rtl"
 >
 <div className="flex-1 flex items-center justify-center gap-2">
 
 {siteConfig.announcementBarLink ? (
 <Link to={siteConfig.announcementBarLink} className="hover:underline flex items-center gap-1.5">
 <span>{siteConfig.announcementBar}</span>
 <span className="text-[11px] underline opacity-90 mr-1">تصفحي الآن ←</span>
 </Link>
 ) : (
 <span>{siteConfig.announcementBar}</span>
 )}
 </div>
 <button
 type="button"
 onClick={() => setIsBannerDismissed(true)}
 className="text-white/70 hover:text-white p-1 text-xs leading-none transition cursor-pointer"
 aria-label="إغلاق الإعلان"
 >
 ✕
 </button>
 </div>
 )}

 {!isDashboard && (
 <header className="container mx-auto border-b border-burgundy/10 bg-[#fcf9f8] px-4 py-5 shadow-sm relative">
  <div className="flex items-center justify-between gap-4">
    {/* Right in RTL: Logo */}
    <div className="flex items-center gap-3">
      <Logo />
      <p className="hidden lg:block text-xs text-burgundy/60 border-r border-burgundy/15 pr-3">
        تسوق الأزياء النسائية بأناقة
      </p>
    </div>

    {/* Center in RTL: Main Navigation Links */}
    <nav className="hidden md:flex items-center gap-1 lg:gap-2">
      {navItem('الرئيسية', '/')}
      {navItem('الملابس', '/shop')}
      {Boolean(siteConfig?.features?.lookbook) && navItem('إطلالات الموديلز', '/lookbook')}
      {Boolean(siteConfig?.features?.outfitter) && navItem('غرفة التنسيق', '/outfitter')}
      {navItem('تواصل معنا', '/about')}
    </nav>

    {/* Left in RTL: Action Icons Group */}
    <div className="flex items-center gap-2">
      {/* Quick Search Button */}
      <button
        type="button"
        onClick={() => setIsSearchModalOpen(true)}
        className="h-9 w-9 rounded-full border border-burgundy/15 bg-white/80 hover:bg-burgundy hover:text-white text-burgundy/80 flex items-center justify-center transition shadow-2xs cursor-pointer"
        title="بحث في الموديلات"
        aria-label="بحث في الموديلات"
      >
        <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
        </svg>
      </button>

      {/* Compare Button */}
      {siteConfig?.features?.productComparison !== false && (
        <button
          type="button"
          onClick={() => setIsCompareOpen(true)}
          className="relative h-9 w-9 rounded-full border border-burgundy/15 bg-white/80 hover:bg-burgundy hover:text-white text-burgundy/80 flex items-center justify-center transition shadow-2xs cursor-pointer"
          title="مقارنة الموديلات"
          aria-label="مقارنة الموديلات"
        >
          <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          {compareItems.length > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white shadow-xs">
              {compareItems.length}
            </span>
          )}
        </button>
      )}

      {/* Cart Button */}
      <button
        type="button"
        onClick={() => setIsCartDrawerOpen(true)}
        className="relative h-9 px-3.5 rounded-full border border-burgundy/20 bg-burgundy text-white hover:bg-[#680017] flex items-center gap-1.5 transition shadow-xs cursor-pointer text-xs font-bold"
        aria-label="سلة التسوق"
      >
        <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
        </svg>
        <span className="hidden sm:inline">السلة</span>
        {cart.length > 0 && (
          <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white text-burgundy px-1 text-[9px] font-black">
            {cart.length}
          </span>
        )}
      </button>

      {/* Hamburger Button for mobile */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden flex flex-col justify-between w-6 h-4 text-burgundy focus:outline-none p-0.5 mr-1 cursor-pointer"
        aria-label="Toggle Menu"
      >
        <span className={`h-0.5 w-full bg-burgundy rounded transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
        <span className={`h-0.5 w-full bg-burgundy rounded transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
        <span className={`h-0.5 w-full bg-burgundy rounded transition-transform duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
      </button>
    </div>
  </div>

 {/* Mobile Navigation Dropdown */}
 {isMobileMenuOpen && (
 <nav className="md:hidden mt-4 flex flex-col gap-1.5 pb-2 border-t border-burgundy/5 pt-3 fade-in">
 <button
   type="button"
   onClick={() => {
     setIsMobileMenuOpen(false);
     setIsSearchModalOpen(true);
   }}
   className="px-4 py-2.5 rounded-xl transition font-semibold text-sm text-right text-burgundy/80 hover:bg-burgundy/5 flex items-center gap-2 cursor-pointer bg-burgundy/5"
 >
   <span></span>
   <span>بحث في الموديلات</span>
 </button>
 <NavLink
 to="/"
 onClick={() => setIsMobileMenuOpen(false)}
 className={({ isActive }) =>
 `px-4 py-2.5 rounded-xl transition font-semibold text-sm ${isActive ? 'bg-burgundy text-white' : 'text-burgundy/80 hover:bg-burgundy/5'}`
 }
 >
 الرئيسية
 </NavLink>
 <NavLink
 to="/shop"
 onClick={() => setIsMobileMenuOpen(false)}
 className={({ isActive }) =>
 `px-4 py-2.5 rounded-xl transition font-semibold text-sm ${isActive ? 'bg-burgundy text-white' : 'text-burgundy/80 hover:bg-burgundy/5'}`
 }
 >
 الملابس
 </NavLink>
          {Boolean(siteConfig?.features?.outfitter) && (
            <NavLink
              to="/outfitter"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `px-4 py-2.5 rounded-xl transition font-semibold text-sm ${isActive ? 'bg-burgundy text-white' : 'text-burgundy/80 hover:bg-burgundy/5'}`
              }
            >
              غرفة التنسيق
            </NavLink>
          )}
          {Boolean(siteConfig?.features?.lookbook) && (
            <NavLink
              to="/lookbook"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `px-4 py-2.5 rounded-xl transition font-semibold text-sm ${isActive ? 'bg-burgundy text-white' : 'text-burgundy/80 hover:bg-burgundy/5'}`
              }
            >
              إطلالات الموديلز
            </NavLink>
          )}
          {siteConfig?.features?.productComparison !== false && (
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsCompareOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl transition font-semibold text-sm flex justify-between items-center text-burgundy/80 hover:bg-burgundy/5"
            >
              <span>مقارنة الإطلالات</span>
              {compareItems.length > 0 && (
                <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
                  {compareItems.length}
                </span>
              )}
            </button>
          )}
 <button
 type="button"
 onClick={() => {
 setIsMobileMenuOpen(false);
 setIsCartDrawerOpen(true);
 }}
 className="px-4 py-2.5 rounded-xl transition font-semibold text-sm flex justify-between items-center text-burgundy/80 hover:bg-burgundy/5"
 >
 <span>سلة المشتريات</span>
 {cart.length > 0 && (
 <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-burgundy px-2 text-xs font-semibold text-white">
 {cart.length}
 </span>
 )}
 </button>
 <NavLink
 to="/about"
 onClick={() => setIsMobileMenuOpen(false)}
 className={({ isActive }) =>
 `px-4 py-2.5 rounded-xl transition font-semibold text-sm ${isActive ? 'bg-burgundy text-white' : 'text-burgundy/80 hover:bg-burgundy/5'}`
 }
 >
 تواصل معنا
 </NavLink>
 </nav>
 )}
 </header>
 )}

 <main className={!isDashboard ? "container mx-auto px-4 pb-12" : ""}>
 <Routes>
 {/* Public Routes */}
 <Route path="/" element={<LandingPage />} />
 <Route path="/shop" element={<CollectionsPage />} />
          <Route path="/outfitter" element={siteConfig?.features?.outfitter ? <OutfitterPage /> : <Navigate to="/shop" replace />} />
          <Route path="/lookbook" element={siteConfig?.features?.lookbook ? <LookbookPage /> : <Navigate to="/shop" replace />} />
 <Route path="/collections" element={<CollectionsPage />} />
 <Route path="/about" element={<AboutPage />} />
 <Route path="/contact" element={<ContactPage />} />
 <Route path="/product/:id" element={<ProductDetailsPage />} />
 <Route path="/category/:slug" element={<CategoryPage />} />
 <Route path="/cart" element={<CartPage />} />
 <Route path="/payment" element={<PaymentPage />} />
 <Route path="/login" element={<LoginPage />} />

 {/* Admin Routes */}
 <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminOverview /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/products" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminProducts /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/products/analytics" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminLayout><AdminProductAnalytics /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/products/:id/analytics" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminLayout><AdminProductAnalytics /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/product-analytics" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminLayout><AdminProductAnalytics /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminOrders /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/customers" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminCustomers /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/employees" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminEmployees /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/suppliers" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminSuppliers /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/inventory-count" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminInventoryCount /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/barcodes" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminBarcodeLabels /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/site" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'developer']}><AdminLayout><AdminSiteSettings /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/looks" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'developer']}><AdminLayout><AdminLookbook /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminUsers /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/activities" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminActivities /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/debts" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminDebts /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminFinancialCenter defaultView="report" /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/safe" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminSafe /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/statements" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminFinancialCenter defaultView="ledger" /></AdminLayout></ProtectedRoute>} />
 <Route path="/admin/updates" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminUpdates /></AdminLayout></ProtectedRoute>} />

 {/* Cashier Routes */}
 <Route path="/cashier" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierPOS /></CashierLayout></ProtectedRoute>} />
 <Route path="/cashier/pos" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierPOS /></CashierLayout></ProtectedRoute>} />
 <Route path="/cashier/returns" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierReturns /></CashierLayout></ProtectedRoute>} />
 <Route path="/cashier/today" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierToday /></CashierLayout></ProtectedRoute>} />
 <Route path="/cashier/safe" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierSafe /></CashierLayout></ProtectedRoute>} />
 <Route path="/cashier/activities" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierActivities /></CashierLayout></ProtectedRoute>} />

 {/* Employee Routes */}
 <Route path="/employee" element={<ProtectedRoute allowedRoles={['employee', 'admin']}><EmployeeLayout><EmployeePriceCheck /></EmployeeLayout></ProtectedRoute>} />
 <Route path="/employee/tasks" element={<ProtectedRoute allowedRoles={['employee', 'admin']}><EmployeeLayout><EmployeeInventoryTasks /></EmployeeLayout></ProtectedRoute>} />
 <Route path="/employee/finances" element={<ProtectedRoute allowedRoles={['employee', 'admin']}><EmployeeLayout><EmployeeFinances /></EmployeeLayout></ProtectedRoute>} />

 {/* Legacy redirects */}
 <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierPOS /></CashierLayout></ProtectedRoute>} />
 <Route path="/pos" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierPOS /></CashierLayout></ProtectedRoute>} />
 </Routes>
 </main>
 
 {!isDashboard && <Footer />}

 {/* Social Proof Live Sales Notification */}
 {!isDashboard && (
 <SocialProofPopup active={siteConfig?.socialProofActive !== false && siteConfig?.features?.socialProof !== false} />
 )}

 {/* Interactive WhatsApp Concierge Widget */}
 {!isDashboard && (
 <WhatsAppWidget whatsappNumber={whatsappNumber} />
 )}

  {/* Outfit Comparison Floating Bar & Modal */}
  {!isDashboard && siteConfig?.features?.productComparison !== false && (
    <>
      <OutfitComparisonBar />
      <OutfitComparisonModal whatsappNumber={whatsappNumber} />
    </>
  )}

{!isDashboard && (
   <StorefrontSearchModal
     isOpen={isSearchModalOpen}
     onClose={() => setIsSearchModalOpen(false)}
     products={storefrontProducts}
   />
 )}

 {/* Cart Drawer */}
 {isCartDrawerOpen && (
 <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
 {/* Overlay */}
 <div className="absolute inset-0 bg-burgundy/40 backdrop-blur-sm transition-opacity" onClick={() => setIsCartDrawerOpen(false)} />

 <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
 <div className="pointer-events-auto w-screen max-w-md transform bg-[#FAF7F2] shadow-2xl transition-all duration-500 flex flex-col h-full">
 {/* Header */}
 <div className="px-6 py-5 border-b border-burgundy/10 flex items-center justify-between">
 <h2 className="text-xl font-bold text-burgundy flex items-center gap-2">
 سلة التسوق
 </h2>
 <button
 type="button"
 onClick={() => setIsCartDrawerOpen(false)}
 className="text-burgundy/60 hover:text-burgundy text-2xl font-semibold"
 >
 
 </button>
 </div>

 {/* Items List */}
 <div className="flex-1 overflow-y-auto p-6 space-y-4">
 {cart.length === 0 ? (
 <div className="text-center py-20 text-burgundy/60 space-y-4">
 <span className="text-5xl block"></span>
 <p className="text-sm font-semibold">سلة المشتريات فارغة حالياً</p>
 <button
 onClick={() => {
 setIsCartDrawerOpen(false);
 navigate('/shop');
 }}
 className="text-xs text-burgundy underline font-bold"
 >
 تصفح الملابس لإضافتها
 </button>
 </div>
 ) : (
 cart.map((item) => (
 <div key={item.cartId} className="flex gap-4 p-3 bg-white rounded-xl border border-burgundy/5 shadow-sm">
 <img
 src={resolveImageUrl(item.image || item.images?.[0]) || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80'}
 alt={item.name}
 className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
 />
 <div className="flex-1 min-w-0 flex flex-col justify-between">
 <div>
 <div className="flex justify-between items-start">
 <h4 className="text-sm font-bold text-burgundy truncate">{item.name}</h4>
 <button
 type="button"
 onClick={() => removeItem(item.cartId)}
 className="text-red-500 hover:text-red-700 text-xs mr-2"
 >
 حذف
 </button>
 </div>
 <p className="text-[10px] text-burgundy/60 mt-0.5">
 {item.selectedSize ? `مقاس: ${item.selectedSize}` : ''} {item.selectedColor ? `· لون: ${item.selectedColor}` : ''}
 </p>
 </div>
 <div className="flex items-center justify-between mt-2">
 <div className="flex items-center border border-burgundy/10 rounded-lg overflow-hidden bg-beige/5">
 <button
 type="button"
 onClick={() => updateQuantity(item.cartId, Math.max(1, item.quantity - 1))}
 className="px-2 py-0.5 text-xs hover:bg-burgundy/5 text-burgundy font-bold"
 >
 -
 </button>
 <span className="px-3 text-xs font-mono text-burgundy">{item.quantity}</span>
 <button
 type="button"
 onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
 className="px-2 py-0.5 text-xs hover:bg-burgundy/5 text-burgundy font-bold"
 >
 +
 </button>
 </div>
 <span className="text-xs font-bold text-burgundy">
 {Number(item.price * item.quantity).toLocaleString('en-US')} ج.م
 </span>
 </div>
 </div>
 </div>
 ))
 )}
 </div>

 {/* Footer */}
 {cart.length > 0 && (
 <div className="border-t border-burgundy/10 px-6 py-5 bg-white space-y-4">
 <div className="flex justify-between items-center text-sm font-bold text-burgundy">
 <span>إجمالي المشتريات:</span>
 <span className="text-lg">{Number(total).toLocaleString('en-US')} ج.م</span>
 </div>
 <button
 type="button"
 onClick={() => {
 setIsCartDrawerOpen(false);
 navigate('/payment');
 }}
 className="w-full rounded-full bg-burgundy py-3 text-center text-sm font-bold text-white transition hover:bg-[#650018] shadow"
 >
 الذهاب للدفع وتأكيد الطلب
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

function App() {
  useRevealOnScroll();

  return (
    <CartProvider>
      <CompareProvider>
        <AppContent />
      </CompareProvider>
    </CartProvider>
  );
}

export default App;
