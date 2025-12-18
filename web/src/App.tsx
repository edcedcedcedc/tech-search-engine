import { ThemeProvider, CssBaseline, Container, Box } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import theme from "./theme/theme";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AppRoutes from "./routes/Routes"; // your routes
import HeroSearch from "./components/HeroSearch"; // hero search bar
import "./App.css";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Header />

        {/* Hero search section */}
        <HeroSearch />

        {/* Main content (renders pages via routes) */}
        <Box component="main" sx={{ flex: 1, py: 4 }}>
          <Container className="container">
            <AppRoutes />
          </Container>
        </Box>

        <Footer />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
