// ✅ main.tsx for Vite
import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, CssBaseline } from "@mui/material";

import getTheme from "./theme/theme";
import { useStore } from "./store/store";
import App from "./App";
import "./i18n";

const Root = () => {
  const mode = useStore((state) => state.mode);
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
};

// ❌ Do not export Root
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

const preloader = document.getElementById("preloader");
if (preloader) {
  preloader.style.transition = "opacity 0.3s ease";
  preloader.style.opacity = "0";
  setTimeout(() => {
    preloader.style.display = "none";
  }, 300);
}
