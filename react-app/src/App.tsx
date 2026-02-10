import {
  Box,
  Container,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { BrowserRouter } from "react-router-dom";

import Header from "./components/Header";

import AppRoutes from "./router/Router";
import { Cookie } from "./components/Cookie";
import { Meta } from "./components/Meta";
/* import ResetCookieButton from "./tests/components/ResetCookieButton"; */
import { SearchAutocomplete } from "./components/SearchAutocomplete";
import { useTranslation } from "react-i18next";
import Bottom from "./components/Bottom";
import { useNotificationStore } from "./store/store";
import { Notification } from "./components/Notification";
import SessionExpiredDialog from "./components/SessionExpiredDialog";
import OfflineDialog from "./components/OfflineDialog";
import { NetworkListener } from "./components/NetworkListener";
import i18n from "./i18n";
function App() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { notifications, removeNotification } = useNotificationStore();
  const isRO = i18n.language === "ro";
  const isSmallScreen = useMediaQuery("(max-width:768px)");
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
                py: 4, // keep top padding
                pb: isSmallScreen ? 0.5 : 4, // 0 padding bottom for xs (<768px), default 4 for sm+
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
                  fontSize: isRO ? "1.0rem" : "1.1rem", // default for smallest screen
                  [theme.breakpoints.up("sm")]: {
                    fontSize: isRO ? "1.1rem" : "1.3rem",
                  },
                  [theme.breakpoints.up("md")]: {
                    fontSize: isRO ? "1.25rem" : "1.4rem",
                  },
                  [theme.breakpoints.up("lg")]: {
                    fontSize: isRO ? "1.4rem" : "1.6rem",
                  },
                  [theme.breakpoints.up("xl")]: {
                    fontSize: isRO ? "1.6rem" : "1.8rem",
                  },
                  [theme.breakpoints.up("xxl")]: {
                    fontSize: isRO ? "1.8rem" : "2rem",
                  },
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
            {/* <TestNotification /> */}
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

          <Box
            sx={{
              position: "fixed",
              bottom: 16,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              pointerEvents: "none",
              zIndex: 1500,

              // Desktop default left-aligned
              left: 16,

              // Center notifications on screens ≤425px (xs, sm, md)
              right: 16,
              mx: { xs: "auto", sm: "auto", md: "auto", lg: "0" },
              width: {
                xs: "calc(100% - 32px)",
                sm: "calc(100% - 32px)",
                md: "calc(100% - 32px)",
                lg: "auto",
              },
              alignItems: {
                xs: "center",
                sm: "center",
                md: "center",
                lg: "flex-start",
              },
            }}
          >
            {notifications.map((n) => (
              <Box key={n.id} sx={{ pointerEvents: "auto" }}>
                <Notification
                  message={n.message}
                  type={n.type}
                  duration={n.duration}
                  onClose={() => removeNotification(n.id)}
                />
              </Box>
            ))}
          </Box>
          {/* Footer */}
          <Box
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              width: "100%",
              zIndex: 1000,
            }}
          >
            <OfflineDialog />
            <SessionExpiredDialog />
            <Cookie />
            <Bottom />
            <NetworkListener />
          </Box>
        </Box>
      </BrowserRouter>
    </>
  );
}

export default App;
