import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useStore } from "../store/store";
import { useTranslation } from "react-i18next";
import { uiLog } from "../webhook/client/sender";

interface ComparisonModalProps {
  open?: boolean;
  onClose?: () => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({}) => {
  const { t } = useTranslation();
  const selectedOffers = useStore((s) => s.selectedOffers);
  const selectedCount = Object.keys(selectedOffers).length;

  const handleClose = () => {
    uiLog("comparison | modal_close");
  };

  return (
    <Dialog open={false} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: 1,
          borderColor: "divider",
          pb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Comparation title
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Typography variant="body1" gutterBottom>
            You have selected {selectedCount} offer
            {selectedCount !== 1 ? "s" : ""} for comparison.
          </Typography>

          {selectedCount > 0 && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                bgcolor: "background.default",
                borderRadius: 1,
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Selected Offers:
              </Typography>
              {Object.values(selectedOffers)
                .slice(0, 3)
                .map((offer: any) => (
                  <Typography key={offer.id} variant="body2">
                    • {offer.shop}: {offer.price} MDL
                  </Typography>
                ))}
              {selectedCount > 3 && (
                <Typography variant="caption" color="text.secondary">
                  ... and {selectedCount - 3} more
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} variant="contained">
          close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
