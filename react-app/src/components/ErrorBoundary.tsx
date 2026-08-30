import React from "react";
import { Box, Typography, Button, Container } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useStore } from "../store/store";
import i18n from "../i18n";
interface ErrorBoundaryProps {
  children: any;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReset = () => {
    const offline = useStore.getState().isOffline;

    if (!offline) {
      this.setState({ hasError: false, error: null });
      window.location.href = "/";
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm">
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
              gap: 2,
              textAlign: "center",
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 60, color: "error.main" }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {i18n.t("Oops")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {this.state.error?.message}
            </Typography>
            <Button variant="text" onClick={this.handleReset}>
              {i18n.t("Go_Back_To_Home")}
            </Button>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
