import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import LazyImage from '../components/LazyImage';
import { cleanProductName } from '../utils/discount';

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
      .then((response) => {
        const active = (response.data || []).filter(p => (p.stock ?? 0) > 0);
        setProducts(active.slice(0, 8));
      })
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
                <img src={product.images[0]} alt={cleanProductName(product.name)} className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <div className="p-3 sm:p-5">
                <p className="text-sm sm:text-base font-bold text-burgundy line-clamp-1">{cleanProductName(product.name)}</p>
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

      {/* About Section */}
      <div className="rounded-[2rem] sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-6 sm:p-10 shadow-soft" dir="rtl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12">
          {/* Text Side */}
          <div className="flex-1 space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-burgundy/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-burgundy">
              ModaPella
              <span className="block h-2 w-2 rounded-full bg-burgundy animate-pulse" />
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-burgundy leading-snug">عن ModaPella</h2>
            <p className="text-sm sm:text-base leading-8 text-burgundy/75">
              محل أزياء نسائي متخصص في أحدث الموديلات العصرية. نقدم تجربة تسوق راقية ومتكاملة، سواء تتصفحي اونلاين أو تزوري المحل مباشرةً.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-burgundy/10 text-base">📍</span>
                <div>
                  <p className="text-sm font-bold text-burgundy">موقع المحل</p>
                  <p className="text-sm text-burgundy/70">المنيا — بني مزار، شارع الإعدادية بنات</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-burgundy/10 text-base">📞</span>
                <div>
                  <p className="text-sm font-bold text-burgundy">تواصلي معنا</p>
                  <p className="text-sm text-burgundy/70">01090048832</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-burgundy/10 text-base">🛍️</span>
                <div>
                  <p className="text-sm font-bold text-burgundy">تسوق بسهولة</p>
                  <p className="text-sm text-burgundy/70">تصفحي الكتالوج اونلاين واطلبي، أو تعالي زوريناا في المحل مباشرة.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/shop" className="inline-flex items-center justify-center rounded-full bg-burgundy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#650018]">تصفح المنتجات</Link>
              <a href="https://wa.me/201090048832" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-burgundy px-5 py-2.5 text-sm font-medium text-burgundy transition hover:bg-burgundy/10">
                <svg className="h-4 w-4 fill-[#25D366]" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.446L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436.002 9.858-4.419 9.862-9.86.002-2.636-1.023-5.112-2.885-6.978C16.582 1.9 14.116.877 11.478.875c-5.442 0-9.866 4.42-9.87 9.861a9.814 9.814 0 001.492 5.161l-1.018 3.714 3.812-.999c1.637.893 3.167 1.362 4.155 1.362zm10.963-7.405c-.247-.124-1.462-.72-1.687-.801-.225-.082-.388-.124-.55.125-.162.247-.631.801-.773.962-.143.162-.285.182-.532.058-.247-.124-1.043-.383-1.987-1.227-.734-.654-1.229-1.462-1.373-1.711-.143-.247-.015-.38.109-.503.111-.11.247-.285.37-.428.123-.143.165-.244.247-.409.082-.165.041-.309-.021-.433-.062-.124-.55-1.326-.753-1.815-.198-.479-.399-.413-.55-.421-.143-.008-.306-.01-.47-.01-.162 0-.427.061-.65.309-.225.247-.856.837-.856 2.037s.872 2.358.995 2.524c.123.165 1.716 2.62 4.156 3.673.58.25 1.033.4 1.385.512.583.185 1.114.159 1.533.096.467-.069 1.462-.598 1.666-1.173.205-.576.205-1.071.143-1.173-.062-.102-.224-.165-.471-.289z"/></svg>
                واتساب
              </a>
            </div>
          </div>

          {/* Visual Side */}
          <div className="flex-shrink-0 w-full lg:w-64 xl:w-80">
            <div className="relative overflow-hidden rounded-[2rem] bg-burgundy/5 aspect-square flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-burgundy/5 to-beige/30" />
              <div className="relative text-center p-6 space-y-3">
                <div className="text-6xl">🏪</div>
                <p className="text-lg font-bold text-burgundy">ModaPella</p>
                <p className="text-xs text-burgundy/60 leading-relaxed">بني مزار — المنيا</p>
                <div className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">● مفتوح الآن</div>
              </div>
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
                <LazyImage src={p.images[0]} alt={cleanProductName(p.name)} className="w-full h-full" />
              </div>
              <div className="p-3.5">
                <h4 className="font-semibold text-sm sm:text-base line-clamp-1">{cleanProductName(p.name)}</h4>
                <p className="text-xs sm:text-sm text-burgundy/70 font-extrabold mt-1">{Number(p.price).toLocaleString('en-US')} ج.م</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How to Order Steps */}
      <div className="rounded-[2rem] sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-6 sm:p-10 shadow-soft" dir="rtl">
        <div className="text-center space-y-2 mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-burgundy">إزاي تطلبي بسهولة؟</h2>
          <p className="text-sm text-burgundy/70">ثلاث خطوات بسيطة وقطعتك في إيدك</p>
        </div>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
          {/* Step 1 */}
          <div className="relative flex flex-col items-center text-center rounded-[2rem] border border-burgundy/10 bg-burgundy/5 p-6 sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-burgundy text-white text-xl font-extrabold mb-4 shadow-lg">١</div>
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-base sm:text-lg font-bold text-burgundy">تصفحي الكتالوج</h3>
            <p className="mt-2 text-xs sm:text-sm text-burgundy/70 leading-relaxed">اختاري القطعة والمقاس واللون اللي بيعجبك من المتجر.</p>
          </div>
          {/* Arrow - hidden on mobile */}
          {/* Step 2 */}
          <div className="relative flex flex-col items-center text-center rounded-[2rem] border border-burgundy/10 bg-white p-6 sm:p-8 shadow-soft">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-burgundy text-white text-xl font-extrabold mb-4 shadow-lg">٢</div>
            <div className="text-4xl mb-3">📝</div>
            <h3 className="text-base sm:text-lg font-bold text-burgundy">سجلي طلبك</h3>
            <p className="mt-2 text-xs sm:text-sm text-burgundy/70 leading-relaxed">ابعتي بياناتك وأكدي الطلب. هنتواصل معاكي على طول.</p>
          </div>
          {/* Step 3 */}
          <div className="relative flex flex-col items-center text-center rounded-[2rem] border border-burgundy/10 bg-beige/20 p-6 sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-burgundy text-white text-xl font-extrabold mb-4 shadow-lg">٣</div>
            <div className="text-4xl mb-3">🏪</div>
            <h3 className="text-base sm:text-lg font-bold text-burgundy">استلمي من المحل</h3>
            <p className="mt-2 text-xs sm:text-sm text-burgundy/70 leading-relaxed">تعالي المحل في بني مزار واستلمي قطعتك جاهزة ومجهزة.</p>
          </div>
        </div>
        <div className="mt-8 text-center">
          <Link to="/shop" className="inline-flex items-center justify-center rounded-full bg-burgundy px-8 py-3 text-sm font-bold text-white transition hover:bg-[#650018] shadow">ابدأي التسوق الآن</Link>
        </div>
      </div>
    </section>
  );
}

export default LandingPage;
