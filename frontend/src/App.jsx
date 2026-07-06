import { useContext } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import CartContext from './context/CartContext';
import LandingPage from './pages/LandingPage';
import PaymentPage from './pages/PaymentPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import CollectionsPage from './pages/CollectionsPage';
import CartPage from './pages/CartPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import LoginPage from './pages/LoginPage';
import CategoryPage from './pages/CategoryPage';
import ProtectedRoute from './components/ProtectedRoute';
import Footer from './components/Footer';
import Logo from './components/Logo';
import useRevealOnScroll from './hooks/useRevealOnScroll';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminSiteSettings from './pages/admin/AdminSiteSettings';
import AdminUsers from './pages/admin/AdminUsers';

// Cashier Pages
import CashierLayout from './pages/cashier/CashierLayout';
import CashierPOS from './pages/cashier/CashierPOS';
import CashierReturns from './pages/cashier/CashierReturns';
import CashierToday from './pages/cashier/CashierToday';
import CashierSafe from './pages/cashier/CashierSafe';

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
  const { cart } = useContext(CartContext);
  const location = useLocation();
  
  // Don't show public header/footer on admin or cashier routes
  const isDashboard = location.pathname.startsWith('/admin') || location.pathname.startsWith('/cashier');

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-burgundy">
      {!isDashboard && (
        <header className="container mx-auto flex flex-wrap items-center justify-between gap-4 border-b border-burgundy/10 bg-[#fcf9f8] px-4 py-5 shadow-sm">
          <div>
            <Logo />
            <p className="text-sm text-burgundy/70">تسوق الأزياء النسائية بأناقة</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItem('الرئيسية', '/')}
            {navItem('الملابس', '/shop')}
            <NavLink
              to="/cart"
              className={({ isActive }) =>
                `relative px-4 py-2 rounded-lg transition ${isActive ? 'bg-burgundy text-white' : 'text-burgundy/80 hover:text-burgundy'}`
              }
            >
              سلة
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-burgundy px-2 text-xs font-semibold text-white">
                  {cart.length}
                </span>
              )}
            </NavLink>
            {navItem('من نحن', '/about')}
            {navItem('اتصل بنا', '/contact')}
          </nav>
        </header>
      )}

      <main className={!isDashboard ? "container mx-auto px-4 pb-12" : ""}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/shop" element={<CollectionsPage />} />
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
          <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminOrders /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/site" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminSiteSettings /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminUsers /></AdminLayout></ProtectedRoute>} />

          {/* Cashier Routes */}
          <Route path="/cashier" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierPOS /></CashierLayout></ProtectedRoute>} />
          <Route path="/cashier/returns" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierReturns /></CashierLayout></ProtectedRoute>} />
          <Route path="/cashier/today" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierToday /></CashierLayout></ProtectedRoute>} />
          <Route path="/cashier/safe" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierSafe /></CashierLayout></ProtectedRoute>} />

          {/* Legacy redirects */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierPOS /></CashierLayout></ProtectedRoute>} />
          <Route path="/pos" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierPOS /></CashierLayout></ProtectedRoute>} />
        </Routes>
      </main>
      
      {!isDashboard && <Footer />}
    </div>
  );
}

function App() {
  useRevealOnScroll();

  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}

export default App;
