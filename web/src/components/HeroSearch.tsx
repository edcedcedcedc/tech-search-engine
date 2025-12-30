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
import { useEffect, useState } from "react";
import { useProducts } from "../hooks/useProducts";
import { useProductContext } from "../mocks/useProductContextHook";
import SortBy from "./SortBy";

const HeroSearch = () => {
  const theme = useTheme();
  const { t } = useTranslation();

  // todo remove in future
  const { setProducts, filters, setLoading } = useProductContext();

  // in future use query to live search
  const [input, setInput] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  // const filters = store.getFilters()
  const { products, loading } = useProducts({ search: query, filters });

  const handleSearch = () => {
    console.log("Searching for:", query);
    setQuery(input);
    // TODO: integrate live search / navigate to results page
  };

  useEffect(() => {
    console.log("loading:", loading);
    console.log("products:", products);
    setLoading(loading);
  }, [loading, products, setLoading]);

  useEffect(() => {
    setProducts(products);
  }, [products, setProducts]);

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

      <Box sx={{ mt: 4, maxWidth: 600, mx: "auto", display: "flex", gap: 8 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={`${t("Search_product")}...`}
          value={input}
          // for live search, needs debounced call
          // onChange={(e) => setQuery(e.target.value)}
          onChange={(e) => setInput(e.target.value)}
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
        <SortBy />
      </Box>
    </Box>
  );
};

export default HeroSearch;
