// src/views/Home.tsx
import { Box, Typography, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={2} sx={{ width: "100%" }}>
        <Typography variant="h5" fontWeight={600}>
          {t("Home_subject")}
        </Typography>

        <Typography variant="body1" color="text.secondary">
          {t("Smart_price_comparison_across_multiple_online_stores_in_Moldova")}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {t("Search_using_almost")}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {t("Results_are_grouped")}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {t("Categories")}
        </Typography>
        <Typography
          variant="body2"
          sx={{ mt: 1, fontStyle: "italic" }}
          color="text.disabled"
        >
          {t("Mvp_stage")}
        </Typography>
      </Stack>
    </Box>
  );
}
