// hooks/useSystemVersion.ts
import { useEffect, useRef } from "react";
import { useStore, useSystemStore } from "../store/store";
import { getSystemVersion } from "../api/searchApi";
import { uiLog } from "../webhook/client/uiDebug";

/**
 * Hook that ONLY manages system version state
 * Does NOT trigger any dialogs or side effects
 */
export const useSyncDb = () => {
  const openSessionExpired = useStore((s) => s.openSessionExpired)
  const systemVersion = useSystemStore((s) => s.systemVersion);
  const setSystemVersion = useSystemStore((s) => s.setSystemVersion);
  const checkInProgress = useRef(false);

  useEffect(() => {
    const checkVersion = async () => {
      if (checkInProgress.current) return;
      
      try {
        checkInProgress.current = true;
        const data = await getSystemVersion();
        uiLog(`[SystemVersion] Fetched: ${data.version}, Current: ${systemVersion || 'none'}`);

        if (!systemVersion) {
          // First time - just set it
          setSystemVersion(data.version);
          uiLog(`[SystemVersion] Initialized to ${data.version}`);
        } else if (systemVersion !== data.version) {
          // Just update the version, don't trigger anything
          uiLog(`[SystemVersion] Version changed from ${systemVersion} to ${data.version}`);
          setSystemVersion(data.version);
          openSessionExpired();
        }
      } catch (err: any) {
        uiLog(`[SystemVersion] Check failed: ${err?.message}`);
      } finally {
        checkInProgress.current = false;
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [systemVersion, setSystemVersion]);
};