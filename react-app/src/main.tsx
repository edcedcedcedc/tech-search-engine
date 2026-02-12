import { useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, CssBaseline } from "@mui/material";

import getTheme from "./theme/theme";
import { useLastQueryStore, useStore, useThemeStore } from "./store/store";
import App from "./App";
import "./i18n";
import { indexedDbService } from "./services/indexedDb";
import { uiLog } from "./webhook/client/uiDebug";

const Root = () => {
  const mode = useThemeStore((state) => state.mode);
  const theme = useMemo(() => getTheme(mode), [mode]);

  // Colors for both modes
  const colors = {
    light: "#fafafa",
    dark: "#0d1117",
  };

  // Preload the icon
  const preloadIcon = () => {
    const img = new Image();
    img.src = "/src/assets/icon.png"; // or the correct path
  };

  useEffect(() => {
    preloadIcon();
  }, []);

  useEffect(() => {
    const bgColor = colors[mode];

    // Update theme-color meta tag
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", bgColor);
    }

    // Apply background to both html AND body
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;

    // Update data-theme attribute
    document.documentElement.setAttribute("data-theme", mode);

    // Update color-scheme
    document.documentElement.style.colorScheme = mode;

    // Minimal style - NO pseudo-elements that interfere with pull-to-refresh
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      html {
        background-color: ${bgColor} !important;
        color-scheme: ${mode};
      }
      body {
        background-color: ${bgColor} !important;
      }
      
      /* This helps mobile browsers use the right color for overscroll */
      @media (hover: none) and (pointer: coarse) {
        body {
          /* This is the key - ensures overscroll area uses theme color */
          background-attachment: fixed;
          background-image: linear-gradient(${bgColor}, ${bgColor});
        }
      }
    `;

    // Remove any existing style element
    const existingStyle = document.getElementById("theme-overscroll-style");
    if (existingStyle) {
      existingStyle.remove();
    }

    styleEl.id = "theme-overscroll-style";
    document.head.appendChild(styleEl);

    return () => {
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, [mode]);

  useEffect(() => {
    // Get the query that was JUST hydrated from the main store
    const { query, searchProducts } = useStore.getState();

    if (query) {
      // Use the already-hydrated query value
      searchProducts(query, undefined, 1);
    }
  }, []);

  indexedDbService.init().catch((error) => {
    uiLog(`Failed to initialize IndexedDB: ${error}`);
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);

// Handle preloader removal
const preloader = document.getElementById("preloader");
if (preloader) {
  preloader.style.transition = "opacity 0.3s ease";
  preloader.style.opacity = "0";
  setTimeout(() => {
    if (preloader && preloader.parentNode) {
      preloader.style.display = "none";
    }
  }, 300);
}
