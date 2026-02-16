import { useEffect } from "react";
import { useThemeStore } from "../store/store";

const colors: Record<"light" | "dark", string> = {
  light: "#fafafa",  // Match your HTML colors
  dark: "#0d1117",   // Match your HTML colors
};

/**
 * Hook that preloads the app icon, sets theme, and removes preloader
 */
export const useThemePreloadSetup = () => {
  const { mode, effectiveMode } = useThemeStore();

  // Preload icon
  useEffect(() => {
    const img = new Image();
    img.src = "/src/assets/icon.png"; // adjust path if needed
  }, []);

  // Apply theme and remove preloader
  useEffect(() => {
    // Use effectiveMode for actual colors, mode for data-theme attribute
    const bgColor = colors[effectiveMode];

    // ----------------- Theme -----------------
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", bgColor);
    }

    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;
    
    // Store the user's mode preference (light/dark/system) in data-theme
    document.documentElement.setAttribute("data-theme", mode);
    // Use effective mode for color-scheme (browser UI likes light/dark, not "system")
    document.documentElement.style.colorScheme = effectiveMode;

    const styleEl = document.createElement("style");
    styleEl.id = "theme-overscroll-style";
    styleEl.innerHTML = `
      html {
        background-color: ${bgColor} !important;
        color-scheme: ${effectiveMode};
      }
      body {
        background-color: ${bgColor} !important;
      }
      @media (hover: none) and (pointer: coarse) {
        body {
          background-attachment: fixed;
          background-image: linear-gradient(${bgColor}, ${bgColor});
        }
      }
    `;

    const existingStyle = document.getElementById("theme-overscroll-style");
    if (existingStyle) existingStyle.remove();
    document.head.appendChild(styleEl);

    // ----------------- Preloader -----------------
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

    return () => {
      if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    };
  }, [mode, effectiveMode]); // Add effectiveMode as dependency
};