import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import { cleanProductName } from '../utils/discount';

function CategoryPage() {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  const sampleProducts = [
    { _id: 'sp-p1', name: 'Classic Pantalon', category: 'بنطال', price: 45.0, stock: 12, images: ['https://images.unsplash.com/photo-1520975915070-3d4fa8f300fd?auto=format&fit=crop&w=900&q=80'], sizes: ['S','M','L'], colors: ['#000','#7C0A12'] },
    { _id: 'sp-b1', name: 'Soft Blouse', category: 'بلوزة', price: 29.0, stock: 8, images: ['https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80'], sizes: ['XS','S','M'], colors: ['#fff','#f3e8e6'] }
  ];

  useEffect(() => {
    const decoded = decodeURIComponent(slug);
    api.get('/products')
      .then((res) => {
        const filtered = res.data.filter((p) => p.category === decoded);
        setProducts(filtered);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slug]);

  const filteredByOptions = products.filter((p) => {
    if (!selectedSize && !selectedColor) return true;
    let ok = true;
    if (selectedSize) ok = ok && p.sizes && p.sizes.includes(selectedSize);
    if (selectedColor) ok = ok && p.colors && p.colors.includes(selectedColor);
    return ok;
  });

  return (
    <section className="space-y-8 py-10 text-burgundy">
      <div className="rounded-[2.5rem] border border-burgundy/10 bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-semibold">{decodeURIComponent(slug)}</h1>
        <p className="mt-2 text-sm text-burgundy/75">عرض كل العناصر في هذه الفئة.</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm">المقاس:</label>
          <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} className="rounded-md border px-3 py-1">
            <option value="">كل المقاسات</option>
            <option value="XS">XS</option>
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">اللون:</label>
          <select value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="rounded-md border px-3 py-1">
            <option value="">كل الألوان</option>
            <option value="#000">أسود</option>
            <option value="#fff">أبيض</option>
            <option value="#7C0A12">بوردو</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-beige/20 p-10 text-center">جاري التحميل...</div>
      ) : products.length === 0 ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-beige/20 p-10 text-center">
          لا توجد منتجات في هذه الفئة. عرض عينات مؤقتة.
          <div className="mt-6 grid gap-6 grid-cols-2 sm:grid-cols-4">
            {sampleProducts.map((p) => (
              <div key={p._id} className="rounded-[1.5rem] overflow-hidden border">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={p.images[0]} alt={cleanProductName(p.name)} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <h4 className="font-semibold">{cleanProductName(p.name)}</h4>
                  <p className="text-sm text-burgundy/70">${p.price.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 stagger-container">
          {(filteredByOptions.length ? filteredByOptions : products).map((p) => (
            <div className="stagger-item" key={p._id}><ProductCard product={p} /></div>
          ))}
        </div>
      )}
    </section>
  );
}

export default CategoryPage;
