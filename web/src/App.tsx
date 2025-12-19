import { Box, Container } from "@mui/material";
import { BrowserRouter } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import AppRoutes from "./routes/Routes";
import HeroSearch from "./components/HeroSearch";

function App() {
  return (
    <BrowserRouter>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh", // full viewport height
        }}
      >
        {/* HEADER + HERO */}
        <Box sx={{ flexShrink: 0 }}>
          <Header />
          <HeroSearch />
        </Box>

        {/* SCROLLABLE MAIN CONTENT */}
        <Box
          component="main"
          className="scrollable"
          sx={{
            flex: 1,
            overflowY: "auto", // only this box scrolls
            pb: "80px", // padding bottom so content doesn't hide under footer
          }}
        >
          <Container sx={{ py: 4 }}>
            <AppRoutes />
          </Container>
        </Box>

        {/* FIXED FOOTER */}
        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            width: "100%",
            zIndex: 1000,
          }}
        >
          <Footer />
        </Box>
      </Box>
    </BrowserRouter>
  );
}

export default App;
