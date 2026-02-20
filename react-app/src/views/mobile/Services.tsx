// views/mobile/Services.tsx
/* import React from "react"; */
import {
  Box,
  Typography,
  /*   TextField,
  Button,
  Alert,
  CircularProgress, */
} from "@mui/material";
import { useTranslation } from "react-i18next";
/* import { useEmailStore } from "../../store/store";
import { collectEmail } from "../../api/searchApi";
import { useState, useEffect } from "react";
import validator from "validator"; */

export default function ServicesMobile() {
  const { t } = useTranslation();
  /*   const { email, status, message, setEmail, setStatus, setMessage, reset } =
    useEmailStore();
  const [emailError, setEmailError] = useState("");
 */
  /*   useEffect(() => {
    if (status === "success" || status === "error") {
      const timer = setTimeout(() => {
        reset();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, reset]);
 */
  /*   const handleSubmit = async () => {
    setEmailError("");

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
 */
  return (
    <Box sx={{ p: 2, pb: 8 }}>
      {/* Main title */}
      <Typography variant="h5" fontWeight={600} sx={{ mb: 4 }} gutterBottom>
        {t("Services_Title")}
      </Typography>

      {/* Intro text - matching HowTo structure */}
      <Typography variant="body1" color="text.primary" sx={{ mb: 3 }}>
        {t("Services_Intro")}
      </Typography>

      {/* Full Price Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {t("Services_FullPrice_Title")}
        </Typography>

        <Typography variant="body1" sx={{ mb: 1 }}>
          {t("Services_FullPrice_Intro")}
        </Typography>

        <Box component="ul" sx={{ pl: 3 }}>
          <Typography component="li" variant="body1">
            {t("Services_FullPrice_Trend")}
          </Typography>
          <Typography component="li" variant="body1">
            {t("Services_FullPrice_History")}
          </Typography>
        </Box>
      </Box>

      {/* Analytics Section */}
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
        </Box>
      </Box>

      {/* Data Section */}
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
    </Box>
  );
}
