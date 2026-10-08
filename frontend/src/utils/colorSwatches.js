const COLOR_MAP = {
  'أسود': '#1a1a1a',
  'black': '#1a1a1a',
  'أبيض': '#fcfcfc',
  'white': '#fcfcfc',
  'أوف وايت': '#f4f0ea',
  'off white': '#f4f0ea',
  'بيج': '#e5d7c3',
  'beige': '#e5d7c3',
  'بورجندي': '#7C0A12',
  'عنابي': '#7C0A12',
  'burgundy': '#7C0A12',
  'كحلي': '#0f1f3d',
  'navy': '#0f1f3d',
  'أزرق': '#2563eb',
  'blue': '#2563eb',
  'سماوي': '#7dd3fc',
  'baby blue': '#7dd3fc',
  'زيتي': '#3f4f34',
  'olive': '#3f4f34',
  'أخضر': '#15803d',
  'green': '#15803d',
  'منت': '#a7f3d0',
  'mint': '#a7f3d0',
  'وردي': '#f472b6',
  'بينك': '#f472b6',
  'pink': '#f472b6',
  'رمادي': '#9ca3af',
  'gray': '#9ca3af',
  'grey': '#9ca3af',
  'بني': '#653e24',
  'brown': '#653e24',
  'هافان': '#c27847',
  'جملي': '#b47742',
  'camel': '#b47742',
  'أصفر': '#eab308',
  'yellow': '#eab308',
  'موف': '#8b5cf6',
  'بنفسجي': '#7c3aed',
  'purple': '#7c3aed',
  'فوشيا': '#db2777',
  'fuchsia': '#db2777',
  'أحمر': '#dc2626',
  'red': '#dc2626',
  'برتقالي': '#ea580c',
  'orange': '#ea580c'
};

export const getColorHex = (colorName) => {
  if (!colorName) return '#999999';
  const trimmed = colorName.trim();
  if (trimmed.startsWith('#')) return trimmed;
  const lower = trimmed.toLowerCase();
  return COLOR_MAP[lower] || COLOR_MAP[trimmed] || '#c7b299';
};

export const extractProductColors = (product) => {
  if (!product) return [];
  const set = new Set();

  if (Array.isArray(product.colors)) {
    product.colors.forEach(c => c && set.add(c.trim()));
  }

  if (Array.isArray(product.variants)) {
    product.variants.forEach(v => {
      if (v.color && v.color.trim()) set.add(v.color.trim());
    });
  }

  return Array.from(set);
};
