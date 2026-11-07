/**
 * Utility to compress and resize images on the client side before uploading.
 * Reduces 5MB-15MB phone camera photos down to ~250KB-500KB while preserving high visual quality.
 * This guarantees requests never exceed serverless payload limits (like Vercel's 4.5MB limit)
 * and eliminates CORS/timeout errors during upload.
 */
export function compressImage(file, maxDimension = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    // If not an image or is an SVG/GIF, return raw base64
    if (!file || !file.type || !file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        let { width, height } = img;

        // Resize proportionally if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw with smoothing enabled
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Compress as image/jpeg (or keep png if it has transparency)
        const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        // For PNG, canvas.toDataURL quality parameter is ignored, so we use jpeg unless it's small png
        const outputFormat = (file.type === 'image/png' && file.size < 1024 * 1024) ? 'image/png' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(outputFormat, quality);

        resolve(compressedBase64);
      };

      img.onerror = () => {
        // Fallback to original base64 if image decoding fails
        resolve(event.target.result);
      };
    };

    reader.onerror = reject;
  });
}
