import { Box, Button, Typography } from "@mui/material";
import CookieConsent from "react-cookie-consent";
import { useTranslation } from "react-i18next";

export function Cookie() {
  const { t } = useTranslation();
  return (
    <CookieConsent
      location="bottom"
      cookieName="myAppCookieConsent"
      style={{ background: "transparent" }}
      buttonStyle={{ display: "none" }}
    >
      <Box
        sx={{
          bgcolor: "primary.dark",
          color: "primary.contrastText",
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography sx={{ flex: 1, mr: 2, color: "primary.contrastText" }}>
          {t("Cookie_Statement")}
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            color="secondary"
            sx={{
              borderColor: "secondary.main",
              color: "secondary.contrastText",
            }}
            onClick={() => {
              document.cookie =
                "myAppCookieConsent=false; path=/; max-age=12960000";
              window.location.reload();
            }}
          >
            {t("Cookie_Reject_Button")}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            sx={{
              backgroundColor: "secondary.main",
              color: "secondary.contrastText",
            }}
            onClick={(e) => {
              document.cookie =
                "myAppCookieConsent=true; path=/; max-age=12960000";
              window.location.reload();
            }}
          >
            {t("Cookie_Accept_Button")}
          </Button>
        </Box>
      </Box>
    </CookieConsent>
  );
}
