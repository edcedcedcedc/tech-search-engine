import React from "react";
import { Box, useTheme } from "@mui/material";
import GrapeIcon from "../assets/icon.png";

interface IconProps {
  size?: number;
  color?: "primary" | "secondary" | "text" | "inherit";
  sx?: any;
  variant?: "logo" | "default";
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
        mask: `url(${GrapeIcon}) no-repeat center / contain`,
        WebkitMask: `url(${GrapeIcon}) no-repeat center / contain`,
        display: "inline-block",
        ...sx,
      }}
    />
  );
};

export default Icon;
