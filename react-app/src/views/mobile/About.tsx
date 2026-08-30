// components/AboutView.tsx
import React from "react";
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  useTheme,
} from "@mui/material";
import { ArrowBackOutlined as ArrowBackOutlinedIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

interface AboutViewProps {
  onClose: () => void;
}

const AboutView: React.FC<AboutViewProps> = ({ onClose }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: theme.palette.background.paper,
      }}
    >
      {/* Header with back button */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 44,
          px: 1.5,
          py: 0,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: "text.secondary",
            "&:hover": {
              bgcolor: "action.hover",
            },
            mr: 1,
          }}
        >
          <ArrowBackOutlinedIcon fontSize="small" />
        </IconButton>
        <Typography
          variant="h6"
          component="h1"
          sx={{
            fontWeight: 600,
            fontSize: "1rem",
            color: "text.primary",
          }}
        >
          {t("About_Us")}
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <List disablePadding>
          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={t("About_Us_description")}
              primaryTypographyProps={{
                fontSize: "0.95rem",
                color: "text.primary",
              }}
            />
          </ListItem>

          <Divider sx={{ mx: 0 }} />

          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={t("About_Us_description_secondary")}
              primaryTypographyProps={{
                fontSize: "0.95rem",
                color: "text.secondary",
              }}
            />
          </ListItem>
        </List>
      </Box>
    </Box>
  );
};

export default AboutView;
