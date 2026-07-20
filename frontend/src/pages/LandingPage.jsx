import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import { cleanProductName } from '../utils/discount';
import { Icon } from '../components/Icon';

const defaultSiteConfig = {
  published: true,
  heroTitle: 'أزياء تليق بكِ',
  heroSubtitle: 'تصفحي أحدث الموديلات النسائية واطلبي بسهولة، أو زوري محلنا مباشرة في بني مزار.',
  heroCtaLabel: 'تسوقي الآن',
  heroCtaLink: '/shop',
  secondaryCtaLabel: 'شاهدي المجموعات',
  secondaryCtaLink: '/collections',
  featuredTitle: 'أحدث الموديلات',
  featuredSubtitle: 'قطع مختارة بعناية — شوفي اللي يعجبك واطلبيه على طول.',
  maintenanceMessage: 'الموقع غير متاح حالياً، سنعود قريباً.',
  whatsappNumber: '201090048832',
  storeAddress: 'شارع الإعدادية بنات، بني مزار، المنيا',
  storePhone: '01090048832',
  aboutText: 'محل أزياء نسائي في قلب بني مزار، بنقدم فيه أحدث الموديلات العصرية بأسعار كويسة. تقدري تتصفحي اونلاين وتطلبي، أو تيجي المحل مباشرة وتشوفي القطع على عينك.'
};

const heroImages = [
  'https://i.postimg.cc/NFz9t4fC/Elegant-fashion-website-hero-banner-women-s-clothing-rack-background-soft-burgundy-overlay-modern.jpg',
  'https://images.unsplash.com/photo-1520975915070-3d4fa8f300fd?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80'
];

function LandingPage() {
  const [products, setProducts] = useState([]);
  const [siteConfig, setSiteConfig] = useState(defaultSiteConfig);

  useEffect(() => {
    api.get('/products')
      .then((res) => {
        const active = (res.data || []).filter(p => (p.stock ?? 0) > 0);
        setProducts(active.slice(0, 8));
      })
      .catch(() => setProducts([]));

    api.get('/admin/site-config')
      .then((res) => setSiteConfig(res.data))
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

      {/* شريط الإعلان */}
      {siteConfig.announcementBar && (
        <div className="rounded-2xl bg-burgundy text-white text-center py-2.5 px-4 text-xs sm:text-sm font-semibold tracking-wide shadow">
          {siteConfig.announcementBar}
        </div>
      )}

      {/* ━━━━━━━━━━━━ HERO ━━━━━━━━━━━━ */}
      <div className="relative overflow-hidden rounded-[2rem] border border-burgundy/10 bg-white shadow-soft">
        {/* صورة الخلفية */}
        <div className="relative aspect-[16/9] sm:aspect-[12/5] max-h-[60vh] overflow-hidden">
          {/* صورة الخلفية مثبتة من اليمين لإخفاء المساحة البيضاء الأيسر */}
          <img
            src={heroImages[0]}
            alt="ModaPella"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              height: '100%',
              width: '100%',
              objectFit: 'cover',
              objectPosition: 'right center',
              transform: 'scale(1.15)',
              transformOrigin: 'right center',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-burgundy/80 via-burgundy/30 to-transparent" />

          {/* النص فوق الصورة */}
          <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-10">
            <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
              ModaPella
              <span className="block h-2 w-2 rounded-full bg-white animate-pulse" />
            </span>
            <h1 className="text-2xl sm:text-4xl font-bold text-white leading-snug max-w-lg">
              {siteConfig.heroTitle}
            </h1>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-white/80 max-w-md leading-7">
              {siteConfig.heroSubtitle}
            </p>
            <div className="mt-4 sm:mt-6 flex flex-wrap gap-3">
              <Link
                to={siteConfig.heroCtaLink || '/shop'}
                className="rounded-full bg-white px-5 sm:px-7 py-2.5 sm:py-3 text-sm font-bold text-burgundy transition hover:bg-beige shadow"
              >
                {siteConfig.heroCtaLabel}
              </Link>
              <Link
                to={siteConfig.secondaryCtaLink || '/collections'}
                className="rounded-full border border-white/60 px-5 sm:px-7 py-2.5 sm:py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                {siteConfig.secondaryCtaLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━ خطوات الطلب ━━━━━━━━━━━━ */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-white p-5 sm:p-10 shadow-soft">
        <div className="text-center mb-7 sm:mb-10 space-y-1">
          <h2 className="text-xl sm:text-3xl font-bold text-burgundy">إزاي تطلبي بسهولة؟</h2>
          <p className="text-sm text-burgundy/60">ثلاث خطوات وقطعتك في إيدك</p>
        </div>
        <div className="grid gap-3 sm:gap-6 grid-cols-3">
          {[
            { num: '١', icon: 'search', title: 'تصفحي المتجر', desc: 'اختاري القطعة والمقاس اللي بيعجبك' },
            { num: '٢', icon: 'orders', title: 'سجلي طلبك', desc: 'أكملي بياناتك وأكدي الطلب بسهولة' },
            { num: '٣', icon: 'store', title: 'استلمي من المحل', desc: 'تعالي بني مزار وخدي قطعتك جاهزة' },
          ].map((step) => (
            <div
              key={step.num}
              className="flex flex-col items-center text-center rounded-2xl sm:rounded-[2rem] border border-burgundy/10 bg-burgundy/5 p-3 sm:p-8"
            >
              <div className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-burgundy text-white text-base sm:text-xl font-extrabold mb-3 shadow">
                {step.num}
              </div>
              <div className="mb-2 text-burgundy opacity-85">
                <Icon name={step.icon} className="w-6 h-6 sm:w-10 sm:h-10" />
              </div>
              <h3 className="text-xs sm:text-base font-bold text-burgundy leading-tight">{step.title}</h3>
              <p className="mt-1 text-[10px] sm:text-sm text-burgundy/60 leading-relaxed hidden sm:block">{step.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 sm:mt-8 text-center">
          <Link
            to="/shop"
            className="inline-flex items-center justify-center rounded-full bg-burgundy px-7 py-3 text-sm font-bold text-white transition hover:bg-[#650018] shadow"
          >
            ابدأي التسوق
          </Link>
        </div>
      </div>

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
            عرض الكل
          </Link>
        </div>
        <div className="grid gap-3 sm:gap-5 grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
          {products.length === 0 && (
            <div className="col-span-2 lg:col-span-4 text-center py-14 text-burgundy/40 text-sm">
              لا توجد منتجات متاحة حالياً، تابعونا قريباً ✨
            </div>
          )}
        </div>
      </div>

      {/* ━━━━━━━━━━━━ عن المحل ━━━━━━━━━━━━ */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-white p-5 sm:p-10 shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12">

          {/* الجانب المرئي — يظهر أول على الموبايل */}
          <div className="w-full lg:w-64 xl:w-72 flex-shrink-0 order-first lg:order-last">
            <div className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] bg-burgundy/5 aspect-[4/3] sm:aspect-square flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-burgundy/5 to-beige/30" />
              <div className="relative text-center p-4 sm:p-6 space-y-2 sm:space-y-3 flex flex-col items-center">
                <Icon name="store" className="w-12 h-12 text-burgundy" />
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

    </section>
  );
}

export default LandingPage;
