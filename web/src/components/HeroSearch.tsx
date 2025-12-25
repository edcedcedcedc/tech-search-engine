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
import { useTranslation } from "react-i18next";

interface HeroSearchProps {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
}

const HeroSearch: React.FC<HeroSearchProps> = ({ query, setQuery }) => {
  const theme = useTheme();
  const { t } = useTranslation();

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
        {t("Compare_prices_in_Moldova")}
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {t("Find_the_best_price_for_your_favorite_products")}
      </Typography>

      <Box sx={{ mt: 4, maxWidth: 600, mx: "auto" }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={`${t("Search_product")}...`}
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
