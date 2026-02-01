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
  CircularProgress,
} from "@mui/material";

import { useTranslation } from "react-i18next";
import type { AggregatedProduct } from "../types/AggregatedProduct";
import { useStore } from "../store/store";
import ListAltIcon from "@mui/icons-material/ListAlt";
import { useEffect } from "react";
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
          gap: isVerySmall ? "1rem" : 3,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
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
                  <ListAltIcon />
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
            mt: 4,
            mb: 2,
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
      {isLoading && aggregated_products.length > 0 && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            zIndex: 9999,
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </> // Close the fragment
  );
};

export default ProductGrid;
