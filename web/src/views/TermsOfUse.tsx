// src/views/TermsOfUse.tsx
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function TermsOfUse() {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t("Terms_Title")}
      </Typography>

      <Typography variant="body1">{t("Terms_Intro")}</Typography>

      <Box component="ul" sx={{ pl: 3 }}>
        <Typography component="li" variant="body1">
          {t("Terms_AsIs")}
        </Typography>
        <Typography component="li" variant="body1">
          {t("Terms_NoLiability")}
        </Typography>
        <Typography component="li" variant="body1">
          {t("Terms_NoSales")}
        </Typography>
        <Typography component="li" variant="body1">
          {t("Terms_DataUsage")}
        </Typography>
        <Typography component="li" variant="body1">
          {t("Terms_Modifications")}
        </Typography>
      </Box>
    </Box>
  );
}
