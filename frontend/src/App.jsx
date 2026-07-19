import { useContext, useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import CartContext from './context/CartContext';
import LandingPage from './pages/LandingPage';
import PaymentPage from './pages/PaymentPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import CollectionsPage from './pages/CollectionsPage';
import CartPage from './pages/CartPage';
import api from './services/api';
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
import AdminDebts from './pages/admin/AdminDebts';

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
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [prevCartLength, setPrevCartLength] = useState(cart.length);
  const [whatsappNumber, setWhatsappNumber] = useState('201012345678');

  // Trigger drawer cart open when items are added
  useEffect(() => {
    if (cart.length > prevCartLength) {
      setIsCartDrawerOpen(true);
    }
    setPrevCartLength(cart.length);
  }, [cart.length]);

  useEffect(() => {
    api.get('/admin/site-config')
      .then(res => {
        if (res.data && res.data.whatsappNumber) {
          setWhatsappNumber(res.data.whatsappNumber);
        }
      })
      .catch(console.error);
  }, []);
  
  // Don't show public header/footer on admin or cashier routes
  const isDashboard = location.pathname.startsWith('/admin') || location.pathname.startsWith('/cashier') || location.pathname.startsWith('/employee');

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
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(true)}
                className="relative px-4 py-2 rounded-lg transition text-burgundy/80 hover:text-burgundy font-semibold text-sm"
              >
                سلة
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-burgundy px-1.5 text-[10px] font-semibold text-white">
                    {cart.length}
                  </span>
                )}
              </button>
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
          <Route path="/admin/debts" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminDebts /></AdminLayout></ProtectedRoute>} />

          {/* Cashier Routes */}
          <Route path="/cashier" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierPOS /></CashierLayout></ProtectedRoute>} />
          <Route path="/cashier/returns" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierReturns /></CashierLayout></ProtectedRoute>} />
          <Route path="/cashier/today" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierToday /></CashierLayout></ProtectedRoute>} />
          <Route path="/cashier/safe" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierSafe /></CashierLayout></ProtectedRoute>} />
          <Route path="/cashier/activities" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierActivities /></CashierLayout></ProtectedRoute>} />

          {/* Employee Routes */}
          <Route path="/employee" element={<ProtectedRoute allowedRoles={['employee', 'admin']}><EmployeeLayout><EmployeePriceCheck /></EmployeeLayout></ProtectedRoute>} />
          <Route path="/employee/tasks" element={<ProtectedRoute allowedRoles={['employee', 'admin']}><EmployeeLayout><EmployeeInventoryTasks /></EmployeeLayout></ProtectedRoute>} />

          {/* Legacy redirects */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierPOS /></CashierLayout></ProtectedRoute>} />
          <Route path="/pos" element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'manager']}><CashierLayout><CashierPOS /></CashierLayout></ProtectedRoute>} />
        </Routes>
      </main>
      
      {!isDashboard && <Footer />}

      {/* Floating WhatsApp Button */}
      {!isDashboard && (
        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 bg-[#25D366] text-white p-4 rounded-full shadow-2xl transition hover:scale-110 flex items-center justify-center hover:bg-[#20ba5a]"
          style={{ width: '60px', height: '60px' }}
          title="تواصل معنا عبر واتساب"
        >
          <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.446L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436.002 9.858-4.419 9.862-9.86.002-2.636-1.023-5.112-2.885-6.978C16.582 1.9 14.116.877 11.478.875c-5.442 0-9.866 4.42-9.87 9.861a9.814 9.814 0 001.492 5.161l-1.018 3.714 3.812-.999c1.637.893 3.167 1.362 4.155 1.362zm10.963-7.405c-.247-.124-1.462-.72-1.687-.801-.225-.082-.388-.124-.55.125-.162.247-.631.801-.773.962-.143.162-.285.182-.532.058-.247-.124-1.043-.383-1.987-1.227-.734-.654-1.229-1.462-1.373-1.711-.143-.247-.015-.38.109-.503.111-.11.247-.285.37-.428.123-.143.165-.244.247-.409.082-.165.041-.309-.021-.433-.062-.124-.55-1.326-.753-1.815-.198-.479-.399-.413-.55-.421-.143-.008-.306-.01-.47-.01-.162 0-.427.061-.65.309-.225.247-.856.837-.856 2.037s.872 2.358.995 2.524c.123.165 1.716 2.62 4.156 3.673.58.25 1.033.4 1.385.512.583.185 1.114.159 1.533.096.467-.069 1.462-.598 1.666-1.173.205-.576.205-1.071.143-1.173-.062-.102-.224-.165-.471-.289z" />
          </svg>
        </a>
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
                  🛍️ سلة التسوق
                </h2>
                <button
                  type="button"
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="text-burgundy/60 hover:text-burgundy text-2xl font-semibold"
                >
                  ✕
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-20 text-burgundy/60 space-y-4">
                    <span className="text-5xl block">🛒</span>
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
                        src={item.images?.[0] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80'}
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
      <AppContent />
    </CartProvider>
  );
}

export default App;
