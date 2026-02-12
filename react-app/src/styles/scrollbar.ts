import type { Theme } from "@mui/material";

export const scrollableScrollbar = (theme: Theme) => ({
  "&::-webkit-scrollbar": { width: theme.spacing(1) },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: theme.palette.background.default,
  },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  scrollbarWidth: "thin", // Firefox
  scrollbarColor:
    theme.palette.mode === "dark"
      ? "rgba(255,255,255,0.2) transparent"
      : "rgba(0,0,0,0.3) transparent",
});