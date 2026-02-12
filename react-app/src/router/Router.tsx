import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
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

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -50 }}
    transition={{ duration: 0.25 }}
    style={{ width: "100%" }}
  >
    {" "}
    {children}{" "}
  </motion.div>
);

const AppRoutes: React.FC<any> = () => {
  return (
    <ErrorBoundary>
      <Box sx={{ position: "relative" }}>
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
          <AnimatePresence mode="sync">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/source" element={<Source />} />
              <Route path="/terms-of-use" element={<TermsOfUse />} />
              <Route path="/products" element={<Products />} />
              {/*  <Route path="*" element={<Navigate to="/landing" replace />} />*/}
              <Route path="/services" element={<Services />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </Box>
    </ErrorBoundary>
  );
};

export default AppRoutes;
