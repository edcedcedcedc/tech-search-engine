import React from "react";
import { Box } from "@mui/material";

import { Cookie } from "./Cookie";
import Bottom from "./Bottom";
import { NetworkListener } from "./NetworkListener";
import OfflineDialog from "./OfflineDialog";
import SessionExpiredDialog from "./SessionExpiredDialog";

const AppOverlays: React.FC = () => {
  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        zIndex: 1000,
      }}
    >
      <OfflineDialog />
      <SessionExpiredDialog />
      <Cookie />
      <Bottom />
      <NetworkListener />
    </Box>
  );
};

export default AppOverlays;
