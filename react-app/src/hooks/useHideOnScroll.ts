// hooks/useHideOnScroll.ts
import { useState, useEffect, useRef } from 'react';
import { uiLog } from '../webhook/client/uiDebug';

interface UseHideOnScrollOptions {
  threshold?: number;
  hideOnMount?: boolean;
  scrollElement?: HTMLElement | null;
}

export const useHideOnScroll = (options: UseHideOnScrollOptions = {}) => {
  const { threshold = 10, hideOnMount = false, scrollElement = null } = options;
  
  const [isVisible, setIsVisible] = useState(!hideOnMount);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  uiLog(`[useHideOnScroll] Hook initialized with threshold: ${threshold}, hideOnMount: ${hideOnMount}, hasScrollElement: ${!!scrollElement}`);

  useEffect(() => {
    if (!scrollElement) {
      uiLog(`[useHideOnScroll] No scroll element yet, waiting...`);
      return;
    }

    const element = scrollElement;
    
    uiLog(`[useHideOnScroll] Setting up scroll listener on element: ${element.tagName} ${element.id ? '#'+element.id : ''}`);

    // Log initial scroll position
    uiLog(`[useHideOnScroll] Initial scrollTop: ${element.scrollTop}, scrollHeight: ${element.scrollHeight}, clientHeight: ${element.clientHeight}`);

    const update = () => {
      const currentScrollY = element.scrollTop;
      const scrollDiff = currentScrollY - lastScrollY.current;
      
      uiLog(`[useHideOnScroll] 📊 Scroll update - current: ${currentScrollY}, last: ${lastScrollY.current}, diff: ${scrollDiff}`);
      
      if (currentScrollY > lastScrollY.current + threshold) {
        uiLog(`[useHideOnScroll] 🔽 Scrolling down - hiding header`);
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current - threshold) {
        uiLog(`[useHideOnScroll] 🔼 Scrolling up - showing header`);
        setIsVisible(true);
      }
      
      if (currentScrollY < 10) {
        if (!isVisible) {
          uiLog(`[useHideOnScroll] ⬆️ At top - forcing header visible`);
        }
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
      ticking.current = false;
    };

    const onScroll = (e: Event) => {
      uiLog(`[useHideOnScroll] 🔄 SCROLL EVENT! target: ${(e.target as HTMLElement).id || 'unknown'}, scrollTop: ${element.scrollTop}`);
      
      if (!ticking.current) {
        requestAnimationFrame(update);
        ticking.current = true;
      }
    };

    element.addEventListener('scroll', onScroll, { passive: true });
    
    uiLog(`[useHideOnScroll] Scroll listener attached - waiting for scroll events...`);

    return () => {
      uiLog(`[useHideOnScroll] Cleaning up scroll listener`);
      element.removeEventListener('scroll', onScroll);
    };
  }, [threshold, scrollElement]);

  uiLog(`[useHideOnScroll] Returning isVisible: ${isVisible}`);
  return isVisible;
};