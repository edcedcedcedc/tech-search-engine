import React, { Suspense, lazy } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { AnimatePresence } from "framer-motion";

import LandingPage from "../views/Landing";
import ErrorBoundary from "../components/ErrorBoundary";

const Home = lazy(() => import("../views/Home"));
const Products = lazy(() => import("../views/Products"));
const Disclaimer = lazy(() => import("../views/Disclaimer"));
const PrivacyPolicy = lazy(() => import("../views/PrivacyPolicy"));
const Contact = lazy(() => import("../views/Contact"));
const About = lazy(() => import("../views/About"));
const Source = lazy(() => import("../views/Source"));
const TermsOfUse = lazy(() => import("../views/TermsOfUse"));
const Services = lazy(() => import("../views/Services"));

const AppRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <ErrorBoundary>
      <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
        <Suspense
          fallback={
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "40vh",
              }}
            >
              <CircularProgress />
            </Box>
          }
        >
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/source" element={<Source />} />
              <Route path="/terms-of-use" element={<TermsOfUse />} />
              <Route path="/products" element={<Products />} />
              <Route path="/services" element={<Services />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </Box>
    </ErrorBoundary>
  );
};

export default AppRoutes;
