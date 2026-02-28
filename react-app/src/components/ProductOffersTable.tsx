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
  Menu,
  MenuItem,
  FormControlLabel,
  Checkbox,
  /*  Button, */
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import { useStore } from "../store/store";
import { useTranslation } from "react-i18next";
import { Popover } from "@mui/material";
import { Sparklines, SparklinesLine } from "react-sparklines";
import { useState } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { uiLog } from "../webhook/client/uiDebug";
// import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
// import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";
import type { PriceTrendPreview } from "../types/PriceTrend";

export default function ProductOffersTable() {
  const selectedProductId = useStore((s) => s.selectedProductId);

  const offersEntry = useStore((s) =>
    selectedProductId ? s.productOffers[selectedProductId] : null,
  );
  //offers
  const offers = offersEntry?.offers ?? null;
  const isError = Boolean(offersEntry?.isError);
  /*   const errorType = offersEntry?.errorType; */

  const setRightDrawerOpen = useStore((s) => s.setRightDrawerOpen);
  // const selectedOffers = useStore((s) => s.selectedOffers);
  // const addSelectedOffer = useStore((s) => s.addSelectedOffer);
  // const removeSelectedOffer = useStore((s) => s.removeSelectedOffer);

  const close = useStore((s) => s.closeProduct);
  const isLoading = useStore((s) => s.isOffersLoading);

  const theme = useTheme();
  const { t, i18n } = useTranslation();

  const isSmallScreen = useMediaQuery("(max-width:768px)");
  const isVerySmallScreen = useMediaQuery("(max-width:425px)");
  const isTinyScreen = useMediaQuery("(max-width:320px)");
  const isTinyScreen344 = useMediaQuery("(max-width:344px)");
  const isLargeScreen = useMediaQuery("(min-width:1024px)");

  const open = Boolean(selectedProductId);

  const [pages, setPages] = React.useState<Record<string, number>>({});
  const [rowsPerPages, setRowsPerPages] = React.useState<
    Record<string, number>
  >({});

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPriceHistory, setSelectedPriceHistory] =
    useState<PriceTrendPreview | null>(null);
  const [columnsAnchorEl, setColumnsAnchorEl] = useState<null | HTMLElement>(
    null,
  );

  const openPopover = Boolean(anchorEl);
  const [columnVisibility, setColumnVisibility] = useState({
    // selection: true,
    shop: true,
    price: true,
    inStock: true,
    priceTrend: true,
    name: true,
    variant: true,
    actions: true,
  });
  const page = selectedProductId ? pages[selectedProductId] || 0 : 0;
  const rowsPerPage = selectedProductId
    ? rowsPerPages[selectedProductId] || 5
    : 5;

  //offers
  const hasOffers = Boolean(offers && offers.length > 0);
  const showSpinner = isLoading && !hasOffers && !isError;
  const isEmpty =
    !isLoading && selectedProductId && offers && offers.length === 0 && isError;
  // Define column configurations in the correct order
  const columnConfigs = [
    // { key: "selection" as const, label: "" },
    { key: "shop" as const, label: t("Shop") },
    {
      key: "price" as const,
      label: <span>{t("Price")}&nbsp;MDL&nbsp;</span>,
    },
    {
      key: "inStock" as const,
      label: (
        <span>
          {t("In")}&nbsp;{t("Stock")}&nbsp;
        </span>
      ),
    },
    {
      key: "priceTrend" as const,
      label: (
        <span>
          {t("Price_Trend1")}&nbsp;{t("Price_Trend2")}&nbsp;
        </span>
      ),
    },
    { key: "name" as const, label: t("Name") },
    { key: "variant" as const, label: t("Variant") },
    { key: "actions" as const, label: "" },
  ];

  React.useEffect(() => {
    if (isTinyScreen344) {
      // Tiny / very small screen layout
      setColumnVisibility({
        // selection: true,
        shop: true,
        price: true,
        inStock: false,
        priceTrend: true,
        name: true,
        variant: false,
        actions: false,
      });
    } else if (isVerySmallScreen) {
      // Small screens (mobile tablets)
      setColumnVisibility({
        // selection: true,
        shop: true,
        price: true,
        inStock: false,
        priceTrend: true,
        name: true,
        variant: true,
        actions: false,
      });
    } else if (isSmallScreen) {
      // Small screens (mobile tablets)
      setColumnVisibility({
        // selection: true,
        shop: true,
        price: true,
        inStock: true,
        priceTrend: true,
        name: true,
        variant: true,
        actions: true,
      });
    } else {
      // Default (desktop)
      setColumnVisibility({
        // selection: true,
        shop: true,
        price: true,
        inStock: true,
        priceTrend: true,
        name: true,
        variant: true,
        actions: true,
      });
    }
  }, [isTinyScreen, isVerySmallScreen, isSmallScreen, isTinyScreen344]);

  React.useEffect(() => {
    console.log("[ProductOffersTable] Right drawer state changing to:", open);
    setRightDrawerOpen(open);

    // Cleanup when component unmounts
    return () => {
      if (open) {
        console.log("[ProductOffersTable] Cleaning up, closing right drawer");
        setRightDrawerOpen(false);
      }
    };
  }, [open, setRightDrawerOpen]);

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

  const handleColumnVisibilityToggle = (
    column: keyof typeof columnVisibility,
  ) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
    uiLog(
      `Column visibility toggled: ${column} = ${!columnVisibility[column]}`,
    );
  };

  const handleColumnsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setColumnsAnchorEl(event.currentTarget);
    uiLog("Column visibility menu opened");
  };

  const handleColumnsMenuClose = () => {
    setColumnsAnchorEl(null);
    uiLog("Column visibility menu closed");
  };

  const getColumns = () => {
    const visibleColumns = columnConfigs
      .filter((config) => {
        // For tiny screens, always hide inStock column
        if (config.key === "inStock" && isTinyScreen) return false;
        return columnVisibility[config.key as keyof typeof columnVisibility];
      })
      .map((config) => config.label);

    return visibleColumns;
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

  const [_isSafari, setIsSafari] = React.useState(false);

  React.useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isSafari =
      /safari/.test(ua) &&
      !/chrome|chromium|crios/.test(ua) &&
      !/android/.test(ua);

    const isiOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    setIsSafari(isSafari || isiOS);
    console.log("Safari/iOS detected:", isSafari || isiOS);
  }, []);

  return (
    <Drawer
      anchor="right"
      open={open}
      elevation={3}
      onClose={() => {
        uiLog("Drawer closed");
        close();
      }}
      PaperProps={{
        sx: {
          zIndex: 1600,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          bgcolor: theme.palette.background.paper,
          py: {
            xs: _isSafari ? `calc(8px + env(safe-area-inset-top, 0px))` : 0, // mobile
            sm: _isSafari ? `calc(12px + env(safe-area-inset-top, 0px))` : 0, // small tablets
            md: _isSafari ? `calc(16px + env(safe-area-inset-top, 0px))` : 0, // medium tablets
            lg: _isSafari ? `calc(20px + env(safe-area-inset-top, 0px))` : 0, // desktop
            xl: _isSafari ? `calc(24px + env(safe-area-inset-top, 0px))` : 0, // large screens
          },
        },
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
              fontSize: {
                xs: "0.85rem", // < 375px
                sm: "0.9rem", // 375px - 424px
                md: "0.95rem", // 425px - 767px
                lg: "1rem", // 768px - 1023px
                xl: "1.1rem", // 1024px+
              },
              fontWeight: 600,
            }}
          >
            {t("Offers")}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title={t("View_columns_tooltip")}>
              <IconButton
                onClick={handleColumnsMenuOpen}
                size="small"
                sx={{ p: isVerySmallScreen ? 0.5 : 1 }}
                disabled={isLoading || !hasOffers}
              >
                <ViewColumnOutlinedIcon
                  fontSize={isVerySmallScreen ? "small" : "medium"}
                />
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={() => {
                uiLog("Close icon clicked");
                close();
              }}
              size="small"
              sx={{ p: isVerySmallScreen ? 1 : 1.5 }}
            >
              <CloseOutlinedIcon
                fontSize={isVerySmallScreen ? "small" : "medium"}
              />
            </IconButton>
          </Box>
        </Box>

        {/* Column Visibility Menu */}
        <Menu
          anchorEl={columnsAnchorEl}
          open={Boolean(columnsAnchorEl)}
          onClose={handleColumnsMenuClose}
          /* elevation={1} */
          sx={{
            "& .MuiPaper-root": {
              maxHeight: 400,
              minWidth: 200,
            },
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
          {columnConfigs.map((column) => {
            // Skip inStock column for tiny screens in the menu too

            return (
              <MenuItem key={column.key} dense disableGutters>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={
                        columnVisibility[
                          column.key as keyof typeof columnVisibility
                        ]
                      }
                      onChange={() =>
                        handleColumnVisibilityToggle(
                          column.key as keyof typeof columnVisibility,
                        )
                      }
                    />
                  }
                  label={
                    <Typography variant="body2">
                      {column.key === "actions" ? t("Actions") : column.label}
                    </Typography>
                  }
                  sx={{ ml: 1, mr: 2 }}
                />
              </MenuItem>
            );
          })}
        </Menu>

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
          <Box
            sx={{
              overflowX: "auto",
              overflowY: "auto",
              flexGrow: 1,
              position: "relative",
            }}
          >
            <Table
              size={isVerySmallScreen ? "small" : "medium"}
              sx={{
                "& .MuiTableCell-root": {
                  px: 0.125, // left & right
                  py: 0.5, // top & bottom
                },
              }}
            >
              <TableHead
                sx={{
                  "& .MuiTableCell-root": {
                    px: 0.125, // left & right
                    py: 0.5, // top & bottom
                    opacity: isLoading || !hasOffers ? 0.5 : 1,
                  },
                }}
              >
                <TableRow>
                  {columns.map((col, idx) => {
                    // Get the column key for this position
                    const visibleColumnKeys = columnConfigs
                      .filter((config) => {
                        if (config.key === "inStock" && isTinyScreen)
                          return false;
                        return columnVisibility[
                          config.key as keyof typeof columnVisibility
                        ];
                      })
                      .map((config) => config.key);

                    const columnKey = visibleColumnKeys[idx];

                    return (
                      <TableCell
                        key={idx}
                        align={
                          columnKey === "price" || columnKey === "priceTrend"
                            ? "center"
                            : "left"
                        }
                        sx={{
                          cursor: columnKey === "price" ? "pointer" : "default",
                        }}
                      >
                        {columnKey === "price" ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 0.3,
                            }}
                          >
                            {col}
                          </Box>
                        ) : (
                          col
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>

              <TableBody>
                {paginatedOffers.map((offer: any) => {
                  // Get the visible column keys in order
                  const visibleColumnKeys = columnConfigs
                    .filter((config) => {
                      if (config.key === "inStock" && isTinyScreen)
                        return false;
                      return columnVisibility[
                        config.key as keyof typeof columnVisibility
                      ];
                    })
                    .map((config) => config.key);

                  return (
                    <TableRow key={offer.id}>
                      {visibleColumnKeys.map((columnKey) => {
                        switch (columnKey) {
                          // case "selection":
                          //   return (
                          //     <TableCell
                          //       key={columnKey}
                          //       align="center"
                          //       sx={{ width: 36, cursor: "pointer" }}
                          //       onClick={() => {
                          //         if (selectedOffers[offer.id]) {
                          //           uiLog(`Offer deselected: ${offer.id}`);
                          //           removeSelectedOffer(offer.id);
                          //         } else {
                          //           uiLog(`Offer selected: ${offer.id}`);
                          //           addSelectedOffer(offer);
                          //         }
                          //       }}
                          //     >
                          //       {selectedOffers[offer.id] ? (
                          //         <CheckBoxOutlinedIcon fontSize="small" />
                          //       ) : (
                          //         <CheckBoxOutlineBlankIcon fontSize="small" />
                          //       )}
                          //     </TableCell>
                          //   );

                          case "shop":
                            return (
                              <TableCell key={columnKey}>
                                {truncateText(offer.shop, 10)}
                              </TableCell>
                            );

                          case "price":
                            return (
                              <TableCell key={columnKey} align="center">
                                {offer.price.toLocaleString()}
                              </TableCell>
                            );

                          case "inStock":
                            return (
                              <TableCell key={columnKey}>
                                {offer.in_stock ? t("Yes") : t("No")}
                              </TableCell>
                            );

                          case "priceTrend":
                            return (
                              <TableCell
                                key={columnKey}
                                sx={{ width: 90, py: 1 }}
                              >
                                <Box
                                  onClick={(e) =>
                                    handleSparklineClick(
                                      e,
                                      offer.price_trend_preview,
                                    )
                                  }
                                  sx={{ cursor: "pointer" }}
                                >
                                  <Sparklines
                                    data={[
                                      ...(offer.price_trend_preview
                                        ?.free_price_trend.length
                                        ? offer.price_trend_preview
                                            .free_price_trend
                                        : []),
                                    ]
                                      .reverse()
                                      .map((h) => h.price)}
                                    height={40}
                                  >
                                    <SparklinesLine
                                      color={
                                        offer.price_trend_preview
                                          ?.free_price_trend[0]?.price ===
                                        offer.price_trend_preview
                                          ?.free_price_trend[
                                          offer.price_trend_preview
                                            .free_price_trend.length - 1
                                        ]?.price
                                          ? theme.palette.info.main
                                          : offer.price_trend_preview
                                                ?.free_price_trend[0]?.price >
                                              offer.price_trend_preview
                                                ?.free_price_trend[
                                                offer.price_trend_preview
                                                  .free_price_trend.length - 1
                                              ]?.price
                                            ? theme.palette.error.main
                                            : theme.palette.success.main
                                      }
                                    />
                                  </Sparklines>
                                </Box>
                              </TableCell>
                            );

                          case "name":
                            return (
                              <TableCell key={columnKey}>
                                {getTranslated(offer.t_name, offer.name)}
                              </TableCell>
                            );

                          case "variant":
                            return (
                              <TableCell key={columnKey}>
                                {getTranslated(offer.t_variant, offer.variant)}
                              </TableCell>
                            );

                          case "actions":
                            return (
                              <TableCell key={columnKey} align="center">
                                <IconButton
                                  href={offer.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  size={isVerySmallScreen ? "small" : "medium"}
                                  onClick={() =>
                                    uiLog(
                                      `Open offer link clicked: ${offer.id}`,
                                    )
                                  }
                                >
                                  <OpenInNewIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            );

                          default:
                            return null;
                        }
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <TablePagination
              component="div"
              count={offers.length}
              disabled={isLoading || !hasOffers}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
              labelRowsPerPage={t("rows_per_view")}
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} ${t("of")} ${count}`
              }
              sx={{
                // HARD STOP horizontal sliding
                maxWidth: "100%",
                overflowX: "hidden",
                overflowY: "hidden",

                // tiny-screen scale only
                transform: isTinyScreen ? "scale(0.85)" : "none",
                transformOrigin: "right top",

                //  remove underline / divider forever
                borderTop: "none",
                borderBottom: "none",
                "&::before, &::after": {
                  display: "none",
                },

                // toolbar is the real slider — lock it
                "& .MuiTablePagination-toolbar": {
                  maxWidth: "100%",
                  minWidth: 0,
                  paddingLeft: 0,
                  paddingRight: 0,
                  justifyContent: "flex-start",
                  overflowX: "hidden",
                  borderTop: "none",
                },

                // prevent content from forcing width
                "& .MuiTablePagination-actions": {
                  marginLeft: 0,
                  flexShrink: 0,
                },

                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                  {
                    whiteSpace: "nowrap",
                  },
              }}
            />
          </Box>
        )}
        {isEmpty && (
          <Box
            sx={{
              flexGrow: 1, // fill vertical space
              display: "flex",
              justifyContent: "center", // horizontal center
              alignItems: "center", // vertical center
              textAlign: "center",
              gap: 1,
              px: 2,
              zIndex: 10,
            }}
          >
            <Typography variant="body1" color="text.secondary">
              {t("Generic_Drawer_Error_Message")}
            </Typography>
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
          <Tooltip
            title={t("Tooltip_Trend")}
            arrow
            placement="top"
            enterTouchDelay={0}
            leaveTouchDelay={6000}
          >
            <IconButton
              size="small"
              sx={{
                position: "absolute",
                top: 4,
                right: 4,
                p: 0.25,
              }}
            >
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
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
            </TableBody>
          </Table>
          <Typography
            variant="body2"
            sx={{
              mt: 1,
              fontStyle: "normal",
              lineHeight: 1.4,
              fontWeight: 500,
            }}
            color="text.secondary"
          >
            {selectedPriceHistory?.hidden_price_trend_count}{" "}
            {t("Tooltip_Trend2")}
          </Typography>
        </Box>
      </Popover>
    </Drawer>
  );
}
