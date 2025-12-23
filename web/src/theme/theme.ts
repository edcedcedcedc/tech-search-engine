// src/theme/theme.ts
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2", // MUI default blue
    },
    secondary: {
      main: "#9c27b0", // MUI default purple
    },
    error: {
      main: "#d32f2f",
    },
    warning: {
      main: "#ed6c02",
    },
    info: {
      main: "#0288d1",
    },
    success: {
      main: "#2e7d32",
    },
    background: {
      default: "#f5f5f5", // MUI docs background
      paper: "#ffffff",    // Card/paper background
    },
    text: {
      primary: "rgba(0, 0, 0, 0.87)", // default MUI text
      secondary: "rgba(0, 0, 0, 0.6)",
      disabled: "rgba(0, 0, 0, 0.38)",
    },
  },
  typography: {
    fontFamily: "Inter, Arial, sans-serif",
  },
  shape: {
    borderRadius: 4, // default MUI border radius
  },
});

export default theme;
