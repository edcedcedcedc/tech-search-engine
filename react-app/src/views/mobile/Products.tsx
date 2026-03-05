// views/mobile/ProductsMobile.tsx
import React from "react";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import { ProductsHeader } from "../../components/ProductsHeader";
import ProductGrid from "../../components/ProductGrid";
import EmptyState from "../../components/EmptyState";
import { useStore, useLastQueryStore } from "../../store/store";
import { useTranslation } from "react-i18next";
import { uiLog } from "../../webhook/client/uiDebug";
import { useNavigate } from "react-router-dom";
import { useHideOnScroll } from "../../hooks/useHideOnScroll";

const ProductsMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.slice(0, 2);
  const navigate = useNavigate();
  const currentPage = useStore((s) => s.currentPage);
  const totalPages = useStore((s) => s.totalPages);
  const searchProducts = useStore((s) => s.searchProducts);
  const isLoading = useStore((s) => s.isLoading);
  const storeQuery = useStore((s) => s.query);
  const products = useStore((s) => s.aggregatedProducts);
  const hasSearched = useStore((s) => s.hasSearched);
  const searchError = useStore((s) => s.searchError);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));

  const isHeaderVisible = useHideOnScroll({
    threshold: 10,
    hideOnMount: false,
  });

  const getQueryToUse = () => {
    const lastQuery = useLastQueryStore.getState().lastQuery;
    return lastQuery || storeQuery || "";
  };

  const handlePrev = () => {
    if (currentPage > 1 && !isLoading) {
      const queryToUse = getQueryToUse();
      uiLog(
        `[ProductsMobile] Prev page - from ${currentPage} to ${currentPage - 1} with query: "${queryToUse}"`,
      );

      if (queryToUse) {
        searchProducts(queryToUse, lang, currentPage - 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !isLoading) {
      const queryToUse = getQueryToUse();
      uiLog(
        `[ProductsMobile] Next page - from ${currentPage} to ${currentPage + 1} with query: "${queryToUse}"`,
      );

      if (queryToUse) {
        searchProducts(queryToUse, lang, currentPage + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
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
        p: 2,
        pb: 8,
        transition: theme.transitions.create(["padding"], {
          duration: theme.transitions.duration.standard,
          easing: theme.transitions.easing.easeInOut,
        }),
        willChange: "padding",
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
        sticky={true}
        hideOnScroll={true}
        isHeaderVisible={isHeaderVisible}
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

export default ProductsMobile;
