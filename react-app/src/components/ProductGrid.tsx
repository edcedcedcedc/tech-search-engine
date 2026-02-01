import React, { useLayoutEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  useMediaQuery,
  useTheme,
  IconButton,
  Pagination,
  Stack,
  Button,
} from "@mui/material";

import { useTranslation } from "react-i18next";
import type { AggregatedProduct } from "../types/AggregatedProduct";
import { useStore } from "../store/store";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import CachedOutlinedIcon from "@mui/icons-material/CachedOutlined";
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
  const theme = useTheme();
  const isVerySmall = useMediaQuery("(max-width:320px)");
  const aggregated_products = useStore((state) => state.aggregatedProducts);

  const currentPage = useStore((state) => state.currentPage);
  const totalPages = useStore((state) => state.totalPages);
  const totalResults = useStore((state) => state.totalResults);
  const isLoading = useStore((state) => state.isLoading);
  const onOpenProduct = useStore((state) => state.openProduct);
  const searchProducts = useStore((state) => state.searchProducts);
  const setCurrentPage = useStore((state) => state.setCurrentPage);

  useLayoutEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    main.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [currentPage]);
  // Helper: get translation for name or variant
  const getTranslated = (
    tObj: Record<string, string> | undefined,
    fallback: string,
  ) => {
    if (!tObj) return fallback;
    const lang = i18n.language || "en";
    return tObj[lang] || fallback;
  };

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    page: number,
  ) => {
    if (page !== currentPage && !isLoading) {
      // Then update state and load products
      setCurrentPage(page);
      searchProducts(undefined, undefined, page);
    }
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
                <IconButton
                  onClick={() => onOpenProduct(product.id)}
                  disabled={isLoading}
                >
                  <VisibilityOutlinedIcon />
                </IconButton>
              </CardActions>
            </Card>
          );
        })}
      </Box>
      {/* Pagination - Added below the grid */}
      {totalPages > 1 && aggregated_products.length > 0 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mt: 4,
            mb: 2,
            gap: 1.5, // spacing between pagination and icon button
          }}
        >
          <Stack spacing={2}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              variant="outlined"
              color="primary"
              disabled={isLoading}
            />
          </Stack>
        </Box>
      )}
      {/* Loading overlay for page changes */}
    </> // Close the fragment
  );
};

export default ProductGrid;
