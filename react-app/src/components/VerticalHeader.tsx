import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  useTheme,
  useMediaQuery,
  Divider,
} from "@mui/material";

import {
  ManageSearchOutlined as ManageSearchOutlinedIcon,
  HelpOutlined as HelpOutlinedIcon,
  ContactMail as ContactMailIcon,
  BusinessCenterOutlined as ServicesOutlinedIcon,
  InfoOutline,
} from "@mui/icons-material";
import QuestionMarkOutlinedIcon from "@mui/icons-material/QuestionMarkOutlined";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useStore, useThemeStore } from "../store/store";
import InfoIcon from "@mui/icons-material/Info";
import { NavIcon } from "./NavIcons";

const ICON_SIZE = 22;
const iconSx = { fontSize: ICON_SIZE };

const VerticalHeader: React.FC = () => {
  const { t, i18n } = useTranslation();

  const aggregatedProducts = useStore((s) => s.aggregatedProducts);
  const isProductsDisabled = aggregatedProducts.length === 0;
  const isOffline = useStore((s) => s.isOffline);
  const navLinks = [
    {
      path: "/products",
      label: t("Manage_Products"),
      icon: (
        <NavIcon>
          <ManageSearchOutlinedIcon sx={iconSx} />
        </NavIcon>
      ),
    },
    {
      path: "/about",
      label: t("About"),
      icon: (
        <NavIcon>
          <QuestionMarkOutlinedIcon sx={iconSx} />
        </NavIcon>
      ),
    },
    /*  {
      path: "/contact",
      label: t("Contact"),
      icon: (
        <NavIcon>
          <ContactMailIcon sx={iconSx} />
        </NavIcon>
      ),
    }, */
    {
      path: "/services",
      label: t("Services"),
      icon: (
        <NavIcon>
          <ServicesOutlinedIcon sx={iconSx} />
        </NavIcon>
      ),
    },
  ];

  return (
    <Box
      component="nav"
      role="navigation"
      sx={{
        width: 64,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRight: 1,
        borderColor: "divider",
        bgcolor: "background.default",
        flexShrink: 0,
        overflowY: "auto",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <List disablePadding sx={{ flex: 1 }}>
          {navLinks.map((link) => {
            const disabled = link.path === "/products" && isProductsDisabled;

            return (
              <React.Fragment key={link.path}>
                <ListItem disablePadding>
                  <ListItemButton
                    component={!disabled ? RouterLink : "div"}
                    to={!disabled ? link.path : undefined}
                    disabled={disabled}
                    sx={{
                      minHeight: 60,
                      height: 60,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      px: 0,
                      py: 0,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40, // Match Header fixed width
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",

                        color: disabled ? "text.disabled" : "text.secondary",
                      }}
                    >
                      {link.icon}
                    </ListItemIcon>
                  </ListItemButton>
                </ListItem>
                {(link.path === "/products" || link.path === "/about") && (
                  <Divider sx={{ mx: 2 }} /> // Add horizontal margin to match Header
                )}
              </React.Fragment>
            );
          })}
        </List>
      </Box>
    </Box>
  );
};

export default VerticalHeader;
