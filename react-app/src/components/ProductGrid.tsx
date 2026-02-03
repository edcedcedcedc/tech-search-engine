import React, { useLayoutEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  useMediaQuery,
  IconButton,
  Tooltip,
} from "@mui/material";

import { useTranslation } from "react-i18next";
import type { AggregatedProduct } from "../types/AggregatedProduct";
import { useStore } from "../store/store";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

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
  const isVerySmall = useMediaQuery("(max-width:320px)");
  const aggregated_products = useStore((state) => state.aggregatedProducts);
  const currentPage = useStore((state) => state.currentPage);
  const isLoading = useStore((state) => state.isLoading);
  const onOpenProduct = useStore((state) => state.openProduct);
  const { t } = useTranslation();
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
    <>
      {" "}
      {/* Open fragment */}
      {/* Product Grid - Keep exact same structure */}
      <Box
        sx={{
          mt: 0,
          display: "grid",
          gap: 3,
          gridTemplateColumns: {
            xs: "1fr", // 0+
            sm: "1fr ", // 375+
            md: "1fr", // 425+ keep 2 columns
            lg: "1fr 1fr 1fr", // 768+ 3 columns
            xl: "1fr 1fr 1fr ", // 1024+ 4 columns
            xxl: "1fr 1fr 1fr ", // 1440+ 5 columns
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
                ...(isVerySmall && {
                  "& .MuiCardContent-root": { padding: "8px 10px" },
                  "& .MuiCardActions-root": { padding: "6px 10px" },
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
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom sx={{ color: "text.secondary" }}>
                  {product.offers.toLocaleString()}
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

              <CardActions sx={{ mt: "auto" }}>
                <Tooltip title={t("Offers_Tooltip")} enterDelay={1}>
                  <IconButton
                    onClick={() => onOpenProduct(product.id)}
                    size="small"
                    disabled={isLoading}
                  >
                    <VisibilityOutlinedIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          );
        })}
      </Box>
    </> // Close the fragment
  );
};

export default ProductGrid;
