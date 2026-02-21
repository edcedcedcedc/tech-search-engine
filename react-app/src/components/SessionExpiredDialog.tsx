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
  useMediaQuery,
  useTheme,
  Slide,
  Paper,
} from "@mui/material";
import type { TransitionProps } from "@mui/material/transitions";
import { useLastQueryStore, useStore } from "../store/store";
import { useTranslation } from "react-i18next";
import { dbSyncService, type SyncProgress } from "../services/syncDb";
import { syncDebug } from "../webhook/client/syncDebug";
import { indexedDbService } from "../services/indexedDb";
import { uiLog } from "../webhook/client/uiDebug";

// Slide transition for mobile
const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

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

export default function SessionExpiredDialog() {
  const open = useStore((s) => s.isSessionExpired);
  const theme = useTheme();
  const debugShow = useStore((s) => s.debugShowSessionExpired);
  const resetSessionData = useStore((s) => s.resetSessionData);
  const clearLastQuery = useLastQueryStore((s) => s.clearLastQuery);
  const triggerAutocompleteReset = useStore((s) => s.triggerAutocompleteReset);
  const close = useStore((s) => s.closeSessionExpired);
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));

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
    const lastQuery = useLastQueryStore.getState().lastQuery;
    const hasProducts = useStore.getState().aggregatedProducts?.length > 0;

    if (!lastQuery && !hasProducts) {
      resetSessionData();
      triggerAutocompleteReset();
      setSyncState("completed");
      return;
    }

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
        clearLastQuery();
        uiLog("[SessionExpired] IndexedDB cleared on abort");
        setSyncState("completed");
      } else {
        console.error("Sync failed:", error);
        syncDebug.dialogClosed(false, progress.current);
        await indexedDbService.clearAll();
        clearLastQuery();
        uiLog("[SessionExpired] IndexedDB cleared on error");
        setSyncState("error");
      }

      /*    resetSessionData();
      triggerAutocompleteReset(); */
    }
  };

  const handleCancel = async () => {
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
    clearLastQuery();
    triggerAutocompleteReset();
    setSyncState("completed");
  };

  const handleDone = () => {
    if (!debugShow) close();
    setSyncState("completed");
    window.location.replace("/");
  };

  const progressValue =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  const isSyncing = syncState === "syncing";
  const isCompleted = syncState === "completed";
  const isError = syncState === "error";

  // Mobile full-screen dialog
  if (isMobile) {
    return (
      <Dialog
        open={isOpen}
        fullScreen
        TransitionComponent={Transition}
        disableEscapeKeyDown
        disableEnforceFocus
        disableAutoFocus
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.background.default,
            backgroundImage: "none",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            backgroundColor: theme.palette.background.default,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 3,
              py: 2,
              borderBottom: 1,
              borderColor: "divider",
              backgroundColor: theme.palette.background.default,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: "text.primary",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                fontSize: {
                  xs: "1.125rem", // 18px - mobile (0-374px)
                  sm: "1.25rem", // 20px - small mobile (375-424px)
                  md: "1.375rem", // 22px - medium (425-767px)
                  lg: "1.5rem", // 24px - tablet (768-1023px)
                  xl: "1.625rem", // 26px - desktop (1024-1439px)
                  xxl: "1.75rem", // 28px - large desktop (1440px+)
                },
                lineHeight: 1.2,
              }}
            >
              {isCompleted ? t("Error_403_Title2") : t("Error_403_Title")}
              {isSyncing && (
                <SmallCircularProgressWithLabel value={progressValue} />
              )}
            </Typography>

            {debugShow && (
              <Typography
                variant="caption"
                sx={{
                  bgcolor: "warning.main",
                  color: "warning.contrastText",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  fontWeight: 500,
                }}
              >
                DEBUG
              </Typography>
            )}
          </Box>

          {/* Content */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              px: 3,
              py: 4,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ maxWidth: 400, mx: "auto", width: "100%" }}>
              <Typography
                variant="body1"
                sx={{
                  mb: 3,
                  color: "text.primary",
                  fontSize: "1.1rem",
                  lineHeight: 1.5,
                }}
              >
                {t("Error_403_Message1")}
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  mb: 4,
                  color: "text.secondary",
                  fontSize: "1rem",
                }}
              >
                {t("Error_403_Message2")}
              </Typography>

              {isSyncing && progress.currentQuery && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    mt: 2,
                    backgroundColor: theme.palette.action.hover,
                    borderRadius: 2,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      fontFamily: "monospace",
                      wordBreak: "break-word",
                    }}
                  >
                    {progress.currentQuery}
                  </Typography>
                </Paper>
              )}

              {isError && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    mt: 2,
                    backgroundColor: theme.palette.error.light + "20",
                    borderColor: theme.palette.error.main,
                    borderRadius: 2,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: "error.main",
                      textAlign: "center",
                      fontWeight: 500,
                    }}
                  >
                    Sync failed. Please try again.
                  </Typography>
                </Paper>
              )}
            </Box>
          </Box>

          {/* Footer with actions */}
          {/* Footer with actions - MATCH DESKTOP STYLE */}
          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: "divider",
              backgroundColor: theme.palette.background.default,
              display: "flex",
              justifyContent: "flex-end", // Align to the right like desktop
              gap: 1,
            }}
          >
            {!isCompleted ? (
              <>
                <Button
                  onClick={handleCancel}
                  variant="text"
                  color="inherit"
                  disabled={isCompleted}
                  sx={{
                    minWidth: "auto",
                    px: 2,
                    py: 1,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                  }}
                >
                  {t("Reset")}
                </Button>
                <Button
                  onClick={handleSync}
                  variant="text"
                  color="primary"
                  disabled={isSyncing}
                  sx={{
                    minWidth: "auto",
                    px: 2,
                    py: 1,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    opacity: isSyncing ? 0.8 : 1,
                  }}
                >
                  {isSyncing ? t("Refreshing") : t("Refresh")}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleDone}
                variant="text"
                color="primary"
                sx={{
                  minWidth: "auto",
                  px: 2,
                  py: 1,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                {t("Done")}
              </Button>
            )}
          </Box>
        </Box>
      </Dialog>
    );
  }

  // Desktop version (unchanged)
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
        {isCompleted ? t("Error_403_Title2") : t("Error_403_Title")}
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
              disabled={isCompleted}
            >
              {t("Reset")}
            </Button>
            <Button
              onClick={handleSync}
              variant="text"
              color="primary"
              disabled={isSyncing}
              sx={{
                opacity: isSyncing ? 0.8 : 1,
              }}
            >
              {isSyncing ? t("Refreshing") : t("Refresh")}
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
              {t("Done")}
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
}
