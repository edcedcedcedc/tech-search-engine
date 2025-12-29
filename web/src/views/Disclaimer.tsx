// src/views/Disclaimer.tsx
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function Disclaimer() {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t("Disclaimer_Title")}
      </Typography>

      <Typography variant="body1" gutterBottom>
        {t("Disclaimer_Intro")}
      </Typography>

      <Typography variant="body1" gutterBottom>
        {t("Disclaimer_Accuracy")}
      </Typography>

      <Typography variant="body1" gutterBottom>
        {t("Disclaimer_Affiliation")}
      </Typography>

      <Typography variant="body1" gutterBottom color="text.secondary">
        {t("Disclaimer_Trademarks")}
      </Typography>

      <Typography variant="body1" gutterBottom>
        {t("Disclaimer_Risk")}
      </Typography>
    </Box>
  );
}
