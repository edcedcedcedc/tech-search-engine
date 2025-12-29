import { createTheme, responsiveFontSizes } from "@mui/material/styles";

// Extend your existing theme with additional breakpoints
let theme = createTheme({
  palette: {
   primary: {
      light: "#63a4ff",       // lighter than main
      main: "#1976d2",        // MUI default blue
      dark: "#004ba0",        // darker than main
      contrastText: "#fff",   // text on primary
    },
    secondary: {
      light: "#d05ce3",       // lighter than main
      main: "#9c27b0",        // MUI default purple
      dark: "#6a0080",        // darker than main
      contrastText: "#fff",   // text on secondary
    },
    error: {
      light: "#e57373",
      main: "#d32f2f",
      dark: "#9a0007",
      contrastText: "#fff",
    },
    warning: {
      light: "#ffb74d",
      main: "#ed6c02",
      dark: "#b53d00",
      contrastText: "#000",
    },
    info: {
      light: "#4fc3f7",
      main: "#0288d1",
      dark: "#01579b",
      contrastText: "#fff",
    },
    success: {
      light: "#81c784",
      main: "#2e7d32",
      dark: "#1b5e20",
      contrastText: "#fff",
    },
    background: {
      default: "#fafafa",   // brighter page background
      paper: "#ffffff",     // card/paper background
    },
    text: {
      primary: "rgba(0, 0, 0, 0.87)",
      secondary: "rgba(0, 0, 0, 0.65)", // slightly lighter secondary text
      disabled: "rgba(0, 0, 0, 0.38)",
    },
    contrastThreshold: 3,  // default, can increase to 4.5 for accessibility
    tonalOffset: 0.2,      // controls light/dark shade calculation

  },

  typography: {
    fontFamily: "Inter, Arial, sans-serif",
    h1: { fontSize: "2rem", '@media (min-width:600px)': { fontSize: '2.5rem' }, '@media (min-width:900px)': { fontSize: '3rem' }, fontWeight: 700 },
    h2: { fontSize: "1.75rem", '@media (min-width:600px)': { fontSize: '2rem' }, '@media (min-width:900px)': { fontSize: '2.5rem' }, fontWeight: 700 },
    h3: { fontSize: "1.5rem", '@media (min-width:600px)': { fontSize: '1.75rem' }, '@media (min-width:900px)': { fontSize: '2rem' }, fontWeight: 700 },
    h4: { fontSize: "1.25rem", '@media (min-width:600px)': { fontSize: '1.5rem' }, '@media (min-width:900px)': { fontSize: '1.75rem' }, fontWeight: 700 },
    h5: { fontSize: "1.1rem", '@media (min-width:600px)': { fontSize: '1.25rem' }, '@media (min-width:900px)': { fontSize: '1.5rem' }, fontWeight: 700 },
    h6: { fontSize: "1rem", '@media (min-width:600px)': { fontSize: '1.1rem' }, '@media (min-width:900px)': { fontSize: '1.25rem' }, fontWeight: 700 },
    body1: { fontSize: "0.875rem", '@media (min-width:600px)': { fontSize: '0.95rem' }, '@media (min-width:900px)': { fontSize: '1rem' } },
    body2: { fontSize: "0.75rem", '@media (min-width:600px)': { fontSize: '0.875rem' }, '@media (min-width:900px)': { fontSize: '0.9rem' } },
    button: { fontSize: "0.875rem", textTransform: "none", '@media (min-width:600px)': { fontSize: '0.95rem' }, '@media (min-width:900px)': { fontSize: '1rem' } },
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
    MuiCssBaseline: { styleOverrides: { body: { WebkitTapHighlightColor: "transparent", overscrollBehaviorY: "contain" } } },
    MuiButton: { defaultProps: { disableRipple: false, size: "medium" }, styleOverrides: { root: { minHeight: 40 } } },
    MuiCard: { defaultProps: { elevation: 1 } },
    MuiPaper: { defaultProps: { elevation: 1 } },
    MuiContainer: { defaultProps: { maxWidth: "md", disableGutters: false }, styleOverrides: { root: { paddingLeft: 16, paddingRight: 16 } } },
    MuiTypography: { defaultProps: { color: "text.primary" } },
  },
});

theme = responsiveFontSizes(theme);

export default theme;
