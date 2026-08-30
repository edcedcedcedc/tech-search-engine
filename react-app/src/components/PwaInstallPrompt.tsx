// components/PwaInstallPrompt.tsx
import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Close,
  InstallMobile,
  Apple,
  Android,
  IosShare,
  InstallDesktop,
} from "@mui/icons-material";
import { uiLog } from "../webhook/client/uiDebug";
import { useCookieStore } from "../store/store";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export const PwaInstallPrompt = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [cookiesShown, setCookiesShown] = useState(false);
  const [isStoreReady, setIsStoreReady] = useState(false);

  // Get cookie consent state
  const consent = useCookieStore((s) => s.consent);
  const hasCookieConsent = consent === true;
  const hasCookieDeclined = consent === false;
  const cookiePending = consent === null;

  // FIRST: Check store hydration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStoreReady(true);
      uiLog("[PWA] Store ready");
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // SECOND: Setup platform detection and event listeners
  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(standalone);

    // Check platform
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);
    const android = /Android/.test(navigator.userAgent);
    setIsAndroid(android);

    uiLog(`[PWA] iOS: ${iOS}, Android: ${android}, Standalone: ${standalone}`);

    // Don't proceed if already installed
    if (standalone) {
      uiLog("[PWA] Already in standalone mode, not showing prompt");
      return;
    }

    // Check if user previously dismissed install prompt
    const dismissedBefore = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissedBefore) {
      const dismissedTime = parseInt(dismissedBefore, 10);
      const days = isMobile ? 7 : 30;
      if (Date.now() - dismissedTime < days * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    // Listen for install prompt (Android/Desktop)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      uiLog("[PWA] beforeinstallprompt fired");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, [isMobile]);

  // THIRD: Watch for cookie consent changes and show prompt
  useEffect(() => {
    // Wait for store to be ready
    if (!isStoreReady) {
      return;
    }

    // Don't do anything if:
    // - Already installed
    // - Already dismissed
    // - No cookie decision yet
    // - Cookies were declined
    if (isStandalone || dismissed || cookiePending || hasCookieDeclined) {
      if (hasCookieDeclined) {
        uiLog("[PWA] Cookies declined, not showing install prompt");
      }
      return;
    }

    // User accepted cookies, now we can show install prompt
    if (hasCookieConsent && !cookiesShown) {
      uiLog("[PWA] Cookies accepted, showing install prompt");

      // For iOS mobile - ALWAYS show instructions after cookie consent
      if (isMobile && isIOS) {
        uiLog("[PWA] iOS detected, showing instructions");
        const timer = setTimeout(() => {
          setShowPrompt(true);
          setCookiesShown(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
      // For Android mobile with install prompt
      else if (isMobile && isAndroid && deferredPrompt) {
        uiLog("[PWA] Android with prompt, showing install button");
        const timer = setTimeout(() => {
          setShowPrompt(true);
          setCookiesShown(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
      // For Android mobile without prompt (should still show instructions)
      else if (isMobile && isAndroid && !deferredPrompt) {
        uiLog("[PWA] Android without prompt, showing instructions");
        const timer = setTimeout(() => {
          setShowPrompt(true);
          setCookiesShown(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
      // For desktop with install prompt available
      else if (!isMobile && deferredPrompt) {
        setShowPrompt(true);
        setCookiesShown(true);
      }
      // For desktop without install prompt (info banner)
      else if (!isMobile && !deferredPrompt) {
        const timer = setTimeout(() => {
          setShowPrompt(true);
          setCookiesShown(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [
    isStoreReady,
    hasCookieConsent,
    cookiePending,
    hasCookieDeclined,
    isStandalone,
    dismissed,
    isMobile,
    isIOS,
    isAndroid,
    deferredPrompt,
    cookiesShown,
  ]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      uiLog("[PWA] No install prompt available");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    uiLog(`[PWA] User response: ${outcome}`);

    if (outcome === "accepted") {
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
    uiLog("[PWA] Prompt dismissed");
  };

  // Don't render if:
  // - Store not ready yet
  // - Already installed/standalone
  // - Dismissed recently
  // - No cookie consent or cookies declined
  // - Shouldn't show
  if (
    !isStoreReady ||
    isStandalone ||
    dismissed ||
    !showPrompt ||
    consent !== true
  ) {
    return null;
  }

  // ============= DESKTOP BANNER VERSION =============
  if (!isMobile) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          position: "relative",
          width: "100%",
        }}
      >
        <IconButton
          size="small"
          onClick={handleDismiss}
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            color: "white",
            "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
          }}
        >
          <Close fontSize="small" />
        </IconButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, pr: 4 }}>
          <InstallDesktop />
          <Typography variant="body2">
            {deferredPrompt
              ? "Install our desktop app for offline access and quick launching"
              : "Your browser supports installing this app as a desktop application"}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleDismiss}
            sx={{
              color: "white",
              borderColor: "white",
              "&:hover": {
                borderColor: "white",
                bgcolor: "rgba(255,255,255,0.1)",
              },
            }}
          >
            Not now
          </Button>
          {deferredPrompt && (
            <Button
              variant="contained"
              size="small"
              onClick={handleInstall}
              sx={{
                bgcolor: "white",
                color: "primary.main",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.9)",
                },
              }}
            >
              Install
            </Button>
          )}
        </Box>
      </Paper>
    );
  }

  // ============= MOBILE PROMPT VERSION =============
  const iOSInstructions = (
    <Box sx={{ mt: 1 }}>
      <Typography
        variant="body2"
        sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
      >
        <Box component="span" sx={{ display: "flex", alignItems: "center" }}>
          1. Tap <IosShare sx={{ mx: 0.5, fontSize: 20 }} /> Share
        </Box>
      </Typography>
      <Typography
        variant="body2"
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <Box component="span" sx={{ display: "flex", alignItems: "center" }}>
          2. Scroll down and tap{" "}
          <Box component="span" sx={{ mx: 0.5 }}>
            Add to Home Screen
          </Box>
          <Box component="span" sx={{ fontSize: "20px", ml: 0.5 }}>
            ➕
          </Box>
        </Box>
      </Typography>
    </Box>
  );

  const androidInstructions = (
    <Box sx={{ mt: 1 }}>
      <Typography
        variant="body2"
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <Box component="span" sx={{ display: "flex", alignItems: "center" }}>
          1. Tap <InstallMobile sx={{ mx: 0.5, fontSize: 20 }} /> Install below
        </Box>
      </Typography>
    </Box>
  );

  const getIcon = () => {
    if (isIOS) return <Apple sx={{ fontSize: 28 }} />;
    if (isAndroid) return <Android sx={{ fontSize: 28 }} />;
    return <InstallMobile sx={{ fontSize: 28 }} />;
  };

  const getTitle = () => {
    if (isIOS) return "Install on iPhone";
    if (isAndroid) return "Install on Android";
    return "Install App";
  };

  const getDescription = () => {
    if (isIOS) {
      return "Install this app on your iPhone for a better experience, offline access, and quick launching from your home screen:";
    }
    if (isAndroid) {
      return "Add to home screen for quick access, offline support, and a native app-like experience:";
    }
    return "Add to home screen for quick access and offline support";
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        width: "90%",
        maxWidth: 400,
        p: 2,
        zIndex: theme.zIndex.snackbar,
        borderRadius: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <IconButton
        size="small"
        onClick={handleDismiss}
        sx={{ position: "absolute", top: 8, right: 8 }}
      >
        <Close fontSize="small" />
      </IconButton>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
        {getIcon()}
        <Typography variant="h6">{getTitle()}</Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {getDescription()}
      </Typography>

      {isIOS && iOSInstructions}
      {isAndroid && androidInstructions}

      {isAndroid && deferredPrompt && (
        <Button
          variant="contained"
          fullWidth
          onClick={handleInstall}
          startIcon={<InstallMobile />}
          sx={{ mt: 1 }}
        >
          Install Now
        </Button>
      )}

      {(isIOS || (isAndroid && !deferredPrompt)) && (
        <Button
          variant="outlined"
          fullWidth
          onClick={handleDismiss}
          sx={{ mt: 1 }}
        >
          Got it
        </Button>
      )}
    </Paper>
  );
};
