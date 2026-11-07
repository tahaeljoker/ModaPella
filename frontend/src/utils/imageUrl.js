/**
 * Helper to resolve product and media image URLs across local and production Vercel domains.
 * Ensures relative /uploads/... paths correctly resolve to the backend API host.
 */
export function resolveImageUrl(url) {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

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

