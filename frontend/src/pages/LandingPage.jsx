import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import { cleanProductName } from '../utils/discount';
import { registerCustomColors } from '../utils/colorSwatches';
import { Icon } from '../components/Icon';
import FeatureBannerShowcase from '../components/FeatureBannerShowcase';
import OrderStepsVisualCards from '../components/OrderStepsVisualCards';
import BestSellersSlider from '../components/BestSellersSlider';
import ShopTheLookSection from '../components/ShopTheLookSection';
import logoSrc from '../assets/logo.png';
import {
  getCachedStorefrontProducts,
  setCachedStorefrontProducts,
  getCachedSiteConfig,
  setCachedSiteConfig
} from '../services/storefrontCache';

const defaultSiteConfig = {
  published: true,
  heroBadge: 'ModaPella ✦ كولكشن الموسم الجديد',
  heroTitle: 'أشيك استايلات الموسم.. تليق بيكي وبجمال تفاصيلك',
  heroSubtitle: 'كل قطعة بنختارها على الفرازة، خامات ناعمة ومريحة وتفصيل مظبوط بدون تنازلات. اطلبي اللي يعجبك أونلاين وتعايني وتقيسي مع المندوب قبل ما تدفعي مليم، أو شرفينا في صالة العرض ببني مزار.',
  heroCtaLabel: 'تصفحي أحدث الموديلات',
  heroCtaLink: '/shop',
  secondaryCtaLabel: 'استشيرينا على واتساب',
  secondaryCtaLink: 'https://wa.me/201090048832?text=أهلاً%20ModaPella،%20عايزة%20استشارة%20لتنسيق%20طقم%20مناسب',
  heroImages: [
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85',
    'https://i.postimg.cc/NFz9t4fC/Elegant-fashion-website-hero-banner-women-s-clothing-rack-background-soft-burgundy-overlay-modern.jpg'
  ],
  heroAutoplaySpeed: 4.5,
  featuredTitle: 'أحدث الموديلات',
  featuredSubtitle: 'قطع مختارة بعناية — شوفي اللي يعجبك واطلبيه على طول.',
  maintenanceMessage: 'الموقع غير متاح حالياً، سنعود قريباً.',
  whatsappNumber: '201090048832',
  storeAddress: 'شارع الإعدادية بنات، بني مزار، المنيا',
  storePhone: '01090048832',
  aboutText: 'محل أزياء نسائي في قلب بني مزار، بنقدم فيه أحدث الموديلات العصرية بأسعار كويسة. تقدري تتصفحي اونلاين وتطلبي، أو تيجي المحل مباشرة وتشوفي القطع على عينك.'
};

function LandingPage() {
  const [products, setProducts] = useState(() => (getCachedStorefrontProducts() || []).slice(0, 16));
  const [siteConfig, setSiteConfig] = useState(() => getCachedSiteConfig() || defaultSiteConfig);
  const [loading, setLoading] = useState(() => !products || products.length === 0);
  const [isFittingRoomModalOpen, setIsFittingRoomModalOpen] = useState(false);

  useEffect(() => {
    api.get('/products?context=storefront')
      .then((res) => {
        const active = (res.data || []).filter(p => (p.stock ?? 0) > 0);
        setProducts(active.slice(0, 16));
        setCachedStorefrontProducts(active);
        setLoading(false);
      })
      .catch(() => {
        if (!products.length) setProducts([]);
        setLoading(false);
      });

    api.get('/admin/site-config')
      .then((res) => {
        setSiteConfig(res.data);
        setCachedSiteConfig(res.data);
        if (res.data?.customColors) registerCustomColors(res.data.customColors);
      })
      .catch(() => setSiteConfig(defaultSiteConfig));
  }, []);

  if (!siteConfig.published) {
    return (
      <section className="py-20 text-center text-burgundy">
        <div className="rounded-[2rem] border border-burgundy/10 bg-white p-10 shadow-soft">
          <h1 className="text-3xl font-semibold">قريباً</h1>
          <p className="mt-4 text-burgundy/70">{siteConfig.maintenanceMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8 py-6 sm:py-10 text-burgundy" dir="rtl">

      {/* ━━━━━━━━━━━━ HERO (Modern Showcase with Dynamic Photos) ━━━━━━━━━━━━ */}
      <FeatureBannerShowcase siteConfig={siteConfig} />

      {/* ━━━━━━━━━━━━ لافتة غرفة التنسيق الذكية ━━━━━━━━━━━━ */}
      {siteConfig.outfitterBannerActive !== false && siteConfig.features?.outfitter !== false && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-burgundy via-[#680017] to-amber-950 p-6 sm:p-8 text-white shadow-soft">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-right">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold border border-white/15">
                  <span>{siteConfig.outfitterBannerBadge || 'ميزة حصرية جديدة في مودة بيلا'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-burgundy text-xs font-black shadow-md border border-amber-300 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-burgundy" />
                  <span>قريباً ✦</span>
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black">
                {siteConfig.outfitterBannerTitle || 'استوديو التنسيق الذكي وتبديل الملابس على المانيكان'}
              </h3>
              <p className="text-xs sm:text-sm text-white/80 max-w-xl">
                {siteConfig.outfitterBannerDesc || 'اختاري البلوزة مع البنطلون وبدّلي الألوان وشوفي التناسق فوراً قبل الطلب، واحصلي على خصم 15% فوري عند شراء الطقم كاملاً.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFittingRoomModalOpen(true)}
              className="px-6 py-3.5 rounded-full bg-white text-burgundy font-black text-xs sm:text-sm hover:bg-beige transition shadow-lg active:scale-95 flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
            >
              <span>{siteConfig.outfitterBannerCtaText || 'ادخلي استوديو التنسيق الآن'}</span>
              <span className="text-[10px] bg-burgundy/10 text-burgundy px-2 py-0.5 rounded-full font-bold">قريباً</span>
            </button>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━ سلايدر الأكثر مبيعاً ━━━━━━━━━━━━ */}
      {siteConfig?.features?.bestSellers !== false && <BestSellersSlider products={products} />}

      {/* ━━━━━━━━━━━━ تسوقي الإطلالة كاملة (إطلالات الموديلز) ━━━━━━━━━━━━ */}
      {Boolean(siteConfig?.features?.lookbook) && <ShopTheLookSection />}

      {/* ━━━━━━━━━━━━ أحدث الموديلات ━━━━━━━━━━━━ */}
      <div className="space-y-5 sm:space-y-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-3xl font-bold">{siteConfig.featuredTitle}</h2>
            <p className="mt-1 text-xs sm:text-sm text-burgundy/60">{siteConfig.featuredSubtitle}</p>
          </div>
          <Link
            to="/shop"
            className="flex-shrink-0 rounded-full border border-burgundy px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-burgundy transition hover:bg-burgundy/5"
          >
            اكتشفي تشكيلة الموسم كاملة
          </Link>
        </div>
        <div className="grid gap-3 sm:gap-5 grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, idx) => (
              <ProductCardSkeleton key={`landing-skel-${idx}`} />
            ))
          ) : (
            products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))
          )}
          {!loading && products.length === 0 && (
            <div className="col-span-2 lg:col-span-4 text-center py-14 text-burgundy/40 text-sm">
              لا توجد منتجات متاحة حالياً، تابعونا قريباً
            </div>
          )}
        </div>
      </div>

      {/* ━━━━━━━━━━━━ إزاي تطلبي بسهولة؟ (Visual Story Cards) ━━━━━━━━━━━━ */}
      <OrderStepsVisualCards />

      {/* ━━━━━━━━━━━━ عن المحل ━━━━━━━━━━━━ */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-white p-5 sm:p-10 shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12">

          {/* الجانب المرئي — يظهر أول على الموبايل */}
          <div className="w-full lg:w-64 xl:w-72 flex-shrink-0 order-first lg:order-last">
            <div className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] bg-burgundy/5 aspect-[4/3] sm:aspect-square flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-burgundy/5 to-beige/30" />
              <div className="relative text-center p-4 sm:p-6 space-y-2 sm:space-y-3 flex flex-col items-center">
                <img src={logoSrc} alt="ModaPella Logo" className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-2xl bg-white p-2 shadow-sm border border-burgundy/10 transition-transform duration-300 hover:scale-105" />
                <p className="text-base sm:text-lg font-bold text-burgundy">ModaPella</p>
                <p className="text-xs text-burgundy/60">بني مزار — المنيا</p>
                <div className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  ● مفتوح الآن
                </div>
              </div>
            </div>
          </div>

          {/* الجانب النصي */}
          <div className="flex-1 space-y-4 sm:space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-burgundy/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-burgundy">
              ModaPella
              <span className="block h-2 w-2 rounded-full bg-burgundy animate-pulse" />
            </span>
            <h2 className="text-xl sm:text-3xl font-bold text-burgundy leading-snug">عن محلنا</h2>
            <p className="text-sm sm:text-base leading-7 sm:leading-8 text-burgundy/75">
              {siteConfig.aboutText}
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-burgundy/10 text-burgundy">
                  <Icon name="location" className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-burgundy">العنوان</p>
                  <p className="text-sm text-burgundy/70">{siteConfig.storeAddress}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-burgundy/10 text-burgundy">
                  <Icon name="phone" className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-burgundy">للتواصل</p>
                  <p className="text-sm text-burgundy/70">{siteConfig.storePhone}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                to="/shop"
                className="rounded-full bg-burgundy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#650018]"
              >
                تصفحي المنتجات
              </Link>
              <a
                href={`https://wa.me/${siteConfig.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-burgundy px-5 py-2.5 text-sm font-medium text-burgundy transition hover:bg-burgundy/10"
              >
                <svg className="h-4 w-4 fill-[#25D366]" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.446L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436.002 9.858-4.419 9.862-9.86.002-2.636-1.023-5.112-2.885-6.978C16.582 1.9 14.116.877 11.478.875c-5.442 0-9.866 4.42-9.87 9.861a9.814 9.814 0 001.492 5.161l-1.018 3.714 3.812-.999c1.637.893 3.167 1.362 4.155 1.362zm10.963-7.405c-.247-.124-1.462-.72-1.687-.801-.225-.082-.388-.124-.55.125-.162.247-.631.801-.773.962-.143.162-.285.182-.532.058-.247-.124-1.043-.383-1.987-1.227-.734-.654-1.229-1.462-1.373-1.711-.143-.247-.015-.38.109-.503.111-.11.247-.285.37-.428.123-.143.165-.244.247-.409.082-.165.041-.309-.021-.433-.062-.124-.55-1.326-.753-1.815-.198-.479-.399-.413-.55-.421-.143-.008-.306-.01-.47-.01-.162 0-.427.061-.65.309-.225.247-.856.837-.856 2.037s.872 2.358.995 2.524c.123.165 1.716 2.62 4.156 3.673.58.25 1.033.4 1.385.512.583.185 1.114.159 1.533.096.467-.069 1.462-.598 1.666-1.173.205-.576.205-1.071.143-1.173-.062-.102-.224-.165-.471-.289z" />
                </svg>
                واتساب
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━ مودال غرفة القياس قريباً ━━━━━━━━━━━━ */}
      {isFittingRoomModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsFittingRoomModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-burgundy/15 text-center text-burgundy space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-amber-100 text-burgundy flex items-center justify-center mx-auto text-2xl shadow-inner border border-amber-200">
              ✨
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-burgundy/5 text-burgundy text-xs font-black">
              <span>ميزة قيد التطوير والتجهيز</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-burgundy">
              غرفة القياس والتنسيق الذكية
            </h3>
            <p className="text-sm text-burgundy/75 leading-relaxed">
              فريق <strong className="text-burgundy">ModaPella</strong> يضع اللمسات الأخيرة على ميزة غرفة القياس والتنسيق الافتراضية، لتتمكني من تجربة وتنسيق الموديلات والألوان على المانيكان قبل الطلب!
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Link
                to="/shop"
                onClick={() => setIsFittingRoomModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-burgundy text-white font-bold text-sm shadow hover:bg-[#650018] transition text-center"
              >
                تصفحي الملابس المتاحة الآن
              </Link>
              <button
                type="button"
                onClick={() => setIsFittingRoomModalOpen(false)}
                className="py-3 px-4 rounded-xl border border-burgundy/20 bg-beige/20 text-burgundy font-bold text-sm hover:bg-beige/40 transition cursor-pointer"
              >
                حسناً، فهمت
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}

export default LandingPage;
