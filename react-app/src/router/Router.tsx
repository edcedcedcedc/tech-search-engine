import React, { Suspense, lazy } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { AnimatePresence } from "framer-motion";

import ErrorBoundary from "../components/ErrorBoundary";
import { useSessionStart } from "../hooks/useSessionStart";
import { FullScreenLoader } from "../components/FullScreenLoader";
/* import HowTo from "../views/Qna";

import SourceMobile from "../views/mobile/Sources";

const Home = lazy(() => import("../views/Home"));
const Products = lazy(() => import("../views/Products"));
const Disclaimer = lazy(() => import("../views/Disclaimer"));
const PrivacyPolicy = lazy(() => import("../views/PrivacyPolicy"));
const Contact = lazy(() => import("../views/Contact"));
const About = lazy(() => import("../views/About"));
const Source = lazy(() => import("../views/Source"));
const TermsOfUse = lazy(() => import("../views/TermsOfUse"));
const Services = lazy(() => import("../views/Services"));
const Offers = lazy(() => import("../components/ProductOffersTable"));
 */

// Mobile views
import HomeMobile from "../views/mobile/Home";
import BottomNav from "../views/mobile/BottomNav";
import ServicesMobile from "../views/mobile/Services";
import QnaMobile from "../views/mobile/Qna";
import ProductsMobile from "../views/mobile/Products";
import { ScrollContainer } from "../components/ScrollContainer";
import { useTranslation } from "react-i18next";

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const { i18n } = useTranslation();
  useSessionStart();

  return (
    <ErrorBoundary>
      <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
        <Suspense fallback={<FullScreenLoader />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route
                path="/"
                element={
                  <ScrollContainer route="/">
                    <HomeMobile key={i18n.language} />
                  </ScrollContainer>
                }
              />
              <Route
                path="/products"
                element={
                  <ScrollContainer route="/products">
                    <ProductsMobile key={i18n.language} />
                  </ScrollContainer>
                }
              />
              <Route
                path="/services"
                element={
                  <ScrollContainer route="/services">
                    <ServicesMobile key={i18n.language} />
                  </ScrollContainer>
                }
              />
              <Route
                path="/faq"
                element={
                  <ScrollContainer route="/faq">
                    <QnaMobile key={i18n.language} />
                  </ScrollContainer>
                }
              />
            </Routes>
          </AnimatePresence>
        </Suspense>
        {isMobile && <BottomNav />}
      </Box>
    </ErrorBoundary>
  );
};

export default AppRoutes;
