import React from "react";
import {
  TextField,
  Popper,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import debounce from "lodash.debounce";

import { autocomplete } from "../api/searchApi";
import { useStore } from "../store/store";
import { useTranslation } from "react-i18next";

export const SearchAutocomplete: React.FC = () => {
  const setQuery = useStore((s) => s.setQuery);
  const searchProducts = useStore((s) => s.searchProducts);
  const { t } = useTranslation();
  const [value, setValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  const anchorRef = React.useRef<HTMLInputElement | null>(null);

  const fetchSuggestions = React.useMemo(
    () =>
      debounce(async (q: string) => {
        if (q.length < 2) {
          setSuggestions([]);
          return;
        }
        setLoading(true);
        try {
          const res = await autocomplete(q);
          setSuggestions(res.suggestions);
        } finally {
          setLoading(false);
        }
      }, 250),
    []
  );

  const submitSearch = (q: string) => {
    if (!q) return;
    setQuery(q);
    setSuggestions([]);
    searchProducts(q);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setValue(q);
    fetchSuggestions(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      submitSearch(value);
    }
  };

  const handleSelect = (q: string) => {
    setValue(q);
    submitSearch(q);
  };

  return (
    <>
      <TextField
        fullWidth
        variant="outlined"
        inputRef={anchorRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={`${t("Search_product")}...`}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={18} />
              ) : (
                <IconButton onClick={() => submitSearch(value)}>
                  <SearchIcon />
                </IconButton>
              )}
            </InputAdornment>
          ),
        }}
      />

      <Popper
        open={suggestions.length > 0}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        sx={{ zIndex: 1300 }}
      >
        <Paper sx={{ width: anchorRef.current?.offsetWidth }}>
          <List dense>
            {suggestions.map((s) => (
              <ListItemButton key={s} onClick={() => handleSelect(s)}>
                <ListItemText primary={s} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      </Popper>
    </>
  );
};
