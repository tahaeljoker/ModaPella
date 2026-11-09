export const DEFAULT_PRODUCT_PLACEHOLDER =
  import.meta.env.VITE_DEFAULT_PRODUCT_IMAGE ||
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80';

/**
 * Returns the configurable fallback placeholder image for products with no or broken images.
 */
export function getDefaultProductPlaceholder(siteConfig = null) {
  if (siteConfig?.defaultPlaceholderImage && typeof siteConfig.defaultPlaceholderImage === 'string' && siteConfig.defaultPlaceholderImage.trim()) {
    return resolveImageUrl(siteConfig.defaultPlaceholderImage.trim());
  }
  return DEFAULT_PRODUCT_PLACEHOLDER;
}

/**
 * Helper to resolve product and media image URLs across local and production Vercel domains.
 * Ensures relative /uploads/... paths correctly resolve to the backend API host.
 */
export function resolveImageUrl(url, fallback = '') {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback || '';
  }
  const trimmed = url.trim();

  // Already absolute or base64 data URI
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Relative /uploads/... path
  if (trimmed.startsWith('/uploads/')) {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    if (apiUrl.startsWith('http')) {
      try {
        const backendOrigin = new URL(apiUrl).origin;
        return `${backendOrigin}${trimmed}`;
      } catch (e) {
        // Fallback
      }
    }
    // Production default backend URL fallback
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return `https://moda-pella-e9i2.vercel.app${trimmed}`;
    }
  }

  return trimmed;
}

