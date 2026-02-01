// src/views/Home.tsx
import { Box, Typography, Stack, Fade } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();

  return (
    <Fade in timeout={400}>
      <Box sx={{ mt: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h4" fontWeight={600}>
            Strugure
          </Typography>

          <Typography variant="body1" color="text.secondary">
            {t(
              "Smart_price_comparison_across_multiple_online_stores_in_Moldova",
            )}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {t("Search_using_almost")}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {t("Results_are_grouped")}
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
    </Fade>
  );
}
