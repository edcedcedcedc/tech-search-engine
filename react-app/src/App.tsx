import {
  Box,
  Container,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { BrowserRouter } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import AppRoutes from "./router/Router";
import { Cookie } from "./components/Cookie";
import { Meta } from "./components/Meta";
import ResetCookieButton from "./tests/components/ResetCookieButton";
import { SearchAutocomplete } from "./components/SearchAutocomplete";
import { useTranslation } from "react-i18next";
import Bottom from "./components/Bottom";

function App() {
  const theme = useTheme();
  const { t } = useTranslation();

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
            <Box
              sx={{
                py: 4,
                textAlign: "center",
                backgroundColor: theme.palette.background.default,
                px: { xs: 2, sm: 3, md: 4 },
              }}
            >
              <Typography
                variant="h3"
                component="h1"
                gutterBottom
                sx={(theme) => ({
                  fontWeight: 600,
                  lineHeight: 1.3,
                  textAlign: "center",

                  // Proportional scaling across breakpoints
                  fontSize: "0.9rem", // 320px
                  [theme.breakpoints.up("sm")]: { fontSize: "1.1rem" }, // 375px
                  [theme.breakpoints.up("md")]: { fontSize: "1.2rem" }, // 425px
                  [theme.breakpoints.up("lg")]: { fontSize: "1.4rem" }, // 768px
                  [theme.breakpoints.up("xl")]: { fontSize: "1.8rem" }, // 1024px
                  [theme.breakpoints.up("xxl")]: { fontSize: "2rem" }, // 1440px
                })}
              >
                {t("Explore_tech_in_Moldova")}
              </Typography>

              <Typography
                variant="h6"
                color="text.secondary"
                gutterBottom
                sx={(theme) => ({
                  lineHeight: 1.4,
                  textAlign: "center",

                  // Proportional scaling across breakpoints
                  fontSize: "0.65rem", // 320px
                  [theme.breakpoints.up("sm")]: { fontSize: "0.8rem" }, // 375px
                  [theme.breakpoints.up("md")]: { fontSize: "0.85rem" }, // 425px
                  [theme.breakpoints.up("lg")]: { fontSize: "0.95rem" }, // 768px
                  [theme.breakpoints.up("xl")]: { fontSize: "1rem" }, // 1024px
                  [theme.breakpoints.up("xxl")]: { fontSize: "1.1rem" }, // 1440px
                })}
              >
                {t("Discover_the_best_offers_for_your_favorite_products")}
              </Typography>

              <Box
                sx={{
                  mt: 2,
                  maxWidth: 600,
                  mx: "auto",
                  py: 2,
                  fontSize: "1.05rem",
                }}
              >
                <SearchAutocomplete />
              </Box>
            </Box>
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
                backgroundColor: theme.palette.background.default,
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
            <Container
              disableGutters
              maxWidth={false} // <-- ignore default breakpoints
              sx={{
                maxWidth: 800, // container stays 800px on large screens
                width: "100%", // takes full width on smaller screens
                mx: "auto", // centers container
                pt: 0, // remove top padding
              }}
            >
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
            <Bottom />
          </Box>
        </Box>
      </BrowserRouter>
    </>
  );
}

export default App;
