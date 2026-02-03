import React from "react";
import { Box, Stack, Pagination } from "@mui/material";
import { useStore } from "../store/store";

interface BottomProps {
  isLoading?: boolean;
}
import { useLocation } from "react-router-dom";
const Bottom: React.FC<BottomProps> = ({ isLoading }) => {
  const currentPage = useStore((state) => state.currentPage);
  const totalPages = useStore((state) => state.totalPages);
  const aggregatedProducts = useStore((state) => state.aggregatedProducts);
  const setCurrentPage = useStore((state) => state.setCurrentPage);
  const searchProducts = useStore((state) => state.searchProducts);
  const location = useLocation();

  if (location.pathname !== "/products") return null;

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    page: number,
  ) => {
    if (page !== currentPage && !isLoading) {
      setCurrentPage(page);
      searchProducts(undefined, undefined, page);
    }
  };

  if (totalPages <= 1 || aggregatedProducts.length === 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        mt: 4,
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
