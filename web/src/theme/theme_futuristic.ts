import { createTheme, responsiveFontSizes } from "@mui/material/styles";

const getTheme = (mode: "light" | "dark") => {
  let theme = createTheme({
    palette: {
      mode,

      primary: {
        main: "#00e5ff", // nano cyan
        light: "#5df2ff",
        dark: "#00b2cc",
        contrastText: "#001014",
      },

      secondary: {
        main: "#8b5cf6", // quantum violet
        light: "#a78bfa",
        dark: "#6d28d9",
        contrastText: "#0b051f",
      },

      background: {
        default: mode === "dark" ? "#05060a" : "#f8fafc",
        paper: mode === "dark" ? "#0a0d14" : "#ffffff",
      },

      text: {
        primary: mode === "dark" ? "#e5f7ff" : "#020617",
        secondary: mode === "dark" ? "#7dd3fc" : "#475569",
        disabled: mode === "dark" ? "#64748b" : "#94a3b8",
      },

      divider:
        mode === "dark"
          ? "rgba(125,211,252,0.08)"
          : "rgba(2,6,23,0.08)",

      error: {
        main: "#ff4d6d",
      },

      warning: {
        main: "#facc15",
      },

      success: {
        main: "#00ffa3",
      },

      info: {
        main: "#38bdf8",
      },

      contrastThreshold: 4.5,
      tonalOffset: 0.12,
    },

    typography: {
      fontFamily:
        "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",

      h1: { fontWeight: 800, letterSpacing: "-0.03em" },
      h2: { fontWeight: 800, letterSpacing: "-0.03em" },
      h3: { fontWeight: 700 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },

      body1: {
        lineHeight: 1.65,
      },

      body2: {
        lineHeight: 1.6,
      },

      button: {
        textTransform: "none",
        fontWeight: 600,
        letterSpacing: "0.02em",
      },
    },

    shape: {
      borderRadius: 3, // sharper, technical
    },


    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            WebkitTapHighlightColor: "transparent",
            backgroundImage:
              mode === "dark"
                ? "radial-gradient(1000px 500px at 50% -20%, rgba(0,229,255,0.06), transparent 60%)"
                : "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
            transition: "background-color 0.25s ease, color 0.25s ease",
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border:
              mode === "dark"
                ? "1px solid rgba(125,211,252,0.08)"
                : "1px solid rgba(2,6,23,0.06)",
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            border:
              mode === "dark"
                ? "1px solid rgba(125,211,252,0.1)"
                : "1px solid rgba(2,6,23,0.06)",
          },
        },
      },

      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 3,
          },
          containedPrimary: {
            boxShadow:
              mode === "dark"
                ? "0 0 0 1px rgba(0,229,255,0.4)"
                : "none",
          },
        },
      },

      MuiAppBar: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderBottom:
              mode === "dark"
                ? "1px solid rgba(125,211,252,0.08)"
                : "1px solid rgba(2,6,23,0.08)",
          },
        },
      },

      MuiTypography: {
        defaultProps: {
          color: "text.primary",
        },
      },
    },
  });

  return responsiveFontSizes(theme);
};

export default getTheme;
