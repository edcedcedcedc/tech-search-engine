// App.tsx
import { Box, Container, useTheme, useMediaQuery } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import Header from "./components/Header";
import VerticalHeader from "./components/VerticalHeader";
import AppRoutes from "./router/Router";
import { Meta } from "./components/Meta";
import { scrollableScrollbar } from "./styles/scrollbar";
import AppOverlays from "./components/Overlays";
import NotificationsContainer from "./components/NotificationContainer";

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));

  console.log("📱 isMobile:", isMobile);

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
          {/* HEADER - always present */}
          <Box
            id="app-header"
            sx={{
              flexShrink: 0,
              position: "sticky",
              top: 0,
              zIndex: theme.zIndex.appBar,
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
            }}
          >
            {/* Vertical Header - ONLY on desktop */}
            {!isMobile && <VerticalHeader />}

            {/* MAIN CONTENT */}
            <Box
              component="main"
              sx={{
                flex: 1,
                overflowY: "auto",
                // Different padding/margin for mobile vs desktop
                ...(isMobile
                  ? {
                      pb: 7, // Space for bottom nav on mobile
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
                ...scrollableScrollbar(theme),
              }}
            >
              <Container
                disableGutters
                maxWidth={false}
                sx={{
                  maxWidth: isMobile ? "100%" : 800,
                  width: "100%",
                  mx: "auto",
                  pt: 1,
                  px: isMobile ? 0 : 1,
                }}
              >
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
