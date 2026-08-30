// components/NotificationsContainer.tsx
import React from "react";
import { Box } from "@mui/material";
import { useNotificationStore } from "../store/store";
import { Notification } from "./Notification";

const NotificationsContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        pointerEvents: "none",
        zIndex: 998,

        // Desktop default left-aligned
        left: 16,

        // Center notifications on screens ≤425px (xs, sm, md)
        right: 16,
        mx: { xs: "auto", sm: "auto", md: "auto", lg: "0" },
        width: {
          xs: "calc(100% - 32px)",
          sm: "calc(100% - 32px)",
          md: "calc(100% - 32px)",
          lg: "auto",
        },
        alignItems: {
          xs: "center",
          sm: "center",
          md: "center",
          lg: "flex-start",
        },
      }}
    >
      {notifications.map((n) => (
        <Box key={n.id} sx={{ pointerEvents: "auto" }}>
          <Notification
            message={n.message}
            type={n.type}
            duration={n.duration}
            onClose={() => removeNotification(n.id)}
          />
        </Box>
      ))}
    </Box>
  );
};

export default NotificationsContainer;
