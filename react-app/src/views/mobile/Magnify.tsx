// components/MagnifyOnScroll.tsx
import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Box, useTheme } from "@mui/material";

interface MagnifyOnScrollProps {
  children: React.ReactNode;
}

const MagnifyOnScroll: React.FC<MagnifyOnScrollProps> = ({ children }) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  // Track scroll progress through the container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Transform scroll progress (0 to 1) into visual effects
  // Elements magnify when scrollProgress > 0.7 (near bottom)
  const scale = useTransform(
    scrollYProgress,
    [0, 0.7, 0.9, 1],
    [1, 1, 1.1, 1.2], // Start magnifying after 70% scroll
  );

  const y = useTransform(
    scrollYProgress,
    [0.7, 1],
    [0, -10], // Slight upward pull
  );

  const blur = useTransform(
    scrollYProgress,
    [0.7, 1],
    [0, 2], // Slight blur for "lens" effect
  );

  const glow = useTransform(
    scrollYProgress,
    [0.8, 1],
    [0, 1], // Glow intensity
  );

  return (
    <Box
      ref={containerRef}
      sx={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        pb: 10, // Extra padding at bottom for magnification zone
      }}
    >
      {/* Animated content */}
      <motion.div
        style={{
          scale,
          y,
          filter: blur.get() > 0 ? `blur(${blur.get()}px)` : "none",
          transformOrigin: "center bottom",
          width: "100%",
          height: "100%",
        }}
      >
        {children}
      </motion.div>

      {/* Glow effect at the bottom */}
      <motion.div
        style={{
          position: "fixed",
          bottom: 80,
          left: 0,
          right: 0,
          height: 150,
          background: `linear-gradient(to top, ${theme.palette.primary.main}30, transparent)`,
          pointerEvents: "none",
          zIndex: 1000,
          opacity: glow,
        }}
      />

      {/* Magnification zone indicator (subtle) */}
      <motion.div
        style={{
          position: "fixed",
          bottom: 80,
          left: 0,
          right: 0,
          height: 4,
          background: theme.palette.primary.main,
          scaleX: scrollYProgress,
          transformOrigin: "left",
          opacity: 0.5,
          zIndex: 1001,
        }}
      />
    </Box>
  );
};

export default MagnifyOnScroll;
