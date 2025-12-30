import { createTheme, responsiveFontSizes } from "@mui/material/styles";

const getTheme = (mode: "light" | "dark") => {
  const isDark = mode === "dark";
  const theme = createTheme({
    palette: {
      mode,

      primary: {
        light: "#E5E5E5",
        main: "#FFFFFF",
        dark: "#A1A1AA",
        contrastText: "#000000",
      },

      secondary: {
        light: "#71717A",
        main: "#52525B",
        dark: "#3F3F46",
        contrastText: "#FFFFFF",
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
        default: isDark ? "#09090B" : "#f8f8f8", // app root
        muted: isDark ? "#0D0D10" : "#ffffff", // header / footer
        paper: isDark ? "#111113" : "#ffffff", // modals / drawers
      },

      text: {
        primary: isDark ? "#e5e7eb" : "rgba(0,0,0,0.87)",
        secondary: isDark ? "#9ca3af" : "rgba(0,0,0,0.65)",
        disabled: isDark ? "#6b7280" : "rgba(0,0,0,0.38)",
      },

      card: {
        background: isDark ? "#0F0F11" : "#ffffff",
      },

      states: {
        hover: {
          border: isDark ? "#343434" : "#b0b0b0",
          background: isDark ? "#ffffff0a" : "#f8f8f8",
        },
      },

      divider: isDark ? "#232325" : "rgba(0,0,0,0.08)",

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
        defaultProps: {
          disableRipple: false,
          size: "medium",
        },
        styleOverrides: {
          root: ({ theme }) => ({
            minHeight: 36,
            textTransform: "none",
            borderRadius: theme.shape.borderRadius,
            fontWeight: 500,
          }),
        },
        variants: [
          {
            props: { variant: "outlined", size: "small" },
            style: ({ theme }) => ({
              color: theme.palette.text.primary,
              borderColor: theme.palette.divider,
              backgroundColor: "transparent",

              "&:hover": {
                borderColor: theme.palette.states.hover.border,
                backgroundColor: theme.palette.states.hover.background,
              },
            }),
          },
        ],
      },

      MuiCard: {
        defaultProps: { elevation: 1 },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.card.background,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius,
            backgroundImage: "none",
          }),
        },
      },
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
