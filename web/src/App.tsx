import { Box, Button, Container, useTheme } from "@mui/material";
import { BrowserRouter } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import AppRoutes from "./router/Router";
import { useStore } from "./store/store";
import HeroSearch from "./components/HeroSearch";
import { Cookie } from "./components/Cookie";
import { Meta } from "./components/Meta";

import ResetCookieButton from "./tests/components/ResetCookieButton";

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
          {/* HEADER + HERO */}
          <Box sx={{ flexShrink: 0 }}>
            <Header />
            <HeroSearch />
          </Box>

          {/* MAIN CONTENT */}
          <Box
            component="main"
            sx={{
              flex: 1,
              overflowY: "scroll",
              pb: theme.spacing(12.5), // 100px equivalent
              position: "relative",

              // Scrollbar styles
              "&::-webkit-scrollbar": { width: theme.spacing(1) },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: theme.palette.background.default, // dark thumb for light mode
                borderRadius: theme.shape.borderRadius,
              },
              "&::-webkit-scrollbar-thumb:hover": {
                backgroundColor: theme.palette.background.default,
              },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              scrollbarWidth: "thin", // Firefox
              scrollbarColor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.2) transparent"
                  : "rgba(0,0,0,0.3) transparent",
            }}
          >
            <Container sx={{ maxWidth: "800px", mx: "auto" }}>
              <AppRoutes />
            </Container>
          </Box>

          {/* FOOTER + COOKIE */}
          <Box
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              width: "100%",
              zIndex: 1000,
            }}
          >
            <Cookie />
            <Button
              onClick={() => console.log(useStore.getState().cookie.consent)}
            >
              Get
            </Button>
            <ResetCookieButton />
            <Footer />
          </Box>
        </Box>
      </BrowserRouter>
    </>
  );
}

export default App;
