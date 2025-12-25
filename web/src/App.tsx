import { Box, Button, Container, Typography } from "@mui/material";
import { BrowserRouter } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import AppRoutes from "./router/Router";
import HeroSearch from "./components/HeroSearch";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import CookieConsent from "react-cookie-consent";
import ResetCookieButton from "./components/TestResetCookieButton";

function App() {
  const [query, setQuery] = useState("");
  const { t } = useTranslation();

  return (
    <BrowserRouter>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        {/* HEADER + HERO */}
        <Box sx={{ flexShrink: 0 }}>
          <Header />
          <HeroSearch query={query} setQuery={setQuery} />
        </Box>

        {/* MAIN CONTENT */}
        <Box
          component="main"
          sx={{
            flex: 1,
            overflowY: "scroll",
            pb: "100px",
            position: "relative",
            "&::-webkit-scrollbar": { width: "8px" },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(0,0,0,0.3)",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              backgroundColor: "rgba(0,0,0,0.5)",
            },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            scrollbarWidth: "thin",
          }}
        >
          <Container sx={{ py: 4, maxWidth: "800px", mx: "auto" }}>
            <AppRoutes query={query} />
          </Container>
        </Box>

        {/* FOOTER + COOKIE CONSENT */}
        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            width: "100%",
            zIndex: 1000,
          }}
        >
          <CookieConsent
            location="bottom"
            cookieName="myAppCookieConsent"
            style={{ background: "transparent" }}
            buttonStyle={{ display: "none" }}
          >
            <Box
              sx={{
                bgcolor: "primary.dark",
                color: "primary.contrastText",
                p: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Typography
                sx={{ flex: 1, mr: 2, color: "primary.contrastText" }}
              >
                {t("Cookie_Statement")}
              </Typography>

              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  sx={{
                    borderColor: "secondary.main",
                    color: "secondary.main",
                  }}
                  onClick={() => {
                    document.cookie =
                      "myAppCookieConsent=false; path=/; max-age=12960000";
                    window.location.reload();
                  }}
                >
                  {t("Cookie_Reject_Button")}
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  sx={{
                    backgroundColor: "secondary.main",
                    color: "secondary.contrastText",
                  }}
                  onClick={(e) => {
                    document.cookie =
                      "myAppCookieConsent=true; path=/; max-age=12960000";
                    window.location.reload();
                  }}
                >
                  {t("Cookie_Accept_Button")}
                </Button>
              </Box>
            </Box>
          </CookieConsent>

          {/* Reset button */}
          <ResetCookieButton />

          <Footer />
        </Box>
      </Box>
    </BrowserRouter>
  );
}

export default App;
