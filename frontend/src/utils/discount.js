export const isDiscountActive = (product) => {
  if (!product) return false;
  if (product.allowDiscount === false) return false;
  if (!product.discountPrice || product.discountPrice <= 0 || product.discountPrice >= product.price) {
    return false;
  }
  const now = new Date();
  if (product.discountStartDate && new Date(product.discountStartDate) > now) {
    return false;
  }
  if (product.discountEndDate) {
    const end = new Date(product.discountEndDate);
    end.setHours(23, 59, 59, 999);
    if (end < now) return false;
  }
  return true;
};

export const getEffectivePrice = (product) => {
  if (!product) return 0;
  return isDiscountActive(product) ? product.discountPrice : product.price;
};

export const cleanProductName = (nameOrProduct) => {
  if (!nameOrProduct) return '';
  // If product object is passed, check onlineName first
  if (typeof nameOrProduct === 'object') {
    if (nameOrProduct.onlineName && nameOrProduct.onlineName.trim()) {
      return nameOrProduct.onlineName.trim();
    }
    return cleanProductName(nameOrProduct.name);
  }

  let str = String(nameOrProduct).trim();
  // Strip trailing warehouse hashes, brackets, or isolated codes e.g. " 104", " - 104", " #12", " (104)", " [104]"
  str = str.replace(/[\s\-_/]+[#№]?\d+[\s\-_/]*$/i, '');
  str = str.replace(/\s*[\(\[\{]\s*[#№]?\d+\s*[\)\]\}]\s*$/i, '');
  str = str.replace(/\s+#\d+$/, '');
  return str.trim() || String(nameOrProduct).trim();
};

export const getProductDisplayName = (product) => {
  if (!product) return '';
  if (typeof product === 'string') return cleanProductName(product);
  if (product.onlineName && product.onlineName.trim()) {
    return product.onlineName.trim();
  }
  return cleanProductName(product.name);
};
