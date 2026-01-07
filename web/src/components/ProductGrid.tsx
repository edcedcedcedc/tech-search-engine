import React from "react";
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import { useTranslation } from "react-i18next";
import type { AggregatedProduct } from "../types/AggregatedProduct";
import { useStore } from "../store/store";

interface Props {
  /* aggregated_products: AggregatedProduct[];
  onOpenProduct: (productId: string) => void; */
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

const ProductGrid: React.FC<Props> = ({}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isVerySmall = useMediaQuery("(max-width:320px)");
  const aggregated_products = useStore((state) => state.aggregatedProducts);
  const onOpenProduct = useStore((state) => state.openProduct);

  return (
    <Box
      sx={{
        mt: 4,
        display: "grid",
        gap: isVerySmall ? "1rem" : 3, // even smaller vertical gap for 320px
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
      }}
    >
      {aggregated_products.map((product: AggregatedProduct) => (
        <Card
          key={product.id}
          sx={{
            ...(isVerySmall && {
              "& .MuiCardContent-root": {
                padding: "8px 10px",
              },
              "& .MuiCardActions-root": {
                padding: "6px 10px",
              },
              "& .MuiTypography-root": {
                fontSize: "0.7rem",
                lineHeight: 1.15,
                mb: 0.4,
              },
              "& .MuiButton-root": {
                minHeight: 30,
                fontSize: "0.7rem",
                padding: "3px 8px",
              },
            }),
          }}
        >
          <CardContent>
            <Typography gutterBottom sx={{ color: "text.secondary" }}>
              {product.offers.toLocaleString()}
            </Typography>

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

            <Typography sx={{ color: "text.secondary" }}>
              {product.brand} {product.variant ? `— ${product.variant}` : ""}
            </Typography>

            <Typography variant="body2" sx={{ color: "text.primary" }}>
              {product.lowest_price.toLocaleString()} MDL
            </Typography>
          </CardContent>

          <CardActions>
            <Button size="small" onClick={() => onOpenProduct(product.id)}>
              {t("See_product")}
            </Button>
          </CardActions>
        </Card>
      ))}
    </Box>
  );
};

export default ProductGrid;
