import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Global in-memory storage for scroll positions.
 * Synchronous and instant across component re-renders.
 */
const scrollPositions = new Map();

const getStorageKey = (pathname, search) => `mp_scroll_${pathname || ''}${search || ''}`;

/**
 * Helper to save a scroll position in both in-memory map and sessionStorage.
 */
export const saveScrollPosition = (pathname, search, y) => {
  if (typeof y !== 'number' || isNaN(y) || y < 0) return;
  const key = getStorageKey(pathname, search);
  scrollPositions.set(key, Math.round(y));
  try {
    sessionStorage.setItem(key, String(Math.round(y)));
  } catch (e) {}
};

/**
 * Helper to retrieve a scroll position from memory or sessionStorage.
 */
export const getScrollPosition = (pathname, search) => {
  const key = getStorageKey(pathname, search);
  if (scrollPositions.has(key)) {
    return scrollPositions.get(key);
  }
  try {
    const raw = sessionStorage.getItem(key);
    if (raw !== null) {
      const val = Number(raw);
      if (!isNaN(val) && val >= 0) {
        scrollPositions.set(key, val);
        return val;
      }
    }
  } catch (e) {}
  return 0;
};

/**
 * Robust Scroll Restoration component for SPA navigation:
 * 1. Sets history.scrollRestoration = 'manual' to prevent browser interference.
 * 2. Continuously snapshots scroll positions during user scrolling & immediately on any click.
 * 3. Never overwrites the target page's scroll position with 0 during route unmount/transitions.
 * 4. Active restoration loop with ResizeObserver + timed retries handles dynamically loaded DOM/images.
 * 5. Stops automatically if the customer manually touches or scrolls.
 */
export default function ScrollRestoration() {
  const location = useLocation();
  const navType = useNavigationType(); // 'POP' | 'PUSH' | 'REPLACE'
  const isRestoringRef = useRef(false);
  const currentPathRef = useRef({ pathname: location.pathname, search: location.search });
  const lastKnownScrollRef = useRef(0);

  // Disable browser's native automatic scroll restoration once on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Continuously record scroll position for the CURRENT active page
  useEffect(() => {
    let scrollTimeout = null;

    const handleScroll = () => {
      // Don't record when actively restoring a position
      if (isRestoringRef.current) return;

      const y = window.scrollY;
      lastKnownScrollRef.current = y;

      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (!isRestoringRef.current) {
          saveScrollPosition(currentPathRef.current.pathname, currentPathRef.current.search, window.scrollY);
        }
      }, 50);
    };

    // Capture click: If user taps ANY link, card, or button to navigate,
    // immediately save scroll position before navigation triggers!
    const handleGlobalClick = () => {
      if (!isRestoringRef.current && window.scrollY > 0) {
        saveScrollPosition(currentPathRef.current.pathname, currentPathRef.current.search, window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('click', handleGlobalClick, { capture: true, passive: true });

    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, []);

  // Handle route change via React Router
  useEffect(() => {
    const prev = currentPathRef.current;
    const isSamePage = prev.pathname === location.pathname && prev.search === location.search;

    // If leaving a previous page, snapshot its last known scroll position
    if (!isSamePage && !isRestoringRef.current) {
      const yToSave = lastKnownScrollRef.current || window.scrollY;
      if (yToSave > 0) {
        saveScrollPosition(prev.pathname, prev.search, yToSave);
      }
    }

    // Update current active path
    currentPathRef.current = { pathname: location.pathname, search: location.search };
    lastKnownScrollRef.current = 0;

    // Save last storefront path for smart fallback in product details back button
    const isStorefront = !location.pathname.startsWith('/admin') &&
                         !location.pathname.startsWith('/cashier') &&
                         !location.pathname.startsWith('/employee') &&
                         !location.pathname.startsWith('/product/');
    if (isStorefront) {
      try {
        sessionStorage.setItem('mp_last_storefront_path', location.pathname + location.search);
      } catch (e) {}
    }

    const isBackNavigation = navType === 'POP' || Boolean(location.state?.restoreScroll);

    if (isBackNavigation) {
      const targetY = getScrollPosition(location.pathname, location.search);

      if (targetY <= 10) {
        isRestoringRef.current = false;
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return;
      }

      // Start active restoration loop
      isRestoringRef.current = true;
      let userCancelled = false;
      let isDone = false;
      let resizeObserver = null;
      let checkInterval = null;

      const stopRestoration = () => {
        if (isDone) return;
        isDone = true;
        window.removeEventListener('wheel', onUserInteract);
        window.removeEventListener('touchmove', onUserInteract);
        window.removeEventListener('touchstart', onUserInteract);
        window.removeEventListener('keydown', onUserInteract);
        if (resizeObserver) {
          resizeObserver.disconnect();
          resizeObserver = null;
        }
        if (checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
        // Small cooldown before allowing scroll event writes
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 120);
      };

      const onUserInteract = () => {
        userCancelled = true;
        stopRestoration();
      };

      window.addEventListener('wheel', onUserInteract, { passive: true });
      window.addEventListener('touchmove', onUserInteract, { passive: true });
      window.addEventListener('touchstart', onUserInteract, { passive: true });
      window.addEventListener('keydown', onUserInteract, { passive: true });

      const attemptScroll = () => {
        if (userCancelled || isDone) return true;

        const docHeight = Math.max(
          document.documentElement.scrollHeight || 0,
          document.body?.scrollHeight || 0,
          document.documentElement.offsetHeight || 0
        );
        const viewportHeight = window.innerHeight || 0;
        const maxScroll = Math.max(0, docHeight - viewportHeight);

        if (maxScroll >= targetY - 15) {
          window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
          if (Math.abs(window.scrollY - targetY) < 15) {
            stopRestoration();
            return true;
          }
        } else if (maxScroll > 0) {
          // Document hasn't expanded enough yet, scroll as far as available
          window.scrollTo({ top: maxScroll, left: 0, behavior: 'instant' });
        }
        return false;
      };

      // 1. Immediate attempt
      attemptScroll();
      requestAnimationFrame(attemptScroll);

      // 2. High frequency retries for fast rendering
      const delays = [20, 50, 90, 150, 250, 400, 600, 900, 1300, 1800];
      const timerIds = delays.map(d => setTimeout(attemptScroll, d));

      // 3. Periodic interval check up to 2 seconds
      checkInterval = setInterval(attemptScroll, 80);

      // 4. ResizeObserver to catch dynamic DOM growth (products, images, cards)
      if (typeof ResizeObserver !== 'undefined' && document.body) {
        resizeObserver = new ResizeObserver(() => {
          attemptScroll();
        });
        resizeObserver.observe(document.body);
        if (document.documentElement) {
          resizeObserver.observe(document.documentElement);
        }
      }

      // Hard timeout after 2.2 seconds
      const maxTimer = setTimeout(() => {
        stopRestoration();
        timerIds.forEach(clearTimeout);
      }, 2200);

      return () => {
        timerIds.forEach(clearTimeout);
        clearTimeout(maxTimer);
        stopRestoration();
      };
    } else {
      // PUSH or REPLACE navigation: user is visiting a new page -> scroll to top
      isRestoringRef.current = false;
      if (!location.hash) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    }
  }, [location.pathname, location.search, navType, location.state]);

  return null;
}
