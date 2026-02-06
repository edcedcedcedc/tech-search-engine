// src/views/PrivacyPolicy.tsx
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <Box>
      {/* Page title */}
      <Typography variant="h5" gutterBottom>
        {t("Privacy_Title")}
      </Typography>

      {/* Intro */}
      <Typography variant="body2" paragraph>
        {t("Privacy_Intro")}
      </Typography>

      {/* Data collection */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t("Privacy_DataCollection_Title")}
      </Typography>
      <Typography variant="body2" paragraph>
        {t("Privacy_DataCollection_Body")}
      </Typography>

      {/* Cookies */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t("Privacy_Cookies_Title")}
      </Typography>
      <Typography variant="body2" paragraph>
        {t("Privacy_Cookies_Body")}
      </Typography>

      {/* External sources */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t("Privacy_ExternalSources_Title")}
      </Typography>
      <Typography variant="body2" paragraph>
        {t("Privacy_ExternalSources_Body")}
      </Typography>

      {/* Advertising */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t("Privacy_Advertising_Title")}
      </Typography>
      <Typography variant="body2" paragraph>
        {t("Privacy_Advertising_Body")}
      </Typography>

      {/* Contact */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t("Privacy_Contact_Title")}
      </Typography>
      <Typography variant="body2">{t("Privacy_Contact_Body")}</Typography>
    </Box>
  );
}
