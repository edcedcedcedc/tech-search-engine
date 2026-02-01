// src/Routes.tsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useStore } from "../store/store";
import LandingPage from "../views/Landing";

const Home = lazy(() => import("../views/Home"));
const Products = lazy(() => import("../views/Products")); // <- new
const Disclaimer = lazy(() => import("../views/Disclaimer"));
const PrivacyPolicy = lazy(() => import("../views/PrivacyPolicy"));
const Contact = lazy(() => import("../views/Contact"));
const About = lazy(() => import("../views/About"));
const Source = lazy(() => import("../views/Source"));
const TermsOfUse = lazy(() => import("../views/TermsOfUse"));

const AppRoutes: React.FC<any> = () => {
  const isLoading = useStore((s) => s.isLoading);

  if (isLoading) {
    return (
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
    );
  }

  return (
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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/disclaimer" element={<Disclaimer />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/source" element={<Source />} />
        <Route path="/terms-of-use" element={<TermsOfUse />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/products" element={<Products />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
