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
  Box,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import debounce from "lodash.debounce";
import ClickAwayListener from "@mui/material/ClickAwayListener";

import { autocomplete } from "../api/searchApi";
import { useStore } from "../store/store";
import { useTranslation } from "react-i18next";

export const SearchAutocomplete: React.FC = () => {
  const setQuery = useStore((s) => s.setQuery);
  const searchProducts = useStore((s) => s.searchProducts);

  const [value, setValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const anchorRef = React.useRef<HTMLInputElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const { t, i18n } = useTranslation();
  const lang = i18n.language.slice(0, 2);
  const [delayedLoading, setDelayedLoading] = React.useState(false);
  const loadingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const closeSuggestions = () => {
    setSuggestions([]);
  };

  const fetchSuggestions = React.useMemo(
    () =>
      debounce(async (q: string) => {
        if (q.length === 0) {
          setSuggestions([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        // show spinner after 100ms delay
        if (!loadingTimerRef.current) {
          loadingTimerRef.current = setTimeout(
            () => setDelayedLoading(true),
            100,
          );
        }

        try {
          const res = await autocomplete(q, lang);
          setSuggestions(res.suggestions);
        } finally {
          setLoading(false);
          // keep spinner visible for at least 300ms to avoid flicker
          setTimeout(() => {
            setDelayedLoading(false);
            if (loadingTimerRef.current) {
              clearTimeout(loadingTimerRef.current);
              loadingTimerRef.current = null;
            }
          }, 300);
        }
      }, 500),
    [lang],
  );

  React.useEffect(() => {
    return () => {
      fetchSuggestions.cancel();
    };
  }, [fetchSuggestions]);

  const submitSearch = (q: string) => {
    if (!q) return;
    setQuery(q);
    setSuggestions([]);
    searchProducts(q, lang);
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
    if (e.key === "Escape") {
      setSuggestions([]);
    }
  };

  const handleSelect = (q: string) => {
    setValue(q);
    submitSearch(q);
  };

  return (
    <Box ref={containerRef} sx={{ width: "100%", position: "relative" }}>
      <TextField
        fullWidth
        variant="outlined"
        inputRef={anchorRef}
        value={value}
        onBlur={() => {
          // delay allows click on suggestion to register first
          setTimeout(() => {
            setSuggestions([]);
          }, 100);
        }}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={`${t("Search_product")}...`}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
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
                <CircularProgress
                  size={24}
                  style={{
                    opacity: delayedLoading ? 1 : 0,
                    transition: "opacity 0.5s ease",
                    position: "absolute",
                  }}
                />
                {!delayedLoading && (
                  <IconButton
                    size="small"
                    onClick={() => submitSearch(value)}
                    style={{
                      position: "absolute",
                    }}
                  >
                    <SearchIcon fontSize="small" />
                  </IconButton>
                )}
              </div>
            </InputAdornment>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            paddingRight: "4px", // Adjust this if needed
          },
        }}
      />

      <Popper
        open={suggestions.length > 0}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        sx={{
          zIndex: 1300,
          width: containerRef.current
            ? `${containerRef.current.offsetWidth}px`
            : "auto",
          maxWidth: "100%",
        }}
        modifiers={[
          {
            name: "offset",
            options: {
              offset: [0, 8], // 8px gap between input and dropdown
            },
          },
        ]}
      >
        <ClickAwayListener onClickAway={closeSuggestions}>
          <Paper
            sx={(theme) => ({
              width: "100%",
              maxHeight: 300,
              overflowY: "auto",
              boxShadow: 3,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,

              // Use theme background instead of default white
              bgcolor: theme.palette.background.paper, // <-- dynamic based on light/dark mode
              // Scrollbar styles
              "&::-webkit-scrollbar": { width: theme.spacing(1) },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: theme.palette.background.default, // dark thumb for light mode
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
            })}
          >
            <List dense disablePadding>
              {suggestions.map((s, idx) => (
                <ListItemButton
                  key={`${s}-${idx}`}
                  onClick={() => handleSelect(s)}
                  sx={{
                    py: 1,
                    px: 2,
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  <ListItemText
                    primary={s}
                    primaryTypographyProps={{
                      noWrap: true,
                      style: { overflow: "hidden", textOverflow: "ellipsis" },
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
};
