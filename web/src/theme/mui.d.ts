// src/theme/mui.d.ts
import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface TypeBackground {
    muted: string;
    card: string;
  }

  interface Palette {
    card: {
      background: string;
      foreground?: string;
      ctaBackground?: string;
    };

    states: {
      hover: {
        border?: string;
        background?: string;
        text?: string;
      };
    };
  }

  interface PaletteOptions {
    card?: {
      background?: string;
      foreground?: string;
      ctaBackground?: string;
    };

    states?: {
      hover?: {
        border: string;
        background?: string;
        text?: string;
      };
    };
  }
}
