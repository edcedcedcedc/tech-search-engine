import React from "react";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface FooterProps {
  onItemClick?: () => void; // <-- new
}

const Footer: React.FC<FooterProps> = ({ onItemClick }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const isExtraSmall = useMediaQuery("(max-width:375px)"); // custom 375px breakpoint
  const fontSize = isExtraSmall ? "0.65rem" : theme.typography.body2.fontSize;

  const navLinks = [
    { path: "/privacy-policy", label: `${t("Privacy_Policy")}` },
    { path: "/source", label: t("Sources") },
    { path: "/terms-of-use", label: t("Terms_and_conditions") },
    { path: "/disclaimer", label: t("Responsibility_Statement") },

    // static text as last item
    {
      path: null,
      label: `© ${new Date().getFullYear()} Strugure™. ${t("All_rights_reserved")}`,
    },
  ];

  return (
    <Box
      component="footer"
      sx={{
        py: 1,
        px: 2,
      }}
    >
      {/* Links container with dots, wrapping into rows */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 0.5,
          mb: 1,
          fontSize,
          lineHeight: 1.2,
          fontWeight: 400,
          color: theme.palette.text.primary,
        }}
      >
        {navLinks.map((link, index) => (
          <React.Fragment key={index}>
            {link.path ? (
              <Box
                component={RouterLink}
                onClick={onItemClick}
                to={link.path}
                sx={{
                  textDecoration: "none",
                  color: "text.primary",
                  opacity: 0.8,
                  "&:hover": { opacity: 1 },
                  whiteSpace: "nowrap",
                }}
              >
                {link.label}
              </Box>
            ) : (
              <Box
                sx={{
                  whiteSpace: "nowrap",
                  color: theme.palette.text.primary,
                }}
              >
                {link.label}
              </Box>
            )}

            {index < navLinks.length - 2 && (
              <Box
                component="span"
                sx={{ mx: 0, color: "text.primary", opacity: 0.8 }}
              >
                •
              </Box>
            )}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

export default Footer;
