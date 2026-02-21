// hooks/useScrollContainer.ts
import { useState, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { uiLog } from '../webhook/client/uiDebug';

export const useScrollContainer = (ref: RefObject<HTMLElement | null>) => {
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const prevRef = useRef<HTMLElement | null>(null);

  uiLog(`[useScrollContainer] Hook called, ref.current=${ref.current}, scrollElement=${scrollElement}`);

  useEffect(() => {
    const currentRef = ref.current;

    uiLog(`[useScrollContainer] useEffect triggered, ref.current=${currentRef}, prevRef=${prevRef.current}`);

    if (currentRef && currentRef !== prevRef.current) {
      uiLog(`[useScrollContainer] ScrollContainer mounted or changed, setting scrollElement`);
      setScrollElement(currentRef);
      prevRef.current = currentRef;
    } else if (!currentRef) {
      uiLog(`[useScrollContainer] ref.current is null, scrollElement not set`);
    }
  }, [ref.current]);

  useEffect(() => {
    uiLog(`[useScrollContainer] Returning scrollElement: ${!!scrollElement}`);
  }, [scrollElement]);

  return scrollElement;
};