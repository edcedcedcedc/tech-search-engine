/*  

---

# **Autocomplete Guide for Your React + Django App**

### **1️⃣ Backend: Autocomplete API**

* **Endpoint:** `/api/autocomplete`
* **Throttle:** limit requests per IP (Layer1Throttle)
* **Logic:**

  1. Cache canonical product cluster names.
  2. Use `RapidFuzz` to match query against names.
  3. Apply `FUZZY_THRESHOLD_AUTOCOMPLETE` to filter suggestions.
  4. Return top N suggestions (`AUTOCOMPLETE_LIMIT`).

**Example response:**

```json
{
  "suggestions": ["iPhone 14", "iPhone 14 Pro"],
  "raw_matches": [...]
}
```

---

### **2️⃣ Frontend: `SearchAutocomplete` Component**

* **Imports:**

  * `TextField`, `Popper`, `Paper`, `List`, `ListItemButton`, `ListItemText` from MUI
  * `SearchIcon` for the button
  * `ClickAwayListener` to detect clicks outside
  * `lodash.debounce` to throttle requests
  * `autocomplete` API function
  * `useStore` for global query state

---

### **3️⃣ State Management**

```ts
const [value, setValue] = React.useState("");        // input value
const [suggestions, setSuggestions] = React.useState<string[]>([]); // autocomplete results
const [loading, setLoading] = React.useState(false); // show spinner
```

---

### **4️⃣ Ref for positioning Popper**

```ts
const anchorRef = React.useRef<HTMLInputElement | null>(null);
```

* Needed to position the suggestion dropdown under the input.

---

### **5️⃣ Debounced API Call**

```ts
const fetchSuggestions = React.useMemo(
  () =>
    debounce(async (q: string) => {
      if (q.length < 2) return setSuggestions([]);
      setLoading(true);
      const res = await autocomplete(q);
      setSuggestions(res.suggestions);
      setLoading(false);
    }, 250), // adjust delay for UX
  []
);
```

* **Why debounce?** Avoid sending API requests on every keystroke.
* **Tip:** Increase delay to 400–500ms for smoother feel.

---

### **6️⃣ Handle Input Change**

```ts
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const q = e.target.value;
  setValue(q);
  fetchSuggestions(q);
};
```

* Updates `value` and triggers debounced API call.

---

### **7️⃣ Handle Search Submit**

```ts
const submitSearch = (q: string) => {
  if (!q) return;
  setQuery(q);          // save to Zustand
  setSuggestions([]);   // hide dropdown
  searchProducts(q);    // trigger search results
};
```

* Triggered on Enter key or clicking the search icon.

---

### **8️⃣ Handle Selection**

```ts
const handleSelect = (q: string) => {
  setValue(q);
  submitSearch(q); // same as pressing Enter
};
```

* Clicking a suggestion sets the input and runs search.

---

### **9️⃣ Handle Keyboard**

```ts
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Enter") submitSearch(value);
  if (e.key === "Escape") setSuggestions([]); // hide dropdown
};
```

---

### **🔟 Handle Outside Click**

```ts
const closeSuggestions = () => setSuggestions([]);
```

* Wrap the Popper in `ClickAwayListener` to close suggestions if user clicks elsewhere.

---

### **1️⃣1️⃣ Render Input + Dropdown**

```tsx
<TextField
  fullWidth
  variant="outlined"
  inputRef={anchorRef}
  value={value}
  onChange={handleChange}
  onKeyDown={handleKeyDown}
  placeholder="Search products…"
  InputProps={{
    endAdornment: (
      <InputAdornment position="end">
        {loading ? <CircularProgress size={18} /> : 
          <IconButton onClick={() => submitSearch(value)}>
            <SearchIcon />
          </IconButton>}
      </InputAdornment>
    ),
  }}
/>

<Popper open={suggestions.length > 0} anchorEl={anchorRef.current} placement="bottom-start">
  <ClickAwayListener onClickAway={closeSuggestions}>
    <Paper sx={{ width: anchorRef.current?.offsetWidth }}>
      <List dense>
        {suggestions.map((s) => (
          <ListItemButton key={s} onClick={() => handleSelect(s)}>
            <ListItemText primary={s} />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  </ClickAwayListener>
</Popper>
```

* `TextField` is the input
* `Popper` shows suggestions
* `ClickAwayListener` closes dropdown on outside click
* `CircularProgress` shows loading state
* `IconButton` triggers search manually

---

### **1️⃣2️⃣ Optional Tuning**

* Debounce delay: 250–500ms
* Fuzzy threshold: 60+
* Minimum characters before search: 2
* Max suggestions: 10

---

###  **Flow Summary**

1. User types → `handleChange` → triggers `fetchSuggestions`.
2. `fetchSuggestions` calls backend via debounce → sets `suggestions`.
3. Dropdown appears (`Popper`) under input.
4. User selects suggestion → `handleSelect` → sets input & triggers search.
5. User clicks outside → `ClickAwayListener` → closes suggestions.
6. User presses Enter → triggers `submitSearch`.
7. User presses Escape → closes suggestions.

---


 */

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
  const { t, i18n } = useTranslation();
  const lang = i18n.language.slice(0, 2);
  const closeSuggestions = () => {
    setSuggestions([]);
  };

  const fetchSuggestions = React.useMemo(
    () =>
      debounce(async (q: string) => {
        if (q.length < 2) {
          setSuggestions([]);
          return;
        }
        setLoading(true);
        try {
          const res = await autocomplete(q, lang);
          setSuggestions(res.suggestions);
        } finally {
          setLoading(false);
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
    <>
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
        <ClickAwayListener onClickAway={closeSuggestions}>
          <Paper sx={{ width: anchorRef.current?.offsetWidth }}>
            <List dense>
              {suggestions.map((s, idx) => (
                <ListItemButton
                  key={`${s}-${idx}`}
                  onClick={() => handleSelect(s)}
                  onDoubleClick={() => {}}
                >
                  <ListItemText primary={s} />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
};
