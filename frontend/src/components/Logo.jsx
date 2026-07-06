import React from 'react';
import logoSrc from '../assets/logo.png';

function Logo({ className = 'flex items-center gap-3' }) {
  return (
    <div className={className}>
      <img src={logoSrc} alt="ModaPella logo" className="h-10 w-auto" />
    </div>
  );
}

export default Logo;
