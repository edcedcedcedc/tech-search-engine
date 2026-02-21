import React from "react";
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  useTheme,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import ManageSearchOutlined from "@mui/icons-material/ManageSearchOutlined";
import { CategoryOutlined, SearchOutlined } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { BusinessCenterOutlined as ServicesOutlinedIcon } from "@mui/icons-material";
import QuestionMarkOutlinedIcon from "@mui/icons-material/QuestionMarkOutlined";

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { t } = useTranslation();

  const isPWA = React.useMemo(
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true,
    [],
  );

  const [_isSafari, setIsSafari] = React.useState(false);

  React.useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isSafari =
      /safari/.test(ua) &&
      !/chrome|chromium|crios/.test(ua) &&
      !/android/.test(ua);

    const isiOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    setIsSafari(isSafari || isiOS);
    console.log("Safari/iOS detected:", isSafari || isiOS);
  }, []);

  React.useEffect(() => {}, [t]);

  // Create icon wrapper to ensure perfect alignment
  const IconWrapper = ({ children }: { children: React.ReactNode }) => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: isPWA ? 28 : 24,
        width: isPWA ? 28 : 24,
        mt: 0,
        pt: 0,
        "& svg": {
          fontSize: isPWA ? 28 : 24,
          display: "block",
        },
      }}
    >
      {children}
    </Box>
  );

  const navItems = [
    {
      label: t("Search_Tooltip"),
      value: "/",
      icon: (
        <IconWrapper>
          <SearchOutlined />
        </IconWrapper>
      ),
    },
    {
      label: t("Products"),
      value: "/products",
      icon: (
        <IconWrapper>
          <CategoryOutlined />
        </IconWrapper>
      ),
    },
    {
      label: t("How_To"),
      value: "/faq",
      icon: (
        <IconWrapper>
          <QuestionMarkOutlinedIcon />
        </IconWrapper>
      ),
    },
    {
      label: t("Services"),
      value: "/services",
      icon: (
        <IconWrapper>
          <ServicesOutlinedIcon />
        </IconWrapper>
      ),
    },
  ];

  React.useEffect(() => {
    // Create a style element
    const style = document.createElement("style");
    style.innerHTML = `
    .MuiSvgIcon-root.MuiSvgIcon-fontSizeMedium.css-1umw9bq-MuiSvgIcon-root {
      margin-top: 0 !important;
      padding-top: 0 !important;
    }
  `;
    document.head.appendChild(style);

    // Cleanup
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <Box
      className="liquidGlass-wrapper"
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
        pb: isPWA ? "env(safe-area-inset-bottom)" : 0,
        fontWeight: 600,
        overflow: "hidden",
        color: theme.palette.mode === "dark" ? "white" : "black",
        // Remove boxShadow
        // boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.1)",
        transition: "all 0.3s ease",
        bgcolor: theme.palette.background.paper,
        // Add thin border on top using divider color
        borderTop: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box
        className="liquidGlass-effect"
        sx={{
          position: "absolute",
          zIndex: 0,
          inset: 0,
          filter: "url(#glass-distortion)",
          overflow: "hidden",
          isolation: "isolate",
          pointerEvents: "none",
        }}
      />

      <Box
        className="liquidGlass-text"
        sx={{
          position: "relative",
          zIndex: 3,
          width: "100%",
        }}
      >
        <BottomNavigation
          value={location.pathname}
          onChange={(_, newValue) => {
            navigate(newValue);
          }}
          showLabels
          sx={{
            height: isPWA ? 80 : 54, // 64px - 10px = 54px (15px smaller would be 49px, but 54px is 10px smaller)
            background: "transparent",
            "& .MuiBottomNavigationAction-root": {
              minWidth: isPWA ? 80 : 54,
              py: 0,
              color: theme.palette.mode === "dark" ? "white" : "black",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              alignItems: "center",
              pt: 1,

              "&.Mui-selected": {
                color: theme.palette.primary.main,
                "& .MuiSvgIcon-root": {
                  color: `${theme.palette.primary.main} !important`,
                },
                "& .MuiBottomNavigationAction-label": {
                  color: `${
                    theme.palette.mode === "dark" ? "white" : "black"
                  } !important`,
                  fontWeight: "500 !important",
                },
              },

              "& .MuiTouchRipple-root": {
                display: "none",
              },

              // Target all icons with these classes
              "& .MuiSvgIcon-root.MuiSvgIcon-fontSizeMedium": {
                marginTop: "0 !important",
                paddingTop: "0 !important",
              },

              // Even more specific with the hash class
              "& .css-1umw9bq-MuiSvgIcon-root": {
                marginTop: "0 !important",
                paddingTop: "0 !important",
              },

              "& .MuiSvgIcon-root": {
                fontSize: isPWA ? 28 : 22, // Just a little smaller: 24 -> 22
                mb: 0.25,
              },

              "& .MuiBottomNavigationAction-label": {
                fontSize: isPWA ? "0.7rem" : "0.65rem", // Keep label same size
                fontWeight: "500 !important",
                mt: 0,
                mb: 0,
                lineHeight: 1.2,
                color: `${
                  theme.palette.mode === "dark" ? "white" : "black"
                } !important`,
                transition: "none !important",
              },
            },
          }}
        >
          {navItems.map((item) => (
            <BottomNavigationAction
              key={item.value}
              label={item.label}
              value={item.value}
              icon={item.icon}
            />
          ))}
        </BottomNavigation>
      </Box>
    </Box>
  );
};

export default MobileBottomNav;
