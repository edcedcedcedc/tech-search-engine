// src/views/HowTo.tsx
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function Qna() {
  const { t } = useTranslation();

  return (
    <Box>
      {/* Main Title */}
      <Typography variant="h5" fontWeight={600} gutterBottom>
        {t("How_To", "How PriceComp Works")}
      </Typography>

      {/* Intro */}
      <Typography variant="body1" color="text.primary" sx={{ mb: 3 }}>
        {t("How_To_Intro")}
      </Typography>

      {/* SEARCH */}
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

      {/* PRICE ANALYTICS */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {t("Price_Trend_Title", "Price Analytics")}
        </Typography>

        <Typography variant="body1" sx={{ mb: 1 }}>
          {t("Price_Trend_Description_1")}
        </Typography>

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

      {/* DATA */}
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
