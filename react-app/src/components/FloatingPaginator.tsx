import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Stack,
  Pagination,
  Paper,
  IconButton,
  Typography,
} from "@mui/material";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import CloseIcon from "@mui/icons-material/Close";
import { useStore } from "../store/store";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const FloatingPaginator: React.FC = () => {
  // All hooks must be called unconditionally at the top level
  const currentPage = useStore((state) => state.currentPage);
  const totalPages = useStore((state) => state.totalPages);
  const aggregatedProducts = useStore((state) => state.aggregatedProducts);
  const searchProducts = useStore((state) => state.searchProducts);
  const isLoading = useStore((state) => state.isLoading);
  const location = useLocation();
  const { i18n } = useTranslation();
  const lang = i18n.language.slice(0, 2);

  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  // Load saved position
  useEffect(() => {
    const saved = localStorage.getItem("paginator-position");
    if (saved) {
      try {
        setPosition(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Save position
  useEffect(() => {
    localStorage.setItem("paginator-position", JSON.stringify(position));
  }, [position]);

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number,
  ) => {
    if (page !== currentPage && !isLoading) {
      searchProducts(undefined, lang, page);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragRef.current && containerRef.current) {
      setIsDragging(true);
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      const maxX = window.innerWidth - containerRef.current.offsetWidth;
      const maxY = window.innerHeight - containerRef.current.offsetHeight;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Now we can do conditional returns after all hooks
  if (location.pathname !== "/products") return null;
  if (totalPages <= 1 || aggregatedProducts.length === 0 || !visible)
    return null;

  return (
    <Paper
      ref={containerRef}
      elevation={3}
      sx={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 9999,
        cursor: isDragging ? "grabbing" : "default",
        borderRadius: 2,
        overflow: "hidden",
        display: {
          xs: "none",
          sm: "none",
          md: "none",
          lg: "none",
          xl: "block",
        },
        transition: isDragging ? "none" : "box-shadow 0.2s ease",
        "&:hover": {
          boxShadow: 6,
        },
      }}
    >
      {/* Drag handle bar */}
      <Box
        ref={dragRef}
        onMouseDown={handleMouseDown}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1,
          py: 0.5,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          cursor: "grab",
          userSelect: "none",
          "&:active": {
            cursor: "grabbing",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <DragHandleIcon sx={{ fontSize: 18 }} />
          <Typography variant="caption" fontWeight={500}>
            Paginator
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={() => setVisible(false)}
          sx={{
            color: "inherit",
            padding: 0.5,
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.1)",
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Pagination content */}
      <Box sx={{ p: 2, bgcolor: "background.paper" }}>
        <Stack spacing={2}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            variant="outlined"
            color="primary"
            disabled={isLoading}
            size="medium"
          />
        </Stack>
      </Box>
    </Paper>
  );
};

export default FloatingPaginator;
