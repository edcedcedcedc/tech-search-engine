// src/views/Source.tsx
import { Box, Typography } from "@mui/material";

export default function Source() {
  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Typography variant="h4" gutterBottom>
        Surse de date
      </Typography>

      <Typography variant="body1">
        Datele despre produse sunt colectate automat din surse publice ale
        magazinelor online, inclusiv (dar fără a se limita la):
      </Typography>

      <Typography variant="body1">– Darwin.md</Typography>

      <Typography variant="body1" color="text.secondary">
        Mărcile comerciale, logo-urile și denumirile produselor aparțin
        proprietarilor respectivi. Platforma noastră nu este afiliată cu aceste
        magazine.
      </Typography>
    </Box>
  );
}
