// src/components/Header.tsx
import React from "react";
import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const Header: React.FC = () => {
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h5" color="primary">
          9999
        </Typography>
        <Box>
          <Button component={RouterLink} to="/" color="inherit">
            Acasă
          </Button>
          <Button component={RouterLink} to="/about" color="inherit">
            Despre
          </Button>
          <Button component={RouterLink} to="/contact" color="inherit">
            Contact
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
