// src/views/Source.tsx
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function Source() {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t("Source_Title")}
      </Typography>

      <Typography variant="body1">{t("Source_Intro")}</Typography>

      <Typography variant="body1">{t("Source_Example")}</Typography>

      <Typography variant="body1" color="text.secondary">
        {t("Source_Disclaimer")}
      </Typography>
    </Box>
  );
}
