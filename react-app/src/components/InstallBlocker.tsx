import {
  Box,
  Typography,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  IconButton,
  Collapse,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import {
  IosShare,
  Add,
  Android,
  MoreVert,
  InstallMobile,
  DesktopWindows,
  Apple,
  Menu as MenuIcon,
  Translate as TranslateIcon,
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { LANGAUGES, type LanguagesCodes } from "../i18n/languages";
import { useThemeStore } from "../store/store";

type Platform = "ios" | "android" | "windows" | "macos" | "linux" | "other";

export const InstallBlocker = () => {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const [platform, setPlatform] = useState<Platform>("ios");
  const [showLangSelector, setShowLangSelector] = useState(false);
  const [key, setKey] = useState(0); // Add key for remounti
  const { mode } = useThemeStore(); // Get theme mode
  useEffect(() => {
    setKey((prev) => prev + 1);
  }, [mode]);

  const handlePlatformChange = (
    _event: React.MouseEvent<HTMLElement>,
    newPlatform: Platform | null,
  ) => {
    if (newPlatform) setPlatform(newPlatform);
  };

  const handleLangChange = (lang: LanguagesCodes) => {
    i18n.changeLanguage(lang);
    setShowLangSelector(false); // Optional: auto-close after selection
  };

  // ---- Platform-specific content (keep all your existing getter functions) ----
  const getDeviceName = () => {
    switch (platform) {
      case "ios":
        return "iPhone/iPad";
      case "android":
        return "Android";
      case "windows":
        return "Windows PC";
      case "macos":
        return "Mac";
      case "linux":
        return "Linux";
      default:
        return "your device";
    }
  };

  const getBrowserName = () => {
    switch (platform) {
      case "ios":
        return "Safari";
      case "android":
        return "Chrome";
      case "windows":
        return "Edge/Chrome/Firefox";
      case "macos":
        return "Safari/Chrome/Firefox";
      case "linux":
        return "Firefox/Chrome";
      default:
        return "your browser";
    }
  };

  const getStep1Icon = () => {
    switch (platform) {
      case "ios":
        return (
          <IosShare
            sx={{ fontSize: theme.typography.body1.fontSize, ml: 0.5 }}
          />
        );
      case "android":
        return (
          <MoreVert
            sx={{ fontSize: theme.typography.body1.fontSize, ml: 0.5 }}
          />
        );
      case "windows":
        return (
          <MenuIcon
            sx={{ fontSize: theme.typography.body1.fontSize, ml: 0.5 }}
          />
        );
      case "macos":
        return (
          <Apple sx={{ fontSize: theme.typography.body1.fontSize, ml: 0.5 }} />
        );
      default:
        return (
          <InstallMobile
            sx={{ fontSize: theme.typography.body1.fontSize, ml: 0.5 }}
          />
        );
    }
  };

  const getStep1Text = () => {
    switch (platform) {
      case "ios":
        return "Tap the Share button";
      case "android":
        return "Tap the menu button (⋮)";
      case "windows":
        return "Click the browser menu (⋮ or ☰)";
      case "macos":
        return "Click the Share button in Safari or browser menu";
      default:
        return "Open the browser menu";
    }
  };

  const getStep2Text = () => {
    switch (platform) {
      case "ios":
        return 'Scroll down and select "Add to Home Screen"';
      case "android":
        return 'Select "Install app" or "Add to Home screen"';
      case "windows":
      case "macos":
      case "linux":
        return 'Select "Install" or "Add to Home screen" from the menu';
      default:
        return "Look for the install option in the menu";
    }
  };

  const getStep3Text = () => {
    switch (platform) {
      case "ios":
        return 'Tap "Add" in the top right corner';
      case "android":
        return 'Tap "Install" in the popup';
      case "windows":
      case "macos":
      case "linux":
        return 'Click "Install" in the dialog';
      default:
        return "Confirm the installation";
    }
  };

  const getStep3Icon = () => {
    return platform === "ios" ? (
      <Add sx={{ fontSize: theme.typography.body1.fontSize, mx: 0.5 }} />
    ) : null;
  };

  const getPreviewIcon1 = () => {
    switch (platform) {
      case "ios":
        return <IosShare sx={{ fontSize: theme.typography.h4.fontSize }} />;
      case "android":
        return <MoreVert sx={{ fontSize: theme.typography.h4.fontSize }} />;
      case "windows":
        return (
          <DesktopWindows sx={{ fontSize: theme.typography.h4.fontSize }} />
        );
      case "macos":
        return <Apple sx={{ fontSize: theme.typography.h4.fontSize }} />;
      default:
        return (
          <InstallMobile sx={{ fontSize: theme.typography.h4.fontSize }} />
        );
    }
  };

  const getPreviewText1 = () => {
    switch (platform) {
      case "ios":
        return "Share";
      case "android":
        return "Menu";
      case "windows":
        return "Menu";
      case "macos":
        return "Share";
      default:
        return "Menu";
    }
  };

  const getPreviewIcon2 = () => {
    switch (platform) {
      case "ios":
        return <Add sx={{ fontSize: theme.typography.h4.fontSize }} />;
      case "android":
        return (
          <InstallMobile sx={{ fontSize: theme.typography.h4.fontSize }} />
        );
      case "windows":
        return (
          <InstallMobile sx={{ fontSize: theme.typography.h4.fontSize }} />
        );
      case "macos":
        return (
          <InstallMobile sx={{ fontSize: theme.typography.h4.fontSize }} />
        );
      default:
        return <Add sx={{ fontSize: theme.typography.h4.fontSize }} />;
    }
  };

  const getPreviewText2 = () => {
    switch (platform) {
      case "ios":
        return "Add to Home";
      case "android":
        return "Install";
      case "windows":
        return "Install";
      case "macos":
        return "Install";
      default:
        return "Install";
    }
  };

  const getUnsupportedMessage = () => {
    switch (platform) {
      case "ios":
        return "Safari on iOS is not supported. Please install the app from the home screen.";
      case "android":
        return "Mobile browsers on Android are not supported. Please install the app from your home screen.";
      case "windows":
        return "Browsers on Windows below 1440px are not supported. Please install the desktop app.";
      case "macos":
        return "Safari on macOS is not supported. Please install the desktop app or use Chrome/Firefox.";
      case "linux":
        return "Linux browsers are not fully supported. Please install the app if available.";
      default:
        return "This browser is not supported. Please use the installed app.";
    }
  };

  return (
    <Box
      key={key}
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: "background.default",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          maxWidth: 500,
          width: "100%",
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: 2,
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Language Toggle Button */}
        <IconButton
          onClick={() => setShowLangSelector(!showLangSelector)}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 10,
            color: showLangSelector ? "primary.main" : "inherit",
          }}
          size="small"
        >
          <TranslateIcon fontSize="small" />
        </IconButton>

        {/* Language Selector Dropdown */}
        <Collapse in={showLangSelector}>
          <Box sx={{ mb: 2, mt: 4 }}>
            <FormControl size="small" fullWidth>
              <Select
                value={i18n.language}
                onChange={(e) =>
                  handleLangChange(e.target.value as LanguagesCodes)
                }
                sx={{
                  fontSize: theme.typography.body2.fontSize,
                }}
                MenuProps={{
                  sx: { zIndex: 1000000 },
                }}
              >
                {(Object.keys(LANGAUGES) as LanguagesCodes[]).map((lang) => (
                  <MenuItem
                    key={lang}
                    value={lang}
                    sx={{ fontSize: theme.typography.body2.fontSize }}
                  >
                    {LANGAUGES[lang].label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Collapse>

        {/* App Icon */}
        <Box
          component="img"
          src="/icons/favicon.svg"
          alt="App Icon"
          sx={{
            width: theme.spacing(10),
            height: theme.spacing(10),
            mb: 2,
            mx: "auto",
          }}
        />

        <Typography variant="h5" gutterBottom fontWeight="bold">
          Install Our App
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Select your device to see installation instructions:
        </Typography>

        {/* Platform Selector */}
        <ToggleButtonGroup
          value={platform}
          exclusive
          onChange={handlePlatformChange}
          aria-label="platform selection"
          sx={{
            mb: 3,
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 0.5,
          }}
        >
          <ToggleButton value="ios" aria-label="iOS" size="small">
            <Apple
              sx={{ mr: 0.5, fontSize: theme.typography.body1.fontSize }}
            />{" "}
            iOS
          </ToggleButton>
          <ToggleButton value="android" aria-label="Android" size="small">
            <Android
              sx={{ mr: 0.5, fontSize: theme.typography.body1.fontSize }}
            />{" "}
            Android
          </ToggleButton>
          <ToggleButton value="windows" aria-label="Windows" size="small">
            <DesktopWindows
              sx={{ mr: 0.5, fontSize: theme.typography.body1.fontSize }}
            />{" "}
            Windows
          </ToggleButton>
          <ToggleButton value="macos" aria-label="macOS" size="small">
            <Apple
              sx={{ mr: 0.5, fontSize: theme.typography.body1.fontSize }}
            />{" "}
            macOS
          </ToggleButton>
          <ToggleButton value="linux" aria-label="Linux" size="small">
            <InstallMobile
              sx={{ mr: 0.5, fontSize: theme.typography.body1.fontSize }}
            />{" "}
            Linux
          </ToggleButton>
          <ToggleButton value="other" aria-label="Other" size="small">
            <MenuIcon
              sx={{ mr: 0.5, fontSize: theme.typography.body1.fontSize }}
            />{" "}
            Other
          </ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          For the best experience, please install our app on {getDeviceName()}.
        </Typography>

        {/* Installation Steps */}
        <Box sx={{ textAlign: "left", mb: 4 }}>
          {/* Step 1 */}
          <Typography
            variant="body2"
            sx={{ display: "flex", alignItems: "center", mb: 1.5 }}
          >
            <Box
              sx={{
                bgcolor: "primary.main",
                color: "white",
                width: theme.spacing(2.5),
                height: theme.spacing(2.5),
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                mr: 1.5,
                fontSize: theme.typography.caption.fontSize,
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              1
            </Box>
            {getStep1Text()}
            {getStep1Icon()}
          </Typography>

          {/* Step 2 */}
          <Typography
            variant="body2"
            sx={{ display: "flex", alignItems: "center", mb: 1.5 }}
          >
            <Box
              sx={{
                bgcolor: "primary.main",
                color: "white",
                width: theme.spacing(2.5),
                height: theme.spacing(2.5),
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                mr: 1.5,
                fontSize: theme.typography.caption.fontSize,
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              2
            </Box>
            {getStep2Text()}
          </Typography>

          {/* Step 3 */}
          <Typography
            variant="body2"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <Box
              sx={{
                bgcolor: "primary.main",
                color: "white",
                width: theme.spacing(2.5),
                height: theme.spacing(2.5),
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                mr: 1.5,
                fontSize: theme.typography.caption.fontSize,
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              3
            </Box>
            {getStep3Text()}
            {getStep3Icon()}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Once installed, open from your home screen / desktop for the best
          experience.
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 2 }}
        >
          {getUnsupportedMessage()}
        </Typography>
      </Paper>
    </Box>
  );
};
