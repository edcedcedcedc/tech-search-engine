import React from "react";
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControl,
  Select,
  MenuItem,
  Switch,
  useTheme,
} from "@mui/material";
import {
  LightModeOutlined as LightModeOutlinedIcon,
  DarkModeOutlined as DarkModeOutlinedIcon,
  ComputerOutlined as ComputerOutlinedIcon,
  ArrowBackOutlined as ArrowBackOutlinedIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { LANGAUGES, type LanguagesCodes } from "../i18n/languages";
import { useThemeStore } from "../store/store";
import { useNotificationStore } from "../store/store";

const ICON_SIZE = 22;
const iconSx = { fontSize: ICON_SIZE };

interface SettingsViewProps {
  onClose: () => void;
  onThemeChange?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  onClose,
  onThemeChange,
}) => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { mode, toggleMode, effectiveMode } = useThemeStore();
  const disabled = useNotificationStore((s) => s.disabled);
  const setDisabled = useNotificationStore((s) => s.setDisabled);

  console.log(
    "[SettingsView] Render - mode:",
    mode,
    "effectiveMode:",
    effectiveMode,
  );

  const getThemeIcon = () => {
    switch (mode) {
      case "light":
        return <LightModeOutlinedIcon sx={iconSx} />;
      case "dark":
        return <DarkModeOutlinedIcon sx={iconSx} />;
      case "system":
        return <ComputerOutlinedIcon sx={iconSx} />;
      default:
        return <ComputerOutlinedIcon sx={iconSx} />;
    }
  };

  const getThemeText = () => {
    switch (mode) {
      case "light":
        return t("Light_mode");
      case "dark":
        return t("Dark_mode");
      case "system":
        return t("System_theme") + (effectiveMode ? ` (${effectiveMode})` : "");
      default:
        return t("System_theme");
    }
  };

  const handleToggleMode = () => {
    console.log("[SettingsView] Toggling theme from", mode);
    toggleMode();
    console.log(
      "[SettingsView] Theme toggled, new mode will be:",
      mode === "light" ? "dark" : mode === "dark" ? "system" : "light",
    );
    if (onThemeChange) {
      console.log("[SettingsView] Calling onThemeChange callback");
      onThemeChange();
    }
  };

  const handleLangChange = (lang: LanguagesCodes) => {
    console.log("[SettingsView] Changing language to:", lang);
    i18n.changeLanguage(lang);
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: theme.palette.background.paper,
      }}
    >
      {/* Header with back button - matching X button position */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 44,
          px: 1.5,
          py: 0,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <IconButton
          onClick={() => {
            console.log("[SettingsView] Close button clicked");
            onClose();
          }}
          size="small"
          sx={{
            color: "text.secondary",
            "&:hover": {
              bgcolor: "action.hover",
            },
            mr: 1,
          }}
        >
          <ArrowBackOutlinedIcon fontSize="small" />
        </IconButton>
        <Typography
          variant="h6"
          component="h1"
          sx={{
            fontWeight: 600,
            fontSize: "1rem",
            color: "text.primary",
          }}
        >
          {t("Settings")}
        </Typography>
      </Box>

      {/* Settings content */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <List disablePadding>
          {/* Theme toggle */}
          <ListItem
            sx={{
              justifyContent: "space-between",
              py: 1.5,
              px: 0,
            }}
          >
            <ListItemText
              primary={t("Theme")}
              secondary={getThemeText()}
              primaryTypographyProps={{
                fontSize: "0.95rem",
              }}
              secondaryTypographyProps={{
                fontSize: "0.85rem",
              }}
            />
            <IconButton size="small" onClick={handleToggleMode}>
              {getThemeIcon()}
            </IconButton>
          </ListItem>

          <Divider sx={{ mx: 0 }} />

          {/* Language selector */}
          <ListItem
            sx={{
              display: "flex",
              alignItems: "center",
              py: 1.5,
              px: 0,
              gap: 1,
            }}
          >
            <ListItemText
              primary={t("Language")}
              sx={{ flex: 0 }}
              primaryTypographyProps={{
                fontSize: "0.95rem",
              }}
            />
            <FormControl size="small" sx={{ ml: "auto", flexShrink: 0 }}>
              <Select
                sx={{
                  width: "110px",
                  fontSize: "0.9rem",
                }}
                value={i18n.language}
                onChange={(e) =>
                  handleLangChange(e.target.value as LanguagesCodes)
                }
              >
                {(Object.keys(LANGAUGES) as LanguagesCodes[]).map((lang) => (
                  <MenuItem key={lang} value={lang}>
                    {LANGAUGES[lang].label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </ListItem>

          <Divider sx={{ mx: 0 }} />

          {/* Disable Notifications toggle */}
          <ListItem
            sx={{
              justifyContent: "space-between",
              alignItems: "center",
              py: 1.5,
              px: 0,
            }}
          >
            <ListItemText
              primary={t("Disable_notifications")}
              primaryTypographyProps={{
                fontSize: "0.95rem",
              }}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Switch
                checked={disabled}
                onChange={(e) => {
                  console.log(
                    "[SettingsView] Toggling notifications to:",
                    e.target.checked,
                  );
                  setDisabled(e.target.checked);
                }}
                color="primary"
                size="medium"
              />
            </Box>
          </ListItem>
        </List>
      </Box>
    </Box>
  );
};

export default SettingsView;
