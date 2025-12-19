// src/components/Header.tsx
import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  useTheme,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const Header: React.FC = () => {
  const theme = useTheme();

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Button component={RouterLink} to="/" color="inherit">
          <Typography variant="h5" color="primary">
            9999
          </Typography>
        </Button>
        <Box>
          {[
            { path: "/", label: "Acasă" },
            { path: "/about", label: "Despre" },
            { path: "/contact", label: "Contact" },
          ].map((btn) => (
            <Button
              key={btn.path}
              component={RouterLink}
              to={btn.path}
              color="inherit"
              sx={{ color: theme.palette.text.primary }} // use theme text
            >
              {btn.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
