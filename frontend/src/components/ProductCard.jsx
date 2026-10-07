import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import LazyImage from './LazyImage';
import { isDiscountActive, cleanProductName } from '../utils/discount';
import CompareContext from '../context/CompareContext';


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
 const { addToCompare, isComparing } = useContext(CompareContext);
 const isItemComparing = isComparing(product._id);
 const image = product.images?.[0] || fallbackImages[product.category] || fallbackImages.Blouse;

 return (
 <div
 onClick={() => navigate(`/product/${product._id}`)}
 className="reveal-on-scroll group stagger-item flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl sm:rounded-[1.75rem] border border-burgundy/5 bg-white shadow-sm transition-all duration-500 ease-out hover:-translate-y-1.5 hover:scale-[1.015] hover:shadow-md"
 >
 <div className="relative overflow-hidden aspect-[4/3]">
 <button
  type="button"
  onClick={(e) => {
   e.stopPropagation();
   addToCompare(product);
  }}
  className={`absolute top-2 sm:top-4 right-2 sm:right-4 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-md backdrop-blur-sm z-10 ${
   isItemComparing
    ? 'bg-amber-400 text-burgundy font-black scale-105 ring-2 ring-amber-300 shadow-amber-900/30'
    : 'bg-white/90 text-burgundy/80 hover:bg-white hover:text-burgundy hover:scale-105'
  }`}
  title={isItemComparing ? 'إزالة من المقارنة' : 'مقارنة هذا الموديل 🪞'}
 >
  <span className="text-xs sm:text-sm">{isItemComparing ? '✓' : '🪞'}</span>
 </button>
 <LazyImage
 src={image}
 alt={cleanProductName(product.name)}
 className={`w-full h-full transition-all duration-700 ease-out group-hover:scale-105 ${
 product.images?.[1] ? 'group-hover:opacity-0' : ''
 }`}
 />
 {product.images?.[1] && (
 <img
 src={product.images[1]}
 alt={`${cleanProductName(product.name)} - 2`}
 className="absolute inset-0 w-full h-full object-cover opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-105"
 loading="lazy"
 />
 )}
 <div className="absolute inset-0 bg-gradient-to-t from-burgundy/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-90" />
 <div className="absolute left-2 sm:left-4 top-2 sm:top-4 rounded-full border border-white/60 bg-white/90 px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-medium tracking-[0.15em] text-burgundy shadow-sm">عرض التفاصيل</div>
 {isDiscountActive(product) && (
 <div className="absolute left-2 sm:left-4 top-9 sm:top-12 rounded-full bg-red-600 px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-sm">
 خصم {Math.round((1 - product.discountPrice / product.price) * 100)}%
 </div>
 )}
 {product.stock === 0 ? (
 <div className="absolute right-2 sm:right-4 bottom-2 sm:bottom-4 rounded-full bg-red-600 text-white px-2.5 sm:px-3 py-0.5 text-[9px] sm:text-[10px] font-bold shadow-sm">
 نفذت الكمية
 </div>
 ) : product.stock <= 5 ? (
 <div className="absolute right-2 sm:right-4 bottom-2 sm:bottom-4 rounded-full bg-amber-500 text-white px-2.5 sm:px-3 py-0.5 text-[9px] sm:text-[10px] font-bold shadow-md flex items-center gap-1 pulse-glow">
 <span className="text-[10px]">🔥</span>
 <span>متبقي {product.stock} فقط</span>
 </div>
 ) : product.stock <= 10 ? (
 <div className="absolute right-2 sm:right-4 bottom-2 sm:bottom-4 rounded-full bg-burgundy/90 text-white px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold shadow-sm flex items-center gap-1">
 <span>⚡</span>
 <span>طلب متزايد</span>
 </div>
 ) : (
 <div className="absolute right-2 sm:right-4 bottom-2 sm:bottom-4 rounded-full bg-white/95 px-2.5 sm:px-3 py-0.5 text-[9px] sm:text-[10px] font-semibold text-burgundy shadow-sm">
 متوفر
 </div>
 )}
 </div>
 <div className="flex flex-col justify-between p-3 sm:p-4 text-burgundy space-y-1.5">
 <div>
 <p className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-[0.2em] text-burgundy/50">{product.category}</p>
 <h3 className="text-xs sm:text-sm font-semibold mt-0.5 text-burgundy/90 line-clamp-1">{cleanProductName(product.name)}</h3>
 </div>
 <div className="flex items-baseline gap-2 pt-1 border-t border-burgundy/5">
 {isDiscountActive(product) ? (
 <>
 <span className="text-sm font-bold text-burgundy">{EGP(product.discountPrice)}</span>
 <span className="text-[10px] text-red-500 line-through">{EGP(product.price)}</span>
 </>
 ) : (
 <span className="text-sm font-bold text-burgundy">{EGP(product.price)}</span>
 )}
 </div>
 </div>
 </div>
 );
}

export default ProductCard;
