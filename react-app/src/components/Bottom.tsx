import React from "react";
import { Box, Stack, Pagination } from "@mui/material";
import { useStore } from "../store/store";

import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
const Bottom: React.FC = () => {
  const currentPage = useStore((state) => state.currentPage);
  const totalPages = useStore((state) => state.totalPages);
  const aggregatedProducts = useStore((state) => state.aggregatedProducts);
  const setCurrentPage = useStore((state) => state.setCurrentPage);
  const searchProducts = useStore((state) => state.searchProducts);
  const isLoading = useStore((state) => state.isLoading);
  const location = useLocation();
  const { i18n } = useTranslation();
  const lang = i18n.language.slice(0, 2); // always 2-letter code

  if (location.pathname !== "/products") return null;

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number,
  ) => {
    if (page !== currentPage && !isLoading) {
      setCurrentPage(page);
      searchProducts(undefined, lang, page);
    }
  };

  if (totalPages <= 1 || aggregatedProducts.length === 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        mt: 0, // removed top margin
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
