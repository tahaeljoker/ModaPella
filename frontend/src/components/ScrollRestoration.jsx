import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Robust Scroll Restoration component for SPA navigation:
 * - Records scroll position before leaving any page.
 * - Restores exact scroll position when user navigates BACK / FORWARD (POP).
 * - Smoothly scrolls to top on new navigation (PUSH).
 */
export default function ScrollRestoration() {
  const location = useLocation();
  const navType = useNavigationType(); // 'POP' | 'PUSH' | 'REPLACE'
  const isPopRef = useRef(false);

  // Save scroll continuously on scroll
  useEffect(() => {
    let timeoutId = null;

    const saveScroll = () => {
      // Don't save 0 if we are currently in the middle of restoring a pop
      if (isPopRef.current && window.scrollY === 0) return;
      const key = `mp_scroll_${location.pathname}${location.search}`;
      sessionStorage.setItem(key, String(window.scrollY));
    };

    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(saveScroll, 60);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
      saveScroll();
    };
  }, [location.pathname, location.search]);

  // Handle route change
  useEffect(() => {
    const key = `mp_scroll_${location.pathname}${location.search}`;

    if (navType === 'POP') {
      isPopRef.current = true;
      const saved = sessionStorage.getItem(key);
      const targetY = saved !== null ? Number(saved) : 0;

      // Try multiple frames to ensure layout is ready
      const restore = () => {
        window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
      };

      restore();
      const r1 = requestAnimationFrame(restore);
      const t1 = setTimeout(restore, 50);
      const t2 = setTimeout(restore, 150);
      const t3 = setTimeout(() => {
        restore();
        isPopRef.current = false;
      }, 350);

      return () => {
        cancelAnimationFrame(r1);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      isPopRef.current = false;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.search, navType]);

  return null;
}

