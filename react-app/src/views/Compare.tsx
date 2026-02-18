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
  Chip,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import FindInPageOutlinedIcon from "@mui/icons-material/FindInPageOutlined";
import { useStore } from "../store/store";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
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
  ...theme.applyStyles?.("dark", {
    backgroundColor: "#1A2027",
  }),
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
  const [estimatedTime, setEstimatedTime] = useState(60); // seconds
  const russianRegex = /[А-Яа-яЁё]/;
  const selectedOffers = useStore((s) => s.selectedOffers);
  const removeSelectedOffer = useStore((s) => s.removeSelectedOffer);
  const isOffline = useStore((state) => state.isOffline);
  const offerList = Object.values(selectedOffers);

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (russianRegex.test(value)) {
      // Option 1: block input and show warning
      setInputValue(""); // clear input

      return;
    }

    setInputValue(value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      simulateLoading();
    }
  };

  const simulateLoading = () => {
    setIsLoading(true);
    setProgress(0);

    // Simulate progress over 60 seconds
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        const newProgress = prevProgress + 1;

        // Update estimated time based on progress
        const remainingSeconds = Math.max(
          0,
          60 - Math.floor(newProgress / 1.67),
        );
        setEstimatedTime(remainingSeconds);

        if (newProgress >= 100) {
          clearInterval(interval);
          setIsLoading(false);
          // Switch to results tab when complete
          setTabValue(1);
          return 100;
        }
        return newProgress;
      });
    }, 600); // Update every 600ms to complete in 60 seconds
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
          <Tab label="Input" {...a11yProps(0)} />
          <Tab label="Results" {...a11yProps(1)} />
        </Tabs>
      </Box>

      {/* Input Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* Loading Indicator */}
        <LinearProgress
          variant="query"
          sx={{
            backgroundColor: "action.hover",
            "& .MuiLinearProgress-bar": {
              borderRadius: 4,
            },
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
            placeholder="AI Overview"
            disabled={isLoading}
            inputProps={{
              style: {
                marginTop: "4.5px",
                fontSize: "16px", // Prevents iOS zoom on focus
                WebkitTextSizeAdjust: "100%", // Prevents text size adjustment
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment
                  position="start"
                  sx={{
                    alignSelf: "flex-start", // 👈 moves adornment to top
                  }}
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
                      disabled={isLoading}
                      onClick={simulateLoading}
                      style={{
                        position: "absolute",
                      }}
                    >
                      <Tooltip title="Search" enterDelay={500} leaveDelay={0}>
                        <AutoAwesomeOutlinedIcon fontSize="medium" />
                      </Tooltip>
                    </IconButton>
                  </div>
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                paddingLeft: 0,
              },
              "& .MuiOutlinedInput-input": {
                paddingLeft: 0,
              },
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
                  {/* LEFT SIDE — matches ProductGrid typography */}
                  <Box sx={{ flex: 1, mr: 2 }}>
                    {/* Name (h5 like grid) */}
                    <Typography
                      variant="h5"
                      component="div"
                      sx={{ color: "text.primary", userSelect: "none" }}
                    >
                      {displayName}
                    </Typography>

                    {/* Brand / Variant / Shop (secondary like grid) */}
                    <Typography
                      sx={{ color: "text.secondary", userSelect: "none" }}
                    >
                      {offer.variant ? offer.variant : ""}
                    </Typography>

                    {/* Price (body2 primary like grid, closer to variant) */}
                    <Typography
                      variant="body2"
                      sx={{ color: "text.primary", userSelect: "none" }}
                    >
                      {offer.price != null
                        ? `${offer.price.toLocaleString()} MDL`
                        : "N/A"}
                    </Typography>
                    {/* Brand / Variant / Shop (secondary like grid) */}
                    <Typography
                      sx={{ color: "text.primary", userSelect: "none" }}
                    >
                      {offer.shop ? `${offer.shop}` : ""}
                    </Typography>
                  </Box>

                  {/* Right side — delete only */}
                  <IconButton
                    size="small"
                    onClick={() => removeSelectedOffer(offer.id)}
                    sx={{
                      borderRadius: "50%",
                      width: 32,
                      height: 32,
                      alignSelf: "flex-start",
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
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
          Comparison results will appear here.
        </Typography>
        {isLoading && (
          <Typography
            variant="caption"
            sx={{ display: "block", mt: 1, color: "text.secondary" }}
          >
            Loading: {progress}% complete
          </Typography>
        )}
      </TabPanel>
    </Box>
  );
}
