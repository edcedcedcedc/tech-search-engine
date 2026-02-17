import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useEmailStore } from "../store/store";
import { collectEmail } from "../api/searchApi";
import { useState, useEffect } from "react";
import validator from "validator";

export default function Services() {
  const { t } = useTranslation();
  const { email, status, message, setEmail, setStatus, setMessage, reset } =
    useEmailStore();
  const [emailError, setEmailError] = useState("");

  // Auto-reset after success or error
  useEffect(() => {
    if (status === "success" || status === "error") {
      const timer = setTimeout(() => {
        reset();
      }, 3000); // Reset after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [status, reset]);

  const handleSubmit = async () => {
    // Clear previous errors
    setEmailError("");

    // Validate email
    if (!email) {
      setEmailError(t("Email_Required"));
      return;
    }

    if (!validator.isEmail(email)) {
      setEmailError(t("Email_Invalid"));
      return;
    }

    setStatus("loading");
    const result = await collectEmail(email);

    if (result.success) {
      setStatus("success");
      setMessage(t("Email_Success"));
    } else {
      setStatus("error");
      setMessage(t("Email_Error"));
    }
  };

  return (
    <Box>
      {/* Main title — match Home's h5 weight */}
      <Typography variant="h5" fontWeight={600} gutterBottom>
        {t("Services_Title")}
      </Typography>

      {/* Intro text — match Home's body1 */}
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {t("Services_Intro")}
      </Typography>

      {/* Analytics as a Service */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {t("Services_Analytics_Title")}
        </Typography>

        <Typography variant="body1" sx={{ mb: 1 }}>
          {t("Services_Analytics_Intro")}
        </Typography>

        <Box component="ul" sx={{ pl: 3 }}>
          <Typography component="li" variant="body1">
            {t("Services_Analytics_PriceTrend")}
          </Typography>
          <Typography component="li" variant="body1">
            {t("Services_Analytics_Comparison")}
          </Typography>
        </Box>
      </Box>

      {/* Data as a Service */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {t("Services_Data_Title")}
        </Typography>

        <Typography variant="body1" sx={{ mb: 1 }}>
          {t("Services_Data_Intro")}
        </Typography>

        <Box component="ul" sx={{ pl: 3 }}>
          <Typography component="li" variant="body1">
            {t("Services_Data_PriceHistory")}
          </Typography>
        </Box>
      </Box>

      {/* Notifications & Distribution */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {t("Services_Notifications_Title")}
        </Typography>

        <Typography variant="body1" sx={{ mb: 1 }}>
          {t("Services_Notifications_Intro")}
        </Typography>

        <Box component="ul" sx={{ pl: 3 }}>
          <Typography component="li" variant="body1">
            {t("Services_Notifications_PriceDrop")}
          </Typography>

          <Typography component="li" variant="body1">
            {t("Services_Notifications_BackInStock")}
          </Typography>

          <Typography component="li" variant="body1">
            {t("Services_Notifications_Volatility")}
          </Typography>

          <Typography component="li" variant="body1">
            {t("Services_Notifications_MarketShift")}
          </Typography>

          <Typography component="li" variant="body1">
            {t("Services_Notifications_EmailTelegramSMS")}
          </Typography>

          <Typography component="li" variant="body1">
            {t("Services_Notifications_Sponsored")}
          </Typography>
        </Box>
      </Box>

      {/* 
      <Box sx={{ mb: 5 }}>

        <Typography variant="h6" fontWeight={600} gutterBottom>
          {t("Services_EarlyAccess_Title")}
        </Typography>

        <Typography variant="body1" sx={{ mb: 2 }}>
          {t("Services_EarlyAccess_Text")}
        </Typography>


        {status === "success" ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            {message}
          </Alert>
        ) : status === "error" ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {message}
          </Alert>
        ) : (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder={t("Email_Placeholder")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
              }}
              error={!!emailError}
              helperText={emailError}
              disabled={status === "loading"}
              sx={{
                flex: 1,
                "& .MuiOutlinedInput-root": {
                  fontSize: {
                    xs: "0.75rem",
                    sm: "0.81rem",
                    md: "0.855rem",
                    lg: "0.9rem",
                    xl: "0.945rem",
                    xxl: "0.99rem",
                  },
                },
              }}
            />
            <Button
              variant="text"
              onClick={handleSubmit}
              disabled={status === "loading"}
              sx={{
                minWidth: {
                  xs: "100%",
                  sm: 100,
                },
                height: 40,
                fontSize: {
                  xs: "0.75rem",
                  sm: "0.81rem",
                  md: "0.855rem",
                  lg: "0.9rem",
                  xl: "0.945rem",
                  xxl: "0.99rem",
                },
              }}
            >
              {status === "loading" ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                t("Subscribe")
              )}
            </Button>
          </Box>
        )}
      </Box> */}
    </Box>
  );
}
