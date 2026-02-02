import React from "react";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";
import { useStore } from "../store/store";

const Footer: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();

  const isExtraSmall = useMediaQuery("(max-width:375px)"); // custom 375px breakpoint
  const fontSize = isExtraSmall ? "0.65rem" : theme.typography.body2.fontSize;

  const query = useStore((state) => state.query);
  const aggregatedProducts = useStore((state) => state.aggregatedProducts);

  const navLinks = [
    { path: "/disclaimer", label: t("Responsibility_Statement") },
    { path: "/terms-of-use", label: t("Terms_and_conditions") },
    { path: "/privacy-policy", label: t("Privacy_Policy") },
    { path: "/about", label: t("About_Us") },
    { path: "/contact", label: t("Contact") },
    { path: "/source", label: t("Sources") },
  ];

  if (query && aggregatedProducts.length > 0) return null;

  return (
    <Box
      component="footer"
      sx={{
        py: 1,
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
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          fontSize,
          lineHeight: 1.2,
          fontWeight: 400,
          color: theme.palette.text.primary,
        }}
      >
        <Icon
          size={20}
          color="primary"
          variant="logo"
          sx={{ position: "relative", top: -1 }}
        />
        © {new Date().getFullYear()} Strugure™. {t("All_rights_reserved")}.
      </Box>
    </Box>
  );
};

export default Footer;
