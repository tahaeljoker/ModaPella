import React, { useState } from 'react';

function LazyImage({ src, alt = '', className = '' }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className.includes('w-full') ? '' : 'w-full'}`}>
      {!loaded && <div className="absolute inset-0 bg-beige/10 animate-pulse" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

export default LazyImage;
