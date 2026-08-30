const LOG_ENDPOINT = "http://localhost:5179/ui-debug";

/**
 * Send a log message to the Node logger.
 * Safe for browser, will not block UI if server is down.
 */
export function uiLog(msg: string) {
  fetch(LOG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msg }),
    keepalive: true,
  }).catch((err) => {
    if (
      !navigator.onLine ||
      err?.name === "TypeError" // fetch network error
    ) {
      return;
    }

    if (import.meta.env.DEV) {
      console.warn("uiLog unexpected error:", err);
    }
  });
}