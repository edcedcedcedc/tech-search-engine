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
  useTheme,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LanguageIcon from "@mui/icons-material/Language";
import InfoIcon from "@mui/icons-material/Info";
import ContactMailIcon from "@mui/icons-material/ContactMail";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LANGAUGES, type LanguagesCodes } from "../i18n/languages";
import { useStore } from "../store/store";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import GrapeIcon from "../components/Icon";
import HomeIcon from "@mui/icons-material/Home";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
const Header: React.FC = () => {
  const theme = useTheme();
  const mode = useStore((s) => s.mode);
  const toggleMode = useStore((s) => s.toggleMode);
  const { t, i18n } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [langMenuAnchor, setLangMenuAnchor] =
    React.useState<null | HTMLElement>(null);

  // Get store actions
  const setQuery = useStore((s) => s.setQuery);
  const clearProducts = useStore((s) => s.clearProducts);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const setTotalPages = useStore((s) => s.setTotalPages);
  const setTotalResults = useStore((s) => s.setTotalResults);
  const clearCache = useStore((s) => s.clearCache); // If you added this to store

  const navLinks = [
    { path: "/", label: t("Home") },
    { path: "/about", label: t("About"), icon: <InfoIcon /> },
    { path: "/contact", label: t("Contact"), icon: <ContactMailIcon /> },
    { path: "/disclaimer", label: t("Responsibility_Statement") },
    { path: "/terms-of-use", label: t("Terms_and_conditions") },
    { path: "/privacy-policy", label: t("Privacy_Policy") },
    { path: "/source", label: t("Sources") },
    { path: "/products", label: t("Manage_Products") },
  ];

  const handleLangMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLangMenuAnchor(event.currentTarget);
  };

  const handleLangMenuClose = () => {
    setLangMenuAnchor(null);
  };

  const handleLangChange = (lang: LanguagesCodes) => {
    i18n.changeLanguage(lang);
    handleLangMenuClose();
  };

  const iconButtonSx = {
    color: "text.secondary",
  };

  // Function to reset everything when clicking logo
  const handleLogoClick = () => {
    /*    setQuery(""); // reset the search query
    clearProducts(); // clear aggregated products
    setCurrentPage(1); // reset to page 1
    setTotalPages(0); // reset total pages
    setTotalResults(0); // reset total results
    clearCache?.(); // clear cache if function exists */
  };

  return (
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
          bgcolor: theme.palette.background.paper,
          width: "100%",
          borderBottom: 1,
          borderColor: "divider",
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        {/* Logo */}
        <Box
          component={RouterLink}
          to="/"
          onClick={handleLogoClick}
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

        {/* Desktop navigation */}
        {!isMobile && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={toggleMode} sx={iconButtonSx}>
              {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>

            {/* About & Contact Icons */}
            <IconButton component={RouterLink} to="/about" sx={iconButtonSx}>
              <InfoIcon />
            </IconButton>
            <IconButton component={RouterLink} to="/products" sx={iconButtonSx}>
              <ManageSearchIcon />
            </IconButton>
            <IconButton component={RouterLink} to="/" sx={iconButtonSx}>
              <HomeIcon />
            </IconButton>

            {/* Language */}
            <IconButton onClick={handleLangMenuOpen} sx={iconButtonSx}>
              <LanguageIcon />
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
          </Box>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton onClick={toggleMode} sx={iconButtonSx}>
              {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>

            {/* Language */}
            <IconButton onClick={handleLangMenuOpen} sx={iconButtonSx}>
              <LanguageIcon />
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

            {/* Drawer */}
            <IconButton
              edge="end"
              sx={iconButtonSx}
              onClick={() => setDrawerOpen(true)}
            >
              <MenuIcon />
            </IconButton>

            <Drawer
              anchor="right"
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
            >
              <Box sx={{ width: 250 }} role="presentation">
                <List>
                  {navLinks.map((link) => (
                    <ListItem key={link.path} disablePadding>
                      <ListItemButton
                        component={RouterLink}
                        to={link.path}
                        onClick={() => {
                          setDrawerOpen(false);
                          // Reset state when navigating home
                          if (link.path === "/") {
                            handleLogoClick();
                          }
                        }}
                      >
                        <ListItemText primary={link.label} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Drawer>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
