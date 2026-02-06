import { Box, Button, Typography, useMediaQuery } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useStore } from "../store/store";

export function Cookie() {
  const { t } = useTranslation();
  const cookie = useStore((state) => state.cookie);

  const isVerySmall = useMediaQuery("(max-width:320px)");
  const isSmall = useMediaQuery("(min-width:321px) and (max-width:375px)");
  const isMedium = useMediaQuery("(min-width:376px) and (max-width:425px)");
  const isLargeMobile = useMediaQuery(
    "(min-width:426px) and (max-width:768px)"
  );

  let fontSize = "0.875rem";
  let padding = 2;
  let buttonPadding = "6px 12px";
  let flexDirection: "row" | "column" = "row";
  let buttonWidth: string | undefined = undefined;
  let gapSize = 1;

  if (isVerySmall) {
    fontSize = "0.65rem";
    padding = 1;
    buttonPadding = "4px 8px";
    flexDirection = "column";
    buttonWidth = "100%";
    gapSize = 0.5;
  } else if (isSmall) {
    fontSize = "0.7rem";
    padding = 1.25;
    buttonPadding = "5px 10px";
    flexDirection = "column";
    buttonWidth = "100%";
    gapSize = 0.75;
  } else if (isMedium) {
    fontSize = "0.75rem";
    padding = 1.5;
    buttonPadding = "6px 12px";
    flexDirection = "column";
    buttonWidth = "100%";
    gapSize = 1;
  } else if (isLargeMobile) {
    fontSize = "0.8rem";
    padding = 1.75;
    buttonPadding = "6px 12px";
    flexDirection = "row";
    buttonWidth = undefined;
    gapSize = 1;
  }

  // Only show if consent is null (user hasn't answered yet)
  if (cookie.consent !== null) return null;

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        color: "text.primary",
        p: padding,
        display: "flex",
        flexDirection,
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: gapSize,
        borderTop: 1,
        borderColor: "divider",
        width: "100%",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          flex: flexDirection === "row" ? 1 : "unset",
          textAlign: flexDirection === "column" ? "center" : "left",
          color: "text.secondary",
          fontSize,
          lineHeight: 1.4,
          width: flexDirection === "column" ? "100%" : "auto",
        }}
      >
        {t("Cookie_Statement")}
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: gapSize,
          flexDirection,
          width: flexDirection === "column" ? "100%" : "auto",
          justifyContent: flexDirection === "column" ? "center" : "flex-end",
          alignItems: "center",
        }}
      >
        <Button
          variant="outlined"
          sx={{
            color: "text.secondary",
            borderColor: "divider",
            fontSize,
            padding: buttonPadding,
            width: buttonWidth,
            minWidth: flexDirection === "column" ? "100%" : "auto",
            flex: flexDirection === "column" ? 1 : "unset",
            "&:hover": {
              backgroundColor: "action.selected",
              borderColor: "divider",
            },
          }}
          onClick={() => cookie.decline()}
        >
          {t("Cookie_Reject_Button")}
        </Button>

        <Button
          variant="contained"
          sx={{
            backgroundColor: "primary.main",
            fontSize,
            padding: buttonPadding,
            width: buttonWidth,
            minWidth: flexDirection === "column" ? "100%" : "auto",
            flex: flexDirection === "column" ? 1 : "unset",
            "&:hover": { backgroundColor: "primary.light" },
          }}
          onClick={() => cookie.accept()}
        >
          {t("Cookie_Accept_Button")}
        </Button>
      </Box>
    </Box>
  );
}
