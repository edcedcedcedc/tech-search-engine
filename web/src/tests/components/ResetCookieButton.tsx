import { Button } from "@mui/material";

function ResetCookieButton() {
  return (
    <Button
      variant="outlined"
      color="error"
      size="small"
      sx={{ position: "fixed", bottom: 16, right: 16, zIndex: 100 }}
      onClick={() => {
        document.cookie = "myAppCookieConsent=; path=/; max-age=0";
        window.location.reload();
      }}
    >
      Reset
    </Button>
  );
}

export default ResetCookieButton;
