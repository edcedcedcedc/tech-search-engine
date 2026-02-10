import { useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, CssBaseline } from "@mui/material";

import getTheme from "./theme/theme";
import { useThemeStore } from "./store/store";
import App from "./App";
import "./i18n";

const Root = () => {
  const mode = useThemeStore((state) => state.mode);
  const theme = useMemo(() => getTheme(mode), [mode]);

  // Colors for both modes - ONLY for the deepest background layer
  const colors = {
    light: "#fafafa",
    dark: "#0d1117",
  };

  useEffect(() => {
    const bgColor = colors[mode];

    // CRITICAL: Only set background on html element (deepest layer)
    // This is what shows during overscroll/pull-to-refresh
    document.documentElement.style.backgroundColor = bgColor;

    // Set body background to inherit from html (or transparent)
    document.body.style.backgroundColor = "transparent";

    // Set meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", bgColor);
    } else {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = bgColor;
      document.head.appendChild(meta);
    }

    // Create minimal style element ONLY for overscroll
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      /* Only target the overscroll area - NOT the scrollbar track */
      /* The html element background will handle overscroll */
      html {
        background-color: ${bgColor} !important;
      }
      
      /* Remove the body::before hack - not needed */
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);

const preloader = document.getElementById("preloader");
if (preloader) {
  preloader.style.transition = "opacity 0.3s ease";
  preloader.style.opacity = "0";
  setTimeout(() => {
    preloader.style.display = "none";
  }, 300);
}
