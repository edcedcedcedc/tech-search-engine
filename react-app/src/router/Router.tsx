import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, CircularProgress, Fade, LinearProgress } from "@mui/material";
import { useStore } from "../store/store";
import LandingPage from "../views/Landing";

const Home = lazy(() => import("../views/Home"));
const Products = lazy(() => import("../views/Products"));
const Disclaimer = lazy(() => import("../views/Disclaimer"));
const PrivacyPolicy = lazy(() => import("../views/PrivacyPolicy"));
const Contact = lazy(() => import("../views/Contact"));
const About = lazy(() => import("../views/About"));
const Source = lazy(() => import("../views/Source"));
const TermsOfUse = lazy(() => import("../views/TermsOfUse"));

const AppRoutes: React.FC<any> = () => {
  const isLoading = useStore((s) => s.isLoading);

  return (
    <Box sx={{ position: "relative" }}>
      <Fade in={isLoading} timeout={300} unmountOnExit={false}>
        <LinearProgress
          variant="query"
          sx={{
            position: "static", // fixed to viewport
            top: 0,
            left: 0,
            width: "100%",
            zIndex: (theme) => theme.zIndex.appBar + 1, // above AppBar but below Drawer
          }}
        />
      </Fade>
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
          <Route path="/products" element={<Products />} />
          <Route path="*" element={<Navigate to="/landing" replace />} />
        </Routes>
      </Suspense>
    </Box>
  );
};

export default AppRoutes;
