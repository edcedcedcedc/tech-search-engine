// src/views/TermsOfUse.tsx
import { Box, Typography } from "@mui/material";

export default function TermsOfUse() {
  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Typography variant="h4" gutterBottom>
        Termeni și condiții
      </Typography>

      <Typography variant="body1">
        Prin utilizarea acestui site, sunteți de acord cu următoarele:
      </Typography>

      <Box component="ul" sx={{ pl: 3 }}>
        <Typography component="li" variant="body1">
          Platforma este oferită „așa cum este”, fără garanții.
        </Typography>
        <Typography component="li" variant="body1">
          Nu suntem responsabili pentru erori de preț, disponibilitate sau
          conținut.
        </Typography>
        <Typography component="li" variant="body1">
          Nu vindem produse și nu procesăm comenzi.
        </Typography>
        <Typography component="li" variant="body1">
          Utilizarea datelor este permisă doar în scop informativ.
        </Typography>
        <Typography component="li" variant="body1">
          Ne rezervăm dreptul de a modifica sau suspenda serviciul fără
          notificare.
        </Typography>
      </Box>
    </Box>
  );
}
