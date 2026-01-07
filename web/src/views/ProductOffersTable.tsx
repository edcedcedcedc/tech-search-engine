import {
  Box,
  Drawer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close"; // Import close icon
import OpenInNewIcon from "@mui/icons-material/OpenInNew"; // Optional: for link icon
import { useStore } from "../store/store";

export default function ProductOffersTable() {
  const selectedProductId = useStore((s) => s.selectedProductId);
  const isLoading = useStore((s) => s.isOffersLoading);
  const offers = useStore((s) =>
    selectedProductId ? s.productOffers[selectedProductId] : null
  );
  const close = useStore((s) => s.closeProduct);
  const theme = useTheme();

  // Simplify breakpoints
  const isSmallScreen = useMediaQuery("(max-width:768px)");
  const isVerySmallScreen = useMediaQuery("(max-width:425px)");

  const open = Boolean(selectedProductId);

  // Function to truncate text for small screens
  const truncateText = (text: string, maxLength: number) => {
    if (!text || !isSmallScreen) return text;
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  return (
    <Drawer anchor="right" open={open} onClose={close}>
      <Box
        sx={{
          width: isSmallScreen ? "100vw" : 800,
          p: isVerySmallScreen ? 0.5 : 2,
          maxHeight: "100vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header - Optimized for small screens */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
            flexShrink: 0,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontSize: isVerySmallScreen ? "0.9rem" : "1rem",
              fontWeight: 600,
            }}
          >
            Offers
          </Typography>
          <IconButton
            onClick={close}
            size="small"
            sx={{ p: isVerySmallScreen ? 0.5 : 1 }}
          >
            <CloseIcon fontSize={isVerySmallScreen ? "small" : "medium"} />
          </IconButton>
        </Box>

        {/* Loading */}
        {isLoading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: 2,
              flexGrow: 1,
            }}
          >
            <CircularProgress size={isVerySmallScreen ? 24 : 40} />
          </Box>
        )}

        {/* Table - Optimized for 425px */}
        {!isLoading && offers && (
          <Box
            sx={{
              overflowX: "auto",
              overflowY: "auto",
              flexGrow: 1,
              "& .MuiTable-root": {
                minWidth: isVerySmallScreen ? "320px" : "100%",
              },
            }}
          >
            <Table size={isVerySmallScreen ? "small" : "medium"}>
              <TableHead>
                <TableRow>
                  {["Shop", "Price", "Name", "Variant", ""].map((col) => (
                    <TableCell
                      key={col}
                      align={col === "Price" ? "right" : "left"}
                      sx={{
                        fontSize: isVerySmallScreen ? "0.7rem" : "0.75rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        px: isVerySmallScreen ? 0.5 : 1,
                        py: isVerySmallScreen ? 0.5 : 1,
                      }}
                    >
                      {col === "Price" ? (
                        <div style={{ lineHeight: 1.1 }}>
                          <div>Price</div>
                          <div style={{ fontSize: "0.65rem", opacity: 0.8 }}>
                            (MDL)
                          </div>
                        </div>
                      ) : (
                        col
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {offers.map((offer: any) => (
                  <TableRow key={offer.id} hover>
                    {/* Shop */}
                    <TableCell
                      sx={{
                        fontSize: isVerySmallScreen ? "0.7rem" : "0.75rem",
                        whiteSpace: "nowrap",
                        px: isVerySmallScreen ? 0.5 : 1,
                        py: isVerySmallScreen ? 0.5 : 1,
                      }}
                    >
                      {truncateText(offer.shop, 8)}
                    </TableCell>

                    {/* Price */}
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: isVerySmallScreen ? "0.7rem" : "0.75rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        px: isVerySmallScreen ? 0.5 : 1,
                        py: isVerySmallScreen ? 0.5 : 1,
                      }}
                    >
                      {offer.price.toLocaleString()}
                    </TableCell>

                    {/* Name */}
                    <TableCell
                      sx={{
                        fontSize: isVerySmallScreen ? "0.7rem" : "0.75rem",
                        px: isVerySmallScreen ? 0.5 : 1,
                        py: isVerySmallScreen ? 0.5 : 1,
                        maxWidth: isVerySmallScreen ? "80px" : "150px",
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        lineHeight: 1.2,
                      }}
                    >
                      {offer.name}
                    </TableCell>

                    {/* Variant */}
                    <TableCell
                      sx={{
                        fontSize: isVerySmallScreen ? "0.7rem" : "0.75rem",
                        px: isVerySmallScreen ? 0.5 : 1,
                        py: isVerySmallScreen ? 0.5 : 1,
                        maxWidth: isVerySmallScreen ? "60px" : "100px",
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        lineHeight: 1.2,
                      }}
                    >
                      {offer.variant || "—"}
                    </TableCell>

                    {/* Link */}
                    <TableCell
                      align="center"
                      sx={{
                        px: isVerySmallScreen ? 0.5 : 1,
                        py: isVerySmallScreen ? 0.5 : 1,
                      }}
                    >
                      <Button
                        size={isVerySmallScreen ? "small" : "medium"}
                        variant="outlined"
                        href={offer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        startIcon={
                          isVerySmallScreen ? (
                            <OpenInNewIcon fontSize="small" />
                          ) : null
                        }
                        sx={{
                          minWidth: "auto",
                          px: isVerySmallScreen ? 1 : 2,
                        }}
                      >
                        {isVerySmallScreen ? (
                          ""
                        ) : (
                          <OpenInNewIcon fontSize="small" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
