import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

const categoryLabels = {
  All: 'كل الفئات',
  Blazer: 'بليزر',
  Blouse: 'بلوزة',
  Chemise: 'قميص',
  Skirt: 'تنورة',
  Dress: 'فستان',
  Pantalon: 'بنطال',
  'T-shirt': 'تيشيرت',
  Portefeuille: 'محفظة'
};

const sampleProducts = [
  { _id: 'sample-p1', name: 'Classic Pantalon', category: 'بنطال', price: 45.0, stock: 12, images: ['https://images.unsplash.com/photo-1520975915070-3d4fa8f300fd?auto=format&fit=crop&w=900&q=80'], sizes: ['S', 'M', 'L'], colors: ['#000', '#7C0A12'] },
  { _id: 'sample-b1', name: 'Soft Blouse', category: 'بلوزة', price: 29.0, stock: 8, images: ['https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80'], sizes: ['XS', 'S', 'M'], colors: ['#fff', '#f3e8e6'] },
  { _id: 'sample-d1', name: 'Elegant Dress', category: 'فستان', price: 69.0, stock: 5, images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80'], sizes: ['S', 'M', 'L'], colors: ['#8A0303', '#0A183D'] },
  { _id: 'sample-t1', name: 'Casual T-shirt', category: 'تيشيرت', price: 22.0, stock: 14, images: ['https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80'], sizes: ['M', 'L'], colors: ['#fff', '#222'] }
];

function CollectionsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [siteConfig, setSiteConfig] = useState(null);

  useEffect(() => {
    api.get('/products')
      .then((response) => setProducts(response.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));

    api.get('/admin/site-config')
      .then((response) => setSiteConfig(response.data))
      .catch(console.error);
  }, []);

  const mergedCategoryLabels = {
    All: 'كل الفئات',
    Blazer: 'بليزر',
    Blouse: 'بلوزة',
    Chemise: 'قميص',
    Skirt: 'تنورة',
    Dress: 'فستان',
    Pantalon: 'بنطال',
    'T-shirt': 'تيشيرت',
    Portefeuille: 'محفظة',
    ...categoryLabels
  };

  if (siteConfig?.categories) {
    siteConfig.categories.forEach(c => {
      mergedCategoryLabels[c.key] = c.nameAr;
    });
  }

  const rawCategories = Array.from(new Set(products.map((product) => product.category))).filter(Boolean);
  const categories = ['All', ...(siteConfig?.categories?.map(c => c.key) || (rawCategories.length ? rawCategories : ['Blouse', 'Chemise', 'Skirt', 'Dress', 'Pantalon', 'T-shirt', 'Portefeuille']))];
  const filteredProducts = activeCategory === 'All' ? products : products.filter((product) => product.category === activeCategory);
  const visibleProducts = products.length ? (filteredProducts.length ? filteredProducts : []) : sampleProducts;

  return (
    <section className="space-y-10 py-10 text-burgundy">
      <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-6 sm:p-10 shadow-soft">
        <div className="hero-blob" />
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full bg-burgundy/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-burgundy">الملابس</span>
            <h1 className="text-4xl font-semibold leading-tight text-burgundy">تسوقي الملابس العصرية بأسلوب أنيق</h1>
            <p className="max-w-2xl text-base leading-7 text-burgundy/75">اكتشفي تشكيلة مختارة من القطع مع تجربة عرض أنيقة ومتحركة تضيف لمسة فاخرة لواجهة المتجر.</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/shop" className="inline-flex items-center justify-center rounded-full bg-burgundy px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#650018]">تسوّقي الآن</Link>
              <Link to="/cart" className="inline-flex items-center justify-center rounded-full border border-burgundy px-6 py-3 text-sm font-semibold text-burgundy transition hover:bg-burgundy/10">عرض السلة</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-burgundy/10 bg-beige/10 p-5 text-sm text-burgundy/80">
                <h2 className="font-semibold text-burgundy">فلترة ذكية</h2>
                <p className="mt-2">صفي المنتجات بسرعة حسب الفئة لتجربة تسوق أكثر سلاسة.</p>
              </div>
              <div className="rounded-[1.75rem] border border-burgundy/10 bg-beige/10 p-5 text-sm text-burgundy/80">
                <h2 className="font-semibold text-burgundy">عرض التفاصيل</h2>
                <p className="mt-2">اضغطي على أي منتج لتنتقلي إلى صفحة التفاصيل مع المقاسات والألوان والكمية.</p>
              </div>
            </div>
          </div>

          <div className="hero-image-frame overflow-hidden rounded-[2rem] shadow-xl aspect-[12/7] max-h-[26rem]">
            <img
              src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80"
              alt="Shop hero"
              className="h-full w-full object-cover animate-hero-img"
            />
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] sm:rounded-[2.5rem] border border-burgundy/10 bg-beige/10 p-6 sm:p-8 shadow-soft">
        <h2 className="text-2xl font-semibold text-burgundy">فلترة حسب الفئة</h2>
        <p className="mt-2 text-sm text-burgundy/70">اختاري الفئة المناسبة أو عرضي كل المنتجات المتاحة الآن.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeCategory === category ? 'bg-burgundy text-white' : 'border border-burgundy/20 text-burgundy hover:bg-burgundy/10'}`}
            >
              {mergedCategoryLabels[category] || category}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-[2rem] sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-6 sm:p-10 text-center text-burgundy">جاري التحميل...</div>
      ) : (
        <div className="space-y-8">
          {visibleProducts.length > 0 ? (
            <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 stagger-container">
              {visibleProducts.map((product) => (
                <div className="stagger-item" key={product._id}><ProductCard product={product} /></div>
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-6 sm:p-10 shadow-soft">
              <p className="text-lg font-semibold text-burgundy">لا توجد منتجات في هذه الفئة حاليًا.</p>
              <p className="mt-2 text-sm text-burgundy/75">عرض بعض العينات حتى تعود المنتجات المتاحة.</p>
              <div className="mt-8 grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
                {sampleProducts.map((product) => (
                  <div className="stagger-item" key={product._id}><ProductCard product={product} /></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default CollectionsPage;
