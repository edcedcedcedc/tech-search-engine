import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Divider,
  IconButton,
} from "@mui/material";

import NavigateNextOutlinedIcon from "@mui/icons-material/NavigateNextOutlined";
import NavigateBeforeOutlinedIcon from "@mui/icons-material/NavigateBeforeOutlined";
import {
  ManageSearchOutlined as ManageSearchOutlinedIcon,
  BusinessCenterOutlined as ServicesOutlinedIcon,
} from "@mui/icons-material";
import QuestionMarkOutlinedIcon from "@mui/icons-material/QuestionMarkOutlined";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useStore } from "../store/store";
import { NavIcon } from "./NavIcons";

const ICON_SIZE = 22;
const iconSx = { fontSize: ICON_SIZE };

const VerticalHeader: React.FC = () => {
  const { t } = useTranslation();

  const location = useLocation();
  const isOnProductsPage = location.pathname.startsWith("/products");

  const aggregatedProducts = useStore((s) => s.aggregatedProducts);
  const currentPage = useStore((s) => s.currentPage);
  const totalPages = useStore((s) => s.totalPages);
  const searchProducts = useStore((s) => s.searchProducts);
  const isLoading = useStore((s) => s.isLoading);

  const lang = "en"; // or get from i18n

  const isProductsDisabled = aggregatedProducts.length === 0;

  const handlePrev = () => {
    if (currentPage > 1 && !isLoading)
      searchProducts(undefined, lang, currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages && !isLoading)
      searchProducts(undefined, lang, currentPage + 1);
  };

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
      {/* Top buttons */}
      <Box
        sx={{
          display: {
            xs: "flex",
            xl: "none",
          },
          flexDirection: "column",
          alignItems: "center",
          py: 1,
        }}
      >
        <IconButton
          size="small"
          onClick={handlePrev}
          disabled={!isOnProductsPage || currentPage <= 1 || isLoading}
        >
          <NavigateBeforeOutlinedIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          onClick={handleNext}
          disabled={!isOnProductsPage || currentPage >= totalPages || isLoading}
        >
          <NavigateNextOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Nav links */}
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
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      px: 0,
                      py: 0,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40,
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
                  <Divider sx={{ mx: 2 }} />
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
