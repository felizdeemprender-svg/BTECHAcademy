'use client';

import { useEffect } from 'react';

export function OverflowDetector() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const isInsideScrollContainer = (el: HTMLElement) => {
      let parent = el.parentElement;
      while (parent) {
        const overflowX = getComputedStyle(parent).overflowX;
        if (overflowX === 'auto' || overflowX === 'hidden' || overflowX === 'scroll') return true;
        parent = parent.parentElement;
      }
      return false;
    };

    const mark = () => {
      const vw = window.innerWidth;
      const elements = Array.from(document.querySelectorAll<HTMLElement>('body *'));
      for (const el of elements) {
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'TEMPLATE') continue;
        const rect = el.getBoundingClientRect();
        const overflows =
          rect.right > vw + 1 && rect.width > 0 && !isInsideScrollContainer(el);
        if (overflows) {
          el.style.outline = '2px solid red';
          el.style.outlineOffset = '-2px';
        } else if (el.style.outline) {
          el.style.outline = '';
        }
      }
    };

    mark();
    window.addEventListener('resize', mark);
    return () => window.removeEventListener('resize', mark);
  }, []);

  return null;
}
