import { useEffect } from "react";
/* import { useTheme } from "@mui/material"; */
import { useThemeStore } from "../store/store";
import { useStore } from "../store/store";

// Hardcoded color dictionary based on your logs
const drawerColors = {
  dark: {
    left: {
      open: "#161b22",
      close: "#0d1117"
    },
    right: {
      open: "#292e34",
      close: "#0d1117"
    }
  },
  light: {
    left: {
      open: "#ffffff",
      close: "#fafafa"
    },
    right: {
      open: "#ffffff",
      close: "#fafafa"
    }
  }
};

export const useThemePreloadSetup = () => {
/*   const theme = useTheme(); */
  const { mode, effectiveMode } = useThemeStore();
  const leftDrawerOpen = useStore((s) => s.drawerOpen);
  const rightDrawerOpen = useStore((s) => s.rightDrawerOpen);
  const sessionExpiredBottomDrawer = useStore((s) => s.isSessionExpired);
  const drawerOpen = leftDrawerOpen || rightDrawerOpen || sessionExpiredBottomDrawer;
  const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
  console.log("🔵 [ThemePreloadSetup] ========== HOOK INITIALIZED ==========");
  console.log("🔵 [ThemePreloadSetup] Initial state:", {
    mode,
    effectiveMode,
    leftDrawerOpen,
    rightDrawerOpen,
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

  // Handle meta theme color based on drawer state - NO DOM SCANNING
  useEffect(() => {
    console.log("\n🔴 [ThemePreloadSetup] ========== META COLOR UPDATE ==========");

    const activeDrawerType = rightDrawerOpen
      ? "right"
      : leftDrawerOpen
      ? "left"
      : null;

    let metaColor: string;

    if (activeDrawerType && effectiveMode) {
      metaColor =
        drawerColors[effectiveMode][activeDrawerType].open;
      console.log(
        `🔴 Drawer ${activeDrawerType} OPEN →`,
        metaColor
      );
    } else {
      metaColor =
        effectiveMode === "dark" ? "#0d1117" : "#fafafa";
      console.log("🔴 No drawer →", metaColor);
    }

    const existing = document.querySelector(
      'meta[name="theme-color"]'
    );

    if (existing) {
      existing.remove();
    }

    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = metaColor;

    document.head.appendChild(meta);

    console.log("🔴 Meta recreated with:", metaColor);
    console.log("🔴 ========== META UPDATE FINISHED ==========\n");
  }, [effectiveMode, leftDrawerOpen, rightDrawerOpen]);

  // Handle Safari tint instead of meta tag
  useEffect(() => {
    console.log("\n🟢 [ThemePreloadSetup] ========== SAFARI TINT UPDATE ==========");

    const activeDrawerType = rightDrawerOpen
      ? "right"
      : leftDrawerOpen
      ? "left"
      : null;

    let tintColor: string;

    if (activeDrawerType && effectiveMode) {
      tintColor =
        drawerColors[effectiveMode][activeDrawerType].open;
      console.log(`🟢 Drawer ${activeDrawerType} OPEN →`, tintColor);
    } else {
      tintColor =
        effectiveMode === "dark" ? "#0d1117" : "#fafafa";
      console.log("🟢 No drawer →", tintColor);
    }

    const tintEl = document.getElementById("safari-tint");

    if (tintEl) {
      tintEl.style.backgroundColor = tintColor;
    }
      // Update bottom tint (only visible in browser mode)
  const bottomTint = document.getElementById("safari-tint-bottom");
  if (bottomTint && !isStandalone) {
    bottomTint.style.backgroundColor = tintColor;
  }

    console.log("🟢 Safari tint updated:", tintColor);
    console.log("🟢 ========== TINT UPDATE FINISHED ==========\n");


    console.log("Tint element exists:", !!tintEl);
    console.log("Current tint height:", tintEl?.offsetHeight);

  }, [effectiveMode, leftDrawerOpen, rightDrawerOpen]);

  // Preloader fadeout only
  useEffect(() => {
    console.log("\n🔴 [ThemePreloadSetup] ========== PRELOADER FADEOUT ==========");
    
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
    
    console.log("🔴 [ThemePreloadSetup] ========== PRELOADER FINISHED ==========\n");
  }, []); // Run once on mount

  const detectTrueRightDrawerColor = () => {
  if (!rightDrawerOpen) return;
  
  console.log("🎯 [DETECT] ========== DETECTING TRUE RIGHT DRAWER COLOR ==========");
  
  const rightDrawer = document.querySelector('.MuiDrawer-paperAnchorRight');
  
  if (rightDrawer) {
    const styles = window.getComputedStyle(rightDrawer);
    const bgColor = styles.backgroundColor; // rgb(22, 27, 34)
    const bgImage = styles.backgroundImage; // linear-gradient(rgba(255, 255, 255, 0.082), rgba(255, 255, 255, 0.082))
    
    console.log("🎯 Base color:", bgColor);
    console.log("🎯 Overlay:", bgImage);
    
    // Create a canvas to sample the actual rendered color
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw the element to canvas to get the actual pixel color
      const rect = rightDrawer.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // This is a simplified approach - in reality you'd need to 
      // draw the element with all its styles
      console.log("🎯 To get true color, inspect in DevTools:");
      console.log("🎯 1. Right-click the drawer → Inspect");
      console.log("🎯 2. In Styles tab, look for background color with overlay");
      console.log("🎯 3. The computed color will show the final value");
    }
  }
};
detectTrueRightDrawerColor()
};