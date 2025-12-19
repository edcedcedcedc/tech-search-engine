// src/components/Footer.tsx
import React from "react";
import { Box, Typography, Link, useTheme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const Footer: React.FC = () => {
  const theme = useTheme();
  return (
    <Box
      component="footer"
      sx={{
        //mt: 8,
        py: 4,
        px: 2,
        backgroundColor: theme.palette.background.default, // use theme
        textAlign: "center",
      }}
    >
      <Typography variant="body2" color="textSecondary">
        © {new Date().getFullYear()} 9999. Toate drepturile rezervate.
      </Typography>

      <Box sx={{ mt: 1 }}>
        <Link component={RouterLink} to="/disclaimer" sx={{ mx: 1 }}>
          Declarație de responsabilitate
        </Link>
        <Link component={RouterLink} to="/terms-of-use" sx={{ mx: 1 }}>
          Termeni și condiții
        </Link>
        <Link component={RouterLink} to="/privacy-policy" sx={{ mx: 1 }}>
          Politica de confidențialitate
        </Link>
        <Link component={RouterLink} to="/about" sx={{ mx: 1 }}>
          Despre noi
        </Link>
        <Link component={RouterLink} to="/contact" sx={{ mx: 1 }}>
          Contact
        </Link>
        <Link component={RouterLink} to="/source" sx={{ mx: 1 }}>
          Surse
        </Link>
      </Box>
    </Box>
  );
};

export default Footer;
