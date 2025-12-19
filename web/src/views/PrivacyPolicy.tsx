// src/views/PrivacyPolicy.tsx
import { Box, Typography } from "@mui/material";

export default function PrivacyPolicy() {
  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Typography variant="h4" gutterBottom>
        Politica de confidențialitate
      </Typography>

      <Typography variant="body1">
        Această aplicație este un agregator de prețuri care afișează informații
        publice preluate din magazine online terțe.
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Colectarea datelor
      </Typography>
      <Typography variant="body1">
        Nu colectăm date personale identificabile ale utilizatorilor. Aplicația
        nu necesită cont, autentificare sau furnizarea de informații personale.
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Cookie-uri
      </Typography>
      <Typography variant="body1">
        În prezent, aplicația nu utilizează cookie-uri pentru urmărirea
        utilizatorilor. În viitor, pot fi utilizate cookie-uri strict necesare
        pentru funcționarea serviciului sau pentru statistici anonime.
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Surse externe
      </Typography>
      <Typography variant="body1" paragraph>
        Prețurile, imaginile și descrierile produselor aparțin magazinelor
        sursă. Nu ne asumăm responsabilitatea pentru acuratețea informațiilor
        afișate.
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Publicitate
      </Typography>
      <Typography variant="body1" paragraph>
        Aplicația poate afișa reclame prin intermediul serviciilor Google.
        Aceste servicii pot utiliza tehnologii proprii conform politicilor lor
        de confidențialitate.
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Contact
      </Typography>
      <Typography variant="body1">
        Pentru întrebări legate de confidențialitate, ne poți contacta prin
        pagina de contact.
      </Typography>
    </Box>
  );
}
