import { createTheme, responsiveFontSizes } from "@mui/material/styles";

const getTheme = (mode: "light" | "dark") => {
  let theme = createTheme({
    palette: {
      mode,

      primary: {
        light: "#8ecbff",   // icy reflection
        main: "#4da3ff",    // snowboard blue
        dark: "#1e5fbf",    // deep cold blue
        contrastText: "#ffffff",
      },

      secondary: {
        light: "#6ee7b7",   // fresh bamboo
        main: "#34d399",    // panda accent green
        dark: "#047857",
        contrastText: "#06281b",
      },

      background: {
        default: mode === "dark" ? "#0b0e14" : "#f7fafc", // night slope / snow
        paper: mode === "dark" ? "#111827" : "#ffffff",
      },

      text: {
        primary: mode === "dark" ? "#e5e7eb" : "#0f172a",
        secondary: mode === "dark" ? "#9ca3af" : "#475569",
        disabled: mode === "dark" ? "#6b7280" : "#94a3b8",
      },

      divider:
        mode === "dark"
          ? "rgba(255,255,255,0.04)" // snow dust
          : "rgba(15,23,42,0.08)",   // soft shadow line

      success: {
        main: "#22c55e",
      },

      warning: {
        main: "#fbbf24",
      },

      error: {
        main: "#f87171",
      },

      info: {
        main: "#38bdf8",
      },

      contrastThreshold: 4.5,
      tonalOffset: 0.18,
    },

    typography: {
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",

      h1: { fontWeight: 800 },
      h2: { fontWeight: 800 },
      h3: { fontWeight: 700 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },

      body1: { lineHeight: 1.6 },
      body2: { lineHeight: 1.6 },

      button: {
        textTransform: "none",
        fontWeight: 600,
      },
    },

    shape: {
      borderRadius: 4, // ❄️ softer, friendlier
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            WebkitTapHighlightColor: "transparent",
            backgroundImage:
              mode === "light"
                ? "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)"
                : "linear-gradient(180deg, #0b0e14 0%, #020617 100%)",
            transition: "background-color 0.25s ease, color 0.25s ease",
          },
        },
      },

      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 4,
            paddingLeft: 10,
            paddingRight: 10,
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 4,
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
