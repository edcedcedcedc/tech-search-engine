import { createTheme, responsiveFontSizes } from "@mui/material/styles";

const getTheme = (mode: "light" | "dark") => {
  let theme = createTheme({
    palette: {
      mode,
      primary: {
        light: "#287bf7ff",
        main: "#2574ebff",
        dark: "#1a3a8a",
        contrastText: "#ffffff",
      },
      secondary: {
        light: "#2fae7f",
        main: "#10b981",
        dark: "#047857",
        contrastText: "#ffffff",
      },
      error: {
        light: "#f87171",
        main: "#ef4444",
        dark: "#991b1b",
        contrastText: "#ffffff",
      },
      warning: {
        light: "#fbbf24",
        main: "#f59e0b",
        dark: "#b45309",
        contrastText: "#000",
      },
      info: {
        light: "#65c7f8",
        main: "#38bdf8",
        dark: "#0369a1",
        contrastText: "#ffffff",
      },
      success: {
        light: "#86efac",
        main: "#22c55e",
        dark: "#15803d",
        contrastText: "#ffffff",
      },
      background: {
        default: mode === "dark" ? "#0d1117" : "#fafafa",
        paper: mode === "dark" ? "#161b22" : "#ffffff",
      },
      text: {
        primary: mode === "dark" ? "#c9d1d9" : "rgba(0,0,0,0.87)",
        secondary: mode === "dark" ? "#8b949e" : "rgba(0,0,0,0.65)",
        disabled: mode === "dark" ? "#6e7681" : "rgba(0,0,0,0.38)",
      },
      divider:
        mode === "dark"
          ? "rgba(255, 255, 255, 0.02)"
          : "rgba(0, 0, 0, 0.11)",
      contrastThreshold: 4.5,
      tonalOffset: 0.2,
    },

    breakpoints: {
      values: { xs: 0, sm: 375, md: 425, lg: 768, xl: 1024, xxl: 1440 },
    },

    typography: {
    fontFamily: "Roboto, Arial, sans-serif",

    h1: {
      fontWeight: 700,
      lineHeight: 1.3,
      fontSize: "1.35rem", // 1.5 * 0.9
      "@media (min-width:375px)": { fontSize: "1.575rem" },
      "@media (min-width:425px)": { fontSize: "1.71rem" },
      "@media (min-width:768px)": { fontSize: "2.025rem" },
      "@media (min-width:1024px)": { fontSize: "2.25rem" },
      "@media (min-width:1440px)": { fontSize: "2.7rem" },
    },

    h2: {
      fontWeight: 700,
      lineHeight: 1.3,
      fontSize: "1.215rem",
      "@media (min-width:375px)": { fontSize: "1.35rem" },
      "@media (min-width:425px)": { fontSize: "1.44rem" },
      "@media (min-width:768px)": { fontSize: "1.71rem" },
      "@media (min-width:1024px)": { fontSize: "1.89rem" },
      "@media (min-width:1440px)": { fontSize: "2.25rem" },
    },

    h3: {
      fontWeight: 600,
      lineHeight: 1.3,
      fontSize: "1.08rem",
      "@media (min-width:375px)": { fontSize: "1.215rem" },
      "@media (min-width:425px)": { fontSize: "1.305rem" },
      "@media (min-width:768px)": { fontSize: "1.44rem" },
      "@media (min-width:1024px)": { fontSize: "1.62rem" },
      "@media (min-width:1440px)": { fontSize: "1.8rem" },
    },

    h4: {
      fontWeight: 600,
      lineHeight: 1.3,
      fontSize: "0.99rem",
      "@media (min-width:375px)": { fontSize: "1.08rem" },
      "@media (min-width:425px)": { fontSize: "1.17rem" },
      "@media (min-width:768px)": { fontSize: "1.305rem" },
      "@media (min-width:1024px)": { fontSize: "1.44rem" },
      "@media (min-width:1440px)": { fontSize: "1.575rem" },
    },

    h5: {
      fontWeight: 600,
      lineHeight: 1.3,
      fontSize: "0.855rem",
      "@media (min-width:375px)": { fontSize: "0.9rem" },
      "@media (min-width:425px)": { fontSize: "0.945rem" },
      "@media (min-width:768px)": { fontSize: "0.99rem" },
      "@media (min-width:1024px)": { fontSize: "1.08rem" },
      "@media (min-width:1440px)": { fontSize: "1.17rem" },
    },

    h6: {
      fontWeight: 400,
      lineHeight: 1.4,
      fontSize: "0.585rem",
      "@media (min-width:375px)": { fontSize: "0.72rem" },
      "@media (min-width:425px)": { fontSize: "0.765rem" },
      "@media (min-width:768px)": { fontSize: "0.855rem" },
      "@media (min-width:1024px)": { fontSize: "0.9rem" },
      "@media (min-width:1440px)": { fontSize: "0.99rem" },
    },

    body1: {
      fontSize: "0.7875rem",
      "@media (min-width:375px)": { fontSize: "0.81rem" },
      "@media (min-width:425px)": { fontSize: "0.855rem" },
      "@media (min-width:768px)": { fontSize: "0.9rem" },
      "@media (min-width:1024px)": { fontSize: "0.945rem" },
      "@media (min-width:1440px)": { fontSize: "0.99rem" },
    },

    body2: {
      fontSize: "0.675rem",
      "@media (min-width:375px)": { fontSize: "0.72rem" },
      "@media (min-width:425px)": { fontSize: "0.765rem" },
      "@media (min-width:768px)": { fontSize: "0.81rem" },
      "@media (min-width:1024px)": { fontSize: "0.855rem" },
      "@media (min-width:1440px)": { fontSize: "0.9rem" },
    },

    button: {
      textTransform: "none",
      fontSize: "0.7875rem",
      "@media (min-width:375px)": { fontSize: "0.81rem" },
      "@media (min-width:425px)": { fontSize: "0.855rem" },
      "@media (min-width:768px)": { fontSize: "0.9rem" },
      "@media (min-width:1024px)": { fontSize: "0.945rem" },
      "@media (min-width:1440px)": { fontSize: "0.99rem" },
    },
  },
    spacing: 8,
    shape: { borderRadius: 4 },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            WebkitTapHighlightColor: "transparent",
            overscrollBehaviorY: "contain",
            transition: "background-color 0.25s ease, color 0.25s ease",
          },
        },
      },
      MuiButton: { defaultProps: { disableRipple: false, size: "medium" }, styleOverrides: { root: { minHeight: 40 } } },
      MuiCard: { defaultProps: { elevation: 1 } },
      MuiPaper: { defaultProps: { elevation: 1 } },
      MuiContainer: { defaultProps: { maxWidth: "md", disableGutters: false }, styleOverrides: { root: { paddingLeft: 16, paddingRight: 16 } } },
      MuiTypography: { defaultProps: { color: "text.primary" } },
    },
  });

  return responsiveFontSizes(theme);
};

export default getTheme;
