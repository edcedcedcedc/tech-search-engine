import { BreakpointOverrides } from "@mui/material/styles";

// Extend MUI breakpoints
declare module "@mui/material/styles" {
  interface BreakpointOverrides {
    xs: true;      // 0+
    sm: true;      // 375px
    md: true;      // 425px
    lg: true;      // 768px
    xl: true;      // 1024px
    xxl: true;     // 1440px
  }
}