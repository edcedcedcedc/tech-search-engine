import React from "react";
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  Select,
  useTheme,
  Divider,
  useMediaQuery,
  Tooltip,
  Typography,
  LinearProgress,
  Fade,
} from "@mui/material";

import { Switch } from "@mui/material";
import { useNotificationStore } from "../store/store";
import {
  ManageSearchOutlined as ManageSearchOutlinedIcon,
  HelpOutlined as HelpOutlinedIcon,
  ContactMail as ContactMailIcon,
  MenuOutlined as MenuOutlinedIcon,
  TranslateOutlined as TranslateOutlinedIcon,
  LightModeOutlined as LightModeOutlinedIcon,
  DarkModeOutlined as DarkModeOutlinedIcon,
  SettingsOutlined as SettingsOutlinedIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LANGAUGES, type LanguagesCodes } from "../i18n/languages";
import { useStore, useThemeStore } from "../store/store";
import GrapeIcon from "../components/Icon";
import Footer from "./Footer";
import { NavIcon } from "./NavIcons";
import { HeaderComparisonIcon } from "./ComparationWidget";
import { ComparisonModal } from "../components/ComparationModal";
import { BusinessCenterOutlined as ServicesOutlinedIcon } from "@mui/icons-material";
const ICON_SIZE = 22;
const iconSx = { fontSize: ICON_SIZE };

const Header: React.FC = () => {
  const theme = useTheme();
  const mode = useThemeStore((state) => state.mode);
  const toggleMode = useThemeStore((s) => s.toggleMode);
  const { t, i18n } = useTranslation();
  const isVerySmallScreen = useMediaQuery("(max-width:425px)");
  const isTinyScreen = useMediaQuery("(max-width:320px)");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [langMenuAnchor, setLangMenuAnchor] =
    React.useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  // Add comparison modal hook

  const aggregatedProducts = useStore((s) => s.aggregatedProducts);
  const isProductsDisabled = aggregatedProducts.length === 0;

  const navLinks = [
    {
      path: "/products",
      label: t("Manage_Products"),
      icon: (
        <NavIcon>
          <ManageSearchOutlinedIcon />
        </NavIcon>
      ),
    },
    {
      path: "/about",
      label: t("About"),
      icon: (
        <NavIcon>
          <HelpOutlinedIcon />
        </NavIcon>
      ),
    },
    {
      path: "/contact",
      label: t("Contact"),
      icon: (
        <NavIcon>
          <ContactMailIcon />
        </NavIcon>
      ),
    },
    {
      path: "/services", // <-- new link
      label: t("Services"), // translation key
      icon: (
        <NavIcon>
          <ServicesOutlinedIcon /> {/* outlined icon */}
        </NavIcon>
      ),
    },
  ];

  const handleLangMenuOpen = (event: React.MouseEvent<HTMLElement>) =>
    setLangMenuAnchor(event.currentTarget);
  const handleLangMenuClose = () => setLangMenuAnchor(null);
  const handleLangChange = (lang: LanguagesCodes) => {
    i18n.changeLanguage(lang);
    handleLangMenuClose();
  };

  const handleSettingsOpen = () => setSettingsOpen(true);
  const handleSettingsClose = () => setSettingsOpen(false);

  const isTiny = useMediaQuery("(max-width:320px)");
  const iconButtonSx = { color: "text.secondary" };
  const isLoading = useStore((s) => s.isLoading);
  return (
    <>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          width: "100%",
          bgcolor: theme.palette.background.paper,
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            borderBottom: 1,
            borderColor: "divider",
            px: { xs: 2, sm: 3, md: 4 },
          }}
        >
          {/* Logo + Menu */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Menu */}
            <Tooltip title={t("Menu_Tooltip")} enterDelay={500} leaveDelay={0}>
              <IconButton
                edge="start"
                sx={{ p: 0.5, display: "flex", alignItems: "center" }}
                onClick={() => setDrawerOpen(true)}
              >
                <NavIcon>
                  <MenuOutlinedIcon fontSize="medium" sx={iconSx} />
                </NavIcon>
              </IconButton>
            </Tooltip>
          </Box>

          {/* Right controls */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <NavIcon>
              <HeaderComparisonIcon />
            </NavIcon>
          </Box>

          {/* Drawer */}
          <Drawer
            anchor="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            PaperProps={{
              sx: {
                width: 260,
                zIndex: 1600,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              },
            }}
          >
            <Box
              sx={{
                width: 260,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Logo on top of drawer */}
              <Box
                component={RouterLink}
                to="/"
                onClick={() => setDrawerOpen(false)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  px: 2,
                  py: 2,
                  borderBottom: 1,
                  borderColor: "divider",
                  gap: 1,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    minWidth: 40,
                    justifyContent: "center",
                  }}
                >
                  <GrapeIcon color="primary" variant="logo" />
                </Box>

                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: "1rem",
                    lineHeight: 1,
                    ml: -1,
                  }}
                >
                  Strugure
                </Typography>
              </Box>

              {/* Navigation links */}
              <List disablePadding>
                {navLinks.map((link) => {
                  const disabled =
                    link.path === "/products" && isProductsDisabled;

                  return (
                    <React.Fragment key={link.path}>
                      <ListItem disablePadding>
                        <ListItemButton
                          component={!disabled ? RouterLink : "div"}
                          to={!disabled ? link.path : undefined}
                          disabled={disabled}
                          onClick={() => !disabled && setDrawerOpen(false)}
                          sx={{ py: 1.2, px: 2 }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 40,
                              display: "flex",
                              justifyContent: "center",
                              color: disabled
                                ? "text.disabled"
                                : "text.secondary",
                            }}
                          >
                            {link.icon}
                          </ListItemIcon>

                          <ListItemText
                            primary={link.label}
                            primaryTypographyProps={{
                              fontSize: "0.95rem",
                              fontWeight: 500,
                            }}
                          />
                        </ListItemButton>
                      </ListItem>

                      {link.path === "/products" && (
                        <Divider sx={{ my: 0.5 }} />
                      )}
                    </React.Fragment>
                  );
                })}

                {
                  <>
                    <Divider sx={{ my: 0.5 }} />
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => {
                          setDrawerOpen(false);
                          handleSettingsOpen();
                        }}
                        sx={{ py: 1.2, px: 2 }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 40,
                            display: "flex",
                            justifyContent: "center",
                            color: "text.secondary",
                          }}
                        >
                          <NavIcon>
                            <SettingsOutlinedIcon />
                          </NavIcon>
                        </ListItemIcon>
                        <ListItemText
                          primary={t("Settings")}
                          primaryTypographyProps={{
                            fontSize: "0.95rem",
                            fontWeight: 500,
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  </>
                }
              </List>

              <Box sx={{ mt: "auto" }}>
                <Footer />
              </Box>
            </Box>
          </Drawer>
        </Toolbar>
        <Fade in={isLoading} timeout={300} unmountOnExit={false}>
          <LinearProgress
            variant="query"
            sx={{
              position: "static", // fixed to viewport
              top: 0,
              left: 0,
              width: "100%",
              zIndex: (theme) => theme.zIndex.appBar + 1, // above AppBar but below Drawer
            }}
          />
        </Fade>
      </AppBar>

      {/* Comparison Modal */}
      <ComparisonModal />

      {/* Settings Modal */}
      <Dialog
        open={settingsOpen}
        onClose={handleSettingsClose}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
          {t("Settings")}
        </DialogTitle>

        <DialogContent>
          <List disablePadding>
            {/* Theme toggle */}
            <ListItem sx={{ justifyContent: "space-between" }}>
              <ListItemText
                primary={t("Theme")}
                secondary={mode === "dark" ? t("Dark_mode") : t("Light_mode")}
              />
              <IconButton size="small" onClick={toggleMode}>
                {mode === "dark" ? (
                  <LightModeOutlinedIcon sx={iconSx} />
                ) : (
                  <DarkModeOutlinedIcon sx={iconSx} />
                )}
              </IconButton>
            </ListItem>

            <Divider />

            {/* Language selector */}
            <ListItem sx={{ display: "flex", alignItems: "center" }}>
              <ListItemText primary={t("Language")} />
              <FormControl size="small" sx={{ ml: "auto" }}>
                <Select
                  sx={{
                    width: isTinyScreen
                      ? "100px"
                      : isVerySmallScreen
                        ? "150px"
                        : "auto",
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

            <Divider />

            {/* Disable Notifications toggle */}
            <ListItem
              sx={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <ListItemText primary={t("Disable_notifications")} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {(() => {
                  const disabled = useNotificationStore((s) => s.disabled);
                  const setDisabled = useNotificationStore(
                    (s) => s.setDisabled,
                  );

                  return (
                    <Switch
                      checked={disabled}
                      onChange={(e) => setDisabled(e.target.checked)}
                      color="primary"
                    />
                  );
                })()}
              </Box>
            </ListItem>
          </List>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleSettingsClose}>{t("Close")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Header;
