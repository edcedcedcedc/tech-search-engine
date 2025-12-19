// src/views/About.tsx
import { Box, Typography } from "@mui/material";

export default function About() {
  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Typography variant="h4" gutterBottom>
        Despre noi
      </Typography>

      <Typography variant="body1">
        Această platformă este un agregator de prețuri care permite compararea
        ofertelor din mai multe magazine online din Republica Moldova. Nu vindem
        produse și nu garantăm disponibilitatea sau exactitatea prețurilor.
      </Typography>

      <Typography variant="body1" color="text.secondary">
        Toate datele sunt preluate din surse publice și pot fi modificate de
        magazine fără notificare.
      </Typography>
    </Box>
  );
}
