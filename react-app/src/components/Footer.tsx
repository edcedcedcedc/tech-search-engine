// components/Footer.tsx
import React from "react";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import { useTranslation } from "react-i18next";

interface FooterProps {
  onItemClick?: () => void;
  onPrivacyClick?: () => void;
  onTermsClick?: () => void;
  onDisclaimerClick?: () => void;
  fullWidthUntilLg?: boolean;
}

const Footer: React.FC<FooterProps> = ({
  onItemClick,
  onPrivacyClick,
  onTermsClick,
  onDisclaimerClick,
  fullWidthUntilLg,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const isExtraSmall = useMediaQuery("(max-width:375px)");
  const fontSize = isExtraSmall ? "0.65rem" : theme.typography.body2.fontSize;

  const handleClick = (handler?: () => void) => {
    if (handler) {
      handler();
    }
    if (onItemClick) {
      onItemClick();
    }
  };

  return (
    <Box
      component="footer"
      sx={{
        width: fullWidthUntilLg
          ? {
              xs: "100%",
              sm: "100%",
              md: "100%",
              lg: "auto", // or your desired width for lg and up
            }
          : "auto",
        py: 1,
        px: 2,
      }}
    >
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
        {/* Privacy Policy */}
        <Box
          onClick={() => handleClick(onPrivacyClick)}
          sx={{
            textDecoration: "none",
            color: "text.primary",
            opacity: 0.8,
            cursor: "pointer",
            "&:hover": { opacity: 1 },
            whiteSpace: "nowrap",
          }}
        >
          {t("Privacy_Policy")}
        </Box>

        <Box
          component="span"
          sx={{ mx: 0, color: "text.primary", opacity: 0.8 }}
        >
          •
        </Box>

        {/* Terms of Use */}
        <Box
          onClick={() => handleClick(onTermsClick)}
          sx={{
            textDecoration: "none",
            color: "text.primary",
            opacity: 0.8,
            cursor: "pointer",
            "&:hover": { opacity: 1 },
            whiteSpace: "nowrap",
          }}
        >
          {t("Terms_and_conditions")}
        </Box>

        <Box
          component="span"
          sx={{ mx: 0, color: "text.primary", opacity: 0.8 }}
        >
          •
        </Box>

        {/* Disclaimer */}
        <Box
          onClick={() => handleClick(onDisclaimerClick)}
          sx={{
            textDecoration: "none",
            color: "text.primary",
            opacity: 0.8,
            cursor: "pointer",
            "&:hover": { opacity: 1 },
            whiteSpace: "nowrap",
          }}
        >
          {t("Responsibility_Statement")}
        </Box>

        <Box
          component="span"
          sx={{ mx: 0, color: "text.primary", opacity: 0.8 }}
        ></Box>

        {/* Copyright */}
        <Box
          sx={{
            whiteSpace: "nowrap",
            color: theme.palette.text.primary,
          }}
        >
          {`© ${new Date().getFullYear()} Strugure™. ${t("All_rights_reserved")}`}
        </Box>
      </Box>
    </Box>
  );
};

export default Footer;
