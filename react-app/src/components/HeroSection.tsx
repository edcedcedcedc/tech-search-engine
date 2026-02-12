// components/HeroSection.tsx
import React from "react";
import { Box, Typography, useTheme, useMediaQuery } from "@mui/material";
import { useTranslation } from "react-i18next";
import { SearchAutocomplete } from "./SearchAutocomplete";

interface HeroSectionProps {
  isRO?: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({ isRO = false }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const isSmallScreen = useMediaQuery("(max-width:768px)");

  return (
    <Box
      sx={{
        py: 4, // top padding
        pb: isSmallScreen ? 0.5 : 4, // bottom padding varies by screen
        textAlign: "center",
        backgroundColor: theme.palette.background.default,
        px: { xs: 2, sm: 3, md: 4 },
      }}
    >
      {/* Main heading */}
      <Typography
        variant="h3"
        component="h1"
        gutterBottom
        sx={(theme) => ({
          fontWeight: 600,
          lineHeight: 1.3,
          textAlign: "center",
          fontSize: isRO ? "1.0rem" : "1.1rem",
          [theme.breakpoints.up("sm")]: {
            fontSize: isRO ? "1.1rem" : "1.3rem",
          },
          [theme.breakpoints.up("md")]: {
            fontSize: isRO ? "1.25rem" : "1.4rem",
          },
          [theme.breakpoints.up("lg")]: {
            fontSize: isRO ? "1.4rem" : "1.6rem",
          },
          [theme.breakpoints.up("xl")]: {
            fontSize: isRO ? "1.6rem" : "1.8rem",
          },
          [theme.breakpoints.up("xxl")]: { fontSize: isRO ? "1.8rem" : "2rem" },
        })}
      >
        {t("Explore_tech_in_Moldova")}
      </Typography>

      {/* Subheading */}
      <Typography
        variant="h6"
        color="text.secondary"
        gutterBottom
        sx={(theme) => ({
          lineHeight: 1.4,
          textAlign: "center",
          fontSize: "0.65rem",
          [theme.breakpoints.up("sm")]: { fontSize: "0.8rem" },
          [theme.breakpoints.up("md")]: { fontSize: "0.85rem" },
          [theme.breakpoints.up("lg")]: { fontSize: "0.95rem" },
          [theme.breakpoints.up("xl")]: { fontSize: "1rem" },
          [theme.breakpoints.up("xxl")]: { fontSize: "1.1rem" },
        })}
      >
        {t("Discover_the_best_offers_for_your_favorite_products")}
      </Typography>

      {/* Search bar */}
      <Box
        sx={{
          mt: 2,
          maxWidth: 600,
          mx: "auto",
          py: 2,
          fontSize: "1.05rem",
        }}
      ></Box>
    </Box>
  );
};

export default HeroSection;
