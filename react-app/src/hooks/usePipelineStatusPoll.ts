import { useEffect } from "react";
import { useSystemStatusStore } from "../store/store";

/**
 * Poll pipelinie status every hour, but only update UI once per 24 hours.
 * Shows spinner if an update is actually performed.
 */
export const usePipelineStatusPoll = () => {
  const fetchStatus = useSystemStatusStore((s) => s.fetchStatus);

  useEffect(() => {
    const poll = async () => {
      const state = useSystemStatusStore.getState();
      const last = state.lastFetchedAt ? new Date(state.lastFetchedAt).getTime() : 0;
      const now = Date.now();

      // Only fetch if never fetched or more than 24h passed
      if (!state.lastFetchedAt || now - last > 24 * 60 * 60 * 1000) {
        await fetchStatus(); // show spinner
      } else {
        await fetchStatus(false); // silent update
      }
    };

    // Initial check
    poll();

    // Poll every hour
    const interval = setInterval(poll, 12 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStatus]);
};