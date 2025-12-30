import { Box, Container } from "@mui/material";
import { BrowserRouter } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import AppRoutes from "./router/Router";
import HeroSearch from "./components/HeroSearch";
import { useState } from "react";
import type { Product } from "./types/Product";
import { ProductContext } from "./mocks/ProductContext";
import type { ProductFilters } from "./types/ProductFilters";

function App() {
  // todo: remove in future and move logic to store
  const [products, setProducts] = useState<Product[]>([]);
  // const [filters, setFilters] = useState<ProductFilters>({
  //   brands: ["AOC", "Philips"],
  // });
  const [filters, setFilters] = useState<ProductFilters>({
    sortBy: "PRICE_LOW_TO_HIGH",
  });
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <BrowserRouter>
      {/* todo: remove in future */}
      <ProductContext
        value={{
          products,
          setProducts,
          filters,
          setFilters,
          loading,
          setLoading,
        }}
      >
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

          <Box
            component="main"
            sx={{
              flex: 1,
              overflowY: "scroll", // use scroll instead of overlay for consistency
              pb: "100px", // padding for footer
              position: "relative",

              // Custom scrollbar
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "rgba(0,0,0,0.3)",
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                backgroundColor: "rgba(0,0,0,0.5)",
              },
              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },
              scrollbarWidth: "thin",
            }}
          >
            <Container
              sx={{
                py: 4,
                maxWidth: "800px",
                mx: "auto", // horizontally center
              }}
            >
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
      </ProductContext>
    </BrowserRouter>
  );
}

export default App;
