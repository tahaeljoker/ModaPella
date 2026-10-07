import { createContext, useState, useEffect } from 'react';

const defaultContextValue = {
  compareItems: [],
  addToCompare: () => false,
  removeFromCompare: () => {},
  clearCompare: () => {},
  isComparing: () => false,
  isCompareOpen: false,
  setIsCompareOpen: () => {},
};

const CompareContext = createContext(defaultContextValue);

export const CompareProvider = ({ children }) => {
  const [compareItems, setCompareItems] = useState(() => {
    try {
      const saved = sessionStorage.getItem('modapella-compare');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem('modapella-compare', JSON.stringify(compareItems));
    } catch (e) {
      console.error(e);
    }
  }, [compareItems]);

  const addToCompare = (product) => {
    if (!product || !product._id) return false;
    
    // Check if already in list
    if (compareItems.some((item) => item._id === product._id)) {
      // Toggle remove
      setCompareItems((prev) => prev.filter((item) => item._id !== product._id));
      return false;
    }

    if (compareItems.length >= 2) {
      // Replace second item or update list with new one
      setCompareItems([compareItems[0], product]);
      setIsCompareOpen(true);
      return true;
    } else {
      const next = [...compareItems, product];
      setCompareItems(next);
      if (next.length === 2) {
        setIsCompareOpen(true);
      }
      return true;
    }
  };

  const removeFromCompare = (productId) => {
    setCompareItems((prev) => prev.filter((item) => item._id !== productId));
  };

  const clearCompare = () => {
    setCompareItems([]);
    setIsCompareOpen(false);
  };

  const isComparing = (productId) => {
    return compareItems.some((item) => item._id === productId);
  };

  return (
    <CompareContext.Provider
      value={{
        compareItems,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isComparing,
        isCompareOpen,
        setIsCompareOpen,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
};

export default CompareContext;
