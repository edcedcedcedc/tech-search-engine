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
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useNotificationStore, useStore } from "../store/store";
import { useTranslation } from "react-i18next";
import { Popover } from "@mui/material";
import { Sparklines, SparklinesLine } from "react-sparklines";
import { useState } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LockIcon from "@mui/icons-material/Lock";
import { uiLog } from "../webhook/client/sender";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";
import type { PriceTrendPreview } from "../types/PriceTrend";

export default function ProductOffersTable() {
  const selectedProductId = useStore((s) => s.selectedProductId);
  const offers = useStore((s) =>
    selectedProductId
      ? (s.productOffers[selectedProductId]?.offers ?? null)
      : null,
  );

  const selectedOffers = useStore((s) => s.selectedOffers);
  const addSelectedOffer = useStore((s) => s.addSelectedOffer);
  const removeSelectedOffer = useStore((s) => s.removeSelectedOffer);

  const close = useStore((s) => s.closeProduct);
  const isLoading = useStore((s) => s.isOffersLoading);
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  const isSmallScreen = useMediaQuery("(max-width:768px)");
  const isVerySmallScreen = useMediaQuery("(max-width:425px)");
  const isTinyScreen = useMediaQuery("(max-width:320px)");
  const isLargeScreen = useMediaQuery("(min-width:1024px)");

  const open = Boolean(selectedProductId);

  const [pages, setPages] = React.useState<Record<string, number>>({});
  const [rowsPerPages, setRowsPerPages] = React.useState<
    Record<string, number>
  >({});
  const [priceArrowUp, setPriceArrowUp] = React.useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPriceHistory, setSelectedPriceHistory] =
    useState<PriceTrendPreview | null>(null);

  React.useEffect(() => {
    if (open && selectedProductId) {
      uiLog(`Drawer opened for productId=${selectedProductId}`);
    }
  }, [open, selectedProductId]);

  const handleSparklineClick = (
    event: React.MouseEvent<HTMLDivElement>,
    priceTrendPreview: PriceTrendPreview,
  ) => {
    uiLog("Sparkline clicked, opening price history popover");
    setAnchorEl(event.currentTarget);
    setSelectedPriceHistory(priceTrendPreview);
  };

  const handleClosePopover = () => {
    uiLog("Price history popover closed");
    setAnchorEl(null);
    setSelectedPriceHistory(null);
  };

  const openPopover = Boolean(anchorEl);

  const handleChangePage = (
    _event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    if (selectedProductId) {
      uiLog(
        `Pagination: page changed to ${newPage} for productId=${selectedProductId}`,
      );
      setPages((prev) => ({ ...prev, [selectedProductId]: newPage }));
    }
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const value = parseInt(event.target.value, 10);
    if (selectedProductId) {
      uiLog(
        `Pagination: rows per page changed to ${value} for productId=${selectedProductId}`,
      );
      setRowsPerPages((prev) => ({ ...prev, [selectedProductId]: value }));
      setPages((prev) => ({ ...prev, [selectedProductId]: 0 }));
    }
  };

  const handlePriceClick = () => {
    uiLog("Price column clicked, toggling sort direction");
    setPriceArrowUp((prev) => !prev);
  };

  const page = selectedProductId ? pages[selectedProductId] || 0 : 0;
  const rowsPerPage = selectedProductId
    ? rowsPerPages[selectedProductId] || 5
    : 5;
  const hasOffers = Boolean(selectedProductId && offers && offers.length > 0);
  const showSpinner = isLoading && !hasOffers;

  const getColumns = () => {
    const base = [
      "",
      t("Shop"),
      t("Price") + " MDL",
      t("Price_Trend"),
      t("Name"),
      t("Variant"),
      "",
    ];
    if (isTinyScreen) return base;
    return [
      "",
      t("Shop"),
      t("Price") + " MDL",
      t("InStock"),
      t("Price_Trend"),
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

  const getTranslated = (
    tObj: Record<string, string> | undefined,
    fallback: string,
  ) => {
    if (!tObj) return fallback;
    const lang = i18n.language || "en";
    return tObj[lang] || fallback;
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => {
        uiLog("Drawer closed");
        close();
      }}
      sx={{
        // Scrollbar styles
        "&::-webkit-scrollbar": { width: theme.spacing(1) },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: theme.palette.background.default,
          borderRadius: theme.shape.borderRadius,
        },
        "&::-webkit-scrollbar-thumb:hover": {
          backgroundColor: theme.palette.background.default,
        },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        scrollbarWidth: "thin", // Firefox
        scrollbarColor:
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.2) transparent"
            : "rgba(0,0,0,0.3) transparent",
      }}
    >
      <Box
        sx={{
          width: isSmallScreen ? "100vw" : 800,
          p: isLargeScreen ? 1 : isSmallScreen ? 1 : 0.5,
          maxHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          overflowY: isLargeScreen ? "auto" : "hidden",
          overflowX: "auto",
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
            onClick={() => {
              uiLog("Close icon clicked");
              close();
            }}
            size="small"
            sx={{ p: isVerySmallScreen ? 1 : 1.5 }}
          >
            <CloseIcon fontSize={isVerySmallScreen ? "small" : "medium"} />
          </IconButton>
        </Box>

        {/* Loading */}
        {showSpinner && (
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
          <Box sx={{ overflowX: "auto", overflowY: "auto", flexGrow: 1 }}>
            <Table size={isVerySmallScreen ? "small" : "medium"}>
              <TableHead>
                <TableRow>
                  {columns.map((col, idx) => (
                    <TableCell
                      key={idx}
                      align={
                        col === "Price MDL" || col === "Price History"
                          ? "center"
                          : "left"
                      }
                      sx={{
                        cursor: col === "Price MDL" ? "pointer" : "default",
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
                  <TableRow key={offer.id}>
                    <TableCell
                      align="center"
                      sx={{ width: 36, cursor: "pointer" }}
                      onClick={() => {
                        if (selectedOffers[offer.id]) {
                          uiLog(`Offer deselected: ${offer.id}`);
                          removeSelectedOffer(offer.id);
                        } else {
                          uiLog(`Offer selected: ${offer.id}`);
                          addSelectedOffer(offer);
                        }
                      }}
                    >
                      {selectedOffers[offer.id] ? (
                        <CheckBoxOutlinedIcon fontSize="small" />
                      ) : (
                        <CheckBoxOutlineBlankIcon fontSize="small" />
                      )}
                    </TableCell>

                    <TableCell>{truncateText(offer.shop, 10)}</TableCell>
                    <TableCell align="center">
                      {offer.price.toLocaleString()}
                    </TableCell>
                    {!isTinyScreen && (
                      <TableCell>
                        {offer.in_stock ? t("Yes") : t("No")}
                      </TableCell>
                    )}

                    <TableCell sx={{ width: 120, py: 1 }}>
                      <Box
                        onClick={(e) =>
                          handleSparklineClick(e, offer.price_trend_preview)
                        }
                        sx={{ cursor: "pointer" }}
                      >
                        <Sparklines
                          data={[
                            ...(offer.price_trend_preview?.free_price_trend
                              .length
                              ? offer.price_trend_preview.free_price_trend
                              : []),
                          ]
                            .reverse()
                            .map((h) => h.price)}
                          height={40}
                        >
                          <SparklinesLine
                            color={
                              offer.price_trend_preview?.free_price_trend[0]
                                ?.price ===
                              offer.price_trend_preview?.free_price_trend[
                                offer.price_trend_preview.free_price_trend
                                  .length - 1
                              ]?.price
                                ? theme.palette.info.main
                                : offer.price_trend_preview?.free_price_trend[0]
                                      ?.price >
                                    offer.price_trend_preview?.free_price_trend[
                                      offer.price_trend_preview.free_price_trend
                                        .length - 1
                                    ]?.price
                                  ? theme.palette.error.main
                                  : theme.palette.success.main
                            }
                          />
                        </Sparklines>
                      </Box>
                    </TableCell>

                    <TableCell>
                      {getTranslated(offer.t_name, offer.name)}
                    </TableCell>
                    <TableCell>
                      {getTranslated(offer.t_variant, offer.variant)}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        href={offer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        size={isVerySmallScreen ? "small" : "medium"}
                        onClick={() =>
                          uiLog(`Open offer link clicked: ${offer.id}`)
                        }
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <TablePagination
              component="div"
              count={offers.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </Box>
        )}
      </Box>

      <Popover
        open={openPopover}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        sx={{
          // Scrollbar styles
          "&::-webkit-scrollbar": { width: theme.spacing(1) },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: theme.palette.background.default,
            borderRadius: theme.shape.borderRadius,
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: theme.palette.background.default,
          },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          scrollbarWidth: "thin", // Firefox
          scrollbarColor:
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.2) transparent"
              : "rgba(0,0,0,0.3) transparent",
        }}
      >
        <Box
          sx={{ p: 1, maxHeight: 250, overflowY: "auto", position: "relative" }}
        >
          <Tooltip title={t("Tooltip_Trend")} arrow placement="top">
            <InfoOutlinedIcon
              fontSize="small"
              sx={{ position: "absolute", top: 4, right: 4, p: 0.25 }}
            />
          </Tooltip>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("Price")}</TableCell>
                <TableCell>{t("In_Stock_Trend")}</TableCell>
                <TableCell>{t("Time_Trend")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedPriceHistory?.free_price_trend.map((h, idx) => {
                const recordedAt = new Date(h.recorded_at);
                const formattedTime =
                  recordedAt.toLocaleDateString("ro-RO") +
                  " " +
                  recordedAt.toLocaleTimeString("ro-RO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                return (
                  <TableRow key={`free-${idx}`}>
                    <TableCell>{h.price.toLocaleString()} MDL</TableCell>
                    <TableCell>{h.in_stock ? t("Yes") : t("No")}</TableCell>
                    <TableCell>{formattedTime}</TableCell>
                  </TableRow>
                );
              })}
              {selectedPriceHistory &&
                Array.from(
                  { length: selectedPriceHistory.hidden_price_trend_count },
                  (_, idx) => (
                    <TableRow
                      key={`hidden-${idx}`}
                      sx={{ opacity: 0.3, pointerEvents: "none" }}
                    >
                      <TableCell>
                        <LockIcon
                          fontSize="small"
                          sx={{ verticalAlign: "middle" }}
                        />
                      </TableCell>
                      <TableCell>
                        <LockIcon
                          fontSize="small"
                          sx={{ verticalAlign: "middle" }}
                        />
                      </TableCell>
                      <TableCell>
                        <LockIcon
                          fontSize="small"
                          sx={{ verticalAlign: "middle" }}
                        />
                      </TableCell>
                    </TableRow>
                  ),
                )}
            </TableBody>
          </Table>
        </Box>
      </Popover>
    </Drawer>
  );
}
