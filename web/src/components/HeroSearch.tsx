// src/components/HeroSearch.tsx
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

interface HeroSearchProps {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
}

const HeroSearch: React.FC<HeroSearchProps> = ({ query, setQuery }) => {
  const theme = useTheme();
  const handleSearch = () => {
    console.log("Searching for:", query);
    // TODO: integrate live search / navigate to results page
  };

  return (
    <Box
      sx={{
        py: 4,
        textAlign: "center",
        backgroundColor: theme.palette.background.default,
        px: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Typography variant="h3" component="h1" gutterBottom>
        Compară prețurile în Moldova
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
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
