import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
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
import { useStore, useLastQueryStore } from "../store/store";
import { NavIcon } from "./NavIcons";
import { uiLog } from "../webhook/client/uiDebug";
import { HeaderComparisonIcon } from "./ComparisonWidget";

const ICON_SIZE = 22;
const iconSx = { fontSize: ICON_SIZE };

const VerticalHeader: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.slice(0, 2);

  const location = useLocation();
  const isOnProductsPage = location.pathname.startsWith("/products");

  const aggregatedProducts = useStore((s) => s.aggregatedProducts);
  const currentPage = useStore((s) => s.currentPage);
  const totalPages = useStore((s) => s.totalPages);
  const searchProducts = useStore((s) => s.searchProducts);
  const isLoading = useStore((s) => s.isLoading);
  const storeQuery = useStore((s) => s.query);

  const isProductsDisabled = aggregatedProducts.length === 0;

  const getQueryToUse = () => {
    const lastQuery = useLastQueryStore.getState().lastQuery;
    return lastQuery || storeQuery || "";
  };

  const handlePrev = () => {
    if (currentPage > 1 && !isLoading) {
      const queryToUse = getQueryToUse();
      uiLog(
        `[VerticalHeader] Prev page - from ${currentPage} to ${currentPage - 1} with query: "${queryToUse}"`,
      );

      if (queryToUse) {
        searchProducts(queryToUse, lang, currentPage - 1);
      } else {
        uiLog(`[VerticalHeader] CRITICAL: No query found for prev page`);
      }
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !isLoading) {
      const queryToUse = getQueryToUse();
      uiLog(
        `[VerticalHeader] Next page - from ${currentPage} to ${currentPage + 1} with query: "${queryToUse}"`,
      );

      if (queryToUse) {
        searchProducts(queryToUse, lang, currentPage + 1);
      } else {
        uiLog(`[VerticalHeader] CRITICAL: No query found for next page`);
      }
    }
  };

  const navLinks = [
    {
      path: "/products",
      label: t("Manage_Products"),
      tooltip: t("Manage_Products_Tooltip"),
      icon: (
        <NavIcon>
          <ManageSearchOutlinedIcon sx={iconSx} />
        </NavIcon>
      ),
    },
    {
      path: "/how-to",
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
      }}
    >
      {/* Top buttons - Only show on products page */}
      {isOnProductsPage && (
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
          <Tooltip
            title={t("Previous_page")}
            placement="right"
            enterDelay={500}
          >
            <span>
              {" "}
              {/* span needed for disabled button tooltip */}
              <IconButton
                size="small"
                onClick={handlePrev}
                disabled={currentPage <= 1 || isLoading}
              >
                <NavigateBeforeOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip
            title={t("Next_page_Tooltip")}
            placement="right"
            enterDelay={500}
          >
            <span>
              {" "}
              {/* span needed for disabled button tooltip */}
              <IconButton
                size="small"
                onClick={handleNext}
                disabled={currentPage >= totalPages || isLoading}
              >
                <NavigateNextOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )}

      {/* Nav links */}
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <List disablePadding sx={{ flex: 1 }}>
          {navLinks.map((link) => {
            const disabled = link.path === "/products" && isProductsDisabled;

            return (
              <React.Fragment key={link.path}>
                <ListItem disablePadding>
                  <Tooltip
                    title={disabled ? t("No_products_available") : link.tooltip}
                    placement="right"
                    enterDelay={500}
                  >
                    <ListItemButton
                      component={!disabled ? RouterLink : "div"}
                      to={!disabled ? link.path : undefined}
                      disabled={disabled}
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
                          color: disabled ? "text.disabled" : "text.secondary",
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
            );
          })}
        </List>
      </Box>
    </Box>
  );
};

export default VerticalHeader;
