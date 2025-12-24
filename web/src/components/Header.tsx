// src/components/Header.tsx
import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  useTheme,
  Select,
  MenuItem,
  type SelectChangeEvent,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LANGAUGES, type LanguagesCodes } from "../i18n/languages";

const Header: React.FC = () => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  const navLinks = [
    { path: "/", label: t("Home") },
    { path: "/about", label: t("About") },
    { path: "/contact", label: t("Contact") },
  ];

  const handleChange = (event: SelectChangeEvent) => {
    const lang = event.target.value as LanguagesCodes;
    i18n.changeLanguage(lang);
  };

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Button component={RouterLink} to="/" color="inherit">
          <Typography variant="h5" color="primary">
            9999
          </Typography>
        </Button>
        <div className="flex justify-center items-center gap-4">
          <Select
            labelId="language-selector"
            id="language-selector"
            value={i18n.language}
            label={t("Select_Language")}
            variant="standard"
            onChange={handleChange}
            className="m-0 p-0"
            size="small"
          >
            {(Object.keys(LANGAUGES) as LanguagesCodes[]).map((lang) => (
              <MenuItem value={LANGAUGES[lang].value}>
                {LANGAUGES[lang].label}
              </MenuItem>
            ))}
          </Select>
          <Box>
            {navLinks.map((btn) => (
              <Button
                key={btn.path}
                component={RouterLink}
                to={btn.path}
                color="inherit"
                sx={{ color: theme.palette.text.primary }} // use theme text
              >
                {btn.label}
              </Button>
            ))}
          </Box>
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
