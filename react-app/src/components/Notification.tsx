import React, { useState, useEffect } from "react";
import { Paper, Typography, IconButton, useTheme } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

type NotificationType = "error" | "success" | "info" | "warning";

interface NotificationProps {
  message: string;
  type?: NotificationType;
  duration?: number; // auto dismiss in ms
  onClose?: () => void;
}

// Icon map as a function to dynamically set the color
const iconMap: Record<NotificationType, (color: string) => React.ReactNode> = {
  error: (color) => <ErrorOutlineIcon fontSize="small" sx={{ color }} />,
  success: (color) => (
    <CheckCircleOutlineIcon fontSize="small" sx={{ color }} />
  ),
  info: (color) => <InfoOutlinedIcon fontSize="small" sx={{ color }} />,
  warning: (color) => (
    <WarningAmberOutlinedIcon fontSize="small" sx={{ color }} />
  ),
};

export const Notification: React.FC<NotificationProps> = ({
  message,
  type = "info",
  duration = 5000,
  onClose,
}) => {
  const theme = useTheme();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => handleClose(), duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  if (!visible) return null;

  // Default colors
  let bgColor = theme.palette.background.paper;
  let textColor =
    theme.palette.mode === "dark" ? "#c9d1d9" : "rgba(0,0,0,0.87)";
  let borderColor = theme.palette.divider;

  // Override based on type
  switch (type) {
    case "error":
      bgColor =
        theme.palette.mode === "dark"
          ? theme.palette.error.dark
          : theme.palette.error.main;
      borderColor =
        theme.palette.mode === "dark"
          ? theme.palette.error.dark
          : theme.palette.error.main;
      textColor = theme.palette.error.contrastText;
      break;
    case "success":
      bgColor =
        theme.palette.mode === "dark"
          ? theme.palette.success.dark
          : theme.palette.success.main;
      borderColor =
        theme.palette.mode === "dark"
          ? theme.palette.success.dark
          : theme.palette.success.main;
      textColor = theme.palette.success.contrastText;
      break;
    case "info":
      bgColor =
        theme.palette.mode === "dark"
          ? theme.palette.primary.dark
          : theme.palette.primary.main;
      borderColor =
        theme.palette.mode === "dark"
          ? theme.palette.info.dark
          : theme.palette.info.main;
      textColor = theme.palette.info.contrastText;
      break;
    case "warning":
      bgColor =
        theme.palette.mode === "dark"
          ? theme.palette.warning.dark
          : theme.palette.warning.main;
      borderColor =
        theme.palette.mode === "dark"
          ? theme.palette.warning.dark
          : theme.palette.warning.main;
      // Hardcode readable text depending on theme
      textColor = theme.palette.info.contrastText;
      break;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1.5,
        borderLeft: `4px solid transparent`,
        bgcolor: bgColor,
        color: textColor,
        minWidth: 280,
        maxWidth: 400,
        boxShadow: theme.shadows[3],
      }}
    >
      <Typography variant="body2" sx={{ flex: 1, color: textColor }}>
        {message}
      </Typography>
      <IconButton size="small" onClick={handleClose} sx={{ color: textColor }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
};
