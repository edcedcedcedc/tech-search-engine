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
} from "@mui/material";
import { styled } from "@mui/material/styles";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { useStore } from "../store/store";

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

  const selectedOffers = useStore((s) => s.selectedOffers);
  const removeSelectedOffer = useStore((s) => s.removeSelectedOffer);

  const offerList = Object.values(selectedOffers);

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
        <TextField
          multiline
          rows={6}
          fullWidth
          placeholder="Enter your input here..."
          sx={{ mb: 2 }}
        />

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
                      sx={{ color: "text.primary" }}
                    >
                      {displayName}
                    </Typography>

                    {/* Brand / Variant / Shop (secondary like grid) */}
                    <Typography sx={{ color: "text.secondary" }}>
                      {offer.variant ? offer.variant : ""}
                      {offer.shop ? ` — ${offer.shop}` : ""}
                    </Typography>

                    {/* Price (body2 primary like grid, closer to variant) */}
                    <Typography variant="body2" sx={{ color: "text.primary" }}>
                      {offer.price != null
                        ? `${offer.price.toLocaleString()} MDL`
                        : "N/A"}
                    </Typography>
                    {/* Brand / Variant / Shop (secondary like grid) */}
                    <Typography sx={{ color: "text.primary" }}>
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
      </TabPanel>
    </Box>
  );
}
