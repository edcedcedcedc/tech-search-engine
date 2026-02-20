// views/mobile/HomeMobile.tsx
import React from "react";
import { Box, Typography, IconButton, Stack, Divider } from "@mui/material";
import { SearchAutocomplete } from "../../components/SearchAutocomplete";
import SearchIcon from "@mui/icons-material/Search";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { t } from "i18next";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
const HomeMobile: React.FC = () => {
  const [showTips, setShowTips] = React.useState(false);

  return (
    <Box sx={{ p: 2, pb: 8 }}>
      {/* Centered Header Text */}
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            fontSize: {
              xs: "1.1rem",
              sm: "1.2rem",
              md: "1.3rem",
            },
            mb: 1,
            color: "text.primary",
          }}
        >
          {t("Explore_tech_in_Moldova")}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontSize: {
              xs: "0.8rem",
              sm: "0.85rem",
              md: "0.9rem",
            },
            color: "text.secondary",
            lineHeight: 1.4,
          }}
        >
          {t("Discover_the_best_offers_for_your_favorite_products")}
        </Typography>
      </Box>

      {/* Search Section */}
      <Box sx={{ mb: 4 }}>
        <SearchAutocomplete />

        <Box
          sx={{
            display: "flex",

            gap: 2,
            mt: 2,
          }}
        >
          <AccessTimeIcon sx={{ fontSize: 18, color: "text.secondary" }} />
          <Typography variant="body2" color="text.secondary">
            {t("Updated_Today")} • 234 {t("Products")}
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 3 }} />

      {/* Expandable Tips */}
      <Box>
        <Box
          onClick={() => setShowTips(!showTips)}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            mb: showTips ? 2 : 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SearchIcon sx={{ fontSize: 20, color: "primary.main" }} />
            <Typography variant="subtitle2">{t("Search_tips")}</Typography>
          </Box>
          <IconButton size="small">
            {showTips ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>

        {showTips && (
          <Stack spacing={2} sx={{ pl: 4, mt: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <ContentCopyOutlinedIcon
                sx={{ fontSize: 18, color: "text.secondary" }}
              />
              <Typography variant="body2">
                {t("Copy_and_past_from_your_shops")}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2">{t("Diversity")}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <CompareArrowsIcon
                sx={{ fontSize: 18, color: "text.secondary" }}
              />
              <Typography variant="body2">{t("Compare")}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <VisibilityOffOutlinedIcon
                sx={{ fontSize: 18, color: "text.secondary" }}
              />
              <Typography variant="body2">{t("Visibility_off")}</Typography>
            </Box>
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default HomeMobile;
