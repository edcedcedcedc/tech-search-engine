import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { useStore } from "../store/store";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function SessionExpiredDialog() {
  const open = useStore((s) => s.isSessionExpired);
  const resetSessionData = useStore((s) => s.resetSessionData);
  const triggerAutocompleteReset = useStore((s) => s.triggerAutocompleteReset);
  const close = useStore((s) => s.closeSessionExpired);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleConfirm = () => {
    resetSessionData();
    triggerAutocompleteReset();
    close();
    navigate("/", { replace: true });
  };

  return (
    <Dialog open={open} maxWidth="xs" fullWidth disableEscapeKeyDown>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontWeight: 600,
          color: "text.primary",
        }}
      >
        {t("Error_403_Title")}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t("Error_403_Message1")}
          </Typography>

          <Typography variant="body2" sx={{ mt: 1, color: "text.primary" }}>
            {t("Error_403_Message2")}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          sx={{
            "&:hover": { backgroundColor: "primary.light" },
          }}
        >
          {t("Refresh", "Refresh")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
