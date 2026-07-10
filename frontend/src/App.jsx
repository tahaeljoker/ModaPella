import { useContext, useState } from 'react';
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
import AdminBarcodeLabels from './pages/admin/AdminBarcodeLabels';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminSuppliers from './pages/admin/AdminSuppliers';
import AdminInventoryCount from './pages/admin/AdminInventoryCount';
import AdminActivities from './pages/admin/AdminActivities';
// import AdminDebts from './pages/admin/AdminDebts';

// Cashier Pages
import CashierLayout from './pages/cashier/CashierLayout';
import CashierPOS from './pages/cashier/CashierPOS';
import CashierReturns from './pages/cashier/CashierReturns';
import CashierToday from './pages/cashier/CashierToday';
import CashierSafe from './pages/cashier/CashierSafe';
import CashierActivities from './pages/cashier/CashierActivities';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Don't show public header/footer on admin or cashier routes
  const isDashboard = location.pathname.startsWith('/admin') || location.pathname.startsWith('/cashier');

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-burgundy">
      {!isDashboard && (
        <header className="container mx-auto border-b border-burgundy/10 bg-[#fcf9f8] px-4 py-5 shadow-sm relative">
          <div className="flex items-center justify-between">
            <div>
              <Logo />
              <p className="text-xs sm:text-sm text-burgundy/70 mt-0.5">تسوق الأزياء النسائية بأناقة</p>
            </div>
            
            {/* Hamburger Button for mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex flex-col justify-between w-6 h-4 text-burgundy focus:outline-none"
              aria-label="Toggle Menu"
            >
              <span className={`h-0.5 w-full bg-burgundy rounded transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`h-0.5 w-full bg-burgundy rounded transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`h-0.5 w-full bg-burgundy rounded transition-transform duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex flex-wrap gap-2">
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
          </div>

          {/* Mobile Navigation Dropdown */}
          {isMobileMenuOpen && (
            <nav className="md:hidden mt-4 flex flex-col gap-1.5 pb-2 border-t border-burgundy/5 pt-3 fade-in">
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
              <NavLink
                to="/cart"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-xl transition font-semibold text-sm flex justify-between items-center ${isActive ? 'bg-burgundy text-white' : 'text-burgundy/80 hover:bg-burgundy/5'}`
                }
              >
                <span>سلة المشتريات</span>
                {cart.length > 0 && (
                  <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-burgundy px-2 text-xs font-semibold text-white">
                    {cart.length}
                  </span>
                )}
              </NavLink>
              <NavLink
                to="/about"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-xl transition font-semibold text-sm ${isActive ? 'bg-burgundy text-white' : 'text-burgundy/80 hover:bg-burgundy/5'}`
                }
              >
                من نحن
              </NavLink>
              <NavLink
                to="/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-xl transition font-semibold text-sm ${isActive ? 'bg-burgundy text-white' : 'text-burgundy/80 hover:bg-burgundy/5'}`
                }
              >
                اتصل بنا
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
          <Route path="/admin/customers" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminCustomers /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/employees" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminEmployees /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/suppliers" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminSuppliers /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/inventory-count" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminInventoryCount /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/barcodes" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminBarcodeLabels /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/site" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminSiteSettings /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminUsers /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/activities" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminActivities /></AdminLayout></ProtectedRoute>} />
          {/* <Route path="/admin/debts" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminDebts /></AdminLayout></ProtectedRoute>} /> */}

          {/* Cashier Routes */}
          <Route path="/cashier" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierPOS /></CashierLayout></ProtectedRoute>} />
          <Route path="/cashier/returns" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierReturns /></CashierLayout></ProtectedRoute>} />
          <Route path="/cashier/today" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierToday /></CashierLayout></ProtectedRoute>} />
          <Route path="/cashier/safe" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierSafe /></CashierLayout></ProtectedRoute>} />
          <Route path="/cashier/activities" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierActivities /></CashierLayout></ProtectedRoute>} />

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
