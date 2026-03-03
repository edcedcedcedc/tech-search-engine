import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Divider,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  CategoryOutlined,
  SearchOutlined,
  BusinessCenterOutlined as ServicesOutlinedIcon,
} from "@mui/icons-material";
import QuestionMarkOutlinedIcon from "@mui/icons-material/QuestionMarkOutlined";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { NavIcon } from "./NavIcons";

const ICON_SIZE = 22;
const iconSx = { fontSize: ICON_SIZE };

const VerticalHeader: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const navLinks = [
    {
      path: "/",
      label: "",
      tooltip: t("Search_Tooltip"),
      icon: (
        <NavIcon>
          <SearchOutlined sx={iconSx} />
        </NavIcon>
      ),
    },
    {
      path: "/products",
      label: t("Manage_Products"),
      tooltip: t("Manage_Products_Tooltip"),
      icon: (
        <NavIcon>
          <CategoryOutlined sx={iconSx} />
        </NavIcon>
      ),
    },
    {
      path: "/faq",
      label: "",
      tooltip: t("How_to_Tooltip"),
      icon: (
        <NavIcon>
          <QuestionMarkOutlinedIcon sx={iconSx} />
        </NavIcon>
      ),
    },
    {
      path: "/services",
      label: t("Services"),
      tooltip: t("Services"),
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
        bgcolor: "background.default",
        flexShrink: 0,
        overflowY: "auto",
        "&::-webkit-scrollbar": { width: theme.spacing(1) },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: theme.palette.background.default,
          borderRadius: theme.shape.borderRadius,
        },
        "&::-webkit-scrollbar-thumb:hover": {
          backgroundColor: theme.palette.background.default,
        },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        scrollbarWidth: "thin",
        scrollbarColor:
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.2) transparent"
            : "rgba(0,0,0,0.3) transparent",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <List disablePadding sx={{ flex: 1 }}>
          {navLinks.map((link) => (
            <React.Fragment key={link.path}>
              <ListItem disablePadding>
                <Tooltip
                  title={link.tooltip}
                  placement="right"
                  enterDelay={500}
                >
                  <ListItemButton
                    component={RouterLink}
                    to={link.path}
                    sx={{
                      minHeight: 54,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      px: 0,
                      py: 0,
                      ml: 1,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        color: "text.secondary",
                      }}
                    >
                      {link.icon}
                    </ListItemIcon>
                  </ListItemButton>
                </Tooltip>
              </ListItem>
              {(link.path === "/products" || link.path === "/about") && (
                <Divider sx={{ mx: 2, mr: 1 }} />
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>
    </Box>
  );
};

export default VerticalHeader;
