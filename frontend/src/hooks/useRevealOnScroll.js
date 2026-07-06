import { useEffect } from 'react';

export default function useRevealOnScroll() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            entry.target.classList.remove('reveal-on-scroll');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    const els = Array.from(document.querySelectorAll('.reveal-on-scroll, .stagger-item'));
    els.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}
