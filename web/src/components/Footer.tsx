// src/components/Footer.tsx
import React from "react";
import { Box, Typography, Link, useTheme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Box
      component="footer"
      sx={{
        //mt: 8,
        py: 4,
        px: 2,
        backgroundColor: theme.palette.background.default, // use theme
        textAlign: "center",
      }}
    >
      <Typography variant="body2" color="textSecondary">
        © {new Date().getFullYear()} 9999. {t("All_rights_reserved")}
      </Typography>

      <Box sx={{ mt: 1 }}>
        <Link component={RouterLink} to="/disclaimer" sx={{ mx: 1 }}>
          {t("Responsibility_Statement")}
        </Link>
        <Link component={RouterLink} to="/terms-of-use" sx={{ mx: 1 }}>
          {t("Terms_and_conditions")}
        </Link>
        <Link component={RouterLink} to="/privacy-policy" sx={{ mx: 1 }}>
          {t("Privacy_Policy")}
        </Link>

        <Link component={RouterLink} to="/about" sx={{ mx: 1 }}>
          {t("About_Us")}
        </Link>

        <Link component={RouterLink} to="/contact" sx={{ mx: 1 }}>
          {t("Contact")}
        </Link>

        <Link component={RouterLink} to="/source" sx={{ mx: 1 }}>
          {t("Sources")}
        </Link>
      </Box>
    </Box>
  );
};

export default Footer;
