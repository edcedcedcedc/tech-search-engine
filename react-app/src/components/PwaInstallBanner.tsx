import { Box, Button, Paper, Typography } from "@mui/material";
import { InstallDesktop } from "@mui/icons-material";

export const PwaInstallBanner = () => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        bgcolor: "primary.main",
        color: "primary.contrastText",
        borderRadius: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <InstallDesktop />
        <Typography variant="body2">
          Install our app for a better experience
        </Typography>
      </Box>
      <Button
        variant="contained"
        size="small"
        sx={{ bgcolor: "white", color: "primary.main" }}
      >
        Install
      </Button>
    </Paper>
  );
};
