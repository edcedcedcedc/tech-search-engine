// components/ScrollContainer.tsx
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { Box, useTheme } from "@mui/material";
import { scrollableScrollbar } from "../styles/scrollbar";

interface ScrollContainerProps {
  children: React.ReactNode;
  route: string;
}

// Store scroll positions per route
const scrollPositions = new Map<string, number>();

export const ScrollContainer: React.FC<ScrollContainerProps> = ({
  children,
  route,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  // Restore scroll position when mounting
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const savedPosition = scrollPositions.get(route) || 0;
      container.scrollTop = savedPosition;
    }
  }, [route]);

  // Save scroll position on scroll
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
        // Smooth scrolling
        scrollBehavior: "auto",
      }}
    >
      {children}
    </Box>
  );
};
