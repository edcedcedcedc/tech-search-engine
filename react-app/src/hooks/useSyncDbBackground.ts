// hooks/useBackgroundSyncDb.ts
import { useEffect, useRef } from "react";
import { useSystemStore } from "../store/store";
import { getSystemVersion } from "../api/searchApi";
import { uiLog } from "../webhook/client/uiDebug";
import { backgroundSyncService } from "../services/syncDbBackground"

export const useBackgroundSyncDb = () => {
  const checkSystemVersion = useSystemStore((s) => s.checkSystemVersion);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined); // Add undefined and initialize
  const isRunningRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    const checkVersion = async () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;

      try {
        const data = await getSystemVersion();
        uiLog(`[BackgroundSyncDb] Checking version ${data.version}`);
        
        if (checkSystemVersion(data.version)) {
          uiLog(`[BackgroundSyncDb] Version changed to ${data.version}, triggering background sync`);
          await backgroundSyncService.forceBackgroundSync();
        }
      } catch (err: any) {
        uiLog(`[BackgroundSyncDb] Check failed: ${err?.message}`);
      } finally {
        isRunningRef.current = false;
        
        // Schedule next check only if still active
        if (isActive) {
          timeoutRef.current = setTimeout(checkVersion, 1 * 60 * 1000);
        }
      }
    };

    // Start immediately
    checkVersion();

    // Cleanup function
    return () => {
      uiLog(`[BackgroundSyncDb] Cleaning up`);
      isActive = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [checkSystemVersion]);

  return null;
};