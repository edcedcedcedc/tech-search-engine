import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStore } from "../store/store";
import { useEffect } from "react";

export default function OfflineDialog() {
  const isOffline = useStore((s) => s.isOffline);
  const setOffline = useStore((s) => s.setOffline);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleConfirm = () => {
    //retriggerPulse(); // restart animation
    //setOffline(false); // close dialog
    // try fetching again
    if (navigator.onLine) {
    } else {
      // maybe keep dialog open or retry in few seconds
      /* setTimeout(() => {
        if (navigator.onLine) navigate("/", { replace: true });
        else retriggerPulse();
      }, 2000);
    } */
    }
  };

  /* useEffect(() => {
    let interval = setInterval(() => {
      if (navigator.onLine) {
        setOffline(false);
        clearInterval(interval);
      } else {
        retriggerPulse();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []); */

  function retriggerPulse() {
    const icon = document.querySelector<HTMLImageElement>(
      "#preloader-icon img",
    );
    if (!icon) return;

    // Remove animation
    icon.style.animation = "none";

    // Trigger reflow
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    icon.offsetHeight;

    // Re-add animation
    icon.style.animation = "pulse 1s ease-in-out infinite";
  }

  return (
    <Dialog open={isOffline} maxWidth="xs" fullWidth disableEscapeKeyDown>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontWeight: 600,
          color: "text.primary",
        }}
      >
        {t("Offline_Title")}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t("Offline_Message1")}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: "text.primary" }}>
            {t("Offline_Message2")}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleConfirm}
          variant="text"
          color="primary"
          sx={{
            "&:hover": { backgroundColor: "primary.light" },
            fontSize: {
              xs: "0.7rem", // 320px
              sm: "0.75rem", // 375px
              md: "0.8rem", // 425px
              lg: "0.85rem", // 540px
              xl: "0.9rem", // 768px+
            },
            minHeight: {
              xs: 28,
              sm: 30,
              md: 32,
              lg: 36,
              xl: 40,
            },
            px: {
              xs: 1.5,
              sm: 2,
              md: 2.5,
              lg: 3,
              xl: 3.5,
            },
          }}
        >
          {t("Refresh", "Refresh")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
