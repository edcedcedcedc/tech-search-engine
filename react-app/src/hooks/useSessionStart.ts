import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { uiLog } from "../webhook/client/uiDebug";

/**
 * Hook that ensures user lands on home page when starting a new session
 * (after tab/browser close)
 */
export const useSessionStart = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if this is a new session
    const checkNewSession = () => {
      const sessionStart = sessionStorage.getItem('session-start');
      const currentPath = window.location.pathname;
      
      if (!sessionStart) {
        // This is a new session (tab just opened)
        sessionStorage.setItem('session-start', Date.now().toString());
        
        // Only redirect if not already on home/landing and not on a public page
        //const publicPaths = ['/landing', '/disclaimer', '/privacy-policy', '/contact', '/about', '/source', '/terms-of-use', '/services'];
        
        if (currentPath !== '/') {
          // Use setTimeout to avoid React state updates during render
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 0);
        }
      }
    };

    checkNewSession();

    // Optional: Detect tab close (for logging/cleanup)
    const handleTabClose = (_event: BeforeUnloadEvent) => {
      // You can log or perform cleanup here if needed
      uiLog('[SESSION] Tab closing, session will reset on next open');
    };

    window.addEventListener('beforeunload', handleTabClose);

    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
    };
  }, [navigate]);
};