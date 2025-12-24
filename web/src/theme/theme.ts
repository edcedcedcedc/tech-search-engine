// src/theme/theme.ts
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
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
  },
  shape: {
    borderRadius: 4,
  },
});

export default theme;
