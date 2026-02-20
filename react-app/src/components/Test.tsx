// In your App.tsx or wherever you want to add debug controls
import { useStore } from "../store/store";
import { Button, Box } from "@mui/material";

// Add this component somewhere in your app (only visible in development)
export default function DebugControls() {
  const setDebugShow = useStore((s) => s.setDebugShowSessionExpired);
  const debugShow = useStore((s) => s.debugShowSessionExpired);

  return (
    <Box sx={{ position: "fixed", bottom: 16, left: 16, zIndex: 9999 }}>
      <Button
        variant="contained"
        color={debugShow ? "warning" : "primary"}
        onClick={() => setDebugShow(!debugShow)}
        size="small"
      >
        {debugShow ? "Hide" : "Show"} Session Dialog
      </Button>
    </Box>
  );
}
