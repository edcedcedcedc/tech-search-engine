import { Box, Container } from "@mui/material";
import { BrowserRouter } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import AppRoutes from "./router/Router";
import HeroSearch from "./components/HeroSearch";
import { useState } from "react";
import ResetCookieButton from "./tests/components/ResetCookieButton";
import { Cookie } from "./components/Cookie";
import { Meta } from "./components/Meta";

function App() {
  const [query, setQuery] = useState("");

  return (
    <>
      <Meta />
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
            {/*COOKIE*/}
            <Cookie />
            {/* RESET COOKIE */}
            <ResetCookieButton />
            <Footer />
          </Box>
        </Box>
      </BrowserRouter>
    </>
  );
}

export default App;
