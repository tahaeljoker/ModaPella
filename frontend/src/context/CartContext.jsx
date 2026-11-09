import { createContext, useEffect, useState } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('modapella-cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cartToast, setCartToast] = useState({ show: false, item: null });

  useEffect(() => {
    localStorage.setItem('modapella-cart', JSON.stringify(cart));
  }, [cart]);

  const addItem = (product, quantity = 1, options = { showToast: true }) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.cartId === product.cartId);
      if (existing) {
        return prev.map((item) =>
          item.cartId === product.cartId
            ? { ...item, quantity: Math.min(item.quantity + quantity, 10) }
            : item
        );
      }
      return [...prev, { ...product, quantity: Math.min(quantity, 10) }];
    });

    if (options.showToast !== false) {
      setCartToast({
        show: true,
        item: { ...product, quantity }
      });
    }
  };

  const hideCartToast = () => {
    setCartToast({ show: false, item: null });
  };

  const removeItem = (cartId) => setCart((prev) => prev.filter((item) => item.cartId !== cartId));

  const updateQuantity = (cartId, quantity) => {
    setCart((prev) =>
      prev.map((item) => (item.cartId === cartId ? { ...item, quantity: Math.max(1, Math.min(quantity, 10)) } : item))
    );
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cart,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      total,
      cartToast,
      hideCartToast
    }}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
