// src/views/About.tsx
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function About() {
  const { t } = useTranslation();

  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Typography variant="h4" gutterBottom>
        {t("About_Us")}
      </Typography>

      <Typography variant="body1">{t("About_Us_description")}</Typography>

      <Typography variant="body1" color="text.secondary">
        {t("About_Us_description_secondary")}
      </Typography>
    </Box>
  );
}
