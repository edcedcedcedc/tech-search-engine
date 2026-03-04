// App.tsx
import { Box, Container, useTheme, useMediaQuery } from "@mui/material";
import Header from "./components/Header";
import VerticalHeader from "./components/VerticalHeader";
import AppRoutes from "./router/Router";
import { Meta } from "./components/Meta";
import AppOverlays from "./components/Overlays";
import NotificationsContainer from "./components/NotificationContainer";
import { useHideOnScroll } from "./hooks/useHideOnScroll";
import { useRef, useEffect, useState, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { uiLog } from "./webhook/client/uiDebug";
import { useScrollStore } from "./store/store";
import { InstallBlocker } from "./components/InstallBlocker";

function App() {
  const theme = useTheme();
  // Use your custom breakpoint: xl = 1440px
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const location = useLocation();
  const currentScrollElement = useScrollStore((s) => s.currentScrollElement);
  const [blocker, setBlocker] = useState(false);

  // Per-route scroll refs
  const scrollRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
    "/": useRef<HTMLDivElement | null>(null),
    "/products": useRef<HTMLDivElement | null>(null),
    "/services": useRef<HTMLDivElement | null>(null),
    "/faq": useRef<HTMLDivElement | null>(null),
  };

  useEffect(() => {
    // Block iOS swipe-back at the document level (where Safari captures it)
    const blockEdgeSwipes = (e: TouchEvent) => {
      const touch = e.touches[0];

      // Block if it's a left edge swipe (iOS back gesture zone)
      if (touch && touch.clientX < 20) {
        e.preventDefault();
        uiLog("[App] Blocked iOS edge swipe");
      }
    };

    // Must use { passive: false } to allow preventDefault
    document.addEventListener("touchstart", blockEdgeSwipes, {
      passive: false,
    });

    return () => {
      document.removeEventListener("touchstart", blockEdgeSwipes);
    };
  }, []);

  useEffect(() => {
    // Disable native pull-to-refresh on all browsers
    const preventPullToRefresh = () => {
      // Apply to html and body
      document.documentElement.style.overscrollBehaviorY = "none";
      document.body.style.overscrollBehaviorY = "none";
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      uiLog("[App] Native pull-to-refresh disabled");
    };

    preventPullToRefresh();
  }, []);

  // Blocking logic
  useLayoutEffect(() => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    // Always allow installed PWA
    if (isStandalone) {
      setBlocker(false);
      uiLog("[App] PWA mode - showing app");
      return;
    }

    // Rule 1: Block all browsers on screens <1440px (mobile, tablets, small laptops)
    if (isMobile) {
      setBlocker(true);
      uiLog("[App] Screen <1440px - showing install blocker");
      return;
    }

    // Rule 2: Block Safari on any screen (including desktop)
    if (isSafari) {
      setBlocker(true);
      uiLog("[App] Safari detected (desktop) - showing install blocker");
      return;
    }

    // Otherwise allow (non-Safari desktop browsers on screens ≥1440px)
    setBlocker(false);
    uiLog("[App] Desktop browser (non-Safari) ≥1440px - showing web version");
  }, [isMobile]);

  // Debug logs (unchanged)
  useEffect(() => {
    uiLog(
      `[App] ScrollRefs initialized: ${Object.keys(scrollRefs)
        .map((k) => `${k}: ${!!scrollRefs[k].current}`)
        .join(", ")}`,
    );
  }, []);

  uiLog(
    `[App] Render cycle: route=${location.pathname}, isBelow1440=${isMobile}, hasScrollElement=${!!currentScrollElement}`,
  );

  const isHeaderVisible = useHideOnScroll({ threshold: 10 });

  useEffect(() => {
    uiLog(`[App] Header visibility updated: ${isHeaderVisible}`);
  }, [isHeaderVisible]);

  // Show blocker if conditions met
  if (blocker) {
    return <InstallBlocker />;
  }

  return (
    <>
      <Meta />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body1.fontSize,
          bgcolor: "background.default",
        }}
      >
        {/* HEADER */}
        <Box
          id="app-header"
          sx={{
            position: "sticky",
            top: 0,
            zIndex: theme.zIndex.appBar,
            flexShrink: 0,
            overflow: "hidden",
            height: isMobile ? (isHeaderVisible ? "auto" : 0) : "auto",
            transform: isMobile
              ? isHeaderVisible
                ? "translateY(0)"
                : "translateY(-100%)"
              : "none",
            transition: isMobile
              ? theme.transitions.create(["transform", "height"], {
                  duration: 300,
                  easing: theme.transitions.easing.easeInOut,
                })
              : "none",
            willChange: isMobile ? "transform, height" : "auto",
          }}
        >
          <Header />
        </Box>

        {/* Main layout */}
        <Box
          sx={{
            display: "flex",
            flex: 1,
            position: "relative",
            overflow: isMobile ? "hidden" : "visible",
            minHeight: 0,
          }}
        >
          {!isMobile && <VerticalHeader />}

          <Container
            disableGutters
            maxWidth={false}
            sx={{
              maxWidth: isMobile ? "100%" : 800,
              width: "100%",
              mx: "auto",
              pt: isMobile && !isHeaderVisible ? 0 : 1,
              px: isMobile ? 0 : 1,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: isMobile ? "hidden" : "visible", // Allow native scroll on desktop
              "& > *": {
                flex: 1,
                minHeight: 0,
                overflow: isMobile ? "hidden" : "visible", // Allow native scroll
              },
            }}
          >
            <AppRoutes scrollRefs={scrollRefs} />
          </Container>
        </Box>

        <NotificationsContainer />
        <AppOverlays />
      </Box>
    </>
  );
}

export default App;
