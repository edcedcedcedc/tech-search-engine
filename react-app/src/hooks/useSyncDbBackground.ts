// hooks/useBackgroundSyncDb.ts
import { useEffect, useRef } from "react";
import { useSystemStore } from "../store/store";
import { getSystemVersion } from "../api/searchApi";
import { uiLog } from "../webhook/client/uiDebug";
import { backgroundSyncService } from "../services/syncDbBackground"

export const useBackgroundSyncDb = () => {
  const checkSystemVersion = useSystemStore((s) => s.checkSystemVersion);
  const intervalRef = useRef<any | null>(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
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
      }
    };

    const init = async () => {
      await checkVersion();
      intervalRef.current = setInterval(checkVersion, 5 * 60 * 1000);
    };

    init();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}