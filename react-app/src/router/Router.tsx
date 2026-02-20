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
const HomeMobile = lazy(() => import("../views/mobile/Home"));
const ProductsMobile = lazy(() => import("../views/mobile/Products"));
import BottomNav from "../views/mobile/BottomNav";
import ServicesMobile from "../views/mobile/Services";
import QnaMobile from "../views/mobile/Qna";
/* import MagnifyOnScroll from "../views/mobile/Magnify"; */

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  useSessionStart();
  console.log("📱 AppRoutes - isMobile:", isMobile);
  console.log("📱 AppRoutes - screen width:", window.innerWidth);
  console.log("📱 AppRoutes - lg breakpoint:", theme.breakpoints.values.lg);
  return (
    <ErrorBoundary>
      <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
        <Suspense fallback={<FullScreenLoader />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              {/* Mobile routes */}

              <Route path="/" element={<HomeMobile />} />
              <Route path="/products" element={<ProductsMobile />} />
              <Route path="/services" element={<ServicesMobile />} />
              <Route path="/faq" element={<QnaMobile />} />

              {/*    <Route path="/privacy" element={<PrivacyPolicyMobile />} />
              <Route path="/terms" element={<TermsOfUseMobile />} />
              <Route path="/disclaimer" element={<DisclaimerMobile />} /> */}
              {/* <Route path="/source" element={<SourceMobile />} /> */}
              {/* Desktop routes (keep existing) */}
              {/*  <Route path="/desktop" element={<Home />} /> */}
              {/* ... other desktop routes */}
            </Routes>
          </AnimatePresence>
        </Suspense>
        {isMobile && <BottomNav />}
      </Box>
    </ErrorBoundary>
  );
};

export default AppRoutes;
