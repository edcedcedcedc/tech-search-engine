import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function ServicesMobile() {
  const { t } = useTranslation();

  return (
    <Box sx={{ p: 2, pb: 8 }}>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          bgcolor: "background.default",
          zIndex: 10,
          mb: 4,
        }}
      >
        <Typography variant="h5" fontWeight={600} gutterBottom>
          {t("Services_Title")}
        </Typography>
      </Box>

      {/* Intro text - matching HowTo structure */}
      <Typography variant="body1" color="text.primary" sx={{ mb: 3 }}>
        {t("Services_Intro")}
      </Typography>

      {/* Full Price Section */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h6"
          fontWeight={600}
          gutterBottom
          sx={{ color: "primary.main" }}
        >
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
        <Typography
          variant="h6"
          fontWeight={600}
          gutterBottom
          sx={{ color: "primary.main" }}
        >
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
        <Typography
          variant="h6"
          fontWeight={600}
          gutterBottom
          sx={{ color: "primary.main" }}
        >
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
        <Typography
          variant="h6"
          fontWeight={600}
          gutterBottom
          sx={{ color: "primary.main" }}
        >
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
  );
}
