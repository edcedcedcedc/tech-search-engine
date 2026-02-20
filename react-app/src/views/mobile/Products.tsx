// views/mobile/ProductsMobile.tsx
import React from "react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import NavigateNextOutlinedIcon from "@mui/icons-material/NavigateNextOutlined";
import NavigateBeforeOutlinedIcon from "@mui/icons-material/NavigateBeforeOutlined";
import ProductGrid from "../../components/ProductGrid";
import { useStore, useLastQueryStore } from "../../store/store";
import { useTranslation } from "react-i18next";
import { uiLog } from "../../webhook/client/uiDebug";

const ProductsMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.slice(0, 2);

  const currentPage = useStore((s) => s.currentPage);
  const totalPages = useStore((s) => s.totalPages);
  const searchProducts = useStore((s) => s.searchProducts);
  const isLoading = useStore((s) => s.isLoading);
  const storeQuery = useStore((s) => s.query);

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

  const showPagination = totalPages > 1;

  return (
    <Box sx={{ p: 2, pb: 8 }}>
      {/* Fixed header section - clean, no effects */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
          position: "sticky",
          top: 0,
          bgcolor: "background.default", // Solid background
          zIndex: 10,

          mt: -1,
          // Simple bottom border
          /*         borderBottom: 1,
          borderColor: "divider", */
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
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

      {/* Products grid */}
      <ProductGrid />
    </Box>
  );
};

export default ProductsMobile;
