import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { cleanProductName } from '../utils/discount';

const customerLocations = [
  'القاهرة',
  'الإسكندرية',
  'الجيزة',
  'بني مزار',
  'المنيا',
  'طنطا',
  'المنصورة',
  'الزقازيق',
  'أسيوط',
  'سوهاج',
  'الإسماعيلية',
  'بورسعيد'
];

const customerFirstNames = [
  'سارة',
  'نورهان',
  'مريم',
  'آية',
  'ياسمين',
  'فاطمة',
  'خلود',
  'شهد',
  'دعاء',
  'رانيا',
  'هاجر',
  'أميرة',
  'روان'
];

const timeAgoList = [
  'للـتو 🛍️',
  'منذ 3 دقائق',
  'منذ 6 دقائق',
  'منذ 12 دقيقة',
  'منذ 18 دقيقة',
  'منذ 25 دقيقة',
];

export default function SocialProofPopup({ active = true }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [currentSale, setCurrentSale] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Fetch products to use in dynamic notifications
    api.get('/products')
      .then((res) => {
        const available = (res.data || []).filter(p => (p.stock ?? 0) > 0);
        if (available.length > 0) {
          setProducts(available);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!active || isDismissed || products.length === 0) return;

    let timeoutId;
    let hideTimeoutId;

    const showNextPopup = () => {
      // Pick random product
      const product = products[Math.floor(Math.random() * products.length)];
      const name = customerFirstNames[Math.floor(Math.random() * customerFirstNames.length)];
      const location = customerLocations[Math.floor(Math.random() * customerLocations.length)];
      const timeAgo = timeAgoList[Math.floor(Math.random() * timeAgoList.length)];

      setCurrentSale({
        product,
        customerName: `${name} من ${location}`,
        timeAgo,
      });

      setIsVisible(true);

      // Hide after 5 seconds
      hideTimeoutId = setTimeout(() => {
        setIsVisible(false);
        // Schedule next popup between 16 and 26 seconds
        const nextDelay = Math.floor(Math.random() * 10000) + 16000;
        timeoutId = setTimeout(showNextPopup, nextDelay);
      }, 5500);
    };

    // Initial popup shows after 5 seconds of browsing
    timeoutId = setTimeout(showNextPopup, 5000);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(hideTimeoutId);
    };
  }, [active, isDismissed, products]);

  if (!active || isDismissed || !currentSale || !isVisible) {
    return null;
  }

  const { product, customerName, timeAgo } = currentSale;
  const image = product.images?.[0] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80';

  return (
    <aside
      aria-label="إشعار الشراء الحديث"
      dir="rtl"
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 max-w-[310px] sm:max-w-[340px] w-[calc(100%-2rem)] sm:w-auto transition-all duration-500 ease-out animate-slide-up"
    >
      <div
        onClick={() => navigate(`/product/${product._id}`)}
        className="group relative flex items-center gap-3 rounded-2xl sm:rounded-[1.35rem] border border-burgundy/15 bg-white/95 backdrop-blur-md p-3 shadow-xl transition-all hover:scale-[1.02] hover:border-burgundy/30 cursor-pointer select-none"
      >
        {/* Product Thumbnail */}
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-burgundy/10 bg-beige/10">
          <img
            src={image}
            alt={cleanProductName(product.name)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] text-white shadow">
            ✓
          </div>
        </div>

        {/* Content details */}
        <div className="flex-1 min-w-0 pr-0.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[11px] font-bold text-burgundy truncate">
              اشترت {customerName}
            </p>
          </div>

          <p className="mt-0.5 text-xs font-semibold text-burgundy/90 line-clamp-1 group-hover:text-[#650018] transition">
            {cleanProductName(product.name)}
          </p>

          <div className="mt-1 flex items-center justify-between text-[10px] text-burgundy/50">
            <span className="font-mono font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              طلب مؤكد
            </span>
            <span>{timeAgo}</span>
          </div>
        </div>

        {/* Close / Dismiss Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
            setIsDismissed(true); // Don't show again this session
          }}
          className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-white border border-burgundy/20 text-[10px] text-burgundy/60 shadow hover:bg-burgundy hover:text-white transition"
          aria-label="إغلاق الإشعار"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
