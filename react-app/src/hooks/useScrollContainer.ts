// hooks/useScrollContainer.ts
import { useState, useEffect } from 'react';
import { uiLog } from '../webhook/client/uiDebug';

export const useScrollContainer = () => {
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

  uiLog(`[useScrollContainer] Hook initialized`);

  useEffect(() => {
    uiLog(`[useScrollContainer] Starting to search for ScrollContainer`);

    const findScrollContainer = () => {
      uiLog(`[useScrollContainer] Searching for ScrollContainer elements`);
    
      
      let found = false;
      
      // Method 1: Look for elements with overflow-y auto in computed style
      const allBoxes = document.querySelectorAll('.MuiBox-root');
      uiLog(`[useScrollContainer] Found ${allBoxes.length} MUI Box elements`);
      
      allBoxes.forEach((box, index) => {
        const el = box as HTMLElement;
        const computedStyle = window.getComputedStyle(el);
        const overflowY = computedStyle.overflowY;
        const hasScrollableContent = el.scrollHeight > el.clientHeight;
        
        uiLog(`[useScrollContainer] Box ${index}: overflowY=${overflowY}, scrollHeight=${el.scrollHeight}, clientHeight=${el.clientHeight}, hasContent=${hasScrollableContent}`);
        
        // A ScrollContainer should have overflow-y: auto and be scrollable
        if (overflowY === 'auto' && el.clientHeight > 0) {
          uiLog(`[useScrollContainer] ✅ Found potential ScrollContainer at index ${index}`);
          uiLog(`[useScrollContainer] Container details - scrollHeight: ${el.scrollHeight}, clientHeight: ${el.clientHeight}, scrollTop: ${el.scrollTop}`);
          setScrollElement(el);
          found = true;
        }
      });
      
      if (!found) {
        uiLog(`[useScrollContainer] ❌ No ScrollContainer found yet - DOM might not be ready`);
        
        // Log all elements as fallback
        const allElements = document.querySelectorAll('*');
        uiLog(`[useScrollContainer] Total elements in DOM: ${allElements.length}`);
      }
    };

    // Run initial search after a delay to ensure DOM is ready
    uiLog(`[useScrollContainer] Scheduling initial search`);
    setTimeout(findScrollContainer, 500);

    // Watch for route changes
    uiLog(`[useScrollContainer] Setting up MutationObserver`);
    const observer = new MutationObserver(() => {
      uiLog(`[useScrollContainer] Mutation detected, re-searching for ScrollContainer`);
      findScrollContainer();
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
    });

    return () => {
      uiLog(`[useScrollContainer] Cleaning up MutationObserver`);
      observer.disconnect();
    };
  }, []);

  uiLog(`[useScrollContainer] Returning scrollElement: ${!!scrollElement}`);
  return scrollElement;
};