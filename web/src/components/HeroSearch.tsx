// src/components/HeroSearch.tsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const HeroSearch: React.FC = () => {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    console.log("Searching for:", query);
    // TODO: integrate live search / navigate to results page
  };

  return (
    <Box
      sx={{
        py: 4,
        textAlign: "center",
        backgroundColor: "#f5f5f5",
        px: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Typography variant="h3" component="h1" gutterBottom>
        Compară prețurile în Moldova
      </Typography>
      <Typography variant="h6" color="textSecondary" gutterBottom>
        Găsește cel mai bun preț pentru produsele tale preferate
      </Typography>

      <Box sx={{ mt: 4, maxWidth: 600, mx: "auto" }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Caută produs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleSearch}>
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Box>
  );
};

export default HeroSearch;
