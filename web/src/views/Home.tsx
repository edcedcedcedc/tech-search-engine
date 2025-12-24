// src/views/Home.tsx
import { Box, Typography } from "@mui/material";
import ProductGrid from "../components/ProductGrid";
import { mockProducts } from "../mocks/product";
import { useTranslation } from "react-i18next";
interface HeroSearchProps {
  query: string;
}

export default function Home({ query }: HeroSearchProps) {
  const { t } = useTranslation();
  const filteredProducts = mockProducts.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Box
      sx={{
        maxWidth: 800,
        mx: "auto",
        //textAlign: "center",
      }}
    >
      <Typography variant="h4" gutterBottom>
        9999
      </Typography>

      <Typography variant="body1" color="text.secondary">
        {t(
          "Compare_product_prices_from_multiple_online_stores_in_the_Republic_of_Moldova_in_one_place"
        )}
      </Typography>

      <Typography variant="body2" color="text.secondary">
        {t("The_application_is_in_the_MVP_stage")}
      </Typography>
      <ProductGrid products={filteredProducts} />
    </Box>
  );
}
