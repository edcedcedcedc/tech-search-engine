import { useEffect } from "react";
import { useStore } from "../store/store";

export function NetworkListener() {
  const setOffline = useStore((s) => s.setOffline);

  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [setOffline]);

  return null;
}
