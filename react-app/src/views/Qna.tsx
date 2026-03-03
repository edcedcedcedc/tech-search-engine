// views/mobile/HowTo.tsx
import { Box, Typography, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Sparklines, SparklinesLine } from "react-sparklines";

export default function HowTo() {
  const { t } = useTranslation();
  const theme = useTheme();
  // Sample data for the sparkline example
  const samplePriceData = [12500, 12200, 11900, 12100, 11800, 11500, 11300];

  return (
    <Box
      sx={{
        height: "100%",
        overflowY: "auto",
        position: "relative",
        "&::-webkit-scrollbar": { width: theme.spacing(1) },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: theme.palette.background.default,
          borderRadius: theme.shape.borderRadius,
        },
        "&::-webkit-scrollbar-thumb:hover": {
          backgroundColor: theme.palette.background.default,
        },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        scrollbarWidth: "thin",
        scrollbarColor:
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.2) transparent"
            : "rgba(0,0,0,0.3) transparent",
      }}
    >
      {/* Sticky Header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          bgcolor: "background.default",
          zIndex: 10,
          px: 2, // Add horizontal padding to match content
          py: 1.5, // Consistent vertical padding
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          {t("How_To", "How PriceComp Works")}
        </Typography>
      </Box>

      {/* Content with padding */}
      <Box sx={{ px: 2, pb: 8 }}>
        {/* Intro */}
        <Typography variant="body1" color="text.primary" sx={{ mb: 3 }}>
          {t("How_To_Intro")}
        </Typography>

        {/* SEARCH Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {t("How_To_Search_Title", "How to Search Smart")}
          </Typography>

          <Typography variant="body1" sx={{ mb: 1 }}>
            {t("How_To_Search_Description_1")}
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {t("How_To_Search_Description_2")}
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {t("How_To_Search_Description_3")}
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {t("How_To_Search_Description_4")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("How_To_Search_Description_5")}
          </Typography>
        </Box>

        {/* PRICE ANALYTICS Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {t("Price_Trend_Title", "Price Analytics")}
          </Typography>

          <Typography variant="body1" sx={{ mb: 2 }}>
            {t("Price_Trend_Description_1")}
          </Typography>

          {/* Sparkline Example */}
          <Sparklines data={samplePriceData} height={60} margin={5}>
            <SparklinesLine color="#4caf50" style={{ strokeWidth: 2 }} />
          </Sparklines>

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {t("Price")}: 11,300 MDL
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("In_Stock")}: {t("Yes")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("Updated")}: 12.02.2025
            </Typography>
          </Box>

          <Box component="ul" sx={{ pl: 3 }}>
            <Typography component="li" variant="body1">
              {t("Price_Trend_Description_2")}
            </Typography>
            <Typography component="li" variant="body1">
              {t("Price_Trend_Description_3")}
            </Typography>
            <Typography component="li" variant="body1">
              {t("Price_Trend_Description_4")}
            </Typography>
          </Box>
        </Box>

        {/* DATA Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {t("Data_Title", "Daily Updated Data")}
          </Typography>

          <Typography variant="body1" sx={{ mb: 1 }}>
            {t("Data_Description_1")}
          </Typography>

          <Box component="ul" sx={{ pl: 3 }}>
            <Typography component="li" variant="body1">
              {t("Data_Description_2")}
            </Typography>
            <Typography component="li" variant="body1">
              {t("Data_Description_3")}
            </Typography>
            <Typography component="li" variant="body1">
              {t("Data_Description_4")}
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t("Data_Description_5")}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
