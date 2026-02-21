import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { uiLog } from '../webhook/client/uiDebug';
import { useScrollStore } from '../store/store';

interface UseHideOnScrollOptions {
  threshold?: number;
  hideOnMount?: boolean;
 
}

export const useHideOnScroll = (options: UseHideOnScrollOptions = {}) => {
  const { threshold = 10, hideOnMount = false } = options;
  const location = useLocation();

  const [isVisible, setIsVisible] = useState(!hideOnMount);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const visibleRef = useRef(isVisible);
  const scrollElement = useScrollStore((s) => s.currentScrollElement);
   const elementRef = useRef<HTMLElement | null>(scrollElement);      
  // Track visibility changes
  useEffect(() => {
    visibleRef.current = isVisible;
    uiLog(`[useHideOnScroll] Visibility updated: ${isVisible}`);
  }, [isVisible]);

  // Reset on route change
  useLayoutEffect(() => {
  if (!scrollElement) {
    uiLog(`[useHideOnScroll] Route change to ${location.pathname}, but no scroll element`);
    return;
  }

  lastScrollY.current = scrollElement.scrollTop;
  setIsVisible(true);
  visibleRef.current = true;
  uiLog(`[useHideOnScroll] Route change to ${location.pathname}, reset visibility and lastScrollY=${lastScrollY.current}`);
}, [location.pathname, scrollElement]); 

  useEffect(() => {
    const el = scrollElement;

    if (!el) {
      uiLog(`[useHideOnScroll] No scrollElement provided`);
      return;
    }
    elementRef.current = el;
    lastScrollY.current = el.scrollTop;
    setIsVisible(true);
    visibleRef.current = true;



    const handleScroll = () => {
      if (ticking.current) return;

      ticking.current = true;

      requestAnimationFrame(() => {
        const currentY = el.scrollTop;
        const diff = currentY - lastScrollY.current;

        uiLog(`[useHideOnScroll] Scroll detected, currentY=${currentY}, diff=${diff}, lastScrollY=${lastScrollY.current}`);

        if (diff > threshold && visibleRef.current) {
          setIsVisible(false);
          visibleRef.current = false;
          uiLog(`[useHideOnScroll] Hiding header (scrolled down ${diff}px)`);
        } else if (diff < -threshold && !visibleRef.current) {
          setIsVisible(true);
          visibleRef.current = true;
          uiLog(`[useHideOnScroll] Showing header (scrolled up ${-diff}px)`);
        }

        if (currentY < 10 && !visibleRef.current) {
          setIsVisible(true);
          visibleRef.current = true;
          uiLog(`[useHideOnScroll] Showing header because near top (currentY < 10)`);
        }

        lastScrollY.current = currentY;
        ticking.current = false;
      });
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    uiLog(`[useHideOnScroll] Scroll listener attached`);

    // Initial check
    handleScroll();

    return () => {
      el.removeEventListener('scroll', handleScroll);
      uiLog(`[useHideOnScroll] Scroll listener removed`);
    };
  }, [scrollElement, threshold, location.pathname]);

  return isVisible;
};