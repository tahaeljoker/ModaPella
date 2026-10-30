import JsBarcode from 'jsbarcode';

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function normalizeBarcodeDigits(input) {
  if (!input) return '';
  let str = String(input);
  for (let i = 0; i < 10; i++) {
    str = str.replaceAll(ARABIC_DIGITS[i], String(i)).replaceAll(PERSIAN_DIGITS[i], String(i));
  }
  return str.trim();
}

/**
 * Renders a crisp PNG Data URL using JsBarcode on HTML5 Canvas.
 * Ideal for thermal printers to prevent subpixel scaling issues.
 */
export function renderBarcodeDataUrl(text, options = {}) {
  if (!text) return '';
  try {
    const normalized = normalizeBarcodeDigits(text);
    // Filter non-printable ASCII chars if any and trim
    const sanitized = normalized.split('').filter(c => {
      const code = c.charCodeAt(0);
      return code >= 32 && code <= 127;
    }).join('').trim();

    if (!sanitized) return '';

    const canvas = document.createElement('canvas');
    // Ensure barcodes have optimal bar width for laser scanners on 40mm thermal stickers
    const defaultWidth = sanitized.length <= 4 ? 2.4 : sanitized.length <= 6 ? 2.0 : 1.7;
    const safeMargin = options.margin !== undefined ? Math.max(options.margin, 6) : 8;

    JsBarcode(canvas, sanitized, {
      format: 'CODE128',
      width: options.width || defaultWidth,
      height: options.height || 45,
      margin: safeMargin,
      displayValue: false,
      lineColor: '#000000',
      background: '#ffffff',
      ...options
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('JsBarcode renderDataUrl error:', err);
    return '';
  }
}

/**
 * Renders an SVG string using JsBarcode (ISO compliant Code 128).
 */
export function renderBarcodeSVG(text, height = 55, quietZone = 8) {
  if (!text) return '';
  try {
    const normalized = normalizeBarcodeDigits(text);
    const sanitized = normalized.split('').filter(c => {
      const code = c.charCodeAt(0);
      return code >= 32 && code <= 127;
    }).join('').trim();

    if (!sanitized) return '';

    const defaultWidth = sanitized.length <= 4 ? 2.4 : sanitized.length <= 6 ? 2.0 : 1.7;
    const safeMargin = Math.max(quietZone, 6);

    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svgNode, sanitized, {
      format: 'CODE128',
      width: defaultWidth,
      height: height,
      margin: safeMargin,
      displayValue: false,
      lineColor: '#000000',
      background: '#ffffff'
    });
    return svgNode.outerHTML;
  } catch (err) {
    console.error('JsBarcode renderSVG error:', err);
    return '';
  }
}
