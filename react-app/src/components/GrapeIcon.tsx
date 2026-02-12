import React from "react";
import { Box, useTheme } from "@mui/material";

// Import your base64 string from the file
import { GRAPE_ICON_BASE64 } from "../assets/icon_base64";

export { GRAPE_ICON_BASE64 };

interface IconProps {
  size?: number;
  color?: "primary" | "secondary" | "text" | "inherit";
  sx?: any;
}

const Icon: React.FC<IconProps> = ({ size = 25, color = "text", sx }) => {
  const theme = useTheme();

  const resolvedColor = (() => {
    switch (color) {
      case "primary":
        return theme.palette.primary.main;
      case "secondary":
        return theme.palette.secondary.main;
      case "text":
        return theme.palette.text.primary;
      case "inherit":
        return "currentColor";
      default:
        return theme.palette.text.primary;
    }
  })();

  return (
    <Box
      sx={{
        width: size,
        height: size,
        backgroundColor: resolvedColor,
        mask: `url(${GRAPE_ICON_BASE64}) no-repeat center / contain`,
        WebkitMask: `url(${GRAPE_ICON_BASE64}) no-repeat center / contain`,
        display: "inline-block",
        ...sx,
      }}
    />
  );
};

export default Icon;
