import React from "react";
import {
  Box,
  Typography,
  Paper,
  Fade,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import { useTranslation } from "react-i18next";

interface NoProductsFoundProps {
  query?: string;
}

const NoProductsFound: React.FC<NoProductsFoundProps> = ({ query }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  // Media queries
  const isVerySmall = useMediaQuery("(max-width:320px)");
  const isSmall = useMediaQuery("(min-width:321px) and (max-width:375px)");
  const isMedium = useMediaQuery("(min-width:376px) and (max-width:425px)");
  const isLargeMobile = useMediaQuery(
    "(min-width:426px) and (max-width:768px)",
  );

  // Default sizes
  let iconSize = 64;
  let paperPadding = 4;
  let titleVariant: "h5" | "h6" | "subtitle1" = "h5";
  let textVariant: "body1" | "body2" = "body1";
  let captionFontSize = "0.75rem";

  // Adjust for smaller screens
  if (isLargeMobile) {
    iconSize = 50;
    paperPadding = 3;
    titleVariant = "h6";
    textVariant = "body2";
    captionFontSize = "0.7rem";
  } else if (isMedium) {
    iconSize = 44;
    paperPadding = 2.5;
    titleVariant = "h6";
    textVariant = "body2";
    captionFontSize = "0.65rem";
  } else if (isSmall) {
    iconSize = 36;
    paperPadding = 2;
    titleVariant = "subtitle1";
    textVariant = "body2";
    captionFontSize = "0.6rem";
  } else if (isVerySmall) {
    iconSize = 28;
    paperPadding = 1.5;
    titleVariant = "subtitle1";
    textVariant = "body2";
    captionFontSize = "0.55rem";
  }

  // Determine icon offset for alignment
  let iconTopOffset = -1.5; // default for larger screens

  if (isVerySmall) {
    iconTopOffset = -0.5; // tweak for 320px
  } else if (isSmall) {
    iconTopOffset = -0.5; // tweak for 321-375px
  }
  return (
    <Fade in timeout={300}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
          p: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: paperPadding,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: 400,
            width: "90%",
          }}
        >
          <SearchOffIcon
            sx={{
              fontSize: iconSize,
              color: "action.disabled",
              mb: 2,
            }}
          />

          <Typography
            variant={titleVariant}
            component="h2"
            gutterBottom
            sx={{
              fontWeight: 500,
              color: "text.primary",
              textAlign: "center",
            }}
          >
            {!query ? t("Search_For_Products") : t("No_Products_Found")}
          </Typography>

          <Typography
            variant={textVariant}
            color="text.secondary"
            align="center"
            sx={{ mb: 3 }}
          >
            {!query
              ? t("Enter_A_Product_Name_To_Start_Searching")
              : `${t("No_Results_For")} "${query}"`}
          </Typography>

          {/* Icon + text row */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.disabled",
              mt: 1,
              gap: 0.5,
            }}
          >
            <ShoppingBagIcon
              sx={{
                fontSize: iconSize * 0.3, // proportionally smaller
                position: "relative",
                top: iconTopOffset, // dynamically adjusted
              }}
            />
            <Typography
              variant="caption"
              sx={{ fontSize: captionFontSize, lineHeight: 1.2 }}
            >
              {t("Try_Diff_Keyword_Or_Check_Spelling")}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Fade>
  );
};

export default NoProductsFound;
