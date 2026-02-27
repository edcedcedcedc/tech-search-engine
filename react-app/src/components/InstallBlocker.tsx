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
  const { t, i18n } = useTranslation();
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
        return t("Device_iphone_ipad");
      case "android":
        return t("Device_android");
      case "windows":
        return t("Device_windows");
      case "macos":
        return t("Device_mac");
      case "linux":
        return t("Device_linux");
      default:
        return t("Device_your_device");
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
          <IosShare // Share button in Safari
            sx={{ fontSize: theme.typography.body1.fontSize, ml: 0.5 }}
          />
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
        return t("Step_1_tap_share");
      case "android":
        return t("Step_1_tap_menu");
      case "windows":
        return t("Step_1_click_browser_menu");
      case "macos":
        return t("Step_1_click_share");
      default:
        return t("Step_1_open_menu");
    }
  };

  const getStep2Text = () => {
    switch (platform) {
      case "ios":
        return t("Step_2_ios");
      case "android":
        return t("Step_2_android");
      case "macos": // Add specific case for macOS
        return t("Select_Add_to_Dock_from_the_menu");
      case "windows":
      case "linux":
        return t("Step_2_desktop");
      default:
        return t("Step_2_default");
    }
  };

  const getStep3Text = () => {
    switch (platform) {
      case "ios":
        return t("Step_3_ios");
      case "android":
        return t("Step_3_android");
      case "windows":
      case "macos":
      case "linux":
        return t("Step_3_desktop");
      default:
        return t("Step_3_default");
    }
  };

  const getStep3Icon = () => {
    return platform === "ios" ? (
      <Add sx={{ fontSize: theme.typography.body1.fontSize, mx: 0.5 }} />
    ) : null;
  };

  const getUnsupportedMessage = () => {
    switch (platform) {
      case "ios":
        return t("Unsupported_ios");
      case "android":
        return t("Unsupported_android");
      case "windows":
        return t("Unsupported_windows");
      case "macos":
        return t("Unsupported_macos");
      case "linux":
        return t("Unsupported_linux");
      default:
        return t("Unsupported_default");
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
          {t("Install_our_app")}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t("Select_your_device")}
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
          {/*     <ToggleButton value="linux" aria-label="Linux" size="small">
            <InstallMobile
              sx={{ mr: 0.5, fontSize: theme.typography.body1.fontSize }}
            />{" "}
            Linux
          </ToggleButton> */}
          <ToggleButton value="other" aria-label="Other" size="small">
            <MenuIcon
              sx={{ mr: 0.5, fontSize: theme.typography.body1.fontSize }}
            />{" "}
            Other
          </ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {t("For_best_experience", { device: getDeviceName() })}
        </Typography>

        {/* Installation Steps */}
        <Box sx={{ textAlign: "left", mb: 4 }}>
          {/* Step 1 */}
          <Typography
            variant="body2"
            sx={{ display: "flex", alignItems: "center", mb: 1.5 }}
          >
            <Box
              component="span"
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
              component="span"
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
              component="span"
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
          {t("Once_installed")}
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
