import React, { Suspense, lazy } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import { AnimatePresence } from "framer-motion";

import ErrorBoundary from "../components/ErrorBoundary";
import { useSessionStart } from "../hooks/useSessionStart";
import { FullScreenLoader } from "../components/FullScreenLoader";
import HowTo from "../views/HowTo";

const Home = lazy(() => import("../views/Home"));
const Products = lazy(() => import("../views/Products"));
const Disclaimer = lazy(() => import("../views/Disclaimer"));
const PrivacyPolicy = lazy(() => import("../views/PrivacyPolicy"));
const Contact = lazy(() => import("../views/Contact"));
const About = lazy(() => import("../views/About"));
const Source = lazy(() => import("../views/Source"));
const TermsOfUse = lazy(() => import("../views/TermsOfUse"));
const Services = lazy(() => import("../views/Services"));
const Compare = lazy(() => import("../views/Compare"));

const AppRoutes: React.FC = () => {
  const location = useLocation();
  useSessionStart();

  return (
    <ErrorBoundary>
      <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
        <Suspense fallback={<FullScreenLoader />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/source" element={<Source />} />
              <Route path="/terms-of-use" element={<TermsOfUse />} />
              <Route path="/products" element={<Products />} />
              <Route path="/services" element={<Services />} />
              <Route path="/how-to" element={<HowTo />} />
              <Route path="/compare" element={<Compare />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </Box>
    </ErrorBoundary>
  );
};

export default AppRoutes;
