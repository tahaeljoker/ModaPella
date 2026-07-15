import { useContext, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import CartContext from '../context/CartContext';
import LazyImage from '../components/LazyImage';
import sampleProducts from '../data/sampleProducts';
import { isDiscountActive } from '../utils/discount';


function ProductDetailsPage() {
  const { id } = useParams();
  const { addItem } = useContext(CartContext);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api.get(`/products/${id}`)
      .then((response) => setProduct(response.data))
      .catch(() => {
        const sample = sampleProducts.find((item) => item._id === id);
        if (sample) {
          setProduct(sample);
        } else {
          setError('تعذر تحميل المنتج');
        }
      });
  }, [id]);

  useEffect(() => {
    if (product) {
      setSelectedSize(product.sizes?.[0] || '');
      setSelectedColor(product.colors?.[0] || '');
      setQuantity(product.stock > 0 ? 1 : 0);
    }
  }, [product]);

  if (error) {
    return (
      <section className="py-10 text-burgundy">
        <div className="rounded-[2.5rem] border border-burgundy/10 bg-white p-10 shadow-soft">{error}</div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="py-10 text-burgundy">
        <div className="rounded-[2.5rem] border border-burgundy/10 bg-white p-10 shadow-soft">جاري التحميل...</div>
      </section>
    );
  }

  const image = product.images?.[0] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=80';

  const handleAddToCart = () => {
    const activeDiscount = isDiscountActive(product);
    const cartItem = {
      ...product,
      price: activeDiscount ? product.discountPrice : product.price,
      originalPrice: product.price,
      isDiscountActive: activeDiscount,
      selectedSize,
      selectedColor,
      cartId: `${product._id}_${selectedSize || 'default'}_${selectedColor || 'default'}`
    };
    addItem(cartItem, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <section className="space-y-6 sm:space-y-10 py-4 sm:py-10 text-burgundy">
      <div className="rounded-2xl sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-4 sm:p-10 shadow-soft">
        <Link to="/shop" className="text-sm text-burgundy/70 underline">عودة إلى المتجر</Link>
        <div className="mt-6 sm:mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-xl sm:rounded-[2rem] bg-beige/10 aspect-[4/3] sm:aspect-[3/2]">
            <LazyImage src={image} alt={product.name} className="w-full h-full" />
          </div>
          <div className="space-y-5 sm:space-y-6">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] sm:tracking-[0.35em] text-burgundy/60">{product.category}</p>
            <h1 className="text-xl sm:text-3xl font-extrabold">{product.name}</h1>
            <p className="text-sm sm:text-base leading-6 sm:leading-8 text-burgundy/75">{product.description || 'وصف مميز للمنتج يعرض تفاصيل التصميم والجودة.'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl sm:rounded-[1.75rem] border border-burgundy/10 bg-white p-3.5 sm:p-6 text-burgundy/80">
                <h2 className="text-xs sm:text-sm font-semibold text-burgundy">السعر</h2>
                {isDiscountActive(product) ? (
                  <div className="flex flex-col gap-1 mt-1.5 sm:mt-3">
                    <p className="text-lg sm:text-2xl font-bold text-burgundy">{Number(product.discountPrice).toLocaleString('en-US')} ج.م</p>
                    <p className="text-xs text-red-500 line-through">{Number(product.price).toLocaleString('en-US')} ج.م</p>
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold w-fit">خصم {Math.round((1 - product.discountPrice / product.price) * 100)}%</span>
                  </div>
                ) : (
                  <p className="mt-1.5 sm:mt-3 text-lg sm:text-2xl font-bold text-burgundy">{Number(product.price).toLocaleString('en-US')} ج.م</p>
                )}
              </div>
              <div className="rounded-xl sm:rounded-[1.75rem] border border-burgundy/10 bg-white p-3.5 sm:p-6 text-burgundy/80">
                <h2 className="text-xs sm:text-sm font-semibold text-burgundy">المخزون المتوفر</h2>
                <p className="mt-1.5 sm:mt-3 text-lg sm:text-2xl font-bold text-burgundy">{product.stock}</p>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-[1.75rem] border border-burgundy/10 bg-beige/10 p-6 text-burgundy/80">
                <h2 className="text-sm font-semibold text-burgundy">معلومات المنتج</h2>
                <ul className="mt-4 space-y-3 text-sm leading-7">
                  <li><span className="font-semibold">الفئة:</span> {product.category}</li>
                  <li><span className="font-semibold">المقاسات:</span> {product.sizes?.join('، ') || 'غير محدد'}</li>
                  <li><span className="font-semibold">الألوان:</span> {product.colors?.join('، ') || 'متعدد'}</li>
                  <li><span className="font-semibold">النوع:</span> {product.type || 'أزياء أنيقة'}</li>
                </ul>
              </div>
              {product.sizes && product.sizes.length > 0 && (
                <div className="rounded-[1.25rem] border border-burgundy/10 bg-beige/10 p-4">
                  <h3 className="text-sm font-semibold">المقاسات المتاحة</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        className={`rounded-full border px-3 py-1 text-sm ${selectedSize === s ? 'border-burgundy bg-burgundy/10 text-burgundy' : 'border-burgundy/20 text-burgundy/80'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.colors && product.colors.length > 0 && (
                <div className="rounded-[1.25rem] border border-burgundy/10 bg-beige/10 p-4">
                  <h3 className="text-sm font-semibold">الألوان المتاحة</h3>
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    {product.colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${selectedColor === c ? 'border-burgundy bg-burgundy/10 text-burgundy' : 'border-burgundy/20 text-burgundy/80'}`}
                      >
                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c }} />
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-[1.25rem] border border-burgundy/10 bg-beige/10 p-4">
                <h3 className="text-sm font-semibold">الكمية المطلوبة</h3>
                <div className="mt-3 flex items-center gap-3">
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    disabled={product.stock === 0}
                    className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2 text-burgundy"
                  >
                    {Array.from({ length: Math.min(product.stock, 10) }, (_, index) => index + 1).map((qty) => (
                      <option key={qty} value={qty}>{qty} قطعة</option>
                    ))}
                  </select>
                  <span className="text-sm text-burgundy/70">من أصل {product.stock} قطع</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={`w-full rounded-xl sm:rounded-3xl px-6 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-white transition ${product.stock === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-burgundy hover:bg-[#650018]'}`}
              >
                {product.stock === 0 ? 'غير متوفر' : added ? 'تمت الإضافة' : 'أضف إلى السلة'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-[2rem] border border-burgundy/10 bg-white p-8 shadow-soft">
        <h3 className="text-2xl font-semibold">منتجات مشابهة</h3>
        <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-[1.25rem] overflow-hidden">
            <div className="aspect-[4/3] overflow-hidden relative">
              <LazyImage src="https://images.unsplash.com/photo-1520975915070-3d4fa8f300fd?auto=format&fit=crop&w=900&q=80" alt="منتج مشابه" className="absolute inset-0 h-full w-full" />
            </div>
          </div>
          <div className="rounded-[1.25rem] overflow-hidden">
            <div className="aspect-[4/3] overflow-hidden relative">
              <LazyImage src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80" alt="sample" className="absolute inset-0 h-full w-full" />
            </div>
          </div>
          <div className="rounded-[1.25rem] overflow-hidden">
            <div className="aspect-[4/3] overflow-hidden relative">
              <LazyImage src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80" alt="sample" className="absolute inset-0 h-full w-full" />
            </div>
          </div>
          <div className="rounded-[1.25rem] overflow-hidden">
            <div className="aspect-[4/3] overflow-hidden relative">
              <LazyImage src="https://images.unsplash.com/photo-1521335629791-ce4aec67dd83?auto=format&fit=crop&w=900&q=80" alt="sample" className="absolute inset-0 h-full w-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductDetailsPage;
