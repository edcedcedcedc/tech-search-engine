// App.tsx
import { Box, Container, useTheme, useMediaQuery, Slide } from "@mui/material";
import Header from "./components/Header";
import VerticalHeader from "./components/VerticalHeader";
import AppRoutes from "./router/Router";
import { Meta } from "./components/Meta";
import AppOverlays from "./components/Overlays";
import NotificationsContainer from "./components/NotificationContainer";
import { useHideOnScroll } from "./hooks/useHideOnScroll";
import { useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { uiLog } from "./webhook/client/uiDebug";
import { useScrollStore } from "./store/store";

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const location = useLocation();
  const currentScrollElement = useScrollStore((s) => s.currentScrollElement);

  // ----------------------
  // Per-route scroll refs
  // ----------------------
  const scrollRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
    "/": useRef<HTMLDivElement | null>(null),
    "/products": useRef<HTMLDivElement | null>(null),
    "/services": useRef<HTMLDivElement | null>(null),
    "/faq": useRef<HTMLDivElement | null>(null),
  };

  // ----------------------
  // Debug scrollRefs assignment
  // ----------------------
  useEffect(() => {
    uiLog(
      `[App] ScrollRefs initialized: ${Object.keys(scrollRefs)
        .map((k) => `${k}: ${!!scrollRefs[k].current}`)
        .join(", ")}`,
    );
  }, []);

  useEffect(() => {
    // Only for iOS Safari (not PWA)
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone;

    if (isIOS && !isStandalone) {
      const handleScroll = () => {
        // When scrolled down, make height full to hide toolbar
        if (window.scrollY > 50) {
          document.documentElement.style.height = "100%";
          document.body.style.height = "100%";
        } else {
          // When at top, restore to trigger toolbar show
          document.documentElement.style.height = "";
          document.body.style.height = "";
        }
      };

      // Initial force
      window.scrollTo(0, 1);

      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, []);

  // ----------------------
  // Get current route scroll element
  // ----------------------
  //const scrollElement = scrollRefs[location.pathname]?.current || null;

  uiLog(
    `[App] Render cycle: route=${location.pathname}, isMobile=${isMobile}, hasScrollElement=${!!currentScrollElement}`,
  );

  // ----------------------
  // Header visibility debug
  // ----------------------
  const isHeaderVisible = useHideOnScroll({
    threshold: 10,
  });

  useEffect(() => {
    uiLog(`[App] Header visibility updated: ${isHeaderVisible}`);
  }, [isHeaderVisible]);

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
        {/*   <Slide direction="down" in={isHeaderVisible} mountOnEnter unmountOnExit> */}
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
        {/*      </Slide> */}
        {/* Main layout */}
        <Box
          sx={{
            display: "flex",
            flex: 1,
            position: "relative",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {!isMobile && <VerticalHeader />}

          <Box
            component="main"
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              height: "100%",
              pb: isMobile ? 7 : 0,
              position: "relative",
            }}
          >
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
              }}
            >
              <AppRoutes scrollRefs={scrollRefs} />
            </Container>
          </Box>
        </Box>

        <NotificationsContainer />
        <AppOverlays />
      </Box>
    </>
  );
}

export default App;
