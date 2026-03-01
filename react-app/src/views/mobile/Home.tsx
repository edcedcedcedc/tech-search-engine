import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Divider,
  CircularProgress,
  Chip,
  Tooltip,
} from "@mui/material";
import { SearchAutocomplete } from "../../components/SearchAutocomplete";
import SearchIcon from "@mui/icons-material/Search";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

import { useSystemStatusStore } from "../../store/store";
import i18n from "../../i18n";
import { t } from "i18next";

const HomeMobile: React.FC = () => {
  const [showTips, setShowTips] = React.useState(false);
  const { refreshInfo, isLoading } = useSystemStatusStore();

  // Format time depending on language
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "";

    const lang = i18n.language;
    const locale = lang === "en" ? "en-US" : "ro-MD";

    const date = new Date(isoString); // Automatically converts from UTC → local time

    return date.toLocaleString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour12: lang === "en",
    });
  };

  return (
    <Box sx={{ p: 2, pb: 8 }}>
      {/* Header */}
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            fontSize: { xs: "1.1rem", sm: "1.2rem", md: "1.3rem" },
            mb: 1,
            color: "text.primary",
          }}
        >
          {t("Explore_tech_in_Moldova")}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontSize: { xs: "0.8rem", sm: "0.85rem", md: "0.9rem" },
            color: "text.secondary",
            lineHeight: 1.4,
          }}
        >
          {t("Discover_the_best_offers_for_your_favorite_products")}
        </Typography>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 4 }}>
        <SearchAutocomplete />
        <Box sx={{ display: "flex", gap: 2, mt: 2, alignItems: "center" }}>
          {isLoading ? (
            <CircularProgress size={16} />
          ) : refreshInfo?.finished_at ? (
            <>
              <AccessTimeIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {`${t("Updated_at")} ${formatDateTime(refreshInfo.finished_at)}`}
              </Typography>
            </>
          ) : (
            <Chip
              icon={<HourglassEmptyIcon />}
              label={t("Preparing_data")}
              size="small"
              variant="outlined"
              sx={{ opacity: 0.7 }}
            />
          )}
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Tips */}
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
          <Tooltip title={t("More_Tooltip")} enterDelay={200}>
            <IconButton size="small">
              {showTips ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </Tooltip>
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
