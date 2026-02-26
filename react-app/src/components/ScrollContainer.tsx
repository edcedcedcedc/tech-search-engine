import React, { useEffect, useLayoutEffect, useRef, forwardRef } from "react";
import { Box, useTheme } from "@mui/material";
import { scrollableScrollbar } from "../styles/scrollbar";
import { uiLog } from "../webhook/client/uiDebug";
import { useScrollStore } from "../store/store";

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
      if (currentScrollElement === el) {
        setCurrentScrollElement(null);
      }
    };
  }, [setCurrentScrollElement]);

  useEffect(() => {
    if (containerRef.current) {
      uiLog(`[ScrollContainer][${route}] Mounted`);
    }

    if (ref && typeof ref === "object") {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current =
        containerRef.current;
    }
  }, [ref, route]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const savedPosition = scrollPositions.get(route) || 0;
      container.scrollTop = savedPosition;
    }
  }, [route]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      scrollPositions.set(route, container.scrollTop);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
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
        // Add a pseudo-element to ensure minimum scroll height
        "&::after": {
          content: '""',
          display: "block",
          height: "100px",
          opacity: 0,
          pointerEvents: "none",
        },
      }}
    >
      {children}
      {/* Add invisible spacer div to ensure minimum scroll height */}
      <Box sx={{ height: "1px", opacity: 0 }} />
    </Box>
  );
});

ScrollContainer.displayName = "ScrollContainer";
