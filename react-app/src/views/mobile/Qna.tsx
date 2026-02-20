// views/mobile/HowTo.tsx
import { Box, Typography, Paper } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Sparklines, SparklinesLine } from "react-sparklines";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export default function QnaMobile() {
  const { t } = useTranslation();

  // Sample data for the sparkline example
  const samplePriceData = [12500, 12200, 11900, 12100, 11800, 11500, 11300];

  return (
    <Box sx={{ p: 2, pb: 8 }}>
      {/* Main Title */}
      <Typography variant="h5" fontWeight={600} sx={{ mb: 4 }} gutterBottom>
        {t("How_To", "How PriceComp Works")}
      </Typography>

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

        {/* Sparkline Example - Clickable */}

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
  );
}
