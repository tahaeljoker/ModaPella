import JsBarcode from 'jsbarcode';

/**
 * Renders a crisp PNG Data URL using JsBarcode on HTML5 Canvas.
 * Ideal for thermal printers to prevent subpixel scaling issues.
 */
export function renderBarcodeDataUrl(text, options = {}) {
  if (!text || typeof text !== 'string') return '';
  try {
    // Filter non-printable ASCII chars if any
    const sanitized = text.split('').filter(c => {
      const code = c.charCodeAt(0);
      return code >= 32 && code <= 127;
    }).join('');

    if (!sanitized) return '';

    const canvas = document.createElement('canvas');
    const defaultWidth = sanitized.length <= 6 ? 2.5 : 2;
    JsBarcode(canvas, sanitized, {
      format: 'CODE128',
      width: options.width || defaultWidth,
      height: options.height || 55,
      margin: options.margin !== undefined ? options.margin : 10,
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
    }).join('');

    if (!sanitized) return '';

    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svgNode, sanitized, {
      format: 'CODE128',
      width: 2,
      height: height,
      margin: quietZone,
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
