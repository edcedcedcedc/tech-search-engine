import { Container, Typography, Box, Link } from "@mui/material";

export default function Contact() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>
        Contact
      </Typography>

      <Typography variant="body1">
        Dacă aveți întrebări, sugestii sau observații legate de platformă, ne
        puteți contacta folosind informațiile de mai jos.
      </Typography>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body1">
          Email:{" "}
          <Link href="mailto:contact@price-aggregator.md">
            contact@price-aggregator.md
          </Link>
        </Typography>

        <Typography variant="body1" sx={{ mt: 1 }}>
          Platforma: agregator de prețuri (informativ)
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
        Nu oferim suport pentru comenzi sau livrări. Pentru achiziții, vă rugăm
        să contactați magazinul de unde doriți să cumpărați produsul.
      </Typography>
    </Container>
  );
}
