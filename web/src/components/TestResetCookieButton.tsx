import { Button } from "@mui/material";
import { resetCookieConsent } from "../utils/cookie";

function ResetCookieButton() {
  return (
    <Button
      variant="outlined"
      color="error"
      size="small"
      sx={{ position: "fixed", bottom: 16, right: 16, zIndex: 100 }}
      onClick={(e) => {
        resetCookieConsent();
      }}
    >
      Reset
    </Button>
  );
}

export default ResetCookieButton;
