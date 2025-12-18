// src/Routes.tsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Disclaimer from "../views/Disclaimer";
import Home from "../views/Home";
import PrivacyPolicy from "../views/PrivacyPolicy";
import Contact from "../views/Contact";
import About from "../views/About";
import Source from "../views/Source";
import TermsOfUse from "../views/TermsOfUse";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/disclaimer" element={<Disclaimer />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/about" element={<About />} />
      <Route path="/source" element={<Source />} />
      <Route path="/terms-of-use" element={<TermsOfUse />} />
    </Routes>
  );
};

export default AppRoutes;
