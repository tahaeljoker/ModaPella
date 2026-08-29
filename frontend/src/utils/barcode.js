import JsBarcode from 'jsbarcode';

/**
 * Renders a crisp PNG Data URL using JsBarcode on HTML5 Canvas.
 * Ideal for thermal printers to prevent subpixel scaling issues.
 */
export function renderBarcodeDataUrl(text, options = {}) {
  if (!text || typeof text !== 'string') return '';
  try {
    // Filter non-printable ASCII chars if any and trim
    const sanitized = text.split('').filter(c => {
      const code = c.charCodeAt(0);
      return code >= 32 && code <= 127;
    }).join('').trim();

    if (!sanitized) return '';

    const canvas = document.createElement('canvas');
    // Ensure barcodes with short codes (e.g. 103) have thick enough bars for laser scanners
    const defaultWidth = sanitized.length <= 4 ? 2.6 : sanitized.length <= 7 ? 2.2 : 1.8;
    const safeMargin = options.margin !== undefined ? Math.max(options.margin, 8) : 10;

    JsBarcode(canvas, sanitized, {
      format: 'CODE128',
      width: options.width || defaultWidth,
      height: options.height || 50,
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
export function renderBarcodeSVG(text, height = 55, quietZone = 10) {
  if (!text || typeof text !== 'string') return '';
  try {
    const sanitized = text.split('').filter(c => {
      const code = c.charCodeAt(0);
      return code >= 32 && code <= 127;
    }).join('').trim();

    if (!sanitized) return '';

    const defaultWidth = sanitized.length <= 4 ? 2.6 : sanitized.length <= 7 ? 2.2 : 1.8;
    const safeMargin = Math.max(quietZone, 8);

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
