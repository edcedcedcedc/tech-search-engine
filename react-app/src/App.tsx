import { Box, Container, useTheme } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import Header from "./components/Header";
import VerticalHeader from "./components/VerticalHeader"; // our new vertical header
import AppRoutes from "./router/Router";
import { Meta } from "./components/Meta";
import { scrollableScrollbar } from "./styles/scrollbar";
import AppOverlays from "./components/Overlays";
import NotificationsContainer from "./components/NotificationContainer";
import Test from "./components/test";

function App() {
  const theme = useTheme();

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
          {/* HEADER + HERO - fixed at top */}
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
          <Test />
          {/* Main layout with vertical header + content */}
          <Box
            sx={{
              display: "flex",
              flex: 1,
              position: "relative",
              overflow: "hidden", // prevent double scrollbars
            }}
          >
            {/* Vertical Header */}

            <VerticalHeader />

            {/* MAIN CONTENT */}
            <Box
              component="main"
              sx={{
                flex: 1,
                overflowY: "auto",
                // leave space for vertical header
                transition: theme.transitions.create("margin-left", {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.standard,
                }),
                pb: {
                  xs: theme.spacing(1),
                  xl: theme.spacing(12.5),
                },
                position: "relative",
                ...scrollableScrollbar(theme),
              }}
            >
              <Container
                disableGutters
                maxWidth={false}
                sx={{
                  maxWidth: 800,
                  width: "100%",
                  mx: "auto",
                  pt: 1,
                  px: 1,
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
