// components/ProductsHeader.tsx
import React from "react";
import { Box, Typography, IconButton, Tooltip, useTheme } from "@mui/material";
import NavigateNextOutlinedIcon from "@mui/icons-material/NavigateNextOutlined";
import NavigateBeforeOutlinedIcon from "@mui/icons-material/NavigateBeforeOutlined";
import { useTranslation } from "react-i18next";
import { uiLog } from "../webhook/client/uiDebug";

interface ProductsHeaderProps {
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  showPagination?: boolean;
  title?: string;
  sticky?: boolean;
  sx?: object;
  hideOnScroll?: boolean;
  isHeaderVisible?: boolean;
}

export const ProductsHeader: React.FC<ProductsHeaderProps> = ({
  currentPage,
  totalPages,
  isLoading,
  onPrevPage,
  onNextPage,
  showPagination = true,
  title,
  sticky = true,
  sx = {},
  hideOnScroll = false,
  isHeaderVisible = true,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const shouldShowPagination = showPagination && totalPages > 1;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 4,
        ...(sticky && {
          position: "sticky",
          top: 0,
          bgcolor: "background.default",
          zIndex: 10,
        }),
        ...(hideOnScroll && {
          transform: isHeaderVisible ? "translateY(0)" : "translateY(-100%)",
          transition: theme.transitions.create("transform"),
        }),
        ...sx,
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 600,
        }}
      >
        {title || t("Products")}
      </Typography>

      {shouldShowPagination && (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title={t("Previous_page_Tooltip")} enterDelay={500}>
            <IconButton
              size="small"
              onClick={onPrevPage}
              disabled={currentPage <= 1 || isLoading}
              sx={{
                bgcolor: "background.paper",
                boxShadow: 1,
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <NavigateBeforeOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={t("Next_page_Tooltip")} enterDelay={500}>
            <IconButton
              size="small"
              onClick={onNextPage}
              disabled={currentPage >= totalPages || isLoading}
              sx={{
                bgcolor: "background.paper",
                boxShadow: 1,
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <NavigateNextOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};
