import React from "react";
import { Box, Stack, Pagination } from "@mui/material";
import { useStore, useLastQueryStore } from "../store/store";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { uiLog } from "../webhook/client/uiDebug";

const Bottom: React.FC = () => {
  const currentPage = useStore((state) => state.currentPage);
  const totalPages = useStore((state) => state.totalPages);
  const aggregatedProducts = useStore((state) => state.aggregatedProducts);
  const searchProducts = useStore((state) => state.searchProducts);
  const isLoading = useStore((state) => state.isLoading);
  const storeQuery = useStore((state) => state.query); // Get current query from store
  const location = useLocation();
  const { i18n } = useTranslation();
  const lang = i18n.language.slice(0, 2);

  // Log state on every render
  uiLog(
    `[BottomPaginator] Render - path: ${location.pathname}, totalPages: ${totalPages}, products: ${aggregatedProducts.length}, currentPage: ${currentPage}, isLoading: ${isLoading}`,
  );

  if (location.pathname !== "/products") {
    uiLog(`[BottomPaginator] Not on products page, returning null`);
    return null;
  }

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number,
  ) => {
    uiLog(
      `[BottomPaginator] Page change requested - from ${currentPage} to ${page}, isLoading: ${isLoading}`,
    );

    if (page !== currentPage && !isLoading) {
      // Try multiple sources for the query, in order of reliability
      const lastQuery = useLastQueryStore.getState().lastQuery;
      const currentQuery = storeQuery;

      // Use lastQuery first (persisted), fallback to currentQuery, then empty string
      const queryToUse = lastQuery || currentQuery || "";

      uiLog(
        `[BottomPaginator] Executing search for page ${page} with query: "${queryToUse}" (lastQuery: "${lastQuery}", currentQuery: "${currentQuery}")`,
      );

      if (queryToUse) {
        searchProducts(queryToUse, lang, page);
      } else {
        uiLog(
          `[BottomPaginator] CRITICAL: No query found in lastQuery or store!`,
        );
        // Optionally redirect to home or show error
      }
    } else {
      uiLog(
        `[BottomPaginator] Page change blocked - ${page === currentPage ? "same page" : ""} ${isLoading ? "loading" : ""}`,
      );
    }
  };

  if (totalPages <= 1 || aggregatedProducts.length === 0) {
    uiLog(
      `[BottomPaginator] Hiding - totalPages: ${totalPages}, products: ${aggregatedProducts.length}`,
    );
    return null;
  }

  return (
    <Box
      sx={{
        display: {
          xs: "none",
          sm: "none",
          md: "none",
          lg: "none",
          xl: "flex",
        },
        justifyContent: "center",
        alignItems: "center",
        mt: 0,
        mb: 2,
        gap: 1.5,
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
  );
};

export default Bottom;
