// components/ContactView.tsx
import React from "react";
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Link,
  useTheme,
} from "@mui/material";
import { ArrowBackOutlined as ArrowBackOutlinedIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

interface ContactViewProps {
  onClose: () => void;
}

const ContactView: React.FC<ContactViewProps> = ({ onClose }) => {
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
          {t("Contact_Title")}
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <List disablePadding>
          {/* Contact Intro */}
          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={t("Contact_Intro")}
              primaryTypographyProps={{
                fontSize: "0.95rem",
                color: "text.primary",
              }}
            />
          </ListItem>

          <Divider sx={{ mx: 0 }} />

          {/* Email and Platform Info */}
          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={
                <Box>
                  <Typography
                    variant="body1"
                    sx={{ fontSize: "0.95rem", mb: 1 }}
                  >
                    {t("Contact_Email_Label")}{" "}
                    <Link
                      href="mailto:contact@price-aggregator.md"
                      sx={{
                        color: "primary.main",
                        textDecoration: "none",
                        "&:hover": {
                          textDecoration: "underline",
                        },
                      }}
                    >
                      contact@price-aggregator.md
                    </Link>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("Contact_Platform_Info")}
                  </Typography>
                </Box>
              }
            />
          </ListItem>

          <Divider sx={{ mx: 0 }} />

          {/* Disclaimer */}
          <ListItem sx={{ py: 1.5, px: 0 }}>
            <ListItemText
              primary={t("Contact_Disclaimer")}
              primaryTypographyProps={{
                fontSize: "0.9rem",
                color: "text.secondary",
                fontStyle: "italic",
              }}
            />
          </ListItem>
        </List>
      </Box>
    </Box>
  );
};

export default ContactView;
