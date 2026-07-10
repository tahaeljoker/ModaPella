import { useNavigate } from 'react-router-dom';
import LazyImage from './LazyImage';

const fallbackImages = {
  Blouse: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
  Chemise: 'https://images.unsplash.com/photo-1520975915070-3d4fa8f300fd?auto=format&fit=crop&w=900&q=80',
  Skirt: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
  Dress: 'https://images.unsplash.com/photo-1521335629791-ce4aec67dd83?auto=format&fit=crop&w=900&q=80',
  Pantalon: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
  'T-shirt': 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
  Portefeuille: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80'
};

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

function ProductCard({ product }) {
  const navigate = useNavigate();
  const image = product.images?.[0] || fallbackImages[product.category] || fallbackImages.Blouse;

  return (
    <div
      onClick={() => navigate(`/product/${product._id}`)}
      className="reveal-on-scroll group stagger-item flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl sm:rounded-[2rem] border border-burgundy/10 bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative overflow-hidden aspect-4-5 sm:aspect-[3/4]">
        <LazyImage src={image} alt={product.name} className="w-full h-full transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-burgundy/80 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-90" />
        <div className="absolute left-2 sm:left-4 top-2 sm:top-4 rounded-full border border-white/60 bg-white/90 px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-semibold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-burgundy shadow-sm">عرض التفاصيل</div>
        <div className="absolute right-2 sm:right-4 bottom-2 sm:bottom-4 rounded-full bg-white/95 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-burgundy shadow-sm">{product.stock > 0 ? `${product.stock} متبقي` : 'غير متوفر'}</div>
      </div>
      <div className="flex flex-1 flex-col justify-between space-y-2 p-3.5 sm:p-6 text-burgundy">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-burgundy/60">{product.category}</p>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-3">
            <h3 className="text-sm sm:text-base font-bold line-clamp-1">{product.name}</h3>
            <span className="text-xs sm:text-sm font-extrabold text-burgundy/80 whitespace-nowrap">{EGP(product.price)}</span>
          </div>
          <p className="hidden sm:block text-xs leading-6 text-burgundy/75">{product.description || 'تفاصيل أنيقة عن هذا المنتج الحديث.'}</p>
        </div>
        <div className="hidden sm:flex flex-wrap gap-2">
          {product.sizes?.slice(0, 3).map((size) => (
            <span key={size} className="rounded-full border border-burgundy/20 bg-beige/20 px-3 py-1 text-xs text-burgundy">{size}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
