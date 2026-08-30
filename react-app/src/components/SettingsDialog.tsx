import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  /*   DialogActions,
  Button, */
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  FormControl,
  Select,
  MenuItem,
  Box,
  Switch,
  useTheme,
  useMediaQuery,
  Portal,
} from "@mui/material";
import {
  LightModeOutlined as LightModeOutlinedIcon,
  DarkModeOutlined as DarkModeOutlinedIcon,
  ComputerOutlined as ComputerOutlinedIcon,
  ArrowBackOutlined as ArrowBackOutlinedIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { LANGAUGES, type LanguagesCodes } from "../i18n/languages";
import { useThemeStore } from "../store/store";
import { useNotificationStore } from "../store/store";

const ICON_SIZE = 22;
const iconSx = { fontSize: ICON_SIZE };

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { mode, toggleMode } = useThemeStore();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const disabled = useNotificationStore((s) => s.disabled);
  const setDisabled = useNotificationStore((s) => s.setDisabled);

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
        return t("System_theme");
      default:
        return t("System_theme");
    }
  };

  const handleLangChange = (lang: LanguagesCodes) => {
    i18n.changeLanguage(lang);
  };

  return (
    <Portal>
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen={isMobile}
        fullWidth
        maxWidth="xs"
        sx={{
          zIndex: isMobile ? 1700 : 1300, // Higher z-index on mobile to be above drawer (1600)
        }}
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            position: "relative",
          },
        }}
      >
        {/* Close icon in top right corner */}
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            zIndex: 1,
            color: "text.secondary",
            "&:hover": {
              bgcolor: "action.hover",
            },
          }}
          size="small"
        >
          {isMobile ? (
            <ArrowBackOutlinedIcon fontSize="small" />
          ) : (
            <CloseIcon fontSize="small" />
          )}
        </IconButton>

        <DialogTitle
          sx={{
            fontWeight: 600,
            fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
            py: { xs: 1, sm: 1 },
            pr: 6, // Add right padding to prevent text from going under the close button
          }}
        >
          {t("Settings")}
        </DialogTitle>

        <DialogContent sx={{ py: { xs: 0.5, sm: 1 } }}>
          <List disablePadding>
            {/* Theme toggle */}
            <ListItem
              sx={{ justifyContent: "space-between", py: { xs: 1, sm: 1 } }}
            >
              <ListItemText primary={t("Theme")} secondary={getThemeText()} />
              <IconButton size="small" onClick={toggleMode}>
                {getThemeIcon()}
              </IconButton>
            </ListItem>

            <Divider sx={{ mx: 2 }} />

            {/* Language selector */}
            <ListItem
              sx={{
                display: "flex",
                alignItems: "center",
                py: { xs: 0.5, sm: 1 },
                gap: 1,
              }}
            >
              <ListItemText primary={t("Language")} sx={{ flex: 0 }} />
              <FormControl size="small" sx={{ ml: "auto", flexShrink: 0 }}>
                <Select
                  sx={{
                    width: { xs: "85px", sm: "110px", md: "140px" },
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

            <Divider sx={{ mx: 2 }} />

            {/* Disable Notifications toggle */}
            <ListItem
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                py: { xs: 0.5, sm: 1 },
              }}
            >
              <ListItemText primary={t("Disable_notifications")} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Switch
                  checked={disabled}
                  onChange={(e) => setDisabled(e.target.checked)}
                  color="primary"
                />
              </Box>
            </ListItem>
          </List>
        </DialogContent>

        {/* Remove DialogActions since we now have the X close icon */}
      </Dialog>
    </Portal>
  );
};

export default SettingsDialog;
