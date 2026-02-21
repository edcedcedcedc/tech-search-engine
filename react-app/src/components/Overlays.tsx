import React from "react";
import { Box } from "@mui/material";

import { Cookie } from "./Cookie";

import { NetworkListener } from "./NetworkListener";
import SessionExpiredDialog from "./SessionExpiredDialog";

import ProductOffersTable from "../components/ProductOffersTable";

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
      <SessionExpiredDialog />
      <Cookie />
      <NetworkListener />
      <ProductOffersTable />
    </Box>
  );
};

export default AppOverlays;
