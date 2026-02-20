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
  Collapse,
  Link,
} from "@mui/material";
import { Close as CloseIcon, ListAltOutlined } from "@mui/icons-material";
import {
  MenuOutlined as MenuOutlinedIcon,
  SettingsOutlined as SettingsOutlinedIcon,
  InfoOutline,
} from "@mui/icons-material";
/* import { Link as RouterLink } from "react-router-dom"; */
import { useTranslation } from "react-i18next";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import { useStore } from "../store/store";
import GrapeIcon from "./GrapeIcon";
import Footer from "./Footer";
import { NavIcon } from "./NavIcons";
import SettingsView from "./SettingsView";
import PrivacyPolicyMobile from "../views/mobile/PrivacyPolicy";
import TermsOfUseMobile from "../views/mobile/TermsOfUse";
import DisclaimerMobile from "../views/mobile/Disclaimer";

const ICON_SIZE = 22;
const iconSx = { fontSize: ICON_SIZE };

const Header: React.FC = () => {
  const theme = useTheme();
  const drawerOpen = useStore((s) => s.drawerOpen);
  const setDrawerOpen = useStore((s) => s.setDrawerOpen);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const [sourcesExpanded, setSourcesExpanded] = React.useState(false);
  const [aboutExpanded, setAboutExpanded] = React.useState(false);
  const [contactExpanded, setContactExpanded] = React.useState(false);
  const [privacyOpen, setPrivacyOpen] = React.useState(false);
  const [termsOpen, setTermsOpen] = React.useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = React.useState(false);
  const { t, i18n } = useTranslation(); // Make sure to get i18n
  /*   const aggregatedProducts = useStore((s) => s.aggregatedProducts); */
  /*   const isProductsDisabled = aggregatedProducts.length === 0; */

  console.log(
    "[Header] Render - drawerOpen:",
    drawerOpen,
    "settingsOpen:",
    settingsOpen,
    "sourcesExpanded:",
    sourcesExpanded,
    "aboutExpanded:",
    aboutExpanded,
    "contactExpanded:",
    contactExpanded,
    "privacyOpen:",
    privacyOpen,
    "termsOpen:",
    termsOpen,
    "disclaimerOpen:",
    disclaimerOpen,
  );

  // Add PWA detection
  const isPWA = React.useMemo(
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true,
    [],
  );

  const handleSettingsToggle = () => {
    console.log(
      "[Header] Toggling settings from",
      settingsOpen,
      "to",
      !settingsOpen,
    );
    setSettingsOpen(!settingsOpen);
    // Close all expanded sections and views when opening settings
    setSourcesExpanded(false);
    setAboutExpanded(false);
    setContactExpanded(false);
    setPrivacyOpen(false);
    setTermsOpen(false);
    setDisclaimerOpen(false);
  };

  const handleSettingsClose = () => {
    console.log("[Header] Closing settings");
    setSettingsOpen(false);
  };

  const handleSourcesToggle = () => {
    console.log(
      "[Header] Toggling sources from",
      sourcesExpanded,
      "to",
      !sourcesExpanded,
    );
    setSourcesExpanded(!sourcesExpanded);
    // Close settings and other views
    setSettingsOpen(false);
    setPrivacyOpen(false);
    setTermsOpen(false);
    setDisclaimerOpen(false);
  };

  const handleAboutToggle = () => {
    console.log(
      "[Header] Toggling about from",
      aboutExpanded,
      "to",
      !aboutExpanded,
    );
    setAboutExpanded(!aboutExpanded);
    // Close settings and other views
    setSettingsOpen(false);
    setPrivacyOpen(false);
    setTermsOpen(false);
    setDisclaimerOpen(false);
  };

  const handleContactToggle = () => {
    console.log(
      "[Header] Toggling contact from",
      contactExpanded,
      "to",
      !contactExpanded,
    );
    setContactExpanded(!contactExpanded);
    // Close settings and other views
    setSettingsOpen(false);
    setPrivacyOpen(false);
    setTermsOpen(false);
    setDisclaimerOpen(false);
  };

  const handlePrivacyToggle = () => {
    console.log("[Header] Opening privacy policy");
    setPrivacyOpen(true);
    setTermsOpen(false);
    setDisclaimerOpen(false);
    setSettingsOpen(false);
    setSourcesExpanded(false);
    setAboutExpanded(false);
    setContactExpanded(false);
  };

  const handlePrivacyClose = () => {
    console.log("[Header] Closing privacy policy");
    setPrivacyOpen(false);
  };

  const handleTermsToggle = () => {
    console.log("[Header] Opening terms of use");
    setTermsOpen(true);
    setPrivacyOpen(false);
    setDisclaimerOpen(false);
    setSettingsOpen(false);
    setSourcesExpanded(false);
    setAboutExpanded(false);
    setContactExpanded(false);
  };

  const handleTermsClose = () => {
    console.log("[Header] Closing terms of use");
    setTermsOpen(false);
  };

  const handleDisclaimerToggle = () => {
    console.log("[Header] Opening disclaimer");
    setDisclaimerOpen(true);
    setPrivacyOpen(false);
    setTermsOpen(false);
    setSettingsOpen(false);
    setSourcesExpanded(false);
    setAboutExpanded(false);
    setContactExpanded(false);
  };

  const handleDisclaimerClose = () => {
    console.log("[Header] Closing disclaimer");
    setDisclaimerOpen(false);
  };

  const handleDrawerClose = () => {
    console.log("[Header] Closing drawer and all views");
    setDrawerOpen(false);
    setSettingsOpen(false);
    setSourcesExpanded(false);
    setAboutExpanded(false);
    setContactExpanded(false);
    setPrivacyOpen(false);
    setTermsOpen(false);
    setDisclaimerOpen(false);
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

          {/* Refresh icon - only in PWA mode - matching menu icon exactly */}
          {isPWA && (
            <Tooltip title={t("Refresh")} enterDelay={500}>
              <IconButton
                sx={{
                  height: 60,
                  width: 60,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: 0,
                  color: "text.primary", // Same color as menu icon
                  ml: "auto", // Push to the right
                }}
                onClick={() => window.location.reload()}
              >
                <NavIcon>
                  <RefreshOutlinedIcon sx={iconSx} />
                </NavIcon>
              </IconButton>
            </Tooltip>
          )}

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
                  md: "100%",
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
                  md: "100%", // Changed from 260 to 100% for md and below
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
                    md: "flex", // Show on md as well since drawer is full width
                    lg: "none",
                  },
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
                size="small"
              >
                <CloseIcon fontSize="small" />
              </IconButton>

              {/* Conditional content */}
              {!settingsOpen &&
              !privacyOpen &&
              !termsOpen &&
              !disclaimerOpen ? (
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

                  {/* Navigation links */}
                  <List
                    disablePadding
                    sx={{
                      flex: 1, // Allow list to take available space
                    }}
                  >
                    {/* Contact button without arrow */}
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={handleContactToggle}
                        sx={{
                          py: 0,
                          px: { xs: 1.5, sm: 1.5, md: 2 },
                          display: "flex",
                          alignItems: "center",
                          height: { xs: 44, sm: 44, md: 48, lg: 48, xl: 52 },
                          bgcolor: contactExpanded
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
                            <ContactPageOutlinedIcon />
                          </NavIcon>
                        </ListItemIcon>
                        <ListItemText
                          primary={t("Contact")}
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

                    {/* Expanded Contact Info */}
                    <Collapse in={contactExpanded} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        <ListItem sx={{ pl: 8, py: 1.5 }}>
                          <Box sx={{ width: "100%" }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              {t("Contact_Intro")}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              {t("Contact_Email_Label")}{" "}
                              <Link
                                href="mailto:contact@price-aggregator.md"
                                sx={{
                                  color: "primary.main",
                                  textDecoration: "none",
                                  "&:hover": {
                                    textDecoration: "underline",
                                  },
                                }}
                              >
                                contact@price-aggregator.md
                              </Link>
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {t("Contact_Platform_Info")}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                mt: 1,
                                display: "block",
                                fontStyle: "italic",
                              }}
                            >
                              {t("Contact_Disclaimer")}
                            </Typography>
                          </Box>
                        </ListItem>
                        <Divider sx={{ mx: 2 }} />
                      </List>
                    </Collapse>

                    {/* About button without arrow */}
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={handleAboutToggle}
                        sx={{
                          py: 0,
                          px: { xs: 1.5, sm: 1.5, md: 2 },
                          display: "flex",
                          alignItems: "center",
                          height: { xs: 44, sm: 44, md: 48, lg: 48, xl: 52 },
                          bgcolor: aboutExpanded
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
                            <InfoOutline sx={iconSx} />
                          </NavIcon>
                        </ListItemIcon>
                        <ListItemText
                          primary={t("About")}
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

                    {/* Expanded About Info */}
                    <Collapse in={aboutExpanded} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        <ListItem sx={{ pl: 8, py: 1.5 }}>
                          <Box sx={{ width: "100%" }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              {t("About_Us_description")}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontStyle: "italic" }}
                            >
                              {t("About_Us_description_secondary")}
                            </Typography>
                          </Box>
                        </ListItem>
                        <Divider sx={{ mx: 2 }} />
                      </List>
                    </Collapse>

                    {/* Sources button without arrow */}
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={handleSourcesToggle}
                        sx={{
                          py: 0,
                          px: { xs: 1.5, sm: 1.5, md: 2 },
                          display: "flex",
                          alignItems: "center",
                          height: { xs: 44, sm: 44, md: 48, lg: 48, xl: 52 },
                          bgcolor: sourcesExpanded
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
                            <ListAltOutlined />
                          </NavIcon>
                        </ListItemIcon>
                        <ListItemText
                          primary={t("Sources")}
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

                    {/* Expanded Sources Info */}
                    <Collapse in={sourcesExpanded} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        <ListItem sx={{ pl: 8, py: 1.5 }}>
                          <Box sx={{ width: "100%" }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              {t("Source_Intro")}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              {t("Source_Example")}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: "block", fontStyle: "italic" }}
                            >
                              {t("Source_Disclaimer")}
                            </Typography>
                          </Box>
                        </ListItem>
                      </List>
                    </Collapse>

                    {/* Divider after Sources */}
                    <Divider sx={{ mx: 2, my: 1 }} />

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

                  {/* Footer - full width until lg */}
                  <Box
                    sx={{
                      mt: "auto",
                      width: "100%", // Ensure full width
                    }}
                  >
                    <Footer
                      onPrivacyClick={handlePrivacyToggle}
                      onTermsClick={handleTermsToggle}
                      onDisclaimerClick={handleDisclaimerToggle}
                      // Add prop to make footer full width until lg
                      fullWidthUntilLg={true}
                    />
                  </Box>
                </>
              ) : settingsOpen ? (
                <SettingsView onClose={handleSettingsClose} />
              ) : privacyOpen ? (
                <PrivacyPolicyMobile onClose={handlePrivacyClose} />
              ) : termsOpen ? (
                <TermsOfUseMobile onClose={handleTermsClose} />
              ) : disclaimerOpen ? (
                <DisclaimerMobile onClose={handleDisclaimerClose} />
              ) : null}
            </Box>
          </Drawer>
        </Toolbar>
      </AppBar>
    </>
  );
};

export default Header;
