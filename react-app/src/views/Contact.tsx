// src/views/Contact.tsx
import { Box, Typography, Link } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function Contact() {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t("Contact_Title")}
      </Typography>

      <Typography variant="body2">{t("Contact_Intro")}</Typography>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2">
          {t("Contact_Email_Label")}{" "}
          <Link href="mailto:contact@price-aggregator.md">
            contact@price-aggregator.md
          </Link>
        </Typography>

        <Typography variant="body2" sx={{ mt: 1 }}>
          {t("Contact_Platform_Info")}
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
        {t("Contact_Disclaimer")}
      </Typography>
    </Box>
  );
}
