import { useEffect } from "react";
import { useTheme } from "@mui/material";
import { useThemeStore } from "../store/store";
import { useStore } from "../store/store";

const colors: Record<"light" | "dark", string> = {
  light: "#fafafa",
  dark: "#0d1117",
};

export const useThemePreloadSetup = () => {
  const theme = useTheme();
  const { mode, effectiveMode } = useThemeStore();
  const drawerOpen = useStore((s) => s.drawerOpen);

  console.log("🔵 [ThemePreloadSetup] ========== HOOK INITIALIZED ==========");
  console.log("🔵 [ThemePreloadSetup] Initial state:", {
    mode,
    effectiveMode,
    drawerOpen,
    timestamp: new Date().toISOString()
  });

  // Preload icon
  useEffect(() => {
    console.log("🖼️ [ThemePreloadSetup] Preloading icon");
    const img = new Image();
    img.src = "/src/assets/icon.png";
    img.onload = () => console.log("🖼️ [ThemePreloadSetup] Icon loaded successfully");
    img.onerror = (err) => console.error("🖼️ [ThemePreloadSetup] Icon failed to load", err);
  }, []);

  // Function to get drawer color with enhanced logging
  const getDrawerColor = (): string => {
    console.log("🎨 [ThemePreloadSetup] getDrawerColor() called");
    console.log("🎨 [ThemePreloadSetup] Current effectiveMode:", effectiveMode);
    
    // Try multiple selectors for better compatibility
    const selectors = [
      '.MuiDrawer-paper',
      '[class*="MuiDrawer-paper"]',
      '.MuiPaper-root'
    ];
    
    for (const selector of selectors) {
      console.log(`🎨 [ThemePreloadSetup] Trying selector: "${selector}"`);
      const drawerElement = document.querySelector(selector);
      
      if (drawerElement) {
        console.log(`🎨 [ThemePreloadSetup] ✅ Found element with selector: "${selector}"`);
        console.log(`🎨 [ThemePreloadSetup] Element classes:`, drawerElement.className);
        
        const computedStyle = window.getComputedStyle(drawerElement);
        let color = computedStyle.backgroundColor;
        
        console.log(`🎨 [ThemePreloadSetup] Raw computed backgroundColor:`, color);
        console.log(`🎨 [ThemePreloadSetup] Also checking other color properties:`);
        console.log(`   - background:`, computedStyle.background);
        console.log(`   - backgroundImage:`, computedStyle.backgroundImage);
        
        // Convert rgb/rgba to hex if needed
        if (color.startsWith('rgb')) {
          console.log(`🎨 [ThemePreloadSetup] Converting RGB to hex`);
          const rgb = color.match(/\d+/g);
          if (rgb && rgb.length >= 3) {
            const hex = '#' + rgb.slice(0, 3).map(x => {
              const hexVal = parseInt(x).toString(16);
              return hexVal.length === 1 ? '0' + hexVal : hexVal;
            }).join('');
            console.log(`🎨 [ThemePreloadSetup] Converted: ${color} → ${hex}`);
            console.log(`🎨 [ThemePreloadSetup] ✅ FINAL DRAWER COLOR: ${hex}`);
            return hex;
          }
        } else {
          console.log(`🎨 [ThemePreloadSetup] ✅ FINAL DRAWER COLOR (already hex): ${color}`);
        }
        return color;
      } else {
        console.log(`🎨 [ThemePreloadSetup] ❌ No element found with selector: "${selector}"`);
      }
    }
    
    console.log("🎨 [ThemePreloadSetup] ⚠️ No drawer element found with any selector, using fallback");
    const fallbackColor = theme.palette.background.paper;
    console.log("🎨 [ThemePreloadSetup] Fallback color from theme:", fallbackColor);
    console.log("🎨 [ThemePreloadSetup] Theme palette details:", {
      paper: theme.palette.background.paper,
      default: theme.palette.background.default,
      mode: theme.palette.mode
    });
    
    return fallbackColor;
  };

  // Apply theme and remove preloader
  useEffect(() => {
    console.log("\n🔴 [ThemePreloadSetup] ========== EFFECT RUNNING ==========");
    console.log("🔴 [ThemePreloadSetup] Effect triggered with dependencies:", {
      mode,
      effectiveMode,
      drawerOpen,
      theme: theme.palette.mode,
      timestamp: new Date().toISOString()
    });

    // Log all possible colors we might use
    console.log("🔴 [ThemePreloadSetup] Available colors:", {
      fromColorsObject: {
        light: colors.light,
        dark: colors.dark,
        current: colors[effectiveMode]
      },
      fromTheme: {
        paper: theme.palette.background.paper,
        default: theme.palette.background.default
      }
    });
    
    const bgColor = colors[effectiveMode];
    console.log("🔴 [ThemePreloadSetup] Selected bgColor:", bgColor);
    
    // Function to update meta tag with current drawer state
    const updateMetaTag = (isRetry: boolean = false) => {
      console.log(`\n🟡 [ThemePreloadSetup] ${isRetry ? 'RETRY' : 'INITIAL'} updateMetaTag()`);
      console.log(`🟡 [ThemePreloadSetup] drawerOpen:`, drawerOpen);
      
      let metaColor;
      let colorSource = '';
      
      if (drawerOpen) {
        console.log("🟡 [ThemePreloadSetup] Drawer is OPEN, getting drawer color...");
        const drawerColor = getDrawerColor();
        metaColor = drawerColor;
        colorSource = 'drawer (computed)';
        console.log("🟡 [ThemePreloadSetup] Drawer color result:", drawerColor);
      } else {
        console.log("🟡 [ThemePreloadSetup] Drawer is CLOSED, using bgColor");
        metaColor = bgColor;
        colorSource = 'bgColor (hardcoded)';
        console.log("🟡 [ThemePreloadSetup] Background color:", bgColor);
      }

      console.log("🟡 [ThemePreloadSetup] Meta color decision:", {
        drawerOpen,
        colorSource,
        chosen: metaColor,
        drawerColor: drawerOpen ? metaColor : 'N/A',
        defaultBg: bgColor,
        mode,
        effectiveMode
      });

      const metaThemeColor = document.querySelector("meta[name=theme-color]");
      if (metaThemeColor) {
        const oldColor = metaThemeColor.getAttribute("content");
        console.log("🟡 [ThemePreloadSetup] Found meta tag, current color:", oldColor);
        console.log("🟡 [ThemePreloadSetup] Setting meta tag to:", metaColor);
        metaThemeColor.setAttribute("content", metaColor);
        
        // Verify it was set
        const newColor = metaThemeColor.getAttribute("content");
        console.log("🟡 [ThemePreloadSetup] Meta tag now:", newColor);
        
        if (oldColor !== newColor) {
          console.log("🟡 [ThemePreloadSetup] ✅ Meta tag updated successfully");
        } else {
          console.log("🟡 [ThemePreloadSetup] ⚠️ Meta tag did not change");
        }
      } else {
        console.warn("🟡 [ThemePreloadSetup] ❌ Meta theme-color tag not found!");
      }
    };

    // Update immediately
    console.log("🔴 [ThemePreloadSetup] Running immediate update...");
    updateMetaTag(false);

    // If drawer just opened, retry after a short delay to ensure DOM is ready
    if (drawerOpen) {
      console.log("🔴 [ThemePreloadSetup] ⏰ Drawer opened, scheduling retry in 50ms...");
      const timeoutId = setTimeout(() => {
        console.log("🔴 [ThemePreloadSetup] ⏰ Retry timeout fired, checking drawer color again");
        console.log("🔴 [ThemePreloadSetup] Current drawerOpen state:", drawerOpen);
        updateMetaTag(true);
      }, 50);
      
      return () => {
        console.log("🔴 [ThemePreloadSetup] Cleaning up retry timeout");
        clearTimeout(timeoutId);
      };
    }

    // Continue with rest of theme setup
    console.log("🔴 [ThemePreloadSetup] Setting document background to:", bgColor);
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;
    
    console.log("🔴 [ThemePreloadSetup] Setting data-theme to:", mode);
    document.documentElement.setAttribute("data-theme", mode);
    console.log("🔴 [ThemePreloadSetup] Setting color-scheme to:", effectiveMode);
    document.documentElement.style.colorScheme = effectiveMode;

    // Overscroll style
    console.log("🔴 [ThemePreloadSetup] Creating/updating overscroll style");
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
    if (existingStyle) {
      console.log("🔴 [ThemePreloadSetup] Removing existing overscroll style");
      existingStyle.remove();
    }
    document.head.appendChild(styleEl);
    console.log("🔴 [ThemePreloadSetup] Added new overscroll style");

    // Preloader
    console.log("🔴 [ThemePreloadSetup] Checking for preloader");
    const preloader = document.getElementById("preloader");
    if (preloader) {
      console.log("🔴 [ThemePreloadSetup] Found preloader, fading out");
      console.log("🔴 [ThemePreloadSetup] Preloader current opacity:", preloader.style.opacity);
      preloader.style.transition = "opacity 0.3s ease";
      preloader.style.opacity = "0";
      console.log("🔴 [ThemePreloadSetup] Preloader new opacity:", preloader.style.opacity);
      
      setTimeout(() => {
        if (preloader && preloader.parentNode) {
          console.log("🔴 [ThemePreloadSetup] Removing preloader from DOM");
          preloader.style.display = "none";
        }
      }, 300);
    } else {
      console.log("🔴 [ThemePreloadSetup] No preloader found");
    }

    console.log("🔴 [ThemePreloadSetup] ========== EFFECT FINISHED ==========\n");

    return () => {
      console.log("🔴 [ThemePreloadSetup] Cleanup running");
      const style = document.getElementById("theme-overscroll-style");
      if (style?.parentNode) {
        console.log("🔴 [ThemePreloadSetup] Removing overscroll style");
        style.parentNode.removeChild(style);
      }
    };
  }, [mode, effectiveMode, drawerOpen, theme]);
};