// components/PullToRefresh.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Box, CircularProgress, useTheme } from "@mui/material";
import { styled } from "@mui/material/styles";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  scrollElement?: HTMLElement | null;
  threshold?: number;
}

const PullIndicator = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== "pullDistance" && prop !== "isRefreshing",
})<{ pullDistance: number; isRefreshing: boolean }>(
  ({ theme, pullDistance, isRefreshing }) => ({
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: 40,
    transform: `translateY(${isRefreshing ? 0 : -40 + Math.min(pullDistance, 40)}px)`,
    transition: isRefreshing ? "transform 0.3s ease" : "transform 0.1s linear",
    zIndex: theme.zIndex.appBar + 1,
    pointerEvents: "none",
    color: theme.palette.primary.main,
  }),
);

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  scrollElement,
  threshold = 60,
}) => {
  const theme = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const startY = useRef(0);
  const isPulling = useRef(false);
  const refreshTimeoutRef = useRef<any>(null);

  const checkIfAtTop = useCallback(() => {
    if (!scrollElement) return true;
    return scrollElement.scrollTop <= 0;
  }, [scrollElement]);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (isRefreshing) return;

      if (checkIfAtTop()) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
        setPullDistance(0);
      }
    },
    [isRefreshing, checkIfAtTop],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (isRefreshing || !isPulling.current || !checkIfAtTop()) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        // Track distance WITHOUT preventing default
        // This lets native animation happen while we track
        const distance = Math.min(diff * 0.5, 70);
        setPullDistance(distance);
      }
    },
    [isRefreshing, checkIfAtTop],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || !checkIfAtTop()) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }

    isPulling.current = false;

    // Check if they pulled down enough
    if (pullDistance >= threshold) {
      setIsRefreshing(true);

      try {
        await onRefresh();
      } catch (error) {
        console.error("[PullToRefresh] Refresh failed:", error);
      } finally {
        refreshTimeoutRef.current = setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }

    startY.current = 0;
  }, [pullDistance, threshold, onRefresh, checkIfAtTop]);

  useEffect(() => {
    const element = scrollElement;
    if (!element) return;

    element.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    element.addEventListener("touchmove", handleTouchMove, { passive: true }); // passive: true lets native animation happen
    element.addEventListener("touchend", handleTouchEnd);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [scrollElement, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calculate content padding based on pull distance or refresh state
  const contentPadding = isRefreshing ? 24 : Math.min(pullDistance * 0.3, 24);

  return (
    <Box sx={{ position: "relative", height: "100%", width: "100%" }}>
      {/* Pull indicator - shows arrow while pulling, spinner while refreshing */}
      <PullIndicator pullDistance={pullDistance} isRefreshing={isRefreshing}>
        {isRefreshing ? (
          <CircularProgress size={24} thickness={4} />
        ) : (
          <Box
            sx={{
              transform: `rotate(${Math.min(pullDistance / threshold, 1) * 180}deg)`,
              transition: "transform 0.2s ease",
              fontSize: "24px",
            }}
          >
            ↓
          </Box>
        )}
      </PullIndicator>

      {/* Content wrapper with dynamic padding */}
      <Box
        sx={{
          height: "100%",
          width: "100%",
          overflow: "auto",
          pt: `${contentPadding}px`,
          transition: "padding-top 0.2s ease-out",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
