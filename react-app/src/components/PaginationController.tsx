// PaginationController.tsx
import React from "react";
import { Pagination, Stack, Box, Typography } from "@mui/material";
import { uiLog } from "../webhook/client/uiDebug";

interface PaginationControllerProps {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const PaginationController: React.FC<PaginationControllerProps> = ({
  currentPage,
  totalPages,
  totalResults,
  itemsPerPage,
  onPageChange,
  disabled = false,
}) => {
  // Log props on every render
  uiLog(
    `[PaginationController] Render - currentPage: ${currentPage}, totalPages: ${totalPages}, totalResults: ${totalResults}, disabled: ${disabled}`,
  );

  // Don't show pagination if only one page
  if (totalPages <= 1 || totalResults === 0) {
    uiLog(
      `[PaginationController] Hiding - totalPages: ${totalPages}, totalResults: ${totalResults}`,
    );
    return null;
  }

  const startItem = Math.min(
    (currentPage - 1) * itemsPerPage + 1,
    totalResults,
  );
  const endItem = Math.min(currentPage * itemsPerPage, totalResults);

  uiLog(
    `[PaginationController] Showing items ${startItem}-${endItem} of ${totalResults}`,
  );

  const handleChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    uiLog(
      `[PaginationController] Page change requested - from ${currentPage} to ${page}, disabled: ${disabled}`,
    );
    if (page !== currentPage && !disabled) {
      uiLog(`[PaginationController] Executing onPageChange for page ${page}`);
      onPageChange(page);
    } else {
      uiLog(
        `[PaginationController] Page change blocked - same page or disabled`,
      );
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: "center",
        gap: 2,
        mt: 4,
        mb: 3,
        p: 2,
        backgroundColor: "background.paper",
        borderRadius: 1,
        boxShadow: 1,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Showing {startItem}-{endItem} of {totalResults.toLocaleString()} results
      </Typography>

      <Stack spacing={2}>
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handleChange}
          variant="outlined"
          color="primary"
          disabled={disabled}
          showFirstButton
          showLastButton
          siblingCount={1}
          boundaryCount={1}
          size="medium"
          sx={{
            "& .MuiPaginationItem-root": {
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
            },
          }}
        />
      </Stack>
    </Box>
  );
};

export default PaginationController;
