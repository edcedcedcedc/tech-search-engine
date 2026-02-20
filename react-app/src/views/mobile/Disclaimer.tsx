// views/mobile/DisclaimerMobile.tsx
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

interface DisclaimerMobileProps {
  onClose: () => void;
}

const DisclaimerMobile: React.FC<DisclaimerMobileProps> = ({ onClose }) => {
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
          {t("Disclaimer_Title")}
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <List disablePadding>
          {/* Intro */}
          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={t("Disclaimer_Intro")}
              primaryTypographyProps={{
                fontSize: "0.95rem",
                color: "text.primary",
              }}
            />
          </ListItem>

          <Divider sx={{ mx: 0 }} />

          {/* Accuracy */}
          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={t("Disclaimer_Accuracy")}
              primaryTypographyProps={{
                fontSize: "0.95rem",
                color: "text.primary",
              }}
            />
          </ListItem>

          <Divider sx={{ mx: 0 }} />

          {/* Affiliation */}
          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={t("Disclaimer_Affiliation")}
              primaryTypographyProps={{
                fontSize: "0.95rem",
                color: "text.primary",
              }}
            />
          </ListItem>

          <Divider sx={{ mx: 0 }} />

          {/* Trademarks */}
          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={t("Disclaimer_Trademarks")}
              primaryTypographyProps={{
                fontSize: "0.95rem",
                color: "text.secondary",
              }}
            />
          </ListItem>

          <Divider sx={{ mx: 0 }} />

          {/* Risk */}
          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={t("Disclaimer_Risk")}
              primaryTypographyProps={{
                fontSize: "0.95rem",
                color: "text.primary",
              }}
            />
          </ListItem>
        </List>
      </Box>
    </Box>
  );
};

export default DisclaimerMobile;
