// SessionExpiredDialog.tsx
import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { useStore } from "../store/store";
import { useTranslation } from "react-i18next";
import { dbSyncService, type SyncProgress } from "../services/syncDb";
import { syncDebug } from "../webhook/client/syncDebug";

// Small Circular Progress with Label Component
function SmallCircularProgressWithLabel(props: { value: number }) {
  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      <CircularProgress
        variant="determinate"
        value={props.value}
        size={20}
        thickness={4}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: "absolute",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="caption"
          component="div"
          sx={{ color: "text.secondary", fontSize: "0.5rem" }}
        >
          {`${Math.round(props.value)}%`}
        </Typography>
      </Box>
    </Box>
  );
}

// Helper function to trim strings
const trimString = (str: string, maxLength: number = 15): string => {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + "...";
};

export default function SessionExpiredDialog() {
  const open = useStore((s) => s.isSessionExpired);
  const debugShow = useStore((s) => s.debugShowSessionExpired);
  const resetSessionData = useStore((s) => s.resetSessionData);
  const triggerAutocompleteReset = useStore((s) => s.triggerAutocompleteReset);
  const close = useStore((s) => s.closeSessionExpired);
  const setDebugShow = useStore((s) => s.setDebugShowSessionExpired);

  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);
  const [progress, setProgress] = React.useState<SyncProgress>({
    current: 0,
    total: 0,
    currentQuery: "",
    productsFetched: 0,
    offersFetched: 0,
    totalOffersEstimate: 0,
  });
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const { t } = useTranslation();

  // Force show in debug mode
  const isOpen = debugShow || open;

  React.useEffect(() => {
    if (isOpen) {
      syncDebug.dialogOpened();
      setIsComplete(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    const unsubscribe = dbSyncService.onProgress(setProgress);
    return unsubscribe;
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSync = async () => {
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    setIsSyncing(true);
    setIsComplete(false);

    try {
      await dbSyncService.syncDatabase(/* abortControllerRef.current.signal */);
      resetSessionData();
      triggerAutocompleteReset();
      syncDebug.dialogClosed(true, progress.total);
      setIsComplete(true);
      setIsSyncing(false);
    } catch (error: any) {
      // Don't show error if it was aborted
      if (error.name === "AbortError" || error.message === "Sync cancelled") {
        console.log("Sync cancelled by user");
        syncDebug.dialogClosed(false, progress.current);
      } else {
        console.error("Sync failed:", error);
        syncDebug.dialogClosed(false, progress.current);
      }
      resetSessionData();
      triggerAutocompleteReset();
      if (!debugShow) close();
      setIsSyncing(false);
      setIsComplete(false);
    }
  };

  const handleCancel = () => {
    // Abort the sync operation if it's in progress
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    resetSessionData();
    triggerAutocompleteReset();
    if (!debugShow) close();
    setIsSyncing(false);
    setIsComplete(false);
  };

  const handleDone = () => {
    if (!debugShow) close();
    setIsComplete(false);
  };

  const progressValue = Math.min(
    progress.totalOffersEstimate > 0
      ? (progress.offersFetched / (progress.totalOffersEstimate * 20)) * 100
      : 0,
    100,
  );

  return (
    <Dialog open={isOpen} maxWidth="xs" fullWidth disableEscapeKeyDown>
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
        {isSyncing && <SmallCircularProgressWithLabel value={progressValue} />}
        {debugShow && (
          <Typography
            variant="caption"
            sx={{
              ml: "auto",
              bgcolor: "warning.main",
              color: "warning.contrastText",
              px: 1,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            DEBUG
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t("Error_403_Message1")}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: "text.primary" }}>
            {t("Error_403_Message2")}
          </Typography>

          {/* Dynamic product and offers display with trimmed names */}
          {isSyncing && (
            <Box sx={{ mt: 2 }}>
              {progress.currentQuery && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 0.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ maxWidth: "70%", textAlign: "right" }}
                  >
                    {progress.currentQuery}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2 }}>
        {!isComplete ? (
          <>
            <Button
              onClick={handleCancel}
              variant="text"
              color="inherit"
              disabled={!isSyncing && !debugShow}
              sx={{
                "&:hover": { backgroundColor: "action.hover" },
                fontSize: {
                  xs: "0.7rem",
                  sm: "0.75rem",
                  md: "0.8rem",
                  lg: "0.85rem",
                  xl: "0.9rem",
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
                ...(!isSyncing &&
                  !debugShow && {
                    color: "text.disabled",
                    "&:hover": {
                      backgroundColor: "transparent",
                    },
                  }),
              }}
            >
              {t("Cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleSync}
              variant="text"
              color="primary"
              disabled={isSyncing}
              sx={{
                "&:hover": { backgroundColor: "primary.light" },
                fontSize: {
                  xs: "0.7rem",
                  sm: "0.75rem",
                  md: "0.8rem",
                  lg: "0.85rem",
                  xl: "0.9rem",
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
                ...(isSyncing && {
                  backgroundColor: "action.disabledBackground",
                  color: "text.disabled",
                  "&:hover": {
                    backgroundColor: "action.disabledBackground",
                  },
                }),
              }}
            >
              {t("Refresh", "Refresh")}
            </Button>
          </>
        ) : (
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}
          >
            <Button
              onClick={handleDone}
              variant="text"
              color="primary"
              sx={{
                "&:hover": { backgroundColor: "primary.light" },
                fontSize: {
                  xs: "0.7rem",
                  sm: "0.75rem",
                  md: "0.8rem",
                  lg: "0.85rem",
                  xl: "0.9rem",
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
              Done
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
}
