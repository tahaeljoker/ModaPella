/**
 * Advanced Arabic Text Normalization & Fuzzy Search Utility
 * Specially tailored for Egyptian Fashion & Apparel Terms
 */

// Strip diacritics, normalize Alef, Taa Marbuta, Yaa, Hamzas, and repetitive letters
export function normalizeArabic(text) {
  if (!text || typeof text !== 'string') return '';

  let str = text.trim().toLowerCase();

  // Remove Arabic diacritics / Tashkeel
  str = str.replace(/[\u064B-\u065F\u0670]/g, '');

  // Remove Tatweel / Kashida
  str = str.replace(/\u0640/g, '');

  // Normalize Alef variants: أ, إ, آ, ٱ -> ا
  str = str.replace(/[أإآٱ]/g, 'ا');

  // Normalize Taa Marbuta: ة -> ه
  str = str.replace(/ة/g, 'ه');

  // Normalize Yaa / Alef Maksura: ى -> ي
  str = str.replace(/[ى]/g, 'ي');

  // Normalize Hamzas: ؤ -> و, ئ -> ي, ء -> ''
  str = str.replace(/ؤ/g, 'و');
  str = str.replace(/ئ/g, 'ي');
  str = str.replace(/ء/g, '');

  // Collapse consecutive identical letters (e.g. فستاااان -> فستان, جاكيييت -> جاكيت)
  str = str.replace(/(.)\1{2,}/g, '$1$1');
  str = str.replace(/(.)\1+/g, '$1');

  // Remove punctuation, special characters, keep Arabic letters, english alphanumeric and spaces
  str = str.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ');

  // Collapse whitespace
  str = str.replace(/\s+/g, ' ').trim();

  return str;
}

// Compute Levenshtein distance between two normalized strings
export function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = [];
  for (let i = 0; i <= b.length; i++) {
    row[i] = i;
  }

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      let val;
      if (a[i - 1] === b[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

// Fashion Synonyms & Root Expansion Dictionary
export const FASHION_SYNONYM_CLUSTERS = [
  {
    canonical: 'جاكيت',
    aliases: ['جاكيت', 'جاكت', 'جواكت', 'جواكيت', 'كوت', 'معطف', 'jacket', 'coat', 'outerwear']
  },
  {
    canonical: 'بليزر',
    aliases: ['بليزر', 'بليزرات', 'blazer', 'blazers']
  },
  {
    canonical: 'كاردن',
    aliases: ['كاردن', 'كارديجان', 'كارديجانات', 'cardigan', 'cardigans']
  },
  {
    canonical: 'فستان',
    aliases: ['فستان', 'فساتين', 'دريس', 'دريسات', 'سواريه', 'ماكسي', 'ميدي', 'dress', 'dresses', 'soiree']
  },
  {
    canonical: 'بلوزة',
    aliases: ['بلوزه', 'بلوزة', 'بلوزات', 'توب', 'توبات', 'بدي', 'blouse', 'top']
  },
  {
    canonical: 'شميز',
    aliases: ['شميز', 'شميزات', 'قميص', 'قمصان', 'chemise', 'shirt']
  },
  {
    canonical: 'بنطلون',
    aliases: ['بنطلون', 'بناطيل', 'بنطال', 'جينز', 'ليجن', 'وايد ليج', 'وايد ليد', 'pants', 'trousers', 'jeans', 'leggings', 'wide leg']
  },
  {
    canonical: 'عباية',
    aliases: ['عبايه', 'عباية', 'عبايات', 'قفطان', 'جلابيه', 'جلابية', 'جلابيات', 'كيمونو', 'abaya', 'kaftan']
  },
  {
    canonical: 'طقم',
    aliases: ['طقم', 'اطقم', 'أطقم', 'سوت', 'تنسيق', 'تو بيس', 'بدله', 'بدلة', 'بدل', 'suit', 'set', 'two piece']
  },
  {
    canonical: 'شال',
    aliases: ['شال', 'شيلان', 'طرحه', 'طرحة', 'طرح', 'ايشارب', 'إيشارب', 'حجاب', 'اسكارف', 'scarf', 'hijab']
  },
  {
    canonical: 'تنورة',
    aliases: ['تنوره', 'تنورة', 'جيبه', 'جيبة', 'جيبات', 'skirt']
  },
  {
    canonical: 'سويت شيرت',
    aliases: ['سويت شيرت', 'سويت شيرتس', 'هودي', 'هوديز', 'بلوفر', 'بلوفرات', 'سويتر', 'تريكو', 'hoodie', 'sweatshirt', 'sweater']
  },
  {
    canonical: 'شنطة',
    aliases: ['شنطه', 'شنطة', 'شنط', 'حقيبه', 'حقيبة', 'حقائب', 'كيس', 'bag', 'bags']
  },
  {
    canonical: 'حذاء',
    aliases: ['حذاء', 'احذيه', 'أحذية', 'شوز', 'كوتشي', 'كوتشيات', 'صندل', 'سليبر', 'shoes', 'sneakers', 'sandals']
  }
];

// Pre-normalize synonyms for fast lookup
const NORMALIZED_SYNONYMS = FASHION_SYNONYM_CLUSTERS.map(cluster => ({
  canonical: cluster.canonical,
  normCanonical: normalizeArabic(cluster.canonical),
  normAliases: Array.from(new Set(cluster.aliases.map(a => normalizeArabic(a)).filter(Boolean)))
}));

/**
 * Given a raw search term, find all related search tokens (synonyms + variations)
 */
export function expandSearchTerm(term) {
  const normTerm = normalizeArabic(term);
  if (!normTerm) return { tokens: [], canonical: term, isTypo: false };

  // Step 1: Look for exact match in any synonym cluster first
  for (const cluster of NORMALIZED_SYNONYMS) {
    if (cluster.normAliases.includes(normTerm)) {
      return {
        tokens: cluster.normAliases,
        canonical: cluster.canonical,
        isTypo: false
      };
    }
  }

  // Step 2: No exact match found; look for closest cluster by edit distance (typo handling)
  let bestCluster = null;
  let minDistance = 999;
  let bestAlias = null;

  for (const cluster of NORMALIZED_SYNONYMS) {
    for (const alias of cluster.normAliases) {
      if (Math.abs(normTerm.length - alias.length) <= 1 && normTerm.length >= 3) {
        const dist = levenshteinDistance(normTerm, alias);
        const maxAllowedDist = normTerm.length <= 5 ? 1 : 2;
        if (dist <= maxAllowedDist && dist < minDistance) {
          minDistance = dist;
          bestCluster = cluster;
          bestAlias = alias;
        }
      }
    }
  }

  if (bestCluster) {
    return {
      tokens: bestCluster.normAliases,
      canonical: bestCluster.canonical,
      isTypo: true
    };
  }

  // If term does not match any cluster, return term itself
  return {
    tokens: [normTerm],
    canonical: term,
    isTypo: false
  };
}

/**
 * Smart fuzzy matching function for a product
 */
export function matchProduct(product, rawQuery) {
  if (!rawQuery || !rawQuery.trim()) {
    return { match: true, score: 100, matchedReason: 'empty' };
  }

  const queryParts = rawQuery.trim().split(/\s+/).filter(Boolean);
  if (!queryParts.length) return { match: true, score: 100, matchedReason: 'empty' };

  const normName = normalizeArabic(product.name || '');
  const normOnlineName = normalizeArabic(product.onlineName || '');
  const normCategory = normalizeArabic(product.category || '');
  const normDesc = normalizeArabic(product.description || '');
  const normSku = (product.sku || '').toLowerCase();
  const normColors = Array.isArray(product.colors) ? product.colors.map(c => normalizeArabic(c)).join(' ') : '';
  const normSizes = Array.isArray(product.sizes) ? product.sizes.join(' ').toLowerCase() : '';

  const fullSearchableCorpus = `${normName} ${normOnlineName} ${normCategory} ${normDesc} ${normColors} ${normSizes} ${normSku}`;
  const corpusWords = fullSearchableCorpus.split(/\s+/).filter(w => w.length >= 2);

  let totalScore = 0;
  let allTokensMatched = true;
  let suggestedCorrection = null;

  for (const part of queryParts) {
    const expansion = expandSearchTerm(part);
    const normPart = normalizeArabic(part);

    let tokenMatched = false;
    let tokenScore = 0;

    if (expansion.isTypo && expansion.canonical) {
      suggestedCorrection = expansion.canonical;
    }

    // 1. Exact direct match
    if (normName.includes(normPart)) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 100);
    } else if (normCategory.includes(normPart)) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 90);
    } else if (normDesc.includes(normPart) || normColors.includes(normPart) || normSku.includes(normPart)) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 80);
    }

    // 2. Cluster / Synonym expansion match
    if (!tokenMatched && expansion.tokens && expansion.tokens.length > 0) {
      for (const alias of expansion.tokens) {
        if (normName.includes(alias)) {
          tokenMatched = true;
          tokenScore = Math.max(tokenScore, 75);
          break;
        } else if (normCategory.includes(alias)) {
          tokenMatched = true;
          tokenScore = Math.max(tokenScore, 70);
          break;
        } else if (normDesc.includes(alias)) {
          tokenMatched = true;
          tokenScore = Math.max(tokenScore, 60);
          break;
        }
      }
    }

    // 3. Typo-tolerant word match across product name / category
    if (!tokenMatched && normPart.length >= 3) {
      for (const word of corpusWords) {
        if (Math.abs(normPart.length - word.length) <= 1) {
          const maxDist = normPart.length <= 5 ? 1 : 2;
          const dist = levenshteinDistance(normPart, word);
          if (dist <= maxDist) {
            tokenMatched = true;
            tokenScore = Math.max(tokenScore, 50 - dist * 10);
            if (!suggestedCorrection && word.length >= 3) {
              suggestedCorrection = word;
            }
            break;
          }
        }
      }
    }

    if (!tokenMatched) {
      allTokensMatched = false;
      break;
    }

    totalScore += tokenScore;
  }

  return {
    match: allTokensMatched,
    score: totalScore,
    matchedReason: allTokensMatched ? 'matched' : 'none',
    suggestedCorrection
  };
}

/**
 * Filter and rank an array of products by relevance
 */
export function filterAndRankProducts(products, query) {
  if (!query || !query.trim()) return { results: products, suggestedCorrection: null };

  const results = [];
  let suggestedCorrection = null;

  for (const product of products) {
    const res = matchProduct(product, query);
    if (res.match) {
      results.push({ product, score: res.score });
      if (!suggestedCorrection && res.suggestedCorrection) {
        suggestedCorrection = res.suggestedCorrection;
      }
    }
  }

  // Sort descending by relevance score
  results.sort((a, b) => b.score - a.score);

  return {
    results: results.map(r => r.product),
    suggestedCorrection
  };
}
