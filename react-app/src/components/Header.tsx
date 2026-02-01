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
  ListItemIcon,
} from "@mui/material";
import {
  HomeOutlined as HomeOutlinedIcon,
  ManageSearchOutlined as ManageSearchOutlinedIcon,
  InfoOutlined as InfoOutlinedIcon,
  ContactMail as ContactMailIcon,
  GavelOutlined as GavelOutlinedIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  PrivacyTipOutlined as PrivacyTipOutlinedIcon,
  SourceOutlined as SourceOutlinedIcon,
  MenuOutlined as MenuOutlinedIcon,
  TranslateOutlined as TranslateOutlinedIcon,
  LightModeOutlined as LightModeOutlinedIcon,
  DarkModeOutlined as DarkModeOutlinedIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LANGAUGES, type LanguagesCodes } from "../i18n/languages";
import { useStore } from "../store/store";
import GrapeIcon from "../components/Icon";

const Header: React.FC = () => {
  const theme = useTheme();
  const mode = useStore((s) => s.mode);
  const toggleMode = useStore((s) => s.toggleMode);
  const { t, i18n } = useTranslation();

  // Mobile layout for widths <= 425px (including exactly 425px)
  const isMobile = useMediaQuery(`(max-width:425px)`);

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [langMenuAnchor, setLangMenuAnchor] =
    React.useState<null | HTMLElement>(null);

  const aggregatedProducts = useStore((s) => s.aggregatedProducts);
  const isProductsDisabled = aggregatedProducts.length === 0;

  const navLinks = [
    { path: "/", label: t("Home"), icon: <HomeOutlinedIcon /> },
    {
      path: "/products",
      label: t("Manage_Products"),
      icon: <ManageSearchOutlinedIcon />,
    },
    { path: "/about", label: t("About"), icon: <InfoOutlinedIcon /> },
    { path: "/contact", label: t("Contact"), icon: <ContactMailIcon /> },
    {
      path: "/disclaimer",
      label: t("Responsibility_Statement"),
      icon: <GavelOutlinedIcon />,
    },
    {
      path: "/terms-of-use",
      label: t("Terms_and_conditions"),
      icon: <DescriptionOutlinedIcon />,
    },
    {
      path: "/privacy-policy",
      label: t("Privacy_Policy"),
      icon: <PrivacyTipOutlinedIcon />,
    },
    { path: "/source", label: t("Sources"), icon: <SourceOutlinedIcon /> },
  ];

  const handleLangMenuOpen = (event: React.MouseEvent<HTMLElement>) =>
    setLangMenuAnchor(event.currentTarget);
  const handleLangMenuClose = () => setLangMenuAnchor(null);
  const handleLangChange = (lang: LanguagesCodes) => {
    i18n.changeLanguage(lang);
    handleLangMenuClose();
  };

  const handleLogoClick = () => {
    // Reset logic if needed
  };

  const iconButtonSx = { color: "text.secondary" };

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{ width: "100%", bgcolor: theme.palette.background.paper }}
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

        {/* Desktop navigation (width > 425px) */}
        {!isMobile && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={toggleMode} sx={iconButtonSx}>
              {mode === "dark" ? (
                <LightModeOutlinedIcon />
              ) : (
                <DarkModeOutlinedIcon />
              )}
            </IconButton>

            <IconButton component={RouterLink} to="/about" sx={iconButtonSx}>
              <InfoOutlinedIcon />
            </IconButton>
            <IconButton
              component={RouterLink}
              to="/products"
              sx={iconButtonSx}
              disabled={isProductsDisabled}
            >
              <ManageSearchOutlinedIcon />
            </IconButton>
            <IconButton component={RouterLink} to="/" sx={iconButtonSx}>
              <HomeOutlinedIcon />
            </IconButton>

            <IconButton onClick={handleLangMenuOpen} sx={iconButtonSx}>
              <TranslateOutlinedIcon />
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

        {/* Mobile navigation (320px–425px inclusive) */}
        {isMobile && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Theme toggle */}
            <IconButton onClick={toggleMode} sx={iconButtonSx}>
              {mode === "dark" ? (
                <LightModeOutlinedIcon />
              ) : (
                <DarkModeOutlinedIcon />
              )}
            </IconButton>

            {/* Language */}
            <IconButton onClick={handleLangMenuOpen} sx={iconButtonSx}>
              <TranslateOutlinedIcon />
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

            {/* Drawer toggle */}
            <IconButton
              edge="end"
              sx={iconButtonSx}
              onClick={() => setDrawerOpen(true)}
            >
              <MenuOutlinedIcon />
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
                          if (link.path === "/") handleLogoClick();
                        }}
                      >
                        <ListItemIcon
                          sx={{ minWidth: 36, color: "text.secondary" }}
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
