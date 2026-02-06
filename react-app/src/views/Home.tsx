// src/views/Home.tsx
import { Box, Typography } from "@mui/material";
import ProductGrid from "../components/ProductGrid";
import { useTranslation } from "react-i18next";
import { useStore } from "../store/store";
import ProductOffersTable from "./ProductOffersTable";

export default function Home() {
  const { t } = useTranslation();
  /*  const filteredProducts = mockProducts.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  ); */
  //TODO: Dynamically change the keywords for relevant products
  // const productKeywords = products.map(p => p.name).join(", ");
  // <Meta keywords={productKeywords} />

  /*   const filteredProducts = aggregatedProducts.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  ); */
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Strugure
      </Typography>

      <Typography variant="body1" color="text.secondary">
        {t("Track_product_prices_from_multiple_online_stores_in_Moldova")}
      </Typography>

      <Typography variant="body2" color="text.secondary">
        {t("The_application_is_in_the_MVP_stage")}
      </Typography>
      <ProductGrid />
      <ProductOffersTable />
    </Box>
  );
}
