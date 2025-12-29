import { createTheme, responsiveFontSizes } from "@mui/material/styles";

const getTheme = (mode: "light" | "dark") => {
  let theme = createTheme({
    palette: {
      mode,

      primary: {
        light: "#6aa9ff",
        main: "#3b82f6",
        dark: "#1e40af",
        contrastText: "#ffffff",
      },

      secondary: {
        light: "#34d399",
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
        light: "#7dd3fc",
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
        default: mode === "dark" ? "#0f172a" : "#fafafa",
        paper: mode === "dark" ? "#111827" : "#ffffff",
      },

      text: {
        primary: mode === "dark" ? "#e5e7eb" : "rgba(0,0,0,0.87)",
        secondary: mode === "dark" ? "#9ca3af" : "rgba(0,0,0,0.65)",
        disabled: mode === "dark" ? "#6b7280" : "rgba(0,0,0,0.38)",
      },

      divider:
        mode === "dark"
          ? "rgba(255,255,255,0.08)"
          : "rgba(0,0,0,0.08)",

      contrastThreshold: 4.5,
      tonalOffset: 0.2,
    },

    typography: {
      fontFamily: "Inter, Arial, sans-serif",

      h1: {
        fontSize: "2rem",
        "@media (min-width:600px)": { fontSize: "2.5rem" },
        "@media (min-width:900px)": { fontSize: "3rem" },
        fontWeight: 700,
      },
      h2: {
        fontSize: "1.75rem",
        "@media (min-width:600px)": { fontSize: "2rem" },
        "@media (min-width:900px)": { fontSize: "2.5rem" },
        fontWeight: 700,
      },
      h3: {
        fontSize: "1.5rem",
        "@media (min-width:600px)": { fontSize: "1.75rem" },
        "@media (min-width:900px)": { fontSize: "2rem" },
        fontWeight: 700,
      },
      h4: {
        fontSize: "1.25rem",
        "@media (min-width:600px)": { fontSize: "1.5rem" },
        "@media (min-width:900px)": { fontSize: "1.75rem" },
        fontWeight: 700,
      },
      h5: {
        fontSize: "1.1rem",
        "@media (min-width:600px)": { fontSize: "1.25rem" },
        "@media (min-width:900px)": { fontSize: "1.5rem" },
        fontWeight: 700,
      },
      h6: {
        fontSize: "1rem",
        "@media (min-width:600px)": { fontSize: "1.1rem" },
        "@media (min-width:900px)": { fontSize: "1.25rem" },
        fontWeight: 700,
      },

      body1: {
        fontSize: "0.875rem",
        "@media (min-width:600px)": { fontSize: "0.95rem" },
        "@media (min-width:900px)": { fontSize: "1rem" },
      },
      body2: {
        fontSize: "0.75rem",
        "@media (min-width:600px)": { fontSize: "0.875rem" },
        "@media (min-width:900px)": { fontSize: "0.9rem" },
      },

      button: {
        fontSize: "0.875rem",
        textTransform: "none",
        "@media (min-width:600px)": { fontSize: "0.95rem" },
        "@media (min-width:900px)": { fontSize: "1rem" },
      },
    },

    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 768,
        lg: 900,
        xl: 1200,
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

      MuiButton: {
        defaultProps: { disableRipple: false, size: "medium" },
        styleOverrides: { root: { minHeight: 40 } },
      },

      MuiCard: { defaultProps: { elevation: 1 } },
      MuiPaper: { defaultProps: { elevation: 1 } },

      MuiContainer: {
        defaultProps: { maxWidth: "md", disableGutters: false },
        styleOverrides: {
          root: {
            paddingLeft: 16,
            paddingRight: 16,
          },
        },
      },

      MuiTypography: {
        defaultProps: { color: "text.primary" },
      },
    },
  });

  return responsiveFontSizes(theme);
};

export default getTheme;
