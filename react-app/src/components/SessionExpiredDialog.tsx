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
import { indexedDbService } from "../services/indexedDb";
import { uiLog } from "../webhook/client/uiDebug";

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

  const [syncState, setSyncState] = React.useState<
    "idle" | "syncing" | "completed" | "error"
  >("idle");
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

  const isOpen = debugShow || open;

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      syncDebug.dialogOpened();
      setSyncState("idle");
      setProgress({
        current: 0,
        total: 0,
        currentQuery: "",
        productsFetched: 0,
        offersFetched: 0,
        totalOffersEstimate: 0,
      });
    }
  }, [isOpen]);

  React.useEffect(() => {
    const unsubscribe = dbSyncService.onProgress(setProgress);
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSync = async () => {
    abortControllerRef.current = new AbortController();
    setSyncState("syncing");

    try {
      await dbSyncService.syncDatabase();
      resetSessionData();
      triggerAutocompleteReset();
      syncDebug.dialogClosed(true, progress.total);
      setSyncState("completed");
    } catch (error: any) {
      if (error.name === "AbortError" || error.message === "Sync cancelled") {
        console.log("Sync cancelled by user");
        syncDebug.dialogClosed(false, progress.current);
        await indexedDbService.clearAll();
        uiLog("[SessionExpired] IndexedDB cleared on abort");
        // On abort, go to completed state (show Done button)
        setSyncState("completed");
      } else {
        console.error("Sync failed:", error);
        syncDebug.dialogClosed(false, progress.current);
        await indexedDbService.clearAll();
        uiLog("[SessionExpired] IndexedDB cleared on error");
        setSyncState("error");
      }

      resetSessionData();
      triggerAutocompleteReset();
    }
  };

  const handleCancel = async () => {
    // If currently syncing, abort it
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    try {
      await indexedDbService.clearAll();
      uiLog("[SessionExpired] IndexedDB cleared on cancel");
    } catch (error) {
      console.error("Failed to clear IndexedDB on cancel:", error);
    }

    resetSessionData();
    triggerAutocompleteReset();

    // After cancel, go to completed state (show Done button)
    setSyncState("completed");
  };

  const handleDone = () => {
    if (!debugShow) close();
    setSyncState("idle");
  };

  const progressValue = Math.min(
    progress.totalOffersEstimate > 0
      ? (progress.offersFetched / (progress.totalOffersEstimate * 20)) * 100
      : 0,
    100,
  );

  const isSyncing = syncState === "syncing";
  const isCompleted = syncState === "completed";
  const isError = syncState === "error";

  return (
    <Dialog
      open={isOpen}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown
      disableEnforceFocus
      disableAutoFocus
    >
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

          {isSyncing && progress.currentQuery && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.disabled">
                {progress.currentQuery}
              </Typography>
            </Box>
          )}

          {isError && (
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Typography variant="body2" color="error.main">
                Sync failed. Please try again.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2 }}>
        {!isCompleted ? (
          <>
            <Button
              onClick={handleCancel}
              variant="text"
              color="inherit"
              disabled={isCompleted || (!isSyncing && !debugShow)} // Enable during sync!
              sx={{
                opacity: isCompleted || (!isSyncing && !debugShow) ? 0.5 : 1,
              }}
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleSync}
              variant="text"
              color="primary"
              disabled={isSyncing}
              sx={{
                opacity: isSyncing ? 0.5 : 1,
              }}
            >
              {isSyncing ? t("Refreshing...") : t("Refresh")}
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
              autoFocus
            >
              Done
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
}
