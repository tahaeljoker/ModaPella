import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Robust Scroll Restoration component for SPA navigation:
 * - Records scroll position before leaving any page.
 * - Listens to both React Router POP and native mobile browser popstate (phone hardware/gesture back).
 * - Restores exact scroll position smoothly without jarring jumps or resets.
 */
export default function ScrollRestoration() {
  const location = useLocation();
  const navType = useNavigationType(); // 'POP' | 'PUSH' | 'REPLACE'
  const isRestoringRef = useRef(false);

  // Continuously record scroll position
  useEffect(() => {
    let timeoutId = null;

    const saveScroll = () => {
      if (isRestoringRef.current && window.scrollY === 0) return;
      const key = `mp_scroll_${window.location.pathname}${window.location.search}`;
      sessionStorage.setItem(key, String(window.scrollY));
    };

    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(saveScroll, 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
      saveScroll();
    };
  }, [location.pathname, location.search]);

  // Handle native phone back button (popstate event from browser)
  useEffect(() => {
    const handleNativePopState = () => {
      isRestoringRef.current = true;
      const key = `mp_scroll_${window.location.pathname}${window.location.search}`;
      const saved = sessionStorage.getItem(key);
      const targetY = saved !== null ? Number(saved) : 0;

      const restore = () => {
        window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
      };

      restore();
      requestAnimationFrame(restore);
      [30, 80, 160, 300].forEach(delay => setTimeout(restore, delay));

      setTimeout(() => {
        isRestoringRef.current = false;
      }, 350);
    };

    window.addEventListener('popstate', handleNativePopState);
    return () => window.removeEventListener('popstate', handleNativePopState);
  }, []);

  // Handle route change via React Router
  useEffect(() => {
    const key = `mp_scroll_${location.pathname}${location.search}`;

    if (navType === 'POP') {
      isRestoringRef.current = true;
      const saved = sessionStorage.getItem(key);
      const targetY = saved !== null ? Number(saved) : 0;

      const restore = () => {
        window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
      };

      restore();
      const r1 = requestAnimationFrame(restore);
      const t1 = setTimeout(restore, 40);
      const t2 = setTimeout(restore, 120);
      const t3 = setTimeout(() => {
        restore();
        isRestoringRef.current = false;
      }, 300);

      return () => {
        cancelAnimationFrame(r1);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      isRestoringRef.current = false;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.search, navType]);

  return null;
}

