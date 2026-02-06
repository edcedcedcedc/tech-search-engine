import React from "react";
import { Box } from "@mui/material";
import { useStore } from "../store/store";
import ProductGrid from "../components/ProductGrid";
import ProductOffersTable from "../components/ProductOffersTable";
import EmptySearchState from "../components/EmptySearchState";

const ProductsPage: React.FC = () => {
  const query = useStore((s) => s.query);
  const aggregatedProducts = useStore((s) => s.aggregatedProducts);
  const isLoading = useStore((s) => s.isLoading);

  // Only show "NoProductsFound" if search is done, query exists, and no products returned
  const showNoProducts = !isLoading && query && aggregatedProducts.length === 0;

  if (showNoProducts) {
    return <EmptySearchState query={query} />;
  }

  // During loading, or if products exist, show the normal grid with fade
  return (
    <Box>
      <ProductGrid />
      <ProductOffersTable />
    </Box>
  );
};

export default ProductsPage;
