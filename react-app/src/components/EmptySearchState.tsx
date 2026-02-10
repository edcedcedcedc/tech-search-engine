import React, { useEffect, useState } from "react";
import { Box, Typography, Fade } from "@mui/material";
import { useTranslation } from "react-i18next";

interface EmptySearchStateProps {
  query?: string;
  loading?: boolean; // optional: pass the loading state
}

const EmptySearchState: React.FC<EmptySearchStateProps> = ({
  query,
  loading,
}) => {
  const { t } = useTranslation();
  const hasQuery = Boolean(query && query.trim().length > 0);

  const [show, setShow] = useState(false);
  const delay = 300; // ms before showing empty state

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShow(true), delay);
      return () => clearTimeout(timer);
    } else {
      setShow(false); // hide if loading starts
    }
  }, [loading]);

  return (
    <Fade in={show} timeout={300}>
      <Box
        sx={{
          mt: 6,
          px: 2,
          textAlign: "center",
          color: "text.secondary",
        }}
      >
        <Typography
          variant={hasQuery ? "h6" : "h5"}
          sx={{
            fontWeight: hasQuery ? 500 : 400,
            mb: 1,
            color: "text.primary",
          }}
        >
          {hasQuery
            ? t("No_Products_Found_Empty")
            : t("Search_For_Products_Empty")}
        </Typography>

        <Typography variant="body2">
          {hasQuery
            ? `${t("No_Results_For_Empty")} "${query}"`
            : t("Try_Typing_Product_Or_Brand_Empty")}
        </Typography>
      </Box>
    </Fade>
  );
};

export default EmptySearchState;
