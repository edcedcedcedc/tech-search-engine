import React from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import validator from "validator";
import { useTranslation } from "react-i18next";
import { useEmailStore } from "../store/store";
import { collectEmail } from "../api/searchApi";
import { Link as RouterLink } from "react-router-dom";

const EarlyAccessCard: React.FC = () => {
  const { t } = useTranslation();

  const { email, status, message, setEmail, setStatus, setMessage, reset } =
    useEmailStore();

  const [emailError, setEmailError] = React.useState("");

  React.useEffect(() => {
    if (emailError) {
      const timer = setTimeout(() => {
        setEmailError("");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [emailError]);

  const handleSubmit = async () => {
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
    const startTime = Date.now();

    try {
      const result = await collectEmail(email);

      // Ensure minimum loading time of 500ms so spinner is visible
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 500) {
        await new Promise((resolve) => setTimeout(resolve, 500 - elapsedTime));
      }

      if (result.success) {
        setStatus("success");
        setMessage(t("Email_Success"));
      } else {
        setStatus("error");
        setMessage(t("Email_Error"));
      }
    } catch {
      setStatus("error");
      setMessage(t("Email_Error"));
    }

    setTimeout(() => {
      reset();
    }, 3000);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography
        variant="body2"
        sx={{
          mb: 1,
          fontWeight: 500,
        }}
      >
        {t("Early_Access_Title")}{" "}
        <Box
          component={RouterLink}
          to="/services"
          sx={{
            textDecoration: "none",
            fontWeight: 600,
            color: "text.primary",
            "&:hover": {
              textDecoration: "underline",
            },
          }}
        >
          {t("Early_Acces_Services")}
        </Box>
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",

          pb: 0.5,
          gap: 1,
        }}
      >
        <TextField
          variant="standard"
          placeholder={t("Enter_email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={!!emailError}
          InputProps={{
            disableUnderline: true,
          }}
          inputProps={{
            style: {
              fontSize: "16px", // This prevents iOS zoom
            },
          }}
          sx={{
            flex: 1,
            "& input": {
              fontSize: "16px", // Override the 14px with 16px
              padding: "6px 0",
            },
          }}
        />
        {status === "loading" ? (
          <Button
            disabled
            sx={{
              flexShrink: 0,
              minWidth: "auto",
              fontSize: 13,
              fontWeight: 600,
              textTransform: "none",
              color: "text.primary",
              whiteSpace: "nowrap",
            }}
          >
            <CircularProgress size={20} color="primary" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            sx={{
              flexShrink: 0,
              minWidth: "auto",
              fontSize: 13,
              fontWeight: 600,
              textTransform: "none",
              color: "text.primary",
              whiteSpace: "nowrap",
            }}
          >
            {t("Subscribe")}
          </Button>
        )}
      </Box>

      {emailError && (
        <Typography
          variant="caption"
          color="error"
          sx={{ mt: 0.5, display: "block" }}
        >
          {emailError}
        </Typography>
      )}

      {status === "success" && (
        <Typography
          variant="caption"
          color="success.main"
          sx={{ mt: 0.5, display: "block" }}
        >
          {message}
        </Typography>
      )}

      {status === "error" && (
        <Typography
          variant="caption"
          color="error"
          sx={{ mt: 0.5, display: "block" }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default EarlyAccessCard;
