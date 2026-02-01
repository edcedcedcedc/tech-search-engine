import * as React from "react";
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
  useTheme,
  useMediaQuery,
  IconButton,
  TablePagination,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import InventoryIcon from "@mui/icons-material/Inventory";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useStore } from "../store/store";
import { useTranslation } from "react-i18next";

export default function ProductOffersTable() {
  const selectedProductId = useStore((s) => s.selectedProductId);
  const isLoading = useStore((s) => s.isOffersLoading);
  const offers = useStore((s) =>
    selectedProductId ? s.productOffers[selectedProductId] : null,
  );
  const close = useStore((s) => s.closeProduct);
  const theme = useTheme();
  const { t } = useTranslation();

  const isSmallScreen = useMediaQuery("(max-width:768px)");
  const isVerySmallScreen = useMediaQuery("(max-width:425px)");
  const isTinyScreen = useMediaQuery("(max-width:320px)");
  const isLargeScreen = useMediaQuery("(min-width:1024px)");

  const open = Boolean(selectedProductId);

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [priceArrowUp, setPriceArrowUp] = React.useState(true); // UI toggle only

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => setPage(newPage);

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handlePriceClick = () => {
    setPriceArrowUp((prev) => !prev);
  };

  const getColumns = () => {
    const baseColumns = [
      t("Shop"),
      t("Price") + " MDL",
      t("Name"),
      t("Variant"),
      "",
    ];
    if (isTinyScreen) return baseColumns;
    return [
      t("Shop"),
      t("Price") + " MDL",
      t("InStock"),
      t("Name"),
      t("Variant"),
      "",
    ];
  };
  const columns = getColumns();

  const truncateText = (text: string, maxLength: number) => {
    if (!text || !isSmallScreen) return text;
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  const paginatedOffers = offers
    ? offers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : [];

  return (
    <Drawer anchor="right" open={open} onClose={close}>
      <Box
        sx={{
          width: isSmallScreen ? "100vw" : 800,
          p: isLargeScreen ? 1 : isSmallScreen ? 1 : 0.5,
          maxHeight: "100vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            flexShrink: 0,
            px: isVerySmallScreen ? 1 : 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontSize: isVerySmallScreen ? "0.9rem" : "1rem",
              fontWeight: 600,
            }}
          >
            {t("Offers")}
          </Typography>
          <IconButton
            onClick={close}
            size="small"
            sx={{ p: isVerySmallScreen ? 1 : 1.5 }}
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

        {!isLoading && offers && (
          <Box
            sx={{
              overflowX: "auto",
              overflowY: "auto",
              flexGrow: 1,
              "& .MuiTable-root": {
                minWidth: isTinyScreen ? "280px" : "100%",
              },
            }}
          >
            <Table size={isVerySmallScreen ? "small" : "medium"}>
              <TableHead>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell
                      key={col}
                      align={col === "Price MDL" ? "center" : "left"}
                      sx={{
                        fontSize: isVerySmallScreen ? "0.7rem" : "0.75rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        px: isVerySmallScreen ? 0.5 : 1.5,
                        py: isVerySmallScreen ? 0.7 : 1.2,
                        cursor: col === "Price MDL" ? "pointer" : "default",
                        display:
                          col === "InStock" && isTinyScreen
                            ? "none"
                            : "table-cell",
                      }}
                      onClick={
                        col === "Price MDL" ? handlePriceClick : undefined
                      }
                    >
                      {col === "Price MDL" ? (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.3,
                          }}
                        >
                          {col}
                          {priceArrowUp ? (
                            <ArrowDropUpIcon fontSize="small" />
                          ) : (
                            <ArrowDropDownIcon fontSize="small" />
                          )}
                        </Box>
                      ) : (
                        col
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {paginatedOffers.map((offer: any) => (
                  <TableRow key={offer.id} hover>
                    <TableCell
                      sx={{
                        fontSize: isVerySmallScreen ? "0.7rem" : "0.75rem",
                        whiteSpace: "nowrap",
                        px: isVerySmallScreen ? 0.5 : 1.5,
                        py: isVerySmallScreen ? 0.7 : 1.2,
                      }}
                    >
                      {truncateText(offer.shop, 8)}
                    </TableCell>

                    <TableCell
                      align={isVerySmallScreen ? "center" : "left"}
                      sx={{
                        fontSize: isVerySmallScreen ? "0.7rem" : "0.75rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        px: isVerySmallScreen ? 0.5 : 1.5,
                        py: isVerySmallScreen ? 0.7 : 1.2,
                      }}
                    >
                      {offer.price.toLocaleString()}
                    </TableCell>

                    {!isTinyScreen && (
                      <TableCell
                        align="left"
                        sx={{
                          fontSize: isVerySmallScreen ? "0.7rem" : "0.75rem",
                          whiteSpace: "nowrap",
                          px: isVerySmallScreen ? 0.5 : 1.5,
                          py: isVerySmallScreen ? 0.7 : 1.2,
                        }}
                      >
                        {offer.in_stock ? t("Yes") : t("No")}
                      </TableCell>
                    )}

                    <TableCell
                      sx={{
                        fontSize: isVerySmallScreen ? "0.7rem" : "0.75rem",
                        px: isVerySmallScreen ? 0.5 : 1.5,
                        py: isVerySmallScreen ? 0.7 : 1.2,
                        maxWidth: isVerySmallScreen ? "70px" : "120px",
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        lineHeight: 1.2,
                      }}
                    >
                      {offer.name}
                    </TableCell>

                    <TableCell
                      sx={{
                        fontSize: isVerySmallScreen ? "0.7rem" : "0.75rem",
                        px: isVerySmallScreen ? 0.5 : 1.5,
                        py: isVerySmallScreen ? 0.7 : 1.2,
                        maxWidth: isVerySmallScreen ? "50px" : "80px",
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        lineHeight: 1.2,
                      }}
                    >
                      {offer.variant || "—"}
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        px: isVerySmallScreen ? 0.5 : 1.5,
                        py: isVerySmallScreen ? 0.7 : 1.2,
                      }}
                    >
                      <IconButton
                        href={offer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        size={isVerySmallScreen ? "small" : "medium"}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <TablePagination
              component="div"
              count={offers.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
              sx={{
                mt: 1,
                fontSize: isTinyScreen
                  ? "0.6rem"
                  : isVerySmallScreen
                    ? "0.65rem"
                    : "0.875rem",
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                  {
                    fontSize: isTinyScreen
                      ? "0.6rem"
                      : isVerySmallScreen
                        ? "0.65rem"
                        : "0.875rem",
                  },
                "& .MuiIconButton-root": {
                  padding: isTinyScreen
                    ? 0.2
                    : isVerySmallScreen
                      ? 0.25
                      : undefined,
                },
              }}
            />
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
