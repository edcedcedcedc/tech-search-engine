import React from "react";
import ContactPageOutlinedIcon from "@mui/icons-material/ContactPageOutlined";
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  useTheme,
  Divider,
  Tooltip,
  Typography,
  LinearProgress,
  Fade,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import {
  MenuOutlined as MenuOutlinedIcon,
  SettingsOutlined as SettingsOutlinedIcon,
  InfoOutline,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStore } from "../store/store";
import GrapeIcon from "./GrapeIcon";
import Footer from "./Footer";
import { NavIcon } from "./NavIcons";
import { SearchAutocomplete } from "./SearchAutocomplete";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import SettingsView from "./SettingsView";

const ICON_SIZE = 22;
const iconSx = { fontSize: ICON_SIZE };

const Header: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const drawerOpen = useStore((s) => s.drawerOpen);
  const setDrawerOpen = useStore((s) => s.setDrawerOpen);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const aggregatedProducts = useStore((s) => s.aggregatedProducts);
  const isProductsDisabled = aggregatedProducts.length === 0;

  console.log(
    "[Header] Render - drawerOpen:",
    drawerOpen,
    "settingsOpen:",
    settingsOpen,
  );

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
    {
      path: "/about",
      label: t("About"),
      icon: (
        <NavIcon>
          <InfoOutline sx={iconSx} />
        </NavIcon>
      ),
    },
  ];

  const handleSettingsToggle = () => {
    console.log(
      "[Header] Toggling settings from",
      settingsOpen,
      "to",
      !settingsOpen,
    );
    setSettingsOpen(!settingsOpen);
  };

  const handleSettingsClose = () => {
    console.log("[Header] Closing settings");
    setSettingsOpen(false);
  };

  const handleDrawerClose = () => {
    console.log("[Header] Closing drawer and settings");
    setDrawerOpen(false);
    setSettingsOpen(false);
  };

  const handleDrawerOpen = () => {
    console.log("[Header] Opening drawer");
    setDrawerOpen(true);
  };

  const isLoading = useStore((s) => s.isLoading);

  return (
    <>
      <AppBar
        position="relative"
        elevation={0}
        sx={{
          width: "100%",
          bgcolor: theme.palette.background.default,
        }}
      >
        <Fade in={isLoading} timeout={300} unmountOnExit={false}>
          <LinearProgress
            variant="query"
            sx={{
              position: "static",
              bottom: 0,
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
              onClick={handleDrawerOpen}
            >
              <NavIcon>
                <MenuOutlinedIcon sx={iconSx} />
              </NavIcon>
            </IconButton>
          </Tooltip>

          {/* Search grows here */}
          <Box sx={{ flex: 1, ml: 0.8, mr: -1 }}>
            <SearchAutocomplete />
          </Box>

          {/* Drawer */}
          <Drawer
            anchor="left"
            open={drawerOpen}
            elevation={0}
            onClose={handleDrawerClose}
            PaperProps={{
              sx: {
                width: {
                  xs: "100%",
                  sm: "100%",
                  md: 260,
                  lg: 260,
                  xl: 260,
                },
                zIndex: 1600,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                bgcolor: theme.palette.background.paper,
              },
            }}
          >
            <Box
              sx={{
                width: {
                  xs: "100%",
                  sm: "100%",
                  md: 260,
                  lg: 260,
                  xl: 260,
                },
                height: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {/* Close button - only visible on mobile/tablet */}
              <IconButton
                onClick={handleDrawerClose}
                sx={{
                  position: "absolute",
                  right: 8,
                  top: 8,
                  zIndex: 1700,
                  color: "text.secondary",
                  display: {
                    xs: "flex",
                    sm: "flex",
                    md: "none",
                  },
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
                size="small"
              >
                <CloseIcon fontSize="small" />
              </IconButton>

              {/* Conditional content: either main view or settings view */}
              {!settingsOpen ? (
                /* Main Navigation View */
                <>
                  {/* Logo */}
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
                  </Box>

                  {/* Hero Text Section */}
                  <Box
                    sx={{
                      px: { xs: 2, sm: 2, md: 2.5 },
                      py: { xs: 2, sm: 2, md: 2.5 },
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 600,
                        fontSize: {
                          xs: "1.1rem",
                          sm: "1.2rem",
                          md: "1.3rem",
                        },
                        mb: 1,
                        color: "text.primary",
                      }}
                    >
                      {t("Explore_tech_in_Moldova")}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: {
                          xs: "0.8rem",
                          sm: "0.85rem",
                          md: "0.9rem",
                        },
                        color: "text.secondary",
                        lineHeight: 1.4,
                      }}
                    >
                      {t("Discover_the_best_offers_for_your_favorite_products")}
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
                                height: {
                                  xs: 44,
                                  sm: 44,
                                  md: 48,
                                  lg: 48,
                                  xl: 52,
                                },
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
                                sx={{
                                  m: 0,
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              />
                            </ListItemButton>
                          </ListItem>

                          {link.path === "/products" && (
                            <Divider sx={{ mx: 2 }} />
                          )}
                          {link.path === "/about" && <Divider sx={{ mx: 2 }} />}
                        </React.Fragment>
                      );
                    })}

                    {/* Settings button */}
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={handleSettingsToggle}
                        sx={{
                          py: 0,
                          px: { xs: 1.5, sm: 1.5, md: 2 },
                          display: "flex",
                          alignItems: "center",
                          height: { xs: 44, sm: 44, md: 48, lg: 48, xl: 52 },
                          bgcolor: settingsOpen
                            ? "action.selected"
                            : "transparent",
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
                  </List>

                  {/* Footer */}
                  <Box sx={{ mt: "auto" }}>
                    <Footer onItemClick={() => setDrawerOpen(false)} />
                  </Box>
                </>
              ) : (
                /* Settings View - takes full height */
                <SettingsView onClose={handleSettingsClose} />
              )}
            </Box>
          </Drawer>
        </Toolbar>
      </AppBar>
    </>
  );
};

export default Header;
