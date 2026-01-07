import React from "react";
import { Box, useTheme } from "@mui/material";
import GrapeIcon from "../assets/icon.png";

interface IconProps {
  size?: number;
  color?: "primary" | "secondary" | "text" | "inherit";
  sx?: any;
  variant?: "logo" | "default";
}

const Icon: React.FC<IconProps> = ({
  size = 25,
  color = "text",
  variant = "default",
  sx,
}) => {
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

        ...(variant === "logo" && {
          transition: "transform 0.25s ease, filter 0.25s ease 0.05s",
          "&:hover": {
            transform: " scale(1.03)",
            filter:
              theme.palette.mode === "dark"
                ? "drop-shadow(0 0 6px rgba(37,116,235,0.6))"
                : "drop-shadow(0 0 4px rgba(37,116,235,0.35))",
          },
        }),

        ...sx,
      }}
    />
  );
};

export default Icon;
