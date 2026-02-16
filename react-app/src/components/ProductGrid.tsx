import React, { useLayoutEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  useMediaQuery,
  CardActionArea,
} from "@mui/material";

import { useTranslation } from "react-i18next";
import type { AggregatedProduct } from "../types/AggregatedProduct";
import { useStore } from "../store/store";

interface Props {}

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

const ProductGrid: React.FC<Props> = () => {
  const { i18n } = useTranslation();
  const isSmallScreen = useMediaQuery("(max-width:768px)");
  const isVerySmallScreen = useMediaQuery("(max-width:425px)");
  const isTinyScreen = useMediaQuery("(max-width:320px)");
  const aggregated_products = useStore((state) => state.aggregatedProducts);
  const currentPage = useStore((state) => state.currentPage);
  const isLoading = useStore((state) => state.isLoading);
  const onOpenProduct = useStore((state) => state.openProduct);

  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useLayoutEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    main.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [currentPage]);

  const getTranslated = (
    tObj: Record<string, string> | undefined,
    fallback: string,
  ) => {
    if (!tObj) return fallback;
    const lang = i18n.language || "en";
    return tObj[lang] || fallback;
  };

  return (
    <Box
      sx={{
        mt: 0,
        display: "grid",
        gap: 3,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "1fr",
          md: "1fr",
          lg: "1fr 1fr 1fr",
          xl: "1fr 1fr 1fr",
          xxl: "1fr 1fr 1fr",
        },
      }}
    >
      {aggregated_products.map((product: AggregatedProduct) => {
        const displayName = getTranslated(product.t_name, product.name);
        const displayVariant = getTranslated(product.t_variant, "");

        return (
          <Card
            key={product.id}
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              border: (theme) => `1px solid ${theme.palette.divider}`,
              transition: "border-color 0.25s ease",
              cursor: isLoading ? "default" : "pointer",
            }}
          >
            <CardActionArea
              disabled={isLoading}
              onClick={() => !isLoading && onOpenProduct(product.id)}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom sx={{ color: "text.secondary" }}>
                  {product.offers_count}
                </Typography>
                <Typography
                  variant="h5"
                  component="div"
                  sx={{ color: "text.primary" }}
                >
                  {displayName.split(" ").map((word, idx, arr) => (
                    <React.Fragment key={`${product.id}-${idx}`}>
                      {word}
                      {idx < arr.length - 1 && bull}
                    </React.Fragment>
                  ))}
                </Typography>
                <Typography sx={{ color: "text.secondary" }}>
                  {product.brand} {displayVariant ? `— ${displayVariant}` : ""}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.primary" }}>
                  {product.lowest_price.toLocaleString()} MDL
                </Typography>
                <Typography variant="body2" sx={{ color: "text.primary" }}>
                  {product.shops.map((s) => ` ${s}`)}
                </Typography>
              </CardContent>

              <CardActions sx={{ mt: 0, pt: 0 }} />
            </CardActionArea>
          </Card>
        );
      })}
    </Box>
  );
};

export default ProductGrid;
