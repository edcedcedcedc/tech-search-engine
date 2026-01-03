import React from "react";
import { Box, Typography, Link, useTheme, useMediaQuery } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();

  const isExtraSmall = useMediaQuery("(max-width:375px)"); // custom 375px breakpoint
  const fontSize = isExtraSmall ? "0.65rem" : theme.typography.body2.fontSize;

  const navLinks = [
    { path: "/disclaimer", label: t("Responsibility_Statement") },
    { path: "/terms-of-use", label: t("Terms_and_conditions") },
    { path: "/privacy-policy", label: t("Privacy_Policy") },
    { path: "/about", label: t("About_Us") },
    { path: "/contact", label: t("Contact") },
    { path: "/source", label: t("Sources") },
  ];

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        backgroundColor: theme.palette.background.default,
        textAlign: "center",
      }}
    >
      {/* Links container */}

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 1,
          mb: 1,
        }}
      >
        {navLinks.map((link) => (
          <Box
            key={link.path}
            component={RouterLink}
            to={link.path}
            sx={{
              fontSize,
              lineHeight: 1.2,
              fontWeight: 400,
              textDecoration: "none",
              color: theme.palette.text.primary,
              whiteSpace: "nowrap",
              "&:hover": { opacity: 0.8 },
            }}
          >
            {link.label}
          </Box>
        ))}
      </Box>

      {/* All rights reserved */}
      <Box
        sx={{
          fontSize,
          lineHeight: 1.2,
          fontWeight: 400,
          textDecoration: "none",
          color: theme.palette.text.primary,
        }}
      >
        © {new Date().getFullYear()} 9999. {t("All_rights_reserved")}
      </Box>
    </Box>
  );
};

export default Footer;
