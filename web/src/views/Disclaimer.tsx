// src/views/Disclaimer.tsx
import { Box, Typography } from "@mui/material";

export default function Disclaimer() {
  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Typography variant="h4" gutterBottom>
        Declarație de responsabilitate
      </Typography>

      <Typography variant="body1" gutterBottom>
        Informațiile afișate pe acest site, inclusiv prețurile produselor, sunt
        oferite exclusiv în scop informativ.
      </Typography>

      <Typography variant="body1" gutterBottom>
        Nu garantăm acuratețea, completitudinea sau actualitatea informațiilor
        prezentate. Prețurile și disponibilitatea produselor pot fi modificate
        în orice moment de către magazinele sursă.
      </Typography>

      <Typography variant="body1" gutterBottom>
        Acest site nu vinde produse și nu este afiliat, asociat sau susținut de
        niciunul dintre comercianții enumerați.
      </Typography>

      <Typography variant="body1" gutterBottom color="text.secondary">
        Toate mărcile comerciale, siglele și denumirile de produse aparțin
        proprietarilor lor respectivi.
      </Typography>

      <Typography variant="body1" gutterBottom>
        Utilizarea acestui site se face pe propria răspundere.
      </Typography>
    </Box>
  );
}
