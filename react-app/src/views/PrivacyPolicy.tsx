// src/views/PrivacyPolicy.tsx
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t("Privacy_Title")}
      </Typography>

      <Typography variant="body1">{t("Privacy_Intro")}</Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        {t("Privacy_DataCollection_Title")}
      </Typography>
      <Typography variant="body1">
        {t("Privacy_DataCollection_Body")}
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        {t("Privacy_Cookies_Title")}
      </Typography>
      <Typography variant="body1">{t("Privacy_Cookies_Body")}</Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        {t("Privacy_ExternalSources_Title")}
      </Typography>
      <Typography variant="body1" paragraph>
        {t("Privacy_ExternalSources_Body")}
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        {t("Privacy_Advertising_Title")}
      </Typography>
      <Typography variant="body1" paragraph>
        {t("Privacy_Advertising_Body")}
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        {t("Privacy_Contact_Title")}
      </Typography>
      <Typography variant="body1">{t("Privacy_Contact_Body")}</Typography>
    </Box>
  );
}
