import React from "react";
import { Box } from "@mui/material";
import { useStore } from "../store/store";
import ProductGrid from "../components/ProductGrid";
import ProductOffersTable from "../components/ProductOffersTable";

const ProductsPage: React.FC = () => {
  const query = useStore((s) => s.query);
  const aggregatedProducts = useStore((s) => s.aggregatedProducts);
  const isLoading = useStore((s) => s.isLoading);

  // During loading, or if products exist, show the normal grid with fade
  return (
    <Box>
      <ProductGrid />
      <ProductOffersTable />
    </Box>
  );
};

export default ProductsPage;
