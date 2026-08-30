// views/mobile/PrivacyPolicyMobile.tsx
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

interface PrivacyPolicyMobileProps {
  onClose: () => void;
}

const PrivacyPolicyMobile: React.FC<PrivacyPolicyMobileProps> = ({
  onClose,
}) => {
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
          {t("Privacy_Title")}
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <List disablePadding>
          {/* Intro */}
          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={t("Privacy_Intro")}
              primaryTypographyProps={{
                fontSize: "0.95rem",
                color: "text.primary",
              }}
            />
          </ListItem>

          <Divider sx={{ mx: 0 }} />

          {/* Data collection */}
          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    sx={{ mb: 1, fontSize: "1rem" }}
                  >
                    {t("Privacy_DataCollection_Title")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("Privacy_DataCollection_Body")}
                  </Typography>
                </Box>
              }
            />
          </ListItem>

          <Divider sx={{ mx: 0 }} />

          {/* Cookies */}
          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    sx={{ mb: 1, fontSize: "1rem" }}
                  >
                    {t("Privacy_Cookies_Title")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("Privacy_Cookies_Body")}
                  </Typography>
                </Box>
              }
            />
          </ListItem>

          <Divider sx={{ mx: 0 }} />

          {/* External sources */}
          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    sx={{ mb: 1, fontSize: "1rem" }}
                  >
                    {t("Privacy_ExternalSources_Title")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("Privacy_ExternalSources_Body")}
                  </Typography>
                </Box>
              }
            />
          </ListItem>

          <Divider sx={{ mx: 0 }} />

          {/* Advertising */}
          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    sx={{ mb: 1, fontSize: "1rem" }}
                  >
                    {t("Privacy_Advertising_Title")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("Privacy_Advertising_Body")}
                  </Typography>
                </Box>
              }
            />
          </ListItem>

          <Divider sx={{ mx: 0 }} />

          {/* Contact */}
          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    sx={{ mb: 1, fontSize: "1rem" }}
                  >
                    {t("Privacy_Contact_Title")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("Privacy_Contact_Body")}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
        </List>
      </Box>
    </Box>
  );
};

export default PrivacyPolicyMobile;
