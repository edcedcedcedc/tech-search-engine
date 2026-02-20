// views/mobile/ProductsMobile.tsx
import React from "react";
import { Box, Typography, IconButton, Tooltip, alpha } from "@mui/material";
import NavigateNextOutlinedIcon from "@mui/icons-material/NavigateNextOutlined";
import NavigateBeforeOutlinedIcon from "@mui/icons-material/NavigateBeforeOutlined";
import ProductGrid from "../../components/ProductGrid";
import EmptyState from "../../components/EmptyState";
import { useStore, useLastQueryStore } from "../../store/store";
import { useTranslation } from "react-i18next";
import { uiLog } from "../../webhook/client/uiDebug";
import { useNavigate } from "react-router-dom";

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
      // Focus search input
      const searchInput = document.querySelector('input[type="text"]');
      if (searchInput) {
        (searchInput as HTMLInputElement).focus();
      }
    } else {
      // Retry search
      const query = getQueryToUse();
      if (query) {
        searchProducts(query, lang, 1);
      }
    }
    navigate("/");
  };

  const showPagination = totalPages > 1 && products && products.length > 0;

  // Determine if we should show empty state
  const showEmptyState = !isLoading && (!products || products.length === 0);

  // Determine empty state type
  let emptyStateType: "initial" | "noResults" | "error" = "initial";
  if (searchError) emptyStateType = "error";
  else if (hasSearched && (!products || products.length === 0))
    emptyStateType = "noResults";

  return (
    <Box sx={{ p: 2, pb: 8 }}>
      {/* Fixed header section */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: showEmptyState ? 0 : 4,
          position: "sticky",
          top: 0,
          bgcolor: "background.default",
          zIndex: 10,
          mt: -1,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            fontSize: "1.5rem",
          }}
        >
          {t("Products")}
        </Typography>

        {showPagination && (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title={t("Previous_page_Tooltip")} enterDelay={500}>
              <span>
                <IconButton
                  size="small"
                  onClick={handlePrev}
                  disabled={currentPage <= 1 || isLoading}
                  sx={{
                    bgcolor: "background.paper",
                    boxShadow: 1,
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                    opacity: currentPage <= 1 || isLoading ? 0.5 : 1,
                  }}
                >
                  <NavigateBeforeOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={t("Next_page_Tooltip")} enterDelay={500}>
              <span>
                <IconButton
                  size="small"
                  onClick={handleNext}
                  disabled={currentPage >= totalPages || isLoading}
                  sx={{
                    bgcolor: "background.paper",
                    boxShadow: 1,
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                    opacity: currentPage >= totalPages || isLoading ? 0.5 : 1,
                  }}
                >
                  <NavigateNextOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        </Box>
      ) : showEmptyState ? (
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
