import React, { useState } from 'react';

function LazyImage({ 
  src, 
  alt = '', 
  className = '', 
  imgClassName = '', 
  fit = null 
}) {
  const [loaded, setLoaded] = useState(false);

  // Determine object-fit: explicit fit prop, or inferred from className, default to contain if specified or cover
  const fitClass = fit 
    ? (fit === 'contain' ? 'object-contain' : 'object-cover')
    : (className.includes('object-contain') ? 'object-contain' : 'object-cover');

  return (
    <div className={`relative overflow-hidden w-full h-full min-w-0 min-h-0 flex items-center justify-center ${className}`}>
      {!loaded && <div className="absolute inset-0 bg-beige/10 animate-pulse z-0" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`w-full h-full max-w-full max-h-full min-w-0 min-h-0 ${fitClass} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
      />
    </div>
  );
}

export default LazyImage;
