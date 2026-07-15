import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import LazyImage from '../components/LazyImage';

const defaultSiteConfig = {
  published: true,
  heroTitle: 'مودا بيلا جاهزة الآن للإطلاق.',
  heroSubtitle: 'واجهة جاهزة للاستخدام، متجر حديث، وتصفح فوري للألوان والمقاسات.',
  heroCtaLabel: 'ابدأي التسوق',
  heroCtaLink: '/shop',
  secondaryCtaLabel: 'شاهد المجموعات',
  secondaryCtaLink: '/collections',
  featuredTitle: 'أحدث المنتجات',
  featuredSubtitle: 'منتجاتنا المميزة الآن، مع عرض سريع لكل قطعة.',
  maintenanceMessage: 'الموقع غير متاح حالياً، سنعود قريباً.'
};

const categories = ['بلوزة', 'قميص', 'تنورة', 'فستان', 'بنطال', 'تيشيرت', 'محفظة'];
const pageLinks = [
  { label: 'المتجر', description: 'اكتشف الأحدث', to: '/shop' },
  { label: 'من نحن', description: 'تعرف على القصة', to: '/about' },
  { label: 'اتصل بنا', description: 'واحد مننا سيساعدك', to: '/contact' },
  { label: 'الدفع', description: 'أسرع طريقة لإتمام الطلب', to: '/payment' }
];
const heroImages = [
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1520975915070-3d4fa8f300fd?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80'
];

function LandingPage() {
  const [products, setProducts] = useState([]);
  const [siteConfig, setSiteConfig] = useState(defaultSiteConfig);
  const sampleProducts = [
    { _id: 'sample-p1', name: 'Classic Pantalon', category: 'بنطال', price: 45.0, stock: 12, images: ['https://images.unsplash.com/photo-1520975915070-3d4fa8f300fd?auto=format&fit=crop&w=900&q=80'] },
    { _id: 'sample-b1', name: 'Soft Blouse', category: 'بلوزة', price: 29.0, stock: 8, images: ['https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80'] }
  ];

  useEffect(() => {
    api.get('/products')
      .then((response) => setProducts(response.data.slice(0, 8)))
      .catch(() => setProducts([]));

    api.get('/admin/site-config')
      .then((response) => setSiteConfig(response.data))
      .catch(() => setSiteConfig(defaultSiteConfig));
  }, []);

  if (!siteConfig.published) {
    return (
      <section className="py-20 text-center text-burgundy">
        <div className="rounded-[2rem] border border-burgundy/10 bg-white p-10 shadow-soft">
          <h1 className="text-3xl font-semibold">النشر معطل حالياً</h1>
          <p className="mt-4 text-burgundy/70">{siteConfig.maintenanceMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-10 py-8 text-burgundy">
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-burgundy/10 bg-white p-6 lg:p-8 shadow-soft">
          <span className="inline-flex items-center gap-2 rounded-full bg-burgundy/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-burgundy">
            ModaPella
            <span className="block h-2 w-2 rounded-full bg-burgundy animate-pulse" />
          </span>

          <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <h1 className="text-3xl font-semibold leading-snug tracking-tight text-burgundy sm:text-4xl">{siteConfig.heroTitle}</h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-burgundy/75">{siteConfig.heroSubtitle}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-burgundy/20 bg-burgundy/5 px-3 py-2 text-xs font-medium text-burgundy">إطلاق فوري</span>
              <span className="rounded-full border border-burgundy/20 bg-burgundy/5 px-3 py-2 text-xs font-medium text-burgundy">منتجات جاهزة</span>
              <span className="rounded-full border border-burgundy/20 bg-burgundy/5 px-3 py-2 text-xs font-medium text-burgundy">تجربة احترافية</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link to={siteConfig.heroCtaLink || '/shop'} className="inline-flex items-center justify-center rounded-full bg-burgundy px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#650018]">{siteConfig.heroCtaLabel}</Link>
            <Link to={siteConfig.secondaryCtaLink || '/collections'} className="inline-flex items-center justify-center rounded-full border border-burgundy px-6 py-3 text-sm font-medium text-burgundy transition hover:bg-burgundy/10">{siteConfig.secondaryCtaLabel}</Link>
          </div>

          <div className="mt-6 relative overflow-hidden rounded-[1.75rem] bg-white shadow-soft">
            <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-burgundy/10" />
            <div className="relative aspect-[12/7] max-h-[20rem] overflow-hidden">
              <img src={heroImages[0]} alt="Hero" className="absolute inset-0 h-full w-full object-cover transition duration-1000 ease-out hover:scale-105 animate-hero-img" />
              <div className="absolute inset-x-0 bottom-0 mx-4 mb-4 rounded-3xl bg-white/85 px-4 py-3 text-sm text-burgundy shadow-soft backdrop-blur-sm">
                <p className="font-semibold">عرض مباشر للمقاسات والألوان</p>
                <p className="mt-1 text-xs text-burgundy/70">كل التفاصيل تظهر بسرعة بدون تحميل الصفحة بالكامل.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-6 sm:p-10 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold">{siteConfig.featuredTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-burgundy/75">{siteConfig.featuredSubtitle}</p>
          </div>
          <Link to="/collections" className="inline-flex items-center justify-center rounded-full border border-burgundy px-6 py-3 text-sm font-semibold text-burgundy transition hover:bg-burgundy/5">عرض الكل</Link>
        </div>
        <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          {sampleProducts.map((product) => (
            <div key={product._id} className="rounded-2xl sm:rounded-[2rem] border border-burgundy/10 bg-beige/10 overflow-hidden shadow-soft transition hover:-translate-y-1 hover:shadow-xl">
              <div className="aspect-[4/3] overflow-hidden relative">
                <img src={product.images[0]} alt={product.name} className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <div className="p-3 sm:p-5">
                <p className="text-sm sm:text-base font-bold text-burgundy line-clamp-1">{product.name}</p>
                <p className="mt-1 text-xs text-burgundy/75">{product.category}</p>
                <div className="mt-3 flex items-center justify-between text-xs sm:text-sm text-burgundy/80">
                  <span className="font-extrabold">{Number(product.price).toLocaleString('en-US')} ج.م</span>
                  <span>{product.stock} متوفر</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-6 sm:p-10 shadow-soft wave-banner">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold">سريع الوصول</h2>
            <p className="mt-2 text-sm text-burgundy/75">اقسم موقعك بأناقة في صفحة واحدة.</p>
          </div>
          <div className="hidden rounded-full bg-burgundy/5 px-4 py-2 text-sm text-burgundy sm:block">حركة ناعمة وواجهة أنيقة</div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {pageLinks.map((link) => (
            <Link key={link.to} to={link.to} className="page-link-card rounded-[1.75rem] border border-burgundy/10 bg-burgundy/5 p-6 text-start text-burgundy transition hover:bg-burgundy/10">
              <p className="text-lg font-semibold">{link.label}</p>
              <p className="mt-2 text-sm text-burgundy/70">{link.description}</p>
            </Link>
          ))}
        </div>
        <div className="mt-8">
          <div className="rounded-full bg-white/80 p-5 shadow-soft">
            <p className="text-sm text-burgundy/75">اقترح إضافة صورة متحركة هنا: مثلاً قالب عرض سريع للبناطيل والبلوزات مع شريط حركة خفيف تحت النص.</p>
            <div className="mt-4 rounded-full bg-burgundy/10 p-1">
              <div className="moving-stripe"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold">المنتجات المميزة</h2>
            <p className="mt-2 text-sm text-burgundy/75">انقر على أي منتج لعرض تفاصيله الكاملة.</p>
          </div>
          <div className="rounded-3xl bg-beige/20 px-5 py-3 text-sm text-burgundy/80">عرض سريع | متجر أزياء</div>
        </div>

        {products.length > 0 ? (
          <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 stagger-container">
            {products.map((product) => (
              <div className="stagger-item" key={product._id}><ProductCard product={product} /></div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
            {sampleProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-12 rounded-[2rem] border border-burgundy/10 bg-white p-8 shadow-soft">
        <h3 className="text-2xl font-semibold">Temporary Samples</h3>
        <p className="mt-2 text-sm text-burgundy/75">نماذج مؤقتة من البناطيل والبلوزات لعرض الشكل حتى يتم النشر من الداشبورد.</p>
        <div className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          {sampleProducts.concat(sampleProducts).map((p, i) => (
            <div key={i} className="rounded-xl sm:rounded-[1.5rem] overflow-hidden border border-burgundy/10 reveal-on-scroll">
              <div className="aspect-[4/3] overflow-hidden">
                <LazyImage src={p.images[0]} alt={p.name} className="w-full h-full" />
              </div>
              <div className="p-3.5">
                <h4 className="font-semibold text-sm sm:text-base line-clamp-1">{p.name}</h4>
                <p className="text-xs sm:text-sm text-burgundy/70 font-extrabold mt-1">{Number(p.price).toLocaleString('en-US')} ج.م</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2.5rem] border border-burgundy/10 bg-burgundy/5 p-8 shadow-soft">
          <h3 className="text-2xl font-semibold text-burgundy">تصميم فاخر</h3>
          <p className="mt-3 text-sm leading-7 text-burgundy/75">لوحة ألوان ناعمة وتصاميم بطابع عصري.</p>
        </div>
        <div className="rounded-[2.5rem] border border-burgundy/10 bg-white p-8 shadow-soft">
          <h3 className="text-2xl font-semibold">سهولة الاستخدام</h3>
          <p className="mt-3 text-sm leading-7 text-burgundy/75">تنقل متجاوب وسلس بين الصفحات والأقسام.</p>
        </div>
        <div className="rounded-[2.5rem] border border-burgundy/10 bg-beige/20 p-8 shadow-soft">
          <h3 className="text-2xl font-semibold text-burgundy">دفع Instapay</h3>
          <p className="mt-3 text-sm leading-7 text-burgundy/75">بوابة دفع واحدة آمنة ومباشرة لكل الطلبات.</p>
        </div>
      </div>
    </section>
  );
}

export default LandingPage;
