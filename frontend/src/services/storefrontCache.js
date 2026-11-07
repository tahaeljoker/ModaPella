/**
 * In-memory & SessionStorage cache for storefront products and site config.
 * Ensures instant re-rendering when navigating back from product details,
 * allowing scroll position to be restored immediately without layout jump or lag.
 */

let memoryProducts = null;
let memorySiteConfig = null;

export const getCachedStorefrontProducts = () => {
  if (memoryProducts && memoryProducts.length > 0) return memoryProducts;
  try {
    const raw = sessionStorage.getItem('mp_storefront_products');
    if (raw) {
      memoryProducts = JSON.parse(raw);
      return memoryProducts;
    }
  } catch (e) {}
  return null;
};

export const setCachedStorefrontProducts = (products) => {
  if (!Array.isArray(products)) return;
  memoryProducts = products;
  try {
    sessionStorage.setItem('mp_storefront_products', JSON.stringify(products));
  } catch (e) {}
};

export const getCachedSiteConfig = () => {
  if (memorySiteConfig) return memorySiteConfig;
  try {
    const raw = sessionStorage.getItem('mp_site_config');
    if (raw) {
      memorySiteConfig = JSON.parse(raw);
      return memorySiteConfig;
    }
  } catch (e) {}
  return null;
};

export const setCachedSiteConfig = (config) => {
  if (!config) return;
  memorySiteConfig = config;
  try {
    sessionStorage.setItem('mp_site_config', JSON.stringify(config));
  } catch (e) {}
};
