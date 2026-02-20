// components/EmptyState.tsx
import React from "react";
import {
  Box,
  Typography,
  Button,
  useTheme,
  alpha,
  Fade,
  Paper,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InventoryIcon from "@mui/icons-material/Inventory";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useTranslation } from "react-i18next";

interface EmptyStateProps {
  type?: "initial" | "noResults" | "error";
  hasSearched?: boolean;
  onAction?: () => void;
  actionLabel?: string;
  message?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  type = "initial",
  hasSearched = false,
  onAction,
  actionLabel,
  message,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const getContent = () => {
    switch (type) {
      case "noResults":
        return {
          icon: <SentimentDissatisfiedIcon />,
          title: t("No matches found"),
          description: message || t("Try adjusting your search"),
          actionLabel: actionLabel || t("Clear"),
        };

      case "error":
        return {
          icon: <ErrorOutlineIcon />,
          title: t("Unable to load"),
          description: message || t("Check your connection"),
          actionLabel: actionLabel || t("Retry"),
        };

      default:
        return {
          icon: <InventoryIcon />,
          title: t("No products"),
          description: hasSearched
            ? t("No results for this search")
            : t("Your products will appear here"),
          actionLabel: actionLabel || (!hasSearched ? t("Search") : undefined),
        };
    }
  };

  const content = getContent();

  return (
    <Fade in timeout={200}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: {
            xs: "calc(100vh - 180px)",
            sm: 400,
          },
          width: "100%",
          px: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            maxWidth: 340,
            width: "100%",
            p: 4,
            bgcolor: "transparent",
            border: "none",
          }}
        >
          {/* Material Icon */}
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2.5,
              color: theme.palette.primary.main,
              "& svg": {
                fontSize: 32,
              },
            }}
          >
            {content.icon}
          </Box>

          {/* Material Typography */}
          <Typography
            variant="body1"
            sx={{
              fontWeight: 500,
              fontSize: "1rem",
              color: theme.palette.text.primary,
              mb: 1,
              letterSpacing: 0.15,
            }}
          >
            {content.title}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              fontSize: "0.875rem",
              color: theme.palette.text.secondary,
              textAlign: "center",
              mb: onAction && content.actionLabel ? 3 : 0,
              lineHeight: 1.6,
              letterSpacing: 0.15,
            }}
          >
            {content.description}
          </Typography>

          {/* Material Button */}
          {onAction && content.actionLabel && (
            <Button
              variant="text"
              onClick={onAction}
              size="medium"
              sx={{
                color: theme.palette.primary.main,
                fontWeight: 500,
                fontSize: "0.875rem",
                textTransform: "none",
                letterSpacing: 0.4,
                minWidth: "auto",
                px: 2,
                py: 0.5,
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              {content.actionLabel}
            </Button>
          )}
        </Paper>
      </Box>
    </Fade>
  );
};

export default EmptyState;
