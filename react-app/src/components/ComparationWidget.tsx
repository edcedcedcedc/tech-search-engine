import React, { useEffect } from "react";
import { IconButton, Badge, Tooltip } from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { useNotificationStore, useStore, useThemeStore } from "../store/store";
import { t } from "i18next";
import { uiLog } from "../webhook/client/sender";

interface HeaderComparisonIconProps {
  onOpenComparison?: () => void;
}

export const HeaderComparisonIcon: React.FC<HeaderComparisonIconProps> = ({
  onOpenComparison,
}) => {
  const selectedOffers = useStore((s) => s.selectedOffers);
  const mode = useThemeStore((s) => s.mode);

  const selectedCount = Object.keys(selectedOffers).length;

  // Show snackbar only on new selection

  const handleClick = () => {
    if (selectedCount < 2) {
      uiLog(`comparison | widget_click_disabled | offers=${selectedCount}`);
      return;
    }

    uiLog(`comparison | widget_click | offers=${selectedCount}`);
  };

  // Hard-coded colors from your theme
  const iconColor = mode === "dark" ? "#c9d1d9" : "rgba(0,0,0,0.87)";
  const isDoubleDigit = selectedCount >= 10 ? true : false;
  return (
    <>
      <Badge
        badgeContent={selectedCount}
        color="secondary"
        overlap="circular"
        invisible={selectedCount === 0}
        sx={{
          ...(isDoubleDigit && {
            "& .MuiBadge-badge": {
              width: "60%",
              height: "60%",
            },
          }),
        }}
      >
        <Tooltip
          title={t("Comparation_Tooltip")}
          enterDelay={500}
          leaveDelay={0}
        >
          <span>
            <IconButton
              sx={{
                color: iconColor,
              }}
              onClick={handleClick}
              disabled={selectedCount < 2}
            >
              <CompareArrowsIcon fontSize="medium" />
            </IconButton>
          </span>
        </Tooltip>
      </Badge>
    </>
  );
};
