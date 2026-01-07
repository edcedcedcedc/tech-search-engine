import { createTheme, responsiveFontSizes } from "@mui/material/styles";

const getTheme = (mode: "light" | "dark") => {
  let theme = createTheme({
    palette: {
      mode,

      primary: {
        main: "#2f5d50", // deep jade pine
        light: "#4a7a6c",
        dark: "#1e3d35",
        contrastText: "#f5f5f4",
      },

      secondary: {
        main: "#7c3f2c", // aged wood / leather
        light: "#9a5a45",
        dark: "#4b2418",
        contrastText: "#fafaf9",
      },

      background: {
        default:
          mode === "dark"
            ? "#0c1210" // night forest
            : "#f4f3ee", // rice paper
        paper:
          mode === "dark"
            ? "#141b18" // moss shadow
            : "#ffffff",
      },

      text: {
        primary:
          mode === "dark"
            ? "#e7e5df" // parchment
            : "#1c1917", // sumi ink
        secondary:
          mode === "dark"
            ? "#a8a29e"
            : "#57534e",
        disabled:
          mode === "dark"
            ? "#78716c"
            : "#a8a29e",
      },

      divider:
        mode === "dark"
          ? "rgba(231,229,223,0.08)"
          : "rgba(28,25,23,0.08)",

      error: {
        main: "#8f1d14", // blood seal red
      },

      warning: {
        main: "#b45309", // amber fire
      },

      success: {
        main: "#3f7668", // living moss
      },

      info: {
        main: "#64748b", // steel mist
      },

      contrastThreshold: 4.5,
      tonalOffset: 0.15,
    },

    typography: {
      fontFamily:
        '"Noto Serif SC", "Inter", system-ui, -apple-system, serif',

      h1: {
        fontWeight: 700,
        letterSpacing: "-0.02em",
      },
      h2: {
        fontWeight: 700,
        letterSpacing: "-0.02em",
      },
      h3: {
        fontWeight: 600,
      },
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },

      body1: {
        lineHeight: 1.75,
      },

      body2: {
        lineHeight: 1.7,
      },

      button: {
        textTransform: "none",
        fontWeight: 600,
        letterSpacing: "0.03em",
      },
    },

    shape: {
      borderRadius: 2, // sharp discipline
    },

    shadows:
      mode === "light"
        ? Array(25).fill("none")
        : Array(25).fill("none"),

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            WebkitTapHighlightColor: "transparent",
            backgroundImage:
              mode === "dark"
                ? "radial-gradient(1200px 600px at 50% -20%, rgba(63,118,104,0.06), transparent 60%)"
                : "linear-gradient(180deg, #fafaf9 0%, #f1efe9 100%)",
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
                ? "1px solid rgba(231,229,223,0.08)"
                : "1px solid rgba(28,25,23,0.08)",
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            border:
              mode === "dark"
                ? "1px solid rgba(231,229,223,0.12)"
                : "1px solid rgba(28,25,23,0.1)",
          },
        },
      },

      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 2,
          },
          containedPrimary: {
            background:
              mode === "dark"
                ? "linear-gradient(180deg, #2f5d50, #1e3d35)"
                : "#2f5d50",
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
                ? "1px solid rgba(231,229,223,0.08)"
                : "1px solid rgba(28,25,23,0.08)",
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
