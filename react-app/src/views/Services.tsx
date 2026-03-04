// views/mobile/Services.tsx
import { Box, Typography, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function Services() {
  const { t } = useTranslation();
  const theme = useTheme();

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
            ? "rgba(255, 255, 255, 0.02) transparent"
            : "rgba(0, 0, 0, 0.04) transparent",
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
          {t("Services_Title")}
        </Typography>
      </Box>

      {/* Content with padding */}
      <Box sx={{ px: 2, pb: 8 }}>
        {/* Intro text */}
        <Typography variant="body1" color="text.primary" sx={{ mb: 3 }}>
          {t("Services_Intro")}
        </Typography>

        {/* Full Price Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {t("Services_FullPrice_Title")}
          </Typography>

          <Typography variant="body1" sx={{ mb: 1 }}>
            {t("Services_FullPrice_Intro")}
          </Typography>

          <Box component="ul" sx={{ pl: 3 }}>
            <Typography component="li" variant="body1">
              {t("Services_FullPrice_Trend")}
            </Typography>
            <Typography component="li" variant="body1">
              {t("Services_FullPrice_History")}
            </Typography>
          </Box>
        </Box>

        {/* Analytics Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {t("Services_Analytics_Title")}
          </Typography>

          <Typography variant="body1" sx={{ mb: 1 }}>
            {t("Services_Analytics_Intro")}
          </Typography>

          <Box component="ul" sx={{ pl: 3 }}>
            <Typography component="li" variant="body1">
              {t("Services_Analytics_PriceTrend")}
            </Typography>
          </Box>
        </Box>
        {/* Notifications Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {t("Services_Notifications_Title")}
          </Typography>

          <Typography variant="body1" sx={{ mb: 1 }}>
            {t("Services_Notifications_Intro")}
          </Typography>

          <Box component="ul" sx={{ pl: 3 }}>
            <Typography component="li" variant="body1">
              {t("Services_Notifications_PriceDrop")}
            </Typography>
            <Typography component="li" variant="body1">
              {t("Services_Notifications_Subscribe")}
            </Typography>
            <Typography component="li" variant="body1">
              {t("Services_Notifications_Custom")}
            </Typography>
          </Box>
        </Box>

        {/* Data Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {t("Services_Data_Title")}
          </Typography>

          <Typography variant="body1" sx={{ mb: 1 }}>
            {t("Services_Data_Intro")}
          </Typography>

          <Box component="ul" sx={{ pl: 3 }}>
            <Typography component="li" variant="body1">
              {t("Services_Data_PriceHistory")}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
