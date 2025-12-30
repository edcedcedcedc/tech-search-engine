// src/components/ProductGrid.tsx
import React from "react";
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  CircularProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";
// import { useProducts } from "../hooks/useProducts";
import { useProductContext } from "../mocks/useProductContextHook";

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

const ProductGrid = () => {
  const { t } = useTranslation();
  // fetch filters and search from store
  // const filters = getFiltersFromStore();
  // const search = getSearchFromStore();
  // const { products, loading, setPage } = useProducts({ filters, search });

  // const products = mockProducts;
  const { products, loading } = useProductContext();
  return (
    <Box
      sx={{
        mt: 4,
        display: "grid",
        gap: 3,
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
      }}
    >
      {loading ? (
        // todo: make this loader better
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 99999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
            width: "100%",
            height: "100%",
            backgroundColor: "#ffffff77",
            backdropFilter: "blur(5px)",
          }}
        >
          <CircularProgress variant="indeterminate" sx={{ scale: 2 }} />
        </Box>
      ) : (
        products.map((product) => (
          <Card key={product.id} sx={{ minWidth: 275 }}>
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
        ))
      )}
    </Box>
  );
};

export default ProductGrid;
