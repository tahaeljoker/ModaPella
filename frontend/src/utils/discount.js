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
  if (product.discountEndDate && new Date(product.discountEndDate) < now) {
    return false;
  }
  return true;
};

export const getEffectivePrice = (product) => {
  if (!product) return 0;
  return isDiscountActive(product) ? product.discountPrice : product.price;
};

export const cleanProductName = (name) => {
  if (!name) return '';
  return name.replace(/\s+#?\d+$/, '').trim();
};
