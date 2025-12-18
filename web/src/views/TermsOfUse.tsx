import { Container, Typography, Box } from "@mui/material";

export default function Terms() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Termeni și condiții
        </Typography>

        <Typography variant="body1" paragraph>
          Prin utilizarea acestui site, sunteți de acord cu următoarele:
        </Typography>

        <Typography variant="body1" component="ul" sx={{ pl: 3 }}>
          <li>Platforma este oferită „așa cum este”, fără garanții.</li>
          <li>
            Nu suntem responsabili pentru erori de preț, disponibilitate sau
            conținut.
          </li>
          <li>Nu vindem produse și nu procesăm comenzi.</li>
          <li>Utilizarea datelor este permisă doar în scop informativ.</li>
          <li>
            Ne rezervăm dreptul de a modifica sau suspenda serviciul fără
            notificare.
          </li>
        </Typography>
      </Box>
    </Container>
  );
}
