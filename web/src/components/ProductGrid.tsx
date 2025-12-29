// src/components/ProductGrid.tsx
import React from "react";
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
} from "@mui/material";
import type { Product } from "../types/Product";
import { useTranslation } from "react-i18next";

interface Props {
  products: Product[];
}

const bull = (
  <Box
    component="span"
    sx={{
      display: "inline-block",
      mx: "2px",
      transform: "scale(0.8)",
      color: "text.secondary",
    }}
  >
    •
  </Box>
);

const ProductGrid: React.FC<Props> = ({ products }) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        mt: 4,
        display: "grid",
        gap: 3,
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
      }}
    >
      {products.map((product) => (
        <Card key={product.id}>
          <CardContent>
            {/* Shop name - small text */}
            <Typography
              gutterBottom
              sx={{ color: "text.secondary", fontSize: 14 }}
            >
              {product.shop}
            </Typography>

            {/* Product name with bulls between words */}
            <Typography
              variant="h5"
              component="div"
              sx={{ color: "text.primary" }}
            >
              {product.name.split(" ").map((word, idx, arr) => (
                <React.Fragment key={idx}>
                  {word}
                  {idx < arr.length - 1 && bull}
                </React.Fragment>
              ))}
            </Typography>

            {/* Brand / Variant */}
            <Typography sx={{ color: "text.secondary", mb: 1.5 }}>
              {product.brand} {product.variant ? `— ${product.variant}` : ""}
            </Typography>

            {/* Price */}
            <Typography variant="body2" sx={{ color: "text.primary" }}>
              {product.price.toLocaleString()} MDL
            </Typography>
          </CardContent>

          <CardActions>
            <Button
              size="small"
              href={product.url}
              target="_blank"
              rel="noopener"
            >
              {t("See_product")}
            </Button>
          </CardActions>
        </Card>
      ))}
    </Box>
  );
};

export default ProductGrid;
