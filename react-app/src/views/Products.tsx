// views/Products.tsx (desktop version)
import React from "react";
import { Box, useTheme } from "@mui/material";
import { ProductsHeader } from "../components/ProductsHeader";
import ProductGrid from "../components/ProductGrid";
import EmptyState from "../components/EmptyState";
import { useStore, useLastQueryStore } from "../store/store";
import { useTranslation } from "react-i18next";
import { uiLog } from "../webhook/client/uiDebug";
import { useNavigate } from "react-router-dom";

const Products: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.slice(0, 2);
  const navigate = useNavigate();
  const theme = useTheme();

  const currentPage = useStore((s) => s.currentPage);
  const totalPages = useStore((s) => s.totalPages);
  const searchProducts = useStore((s) => s.searchProducts);
  const isLoading = useStore((s) => s.isLoading);
  const storeQuery = useStore((s) => s.query);
  const products = useStore((s) => s.aggregatedProducts);
  const hasSearched = useStore((s) => s.hasSearched);
  const searchError = useStore((s) => s.searchError);

  const getQueryToUse = () => {
    const lastQuery = useLastQueryStore.getState().lastQuery;
    return lastQuery || storeQuery || "";
  };

  const handlePrev = () => {
    if (currentPage > 1 && !isLoading) {
      const queryToUse = getQueryToUse();
      uiLog(
        `[ProductsPage] Prev page - from ${currentPage} to ${currentPage - 1}`,
      );
      if (queryToUse) {
        searchProducts(queryToUse, lang, currentPage - 1);
      }
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !isLoading) {
      const queryToUse = getQueryToUse();
      uiLog(
        `[ProductsPage] Next page - from ${currentPage} to ${currentPage + 1}`,
      );
      if (queryToUse) {
        searchProducts(queryToUse, lang, currentPage + 1);
      }
    }
  };

  const handleAction = () => {
    if (!hasSearched) {
      const searchInput = document.querySelector('input[type="text"]');
      if (searchInput) {
        (searchInput as HTMLInputElement).focus();
      }
    } else {
      const query = getQueryToUse();
      if (query) {
        searchProducts(query, lang, 1);
      }
    }
    navigate("/");
  };

  const showPagination = totalPages > 1 && products && products.length > 0;
  const showEmptyState = !isLoading && (!products || products.length === 0);

  let emptyStateType: "initial" | "noResults" | "error" = "initial";
  if (searchError) emptyStateType = "error";
  else if (hasSearched && (!products || products.length === 0))
    emptyStateType = "noResults";

  return (
    <Box
      sx={{
        height: "100%",
        overflowY: "auto",

        "&::-webkit-scrollbar": { width: theme.spacing(1) },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: theme.palette.background.default,
          borderRadius: theme.shape.borderRadius,
        },
        "&::-webkit-scrollbar-thumb:hover": {
          backgroundColor: theme.palette.background.default,
        },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        scrollbarWidth: "thin",
        scrollbarColor:
          theme.palette.mode === "dark"
            ? "rgba(255, 255, 255, 0.02) transparent"
            : "rgba(0, 0, 0, 0.04) transparent",
      }}
    >
      <ProductsHeader
        currentPage={currentPage}
        totalPages={totalPages}
        isLoading={isLoading}
        onPrevPage={handlePrev}
        onNextPage={handleNext}
        showPagination={showPagination}
        title={t("Products")}
        sticky={true} // Changed to true so header stays on top when scrolling
        hideOnScroll={false} // Keep false so it doesn't hide, just sticks
        sx={{
          mb: showEmptyState ? 0 : 4,
          mt: 0,
          bgcolor: "background.default",
          zIndex: 10,
          px: 2, // Add horizontal padding
          py: 1.5, // Consistent vertical padding
        }}
      />

      {!isLoading && showEmptyState ? (
        <EmptyState
          type={emptyStateType}
          hasSearched={hasSearched}
          onAction={handleAction}
          message={searchError || undefined}
        />
      ) : (
        <ProductGrid />
      )}
    </Box>
  );
};

export default Products;
