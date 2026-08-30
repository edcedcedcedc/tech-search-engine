import React from "react";
import { Button, Box } from "@mui/material";
import { useNotificationStore } from "../store/store";

export const TestNotification: React.FC = () => {
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const handleTest = () => {
    addNotification({
      message: "This is a test error notification!",
      type: "warning",
      duration: 5000,
    });
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Button variant="contained" color="error" onClick={handleTest}>
        Show Test Notification
      </Button>
    </Box>
  );
};
