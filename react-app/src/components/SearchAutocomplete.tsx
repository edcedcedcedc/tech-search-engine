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
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import debounce from "lodash.debounce";
import ClickAwayListener from "@mui/material/ClickAwayListener";

import { autocomplete } from "../api/searchApi";
import { useStore } from "../store/store";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { Suggestion } from "../types/Suggestion";
import { uiLog } from "../webhook/client/uiDebug";

export const SearchAutocomplete: React.FC = () => {
  const setQuery = useStore((s) => s.setQuery);
  const searchProducts = useStore((s) => s.searchProducts);

  const [value, setValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [_loading, setLoading] = React.useState(false);
  const anchorRef = React.useRef<HTMLInputElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const { t, i18n } = useTranslation();
  const lang = i18n.language.slice(0, 2);
  const [delayedLoading, setDelayedLoading] = React.useState(false);
  const loadingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const autocompleteResetToken = useStore((s) => s.autocompleteResetToken);
  const isLoading = useStore((state) => state.isLoading);
  const isOffline = useStore((state) => state.isOffline);
  const russianRegex = /[А-Яа-яЁё]/;
  const closeSuggestions = () => {
    uiLog(`autocomplete | closeSuggestions`);
    setSuggestions([]);
  };

  const navigate = useNavigate();

  const fetchSuggestions = React.useCallback(
    debounce(async (q: string) => {
      uiLog(`autocomplete | fetchSuggestions | start | query=${q}`);

      if (isOffline) {
        uiLog(`autocomplete | offline detected, skipping autocomplete`);
        setSuggestions([]);
        setLoading(false);
        return;
      }
      if (q.length === 0) {
        uiLog(`autocomplete | fetchSuggestions | empty query`);
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      if (!loadingTimerRef.current) {
        loadingTimerRef.current = setTimeout(() => {
          setDelayedLoading(true);
          uiLog(`autocomplete | delayed loading=true | query=${q}`);
        }, 100);
      }

      const attemptFetch = async (): Promise<void> => {
        try {
          const res = await autocomplete(q, lang);
          setSuggestions(res.suggestions);
          uiLog(
            `autocomplete | fetchSuggestions | success | query=${q} | results=${res.suggestions.length}`,
          );
        } catch (err: any) {
          const status = err?.response?.status || err?.code;

          // Network offline / unreachable
          if (
            !navigator.onLine ||
            status === "ERR_NETWORK" ||
            err.message === "Network Error"
          ) {
            uiLog(`autocomplete | network offline detected`);
            useStore.getState().setOffline(true); // trigger OfflineDialog
            setSuggestions([]); // hide dropdown
            return; // stop retries
          }

          // Unknown error
          uiLog(
            `autocomplete | fetchSuggestions | error | query=${q} | err=${err?.message}`,
          );
          setSuggestions([]);
        } finally {
          setLoading(false);
          setTimeout(() => {
            setDelayedLoading(false);
            if (loadingTimerRef.current) {
              clearTimeout(loadingTimerRef.current);
              loadingTimerRef.current = null;
            }
          }, 300);
        }
      };

      await attemptFetch();
    }, 500),
    [lang],
  );

  React.useEffect(() => {
    return () => {
      fetchSuggestions.cancel();
      uiLog(`autocomplete | fetchSuggestions | cancelled`);
    };
  }, [fetchSuggestions]);

  React.useEffect(() => {
    uiLog("autocomplete | reset via store");

    setValue("");
    setSuggestions([]);
    setLoading(false);
    setDelayedLoading(false);

    fetchSuggestions.cancel();

    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  }, [autocompleteResetToken, fetchSuggestions]);

  const submitSearch = async (q: string) => {
    if (!navigator.onLine) {
      uiLog(`autocomplete | search icon clicked | offline detected`);
      useStore.getState().setOffline(true); // trigger OfflineDialog
      setSuggestions([]); // hide dropdown
      return;
    }

    uiLog(`autocomplete | submitSearch | query=${q}`);
    setQuery(q);

    await searchProducts(q, lang);

    // Navigate only after search is complete
    if (q) {
      navigate("/products");
    }

    setSuggestions([]);
    setLoading(false);
    setDelayedLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    if (russianRegex.test(q)) {
      // Option 1: block input and show warning
      setValue(""); // clear input
      fetchSuggestions("");
      return;
    }
    uiLog(`autocomplete | handleChange | value=${q}`);
    setValue(q);
    fetchSuggestions(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    uiLog(`autocomplete | handleKeyDown | key=${e.key}`);
    if (e.key === "Enter") {
      submitSearch(value);
    }
    if (e.key === "Escape") {
      setSuggestions([]);
    }
  };

  const handleSelect = (s: Suggestion) => {
    uiLog(`autocomplete | handleSelect | suggestion=${s.name}`);
    submitSearch(s.name); // trigger search immediately
    setSuggestions([]); // close dropdown
  };

  return (
    <Box ref={containerRef} sx={{ width: "100%", position: "relative" }}>
      <TextField
        fullWidth
        variant="outlined"
        inputRef={anchorRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={`${t("Search_product")}`}
        inputProps={{
          style: {
            fontSize: "16px", // Prevents iOS zoom on focus
            WebkitTextSizeAdjust: "100%", // Prevents text size adjustment
          },
        }}
        InputProps={{
          startAdornment: (
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
                {
                  <CircularProgress
                    size={24}
                    style={{
                      opacity: delayedLoading ? 1 : 0,
                      transition: "opacity 0.5s ease",
                      position: "absolute",
                    }}
                  />
                }
                {!delayedLoading && (
                  <IconButton
                    size="medium"
                    disabled={isLoading || isOffline}
                    onClick={() => {
                      uiLog(
                        `autocomplete | search icon clicked | value=${value}`,
                      );
                      submitSearch(value);
                    }}
                    style={{
                      position: "absolute",
                    }}
                  >
                    <Tooltip
                      title={t("Search_Tooltip")}
                      enterDelay={500}
                      leaveDelay={0}
                    >
                      <SearchIcon fontSize="medium" />
                    </Tooltip>
                  </IconButton>
                )}
              </div>
            </InputAdornment>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            paddingLeft: 0, // removes left padding of the root
          },
          "& .MuiOutlinedInput-input": {
            paddingLeft: 0, // removes left padding inside the input
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
              {suggestions.map((s: any, idx: Number) => (
                <ListItemButton
                  key={`${s}-${idx}`}
                  onClick={() => handleSelect(s)}
                  onMouseDown={(e) => e.preventDefault()}
                  sx={{
                    py: 1,
                    px: 2,
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  <ListItemText
                    primary={s.name}
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
