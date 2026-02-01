import React from "react";
import { Box } from "@mui/material";
import { useStore } from "../store/store";
import ProductGrid from "../components/ProductGrid";
import ProductOffersTable from "../components/ProductOffersTable";
import NoProductsFound from "../components/NoProductsFound";

const ProductsPage: React.FC = () => {
  const query = useStore((s) => s.query);
  const aggregatedProducts = useStore((s) => s.aggregatedProducts);

  if (!query || aggregatedProducts.length === 0) {
    return <NoProductsFound query={query} />;
  }

  return (
    <Box>
      <ProductGrid />
      <ProductOffersTable />
    </Box>
  );
};

export default ProductsPage;
