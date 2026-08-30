// components/ScrollContainer.tsx
import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  forwardRef,
  useCallback,
} from "react";
import { Box, useTheme } from "@mui/material";
import { scrollableScrollbar } from "../styles/scrollbar";
import { uiLog } from "../webhook/client/uiDebug";
import { useScrollStore } from "../store/store";
import { useStore } from "../store/store";
import { useTranslation } from "react-i18next";
import { PullToRefresh } from "./PullToRefresh";

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

  const { searchProducts, query, currentPage } = useStore();
  const { i18n } = useTranslation();

  useEffect(() => {
    // Block iOS swipe-back gesture while maintaining scroll
    const container = containerRef.current;
    if (!container) return;

    const blockSwipeBack = (e: Event) => {
      // Cast to TouchEvent since we know it's a touch event
      const touchEvent = e as TouchEvent;
      const touch = touchEvent.touches[0];

      // Only block if it's an edge swipe (first 20px from left edge)
      if (touch && touch.clientX < 20) {
        touchEvent.preventDefault();
      }
    };

    // Use type-safe event listener with proper typing
    container.addEventListener("touchstart", blockSwipeBack as EventListener, {
      passive: false,
    });

    return () => {
      container.removeEventListener(
        "touchstart",
        blockSwipeBack as EventListener,
      );
    };
  }, []); // Empty deps array since containerRef is stable

  // Handle refresh based on route
  const handleRefresh = useCallback(async () => {
    uiLog(`[ScrollContainer][${route}] Refreshing data`);

    switch (route) {
      case "/":
      case "/products":
        await searchProducts(query, i18n.language, currentPage, false);
        break;
      case "/services":
        // Add services refresh logic
        await new Promise((resolve) => setTimeout(resolve, 1000));
        break;
      case "/faq":
        // Add FAQ refresh logic
        await new Promise((resolve) => setTimeout(resolve, 1000));
        break;
      default:
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    uiLog(`[ScrollContainer][${route}] Refresh completed`);
  }, [route, searchProducts, query, i18n.language, currentPage]);

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

  const content = (
    <Box
      ref={containerRef}
      sx={{
        height: "100%",
        width: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        ...scrollableScrollbar(theme),
        scrollBehavior: "auto",
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
      <Box sx={{ height: "1px", opacity: 0 }} />
    </Box>
  );

  // Wrap with PullToRefresh
  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      scrollElement={containerRef.current}
      threshold={50}
    >
      {content}
    </PullToRefresh>
  );
});

ScrollContainer.displayName = "ScrollContainer";
