import { createContext, useContext, useState, useEffect } from 'react';

const FavoritesContext = createContext();

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('modapella_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('modapella_favorites', JSON.stringify(favorites));
    } catch (e) {}
  }, [favorites]);

  const toggleFavorite = (product) => {
    if (!product || !product._id) return;
    setFavorites((prev) => {
      const exists = prev.some((item) => item._id === product._id);
      if (exists) {
        return prev.filter((item) => item._id !== product._id);
      } else {
        return [...prev, {
          _id: product._id,
          name: product.name,
          price: product.price,
          discountPrice: product.discountPrice,
          images: product.images,
          category: product.category,
          stock: product.stock
        }];
      }
    });
  };

  const isFavorite = (productId) => {
    return favorites.some((item) => item._id === productId);
  };

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

export default FavoritesContext;
