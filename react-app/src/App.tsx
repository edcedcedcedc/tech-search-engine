// App.tsx
import { Box, Container, useTheme, useMediaQuery } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import Header from "./components/Header";
import VerticalHeader from "./components/VerticalHeader";
import AppRoutes from "./router/Router";
import { Meta } from "./components/Meta";
import AppOverlays from "./components/Overlays";
import NotificationsContainer from "./components/NotificationContainer";
import { useHideOnScroll } from "./hooks/useHideOnScroll";
import { useScrollContainer } from "./hooks/useScrollContainer";
import { uiLog } from "./webhook/client/uiDebug";

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));

  // Get the active ScrollContainer
  const scrollElement = useScrollContainer();

  uiLog(
    `[App] Rendering with isMobile: ${isMobile}, hasScrollElement: ${!!scrollElement}`,
  );

  // Use the hook with the ScrollContainer
  const isHeaderVisible = useHideOnScroll({
    scrollElement,
    threshold: 10,
  });

  console.log("📱 isMobile:", isMobile);
  console.log("👆 Header visible:", isHeaderVisible);

  return (
    <>
      <Meta />
      <BrowserRouter>
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
              flexShrink: 0,
              position: "sticky",
              top: 0,
              zIndex: theme.zIndex.appBar,
              display: isMobile && !isHeaderVisible ? "none" : "block",
              transform: isMobile && isHeaderVisible ? "translateY(0)" : "none",
              transition:
                isMobile && isHeaderVisible
                  ? theme.transitions.create("transform", {
                      duration: theme.transitions.duration.standard,
                      easing: theme.transitions.easing.easeInOut,
                    })
                  : "none",
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
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            {/* Vertical Header - ONLY on desktop */}
            {!isMobile && <VerticalHeader />}

            {/* MAIN CONTENT - This just provides the container for ScrollContainer */}
            <Box
              component="main"
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                height: "100%",
                ...(isMobile
                  ? {
                      pb: 7, // Space for bottom nav
                    }
                  : {
                      transition: theme.transitions.create("margin-left", {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.standard,
                      }),
                      pb: {
                        xs: theme.spacing(1),
                        xl: theme.spacing(1),
                      },
                    }),
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
                {/* AppRoutes renders ScrollContainer which handles actual scrolling */}
                <AppRoutes />
              </Container>
            </Box>
          </Box>
          <NotificationsContainer />
          <AppOverlays />
        </Box>
      </BrowserRouter>
    </>
  );
}

export default App;
