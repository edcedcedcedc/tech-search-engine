import React, { useEffect, useLayoutEffect, useRef, forwardRef } from "react";
import { Box, useTheme } from "@mui/material";
import { scrollableScrollbar } from "../styles/scrollbar";
import { uiLog } from "../webhook/client/uiDebug"; // assuming you use this for logs
import { useScrollStore } from "../store/store"; // adjust path

interface ScrollContainerProps {
  children: React.ReactNode;
  route: string;
}

// Store scroll positions per route
const scrollPositions = new Map<string, number>();

export const ScrollContainer = forwardRef<
  HTMLDivElement | null,
  ScrollContainerProps
>(({ children, route }, ref) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const currentScrollElement = useScrollStore((s) => s.currentScrollElement);
  const setCurrentScrollElement = useScrollStore(
    (s) => s.setCurrentScrollElement,
  );

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      setCurrentScrollElement(el);
    }
    return () => {
      // Only clear if it's the current element (avoid race conditions)
      if (currentScrollElement === el) {
        setCurrentScrollElement(null);
      }
    };
  }, [setCurrentScrollElement]);

  // --- Notify parent when mounted / ref changes ---
  useEffect(() => {
    if (containerRef.current) {
      uiLog(`[ScrollContainer][${route}] Mounted, containerRef.current set`);
    }

    if (ref && typeof ref === "object") {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current =
        containerRef.current;
      uiLog(`[ScrollContainer][${route}] Forwarded ref updated`);
    }
  }, [ref, route]);

  // --- Restore scroll position when mounting ---
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const savedPosition = scrollPositions.get(route) || 0;
      container.scrollTop = savedPosition;
      uiLog(`[ScrollContainer][${route}] Restored scrollTop=${savedPosition}`);
    } else {
      uiLog(`[ScrollContainer][${route}] No container to restore scrollTop`);
    }
  }, [route]);

  // --- Save scroll position on scroll ---
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      uiLog(`[ScrollContainer][${route}] No container for scroll listener`);
      return;
    }

    const handleScroll = () => {
      scrollPositions.set(route, container.scrollTop);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    uiLog(`[ScrollContainer][${route}] Scroll listener attached`);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      uiLog(`[ScrollContainer][${route}] Scroll listener removed`);
    };
  }, [route]);

  return (
    <Box
      ref={containerRef}
      sx={{
        height: "100%",
        width: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        ...scrollableScrollbar(theme),
        scrollBehavior: "auto",
      }}
    >
      {children}
    </Box>
  );
});

ScrollContainer.displayName = "ScrollContainer";
