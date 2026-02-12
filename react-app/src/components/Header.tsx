import React from "react";
import ContactPageOutlinedIcon from "@mui/icons-material/ContactPageOutlined";
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
  MenuOutlined as MenuOutlinedIcon,
  TranslateOutlined as TranslateOutlinedIcon,
  LightModeOutlined as LightModeOutlinedIcon,
  DarkModeOutlined as DarkModeOutlinedIcon,
  SettingsOutlined as SettingsOutlinedIcon,
  InfoOutline,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LANGAUGES, type LanguagesCodes } from "../i18n/languages";
import { useStore, useThemeStore } from "../store/store";
import GrapeIcon from "./GrapeIcon";
import Footer from "./Footer";
import { NavIcon } from "./NavIcons";
import { HeaderComparisonIcon } from "./ComparationWidget";
import { ComparisonModal } from "../components/ComparationModal";
import { BusinessCenterOutlined as ServicesOutlinedIcon } from "@mui/icons-material";
import { SearchAutocomplete } from "./SearchAutocomplete";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";

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
      path: "/",
      label: t("Home"),
      icon: (
        <NavIcon>
          <HomeOutlinedIcon />
        </NavIcon>
      ),
    },
    {
      path: "/contact",
      label: t("Contact"),
      icon: (
        <NavIcon>
          <ContactPageOutlinedIcon />
        </NavIcon>
      ),
    },
    /*     {
      path: "/services",
      label: t("Services"),
      icon: (
        <NavIcon>
          <ServicesOutlinedIcon />
        </NavIcon>
      ),
    }, */
    {
      path: "/about", // <-- new link
      label: t("About"), // translation key
      icon: (
        <NavIcon>
          <InfoOutline sx={iconSx} />
          {/* outlined icon */}
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

  const isLoading = useStore((s) => s.isLoading);
  return (
    <>
      <AppBar
        position="relative"
        elevation={0}
        sx={{
          width: "100%",
          bgcolor: theme.palette.background.paper,
        }}
      >
        <Fade in={isLoading} timeout={300} unmountOnExit={false}>
          <LinearProgress
            variant="query"
            sx={{
              position: "static",
              bottom: 0, // 👈 sits ON TOP of divider
              left: 0,
              width: "100%",
              zIndex: (theme) => theme.zIndex.appBar + 1,
            }}
          />
        </Fade>
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            minHeight: 60,
            height: 60,
            borderBottom: 1,
            borderColor: "divider",
            px: { xs: 2, sm: 2, md: 2 },
            py: 0,
          }}
        >
          {/* Menu - fixed 60x60 to always align with vertical icons */}
          <Tooltip title={t("Menu_Tooltip")} enterDelay={500}>
            <IconButton
              edge="start"
              sx={{
                height: 60,
                width: 60,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 0,
                color: "text.primary",
              }}
              onClick={() => setDrawerOpen(true)}
            >
              <NavIcon>
                <MenuOutlinedIcon sx={iconSx} />
              </NavIcon>
            </IconButton>
          </Tooltip>

          {/* Search grows here */}
          <Box sx={{ flex: 1, ml: 0, mr: 2 }}>
            <SearchAutocomplete />
          </Box>
          {/* Right controls */}
          <Box sx={{ color: "text.primary" }}>
            <HeaderComparisonIcon />
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
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  px: { xs: 1.5, sm: 1.5, md: 2 },
                  py: 0,
                  height: { xs: 44, sm: 44, md: 48, lg: 48, xl: 52 },
                  gap: 1,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: { xs: 36, sm: 36, md: 40, lg: 40, xl: 44 },
                  }}
                >
                  <GrapeIcon color="primary" />
                </Box>

                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: {
                      xs: "0.9rem",
                      sm: "0.95rem",
                      md: "1rem",
                      lg: "1.05rem",
                    },
                    lineHeight: 1,
                    ml: -1,
                  }}
                >
                  Strugure
                </Typography>
              </Box>

              <Divider sx={{ mx: 2 }} />

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
                          sx={{
                            py: 0,
                            px: { xs: 1.5, sm: 1.5, md: 2 },
                            display: "flex",
                            alignItems: "center",
                            height: { xs: 44, sm: 44, md: 48, lg: 48, xl: 52 },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: {
                                xs: 36,
                                sm: 36,
                                md: 40,
                                lg: 40,
                                xl: 44,
                              },
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
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
                              fontSize: {
                                xs: "0.85rem",
                                sm: "0.9rem",
                                md: "0.95rem",
                                lg: "1rem",
                              },
                              fontWeight: 500,
                            }}
                            sx={{ m: 0, display: "flex", alignItems: "center" }}
                          />
                        </ListItemButton>
                      </ListItem>

                      {link.path === "/products" && <Divider sx={{ mx: 2 }} />}
                    </React.Fragment>
                  );
                })}

                {
                  <>
                    <Divider sx={{ mx: 2 }} />
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => {
                          setDrawerOpen(false);
                          handleSettingsOpen();
                        }}
                        sx={{
                          py: 0,
                          px: { xs: 1.5, sm: 1.5, md: 2 },
                          display: "flex",
                          alignItems: "center",
                          height: { xs: 44, sm: 44, md: 48, lg: 48, xl: 52 },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: {
                              xs: 36,
                              sm: 36,
                              md: 40,
                              lg: 40,
                              xl: 44,
                            },
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
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
                            fontSize: {
                              xs: "0.85rem",
                              sm: "0.9rem",
                              md: "0.95rem",
                              lg: "1rem",
                            },
                            fontWeight: 500,
                          }}
                          sx={{ m: 0, display: "flex", alignItems: "center" }}
                        />
                      </ListItemButton>
                    </ListItem>
                  </>
                }
              </List>

              <Box sx={{ mt: "auto" }}>
                <Footer onItemClick={() => setDrawerOpen(false)} />
              </Box>
            </Box>
          </Drawer>
        </Toolbar>
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
        <DialogTitle
          sx={{
            fontWeight: 600,
            fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
            py: { xs: 1, sm: 1 },
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

        <DialogActions sx={{ py: { xs: 0.5, sm: 1 } }}>
          <Button onClick={handleSettingsClose}>{t("Close")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Header;
