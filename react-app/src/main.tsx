import { createRoot } from "react-dom/client";
import { ThemeProvider, CssBaseline } from "@mui/material";

import getTheme from "./theme/theme";
import { useThemeStore } from "./store/store";
import App from "./App";
import "./i18n";
import { indexedDbService } from "./services/indexedDb";
import { uiLog } from "./webhook/client/uiDebug";
import { usePrefetch } from "./hooks/usePrefetch";
import { useThemePreloadSetup } from "./hooks/useThemePreloadSetup";
import { useHydrateLastQuery } from "./hooks/useHydrateLastQuery";
import { useSyncDb } from "./hooks/useSyncDb";
import React from "react";
import { useBackgroundSyncDb } from "./hooks/useSyncDbBackground";

const Root = () => {
  const effectiveMode = useThemeStore((state) => state.effectiveMode);
  const theme = React.useMemo(() => getTheme(effectiveMode), [effectiveMode]);
  usePrefetch();
  /* useSyncDb(); */
  useBackgroundSyncDb();
  useHydrateLastQuery();
  useThemePreloadSetup();
  indexedDbService.init().catch((error) => {
    uiLog(`Failed to initialize IndexedDB: ${error}`);
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);
