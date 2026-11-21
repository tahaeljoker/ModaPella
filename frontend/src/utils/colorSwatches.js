const BASE_COLOR_MAP = {
  // براند ومميز
  'لون واحد': '#7C0A12',
  'لون موحد': '#7C0A12',
  'one color': '#7C0A12',
  'single color': '#7C0A12',
  'افتراضي': '#7C0A12',
  'بورجندي': '#7C0A12',
  'عنابي': '#7C0A12',
  'نبيتي': '#6b1426',
  'burgundy': '#7C0A12',
  'maroon': '#6b1426',
  'wine': '#6b1426',

  // درجات الأزرق والبترولي
  'بترولي': '#0a5c68',
  'petrol': '#0a5c68',
  'جنزاري': '#1d6d6a',
  'teal': '#0d9488',
  'تركواز': '#14b8a6',
  'فيروزي': '#14b8a6',
  'turquoise': '#14b8a6',
  'كحلي': '#0f1f3d',
  'كحلي غامق': '#0a1128',
  'navy': '#0f1f3d',
  'أزرق': '#2563eb',
  'blue': '#2563eb',
  'أزرق زهري': '#1d4ed8',
  'زهري': '#1d4ed8',
  'royal blue': '#1d4ed8',
  'أزرق ملوكي': '#1d4ed8',
  'سماوي': '#7dd3fc',
  'baby blue': '#93c5fd',
  'بيبي بلو': '#93c5fd',
  'سماوي فاتح': '#bae6fd',

  // درجات الأخضر والزيتي
  'زيتي': '#3f4f34',
  'زيتي غامق': '#283618',
  'olive': '#3f4f34',
  'أخضر': '#15803d',
  'green': '#15803d',
  'أخضر تفاحي': '#84cc16',
  'تفاحي': '#84cc16',
  'أخضر زمردي': '#047857',
  'زمردي': '#047857',
  'emerald': '#047857',
  'بيستاش': '#93c572',
  'بستاج': '#93c572',
  'فستقي': '#93c572',
  'pistachio': '#93c572',
  'منت': '#a7f3d0',
  'mint': '#a7f3d0',
  'ليموني': '#d9f99d',
  'lime': '#d9f99d',

  // درجات البيج والبني والترابيات
  'بيج': '#e5d7c3',
  'beige': '#e5d7c3',
  'أوف وايت': '#f4f0ea',
  'off white': '#f4f0ea',
  'عاجي': '#fffff0',
  'ivory': '#fffff0',
  'هافان': '#b45309',
  'havana': '#b45309',
  'جملي': '#b47742',
  'camel': '#b47742',
  'كراميل': '#b87333',
  'caramel': '#b87333',
  'كافيه': '#997a5b',
  'لاتيه': '#a38260',
  'cafe': '#997a5b',
  'شامبين': '#f1e5cc',
  'champagne': '#f1e5cc',
  'بني': '#653e24',
  'brown': '#653e24',
  'شيكولاتة': '#3d2314',
  'chocolate': '#3d2314',
  'كاكاو': '#5c4033',
  'طوبي': '#9c382c',
  'brick': '#9c382c',
  'terracotta': '#c86446',
  'تايجر': '#a66a38',

  // درجات الأصفر والبرتقالي
  'أصفر': '#eab308',
  'yellow': '#eab308',
  'مستردة': '#d49b29',
  'مسطردة': '#d49b29',
  'خردلي': '#d49b29',
  'mustard': '#d49b29',
  'عسلي': '#d97706',
  'honey': '#d97706',
  'برتقالي': '#ea580c',
  'orange': '#ea580c',
  'سيمون': '#f28e6b',
  'سلمون': '#f28e6b',
  'salmon': '#f28e6b',
  'خوخي': '#fca5a5',
  'peach': '#fca5a5',
  'مرجان': '#ff6f61',
  'كورال': '#ff6f61',
  'coral': '#ff6f61',

  // درجات الوردي والأحمر
  'أحمر': '#dc2626',
  'red': '#dc2626',
  'أحمر ناري': '#ef4444',
  'وردي': '#f472b6',
  'بينك': '#f472b6',
  'pink': '#f472b6',
  'فوشيا': '#db2777',
  'fuchsia': '#db2777',
  'كشمير': '#c89f9c',
  'كشميري': '#c89f9c',
  'cashmere': '#c89f9c',
  'بصلي': '#c47d7d',
  'توتي': '#7b113a',
  'توت': '#7b113a',
  'berry': '#7b113a',
  'بطيخي': '#fb7185',

  // درجات البنفسجي والموف
  'موف': '#8b5cf6',
  'بنفسجي': '#7c3aed',
  'purple': '#7c3aed',
  'لافندر': '#a78bfa',
  'lavender': '#a78bfa',
  'ليلكي': '#c084fc',
  'lilac': '#c084fc',
  'باذنجاني': '#4a044e',

  // أبيض وأسود ورماديات وميتاليك
  'أسود': '#1a1a1a',
  'black': '#1a1a1a',
  'أبيض': '#fcfcfc',
  'white': '#fcfcfc',
  'رمادي': '#9ca3af',
  'رصاصي': '#6b7280',
  'gray': '#9ca3af',
  'grey': '#9ca3af',
  'فضي': '#c0c0c0',
  'سيلفر': '#c0c0c0',
  'silver': '#c0c0c0',
  'ذهبي': '#d4af37',
  'جولد': '#d4af37',
  'gold': '#d4af37',
  'نحاسي': '#b87333',
  'copper': '#b87333',
  'برونزي': '#cd7f32',
  'bronze': '#cd7f32'
};

// In-memory cache for custom user-defined colors
let customColorCache = {};

// Load custom colors from localStorage if available
try {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('modapella_custom_colors') : null;
  if (stored) {
    customColorCache = JSON.parse(stored);
  }
} catch (e) {
  // Ignore localStorage parsing error
}

/**
 * Register custom colors from SiteConfig or database
 */
export const registerCustomColors = (colorMapObj) => {
  if (!colorMapObj || typeof colorMapObj !== 'object') return;
  const entries = colorMapObj instanceof Map ? Object.fromEntries(colorMapObj) : colorMapObj;
  customColorCache = { ...customColorCache, ...entries };
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('modapella_custom_colors', JSON.stringify(customColorCache));
    }
  } catch (e) {}
};

/**
 * Set a single custom color and persist in cache
 */
export const setCustomColor = (colorName, hex) => {
  if (!colorName || !hex) return;
  const cleanName = colorName.trim().toLowerCase();
  customColorCache[cleanName] = hex;
  customColorCache[colorName.trim()] = hex;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('modapella_custom_colors', JSON.stringify(customColorCache));
    }
  } catch (e) {}
};

/**
 * Extract clean color name without (#hex) suffix
 */
export const getCleanColorName = (colorStr) => {
  if (!colorStr) return '';
  return String(colorStr).replace(/\s*\(#[0-9a-fA-F]{3,8}\)\s*/g, '').replace(/\|#[0-9a-fA-F]{3,8}/g, '').trim();
};

/**
 * Resolves single solid hex color for any given color name.
 */
export const getSingleColorHex = (colorName) => {
  if (!colorName) return '#999999';
  const raw = String(colorName).trim();

  // 1. If it's a bare hex code
  if (raw.startsWith('#')) return raw;

  // 1b. Check if string has (#hex) or |#hex inside it
  const hexMatch = raw.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  if (hexMatch) {
    return hexMatch[0];
  }

  const clean = getCleanColorName(raw);
  const lower = clean.toLowerCase();

  // 2. Custom Color Cache (user picked)
  if (customColorCache[lower]) return customColorCache[lower];
  if (customColorCache[clean]) return customColorCache[clean];

  // 3. Exact dictionary lookup
  if (BASE_COLOR_MAP[lower]) return BASE_COLOR_MAP[lower];
  if (BASE_COLOR_MAP[clean]) return BASE_COLOR_MAP[clean];

  // 4. Smart fuzzy match across dictionary
  const entries = Object.entries(BASE_COLOR_MAP);
  for (const [key, hex] of entries) {
    if (key.length >= 3 && (lower.includes(key) || key.includes(lower))) {
      return hex;
    }
  }

  // 5. Fallback neutral stylish beige
  return '#c7b299';
};

/**
 * Resolves hex color for any given color name.
 * For backwards compatibility, returns primary single hex.
 */
export const getColorHex = (colorName) => {
  if (!colorName) return '#999999';
  const raw = String(colorName).trim();

  // Check if multi-color or compound
  const parts = splitMultiColors(raw);
  if (parts.length > 1) {
    return getSingleColorHex(parts[0]);
  }

  return getSingleColorHex(raw);
};

/**
 * Splits compound color names into distinct color components.
 * Supports delimiters: '×', 'x', 'X', '*', ' في ', ' مع ', ' / ', '/', ' - ', '+', '&'
 */
export const splitMultiColors = (colorStr) => {
  if (!colorStr) return [];
  const raw = getCleanColorName(String(colorStr).trim());

  // Check if string contains parentheses like "مشجر (أخضر × كشمير)"
  const parenMatch = raw.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const innerParts = splitMultiColors(parenMatch[1]);
    if (innerParts.length > 0) return innerParts;
  }

  // Split by common multi-color separators
  const parts = raw
    .split(/\s*(?:[×xX*+/&]|\s+في\s+|\s+مع\s+|\s+-\s+|[\/\\])\s*/)
    .map(s => s.trim())
    .filter(Boolean);

  return parts;
};

/**
 * Checks whether a color string represents a multi-color or special pattern.
 */
export const isMultiColor = (colorStr) => {
  if (!colorStr) return false;
  const raw = String(colorStr).trim().toLowerCase();

  const patternKeywords = ['مشجر', 'ورود', 'زهور', 'ورد', 'floral', 'تايجر', 'نمر', 'tiger', 'leopard', 'كاروهات', 'plaid', 'checkered', 'مقلم', 'مخطط', 'striped', 'متعدد', 'متعدد الألوان', 'ألوان متداخلة', 'multicolor', 'rainbow'];
  if (patternKeywords.some(kw => raw.includes(kw))) {
    return true;
  }

  const parts = splitMultiColors(colorStr);
  return parts.length > 1;
};

/**
 * Generates an advanced CSS style object { background, backgroundColor }
 * Supporting solid colors, split multi-colors (e.g. أبيض × أسود), and rich fashion patterns.
 */
export const getColorStyle = (colorName) => {
  if (!colorName) {
    return { background: '#999999', backgroundColor: '#999999' };
  }

  const raw = String(colorName).trim();
  const lower = raw.toLowerCase();

  // 1. Explicit bare hex
  if (raw.startsWith('#')) {
    return { background: raw, backgroundColor: raw };
  }

  // 2. Embedded hex (#123456)
  const hexMatch = raw.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  if (hexMatch) {
    const h = hexMatch[0];
    return { background: h, backgroundColor: h };
  }

  // 3. Special Fashion Patterns
  // 3a. مشجر / ورود (Floral Botanical)
  if (lower.includes('مشجر') || lower.includes('ورود') || lower.includes('زهور') || lower.includes('ورد') || lower.includes('floral')) {
    const parts = splitMultiColors(raw);
    if (parts.length >= 2) {
      const c1 = getSingleColorHex(parts[0]);
      const c2 = getSingleColorHex(parts[1]);
      return {
        background: `linear-gradient(135deg, ${c1} 0%, #f472b6 40%, ${c2} 70%, #059669 100%)`,
        backgroundColor: c1
      };
    }
    return {
      background: 'linear-gradient(135deg, #ec4899 0%, #f472b6 35%, #a7f3d0 65%, #059669 100%)',
      backgroundColor: '#ec4899'
    };
  }

  // 3b. تايجر / نمر (Tiger / Leopard animal print)
  if (lower.includes('تايجر') || lower.includes('نمر') || lower.includes('tiger') || lower.includes('leopard')) {
    return {
      background: 'linear-gradient(135deg, #d49b29 0%, #b45309 45%, #451a03 75%, #1c1917 100%)',
      backgroundColor: '#b45309'
    };
  }

  // 3c. كاروهات (Checkered / Tartan)
  if (lower.includes('كاروهات') || lower.includes('plaid') || lower.includes('checkered')) {
    const parts = splitMultiColors(raw);
    const c1 = parts[0] ? getSingleColorHex(parts[0]) : '#991b1b';
    const c2 = parts[1] ? getSingleColorHex(parts[1]) : '#1e293b';
    return {
      background: `repeating-linear-gradient(45deg, ${c1} 0, ${c1} 5px, ${c2} 5px, ${c2} 10px)`,
      backgroundColor: c1
    };
  }

  // 3d. مقلم / مخطط (Striped)
  if (lower.includes('مقلم') || lower.includes('مخطط') || lower.includes('striped')) {
    const parts = splitMultiColors(raw);
    const c1 = parts[0] ? getSingleColorHex(parts[0]) : '#0f172a';
    const c2 = parts[1] ? getSingleColorHex(parts[1]) : '#f8fafc';
    return {
      background: `repeating-linear-gradient(90deg, ${c1} 0, ${c1} 4px, ${c2} 4px, ${c2} 8px)`,
      backgroundColor: c1
    };
  }

  // 3e. متعدد الألوان / ألوان متداخلة (Rainbow / Multicolor)
  if (lower.includes('متعدد') || lower.includes('ألوان متداخلة') || lower.includes('multicolor') || lower.includes('rainbow')) {
    return {
      background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 25%, #10b981 50%, #3b82f6 75%, #8b5cf6 100%)',
      backgroundColor: '#3b82f6'
    };
  }

  // 4. Split Multi-Colors (e.g. "أبيض × أسود" or "بيج في كحلي")
  const parts = splitMultiColors(raw);
  if (parts.length >= 2) {
    const hexes = parts.map(p => getSingleColorHex(p));
    let gradient = '';

    if (hexes.length === 2) {
      // 50% split sharp diagonal line
      gradient = `linear-gradient(135deg, ${hexes[0]} 0% 50%, ${hexes[1]} 50% 100%)`;
    } else if (hexes.length === 3) {
      gradient = `linear-gradient(135deg, ${hexes[0]} 0% 33.3%, ${hexes[1]} 33.3% 66.6%, ${hexes[2]} 66.6% 100%)`;
    } else if (hexes.length === 4) {
      gradient = `linear-gradient(135deg, ${hexes[0]} 0% 25%, ${hexes[1]} 25% 50%, ${hexes[2]} 50% 75%, ${hexes[3]} 75% 100%)`;
    } else {
      const step = (100 / hexes.length).toFixed(1);
      const stops = hexes.map((h, i) => `${h} ${(i * step)}% ${((i + 1) * step)}%`).join(', ');
      gradient = `linear-gradient(135deg, ${stops})`;
    }

    return {
      background: gradient,
      backgroundColor: hexes[0]
    };
  }

  // 5. Standard single color lookup
  const singleHex = getSingleColorHex(raw);
  return {
    background: singleHex,
    backgroundColor: singleHex
  };
};

/**
 * Suggested multi-color combinations and popular fashion patterns
 */
export const PRESET_MULTI_COLORS = [
  'أبيض × أسود',
  'بيج × كحلي',
  'أبيض × سماوي',
  'زيتي × بيج',
  'كشمير × رمادي',
  'مشجر',
  'كاروهات',
  'مقلم',
  'تايجر',
  'متعدد الألوان'
];

/**
 * Helper to combine two color names cleanly
 */
export const combineColors = (c1, c2) => {
  if (!c1) return c2 || '';
  if (!c2) return c1 || '';
  return `${c1.trim()} × ${c2.trim()}`;
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
