// components/FullScreenLoader.tsx
import { Box, CircularProgress, useTheme } from "@mui/material";

export const FullScreenLoader = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        backdropFilter: "blur(0.5px)",
        zIndex: theme.zIndex.modal + 1,
        opacity: 0.5,
      }}
    >
      <CircularProgress size={60} thickness={4} />
    </Box>
  );
};
