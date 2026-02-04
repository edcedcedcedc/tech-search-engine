const LOG_ENDPOINT = "http://localhost:5179/log";

/**
 * Send a log message to the Node logger.
 * Safe for browser, will not block UI if server is down.
 */
export function uiLog(msg: string) {
  try {
    fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msg }),
      keepalive: true, // survives page unload
    });
  } catch (err) {
    // fail silently, do not break UI
    console.warn("Failed to send UI log", err);
  }
}