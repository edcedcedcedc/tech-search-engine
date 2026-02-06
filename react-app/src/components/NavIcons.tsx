import { Box } from "@mui/material";

const ICON_BOX = 24;
const ICON_SIZE = 20;

export const NavIcon: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Box
    sx={{
      width: ICON_BOX,
      height: ICON_BOX,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      "& svg": {
        fontSize: ICON_SIZE,
        margin: 0,
        padding: 0,
      },
    }}
  >
    {children}
  </Box>
);
