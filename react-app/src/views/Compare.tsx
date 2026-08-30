// src/views/Compare.tsx
import React, { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  TextField,
  Stack,
  Paper,
  Typography,
  IconButton,
  LinearProgress,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { useStore } from "../store/store";
import i18n from "../i18n";
import type { ComparisonResponse, ComparisonRequest } from "../api/searchApi";
import { compareProducts } from "../api/searchApi";
import ComparisonResult from "../components/ComparisonResult";
import { uiLog } from "../webhook/client/uiDebug";

const bull = (
  <Box
    component="span"
    sx={{
      display: "inline-block",
      mx: "2px",
      transform: "scale(0.8)",
      color: "text.secondary",
    }}
  >
    •
  </Box>
);

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: "#fff",
  padding: theme.spacing(1.5),
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  border: `1px solid ${theme.palette.divider}`,
  ...theme.applyStyles?.("dark", { backgroundColor: "#1A2027" }),
}));

function a11yProps(index: number) {
  return {
    id: `compare-tab-${index}`,
    "aria-controls": `compare-tabpanel-${index}`,
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`compare-tabpanel-${index}`}
      aria-labelledby={`compare-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default function Compare() {
  const [tabValue, setTabValue] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [comparisonResult, setComparisonResult] =
    useState<ComparisonResponse | null>(null);
  const russianRegex = /[А-Яа-яЁё]/;
  const selectedOffers = useStore((s) => s.selectedOffers);
  const removeSelectedOffer = useStore((s) => s.removeSelectedOffer);
  const offerList = Object.values(selectedOffers);

  const handleChange = (_: React.SyntheticEvent, newValue: number) =>
    setTabValue(newValue);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (russianRegex.test(value)) {
      setInputValue("");
      return;
    }
    setInputValue(value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitComparison();
    }
  };

  const submitComparison = async () => {
    if (offerList.length < 1) return;

    setIsLoading(true);
    setProgress(0);
    setComparisonResult(null);

    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 98));
    }, 600);

    const lang = i18n.language.startsWith("ro") ? "ro" : "en";

    try {
      const request: ComparisonRequest = {
        offers: offerList,
        tier: "free",
        lang,
        user_text: inputValue,
      };

      // DEBUG: log request payload
      uiLog(`[Compare] Sending request: ${JSON.stringify(request)}`);

      const result = await compareProducts(request);

      // DEBUG: log API response
      uiLog(`[Compare] API response received: ${JSON.stringify(result)}`);

      setComparisonResult(result);
      setProgress(100);
      setTabValue(1);
    } catch (err: any) {
      uiLog(`[Compare] API error: ${err.message || err}`);
      console.error(err);
      alert(
        `${i18n.t("Error comparing products")}${
          err.message ? `: ${err.message}` : ""
        }`,
      );
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Top Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleChange}
          aria-label="compare top tabs"
          variant="fullWidth"
        >
          <Tab label={i18n.t("Input")} {...a11yProps(0)} />
          <Tab label={i18n.t("Results")} {...a11yProps(1)} />
        </Tabs>
      </Box>

      {/* Input Tab */}
      <TabPanel value={tabValue} index={0}>
        <LinearProgress
          variant="query"
          sx={{
            backgroundColor: "action.hover",
            "& .MuiLinearProgress-bar": { borderRadius: 4 },
            opacity: isLoading ? 1 : 0,
            mb: 2,
          }}
        />

        <Box sx={{ width: "100%", position: "relative", mb: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={5}
            variant="outlined"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={i18n.t("AI Overview")}
            disabled={isLoading}
            inputProps={{
              style: {
                marginTop: "4.5px",
                fontSize: "16px",
                WebkitTextSizeAdjust: "100%",
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment
                  position="start"
                  sx={{ alignSelf: "flex-start" }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: 48,
                      height: 48,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconButton
                      size="medium"
                      disabled={isLoading || offerList.length < 2}
                      onClick={() => {
                        if (offerList.length > 2) {
                          alert(
                            i18n.t(
                              "Free version supports a maximum of 2 items. Price trend analysis is not available.",
                            ),
                          );
                          return;
                        }
                        submitComparison();
                      }}
                      style={{ position: "absolute" }}
                    >
                      <Tooltip
                        title={i18n.t("Search")}
                        enterDelay={500}
                        leaveDelay={0}
                      >
                        <AutoAwesomeOutlinedIcon fontSize="medium" />
                      </Tooltip>
                    </IconButton>
                  </div>
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": { paddingLeft: 0 },
              "& .MuiOutlinedInput-input": { paddingLeft: 0 },
            }}
          />
        </Box>

        {offerList.length > 0 && (
          <Stack spacing={2}>
            {offerList.map((offer: any, index: number) => {
              const displayName = offer.name
                ? offer.name
                    .split(" ")
                    .map((word: string, idx: number, arr: string[]) => (
                      <React.Fragment key={`${offer.id}-${idx}`}>
                        {word}
                        {idx < arr.length - 1 && bull}
                      </React.Fragment>
                    ))
                : "Unnamed Product";

              return (
                <Item key={offer.id || index}>
                  <Box sx={{ flex: 1, mr: 2 }}>
                    <Typography
                      variant="h5"
                      sx={{ color: "text.primary", userSelect: "none" }}
                    >
                      {displayName}
                    </Typography>
                    <Typography
                      sx={{ color: "text.secondary", userSelect: "none" }}
                    >
                      {offer.variant || ""}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.primary", userSelect: "none" }}
                    >
                      {offer.price != null
                        ? `${offer.price.toLocaleString()} MDL`
                        : "N/A"}
                    </Typography>
                    <Typography
                      sx={{ color: "text.primary", userSelect: "none" }}
                    >
                      {offer.shop || ""}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => removeSelectedOffer(offer.id)}
                    sx={{
                      borderRadius: "50%",
                      width: 32,
                      height: 32,
                      alignSelf: "flex-start",
                      "&:hover": { backgroundColor: "action.hover" },
                    }}
                  >
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                </Item>
              );
            })}
          </Stack>
        )}
      </TabPanel>

      {/* Results Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {i18n.t("Comparison results will appear here.")}
        </Typography>
        {isLoading && (
          <Typography
            variant="caption"
            sx={{ display: "block", mt: 1, color: "text.secondary" }}
          >
            {i18n.t("Loading")}: {progress}% {i18n.t("complete")}
          </Typography>
        )}
        <ComparisonResult result={comparisonResult} />
      </TabPanel>
    </Box>
  );
}
