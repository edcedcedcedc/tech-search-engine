// router/Router.tsx
import React, { Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { AnimatePresence } from "framer-motion";

import ErrorBoundary from "../components/ErrorBoundary";
import { useSessionStart } from "../hooks/useSessionStart";
import { FullScreenLoader } from "../components/FullScreenLoader";

// Mobile views
import HomeMobile from "../views/mobile/Home";
import BottomNav from "../views/mobile/BottomNav";
import ServicesMobile from "../views/mobile/Services";
import QnaMobile from "../views/mobile/Qna";
import ProductsMobile from "../views/mobile/Products";
import { ScrollContainer } from "../components/ScrollContainer";
import { useTranslation } from "react-i18next";
import { uiLog } from "../webhook/client/uiDebug"; // assuming you have this

interface AppRoutesProps {
  scrollRefs: Record<string, React.RefObject<HTMLDivElement | null>>;
}

const AppRoutes: React.FC<AppRoutesProps> = ({ scrollRefs }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const { i18n } = useTranslation();

  useSessionStart();

  // Debug log route and language changes
  useEffect(() => {
    uiLog(
      `[AppRoutes] Mounted or route changed: ${location.pathname}, language=${i18n.language}`,
    );
    uiLog(
      `[AppRoutes] Scroll refs: ${Object.keys(scrollRefs)
        .map((k) => `${k}: ${!!scrollRefs[k].current}`)
        .join(", ")}`,
    );
  }, [location.pathname, i18n.language, scrollRefs]);

  return (
    <ErrorBoundary>
      <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
        <Suspense fallback={<FullScreenLoader />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route
                path="/"
                element={
                  <ScrollContainer route="/" ref={scrollRefs["/"]}>
                    <HomeMobile key={i18n.language} />
                  </ScrollContainer>
                }
              />
              <Route
                path="/products"
                element={
                  <ScrollContainer
                    route="/products"
                    ref={scrollRefs["/products"]}
                  >
                    <ProductsMobile key={i18n.language} />
                  </ScrollContainer>
                }
              />
              <Route
                path="/services"
                element={
                  <ScrollContainer
                    route="/services"
                    ref={scrollRefs["/services"]}
                  >
                    <ServicesMobile key={i18n.language} />
                  </ScrollContainer>
                }
              />
              <Route
                path="/faq"
                element={
                  <ScrollContainer route="/faq" ref={scrollRefs["/faq"]}>
                    <QnaMobile key={i18n.language} />
                  </ScrollContainer>
                }
              />
            </Routes>
          </AnimatePresence>
        </Suspense>

        {/* Bottom nav debug */}
        {isMobile &&
          (() => {
            uiLog(`[AppRoutes] Rendering BottomNav for mobile`);
            return <BottomNav />;
          })()}
      </Box>
    </ErrorBoundary>
  );
};

export default AppRoutes;
