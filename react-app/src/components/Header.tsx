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
} from "@mui/material";
import {
  ManageSearchOutlined as ManageSearchOutlinedIcon,
  InfoOutlined as InfoOutlinedIcon,
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
import { useStore } from "../store/store";
import GrapeIcon from "../components/Icon";
import Footer from "./Footer";

const ICON_SIZE = 22;
const iconSx = { fontSize: ICON_SIZE };

const Header: React.FC = () => {
  const theme = useTheme();
  const mode = useStore((s) => s.mode);
  const toggleMode = useStore((s) => s.toggleMode);
  const { t, i18n } = useTranslation();

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [langMenuAnchor, setLangMenuAnchor] =
    React.useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const aggregatedProducts = useStore((s) => s.aggregatedProducts);
  const isProductsDisabled = aggregatedProducts.length === 0;

  const navLinks = [
    {
      path: "/products",
      label: t("Manage_Products"),
      icon: <ManageSearchOutlinedIcon sx={iconSx} />,
    },
    {
      path: "/about",
      label: t("About"),
      icon: <InfoOutlinedIcon sx={iconSx} />,
    },
    {
      path: "/contact",
      label: t("Contact"),
      icon: <ContactMailIcon sx={iconSx} />,
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

  return (
    <>
      <AppBar
        position="static"
        elevation={0}
        sx={{ width: "100%", bgcolor: theme.palette.background.paper }}
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
          {/* Logo */}
          <Tooltip title="Strugure" enterDelay={500} leaveDelay={0}>
            <Box
              component={RouterLink}
              to="/"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                cursor: "pointer",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              <GrapeIcon size={27} color="primary" variant="logo" />
            </Box>
          </Tooltip>

          {/* Right controls */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isTiny && (
              <>
                <IconButton onClick={toggleMode} sx={iconButtonSx}>
                  {mode === "dark" ? (
                    <LightModeOutlinedIcon sx={iconSx} />
                  ) : (
                    <DarkModeOutlinedIcon sx={iconSx} />
                  )}
                </IconButton>

                <IconButton onClick={handleLangMenuOpen} sx={iconButtonSx}>
                  <TranslateOutlinedIcon sx={iconSx} />
                </IconButton>

                <Menu
                  anchorEl={langMenuAnchor}
                  open={Boolean(langMenuAnchor)}
                  onClose={handleLangMenuClose}
                >
                  {(Object.keys(LANGAUGES) as LanguagesCodes[]).map((lang) => (
                    <MenuItem key={lang} onClick={() => handleLangChange(lang)}>
                      {LANGAUGES[lang].label}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}

            <Tooltip title={t("Menu_Tooltip")} enterDelay={500} leaveDelay={0}>
              <IconButton
                edge="end"
                sx={iconButtonSx}
                onClick={() => setDrawerOpen(true)}
              >
                <MenuOutlinedIcon sx={iconSx} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Drawer */}
          <Drawer
            anchor="right"
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

                {!isTiny && (
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
                          <SettingsOutlinedIcon sx={iconSx} />
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
                )}
              </List>

              <Box sx={{ mt: "auto" }}>
                <Footer />
              </Box>
            </Box>
          </Drawer>
        </Toolbar>
      </AppBar>

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

            <ListItem sx={{ justifyContent: "space-between" }}>
              <ListItemText primary={t("Language")} />
              <FormControl size="small">
                <Select
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
