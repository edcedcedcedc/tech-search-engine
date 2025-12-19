// src/views/Home.tsx
import { Box, Typography } from "@mui/material";
import ProductGrid from "../components/ProductGrid";
import { mockProducts } from "../mocks/product";
interface HeroSearchProps {
  query: string;
}

export default function Home({ query }: HeroSearchProps) {
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
        Compară prețurile produselor din mai multe magazine online din Republica
        Moldova, într-un singur loc.
      </Typography>

      <Typography variant="body2" color="text.secondary">
        Aplicația este în stadiu MVP.
      </Typography>
      <ProductGrid products={filteredProducts} />
    </Box>
  );
}
