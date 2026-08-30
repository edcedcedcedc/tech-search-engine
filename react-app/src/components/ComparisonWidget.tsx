import React /* useEffect  */ from "react";
import { IconButton, Badge, Tooltip, useTheme } from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import {
  /*  useNotificationStore, */ useStore /* useThemeStore  */,
} from "../store/store";
import { t } from "i18next";
import { uiLog } from "../webhook/client/uiDebug";

interface HeaderComparisonIconProps {
  onOpenComparison?: () => void;
}

export const HeaderComparisonIcon: React.FC<HeaderComparisonIconProps> = ({
  onOpenComparison,
}) => {
  const selectedOffers = useStore((s) => s.selectedOffers);
  const theme = useTheme(); // Get the theme directly

  const selectedCount = Object.keys(selectedOffers).length;

  const handleClick = () => {
    if (selectedCount < 2) {
      uiLog(`comparison | widget_click_disabled | offers=${selectedCount}`);
      return;
    }

    uiLog(`comparison | widget_click | offers=${selectedCount}`);
    if (onOpenComparison) {
      onOpenComparison();
    }
  };

  const isDoubleDigit = selectedCount >= 10;

  return (
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
      <Tooltip title={t("Comparation_Tooltip")} enterDelay={500} leaveDelay={0}>
        <span>
          <IconButton
            sx={{
              color: theme.palette.text.primary, // Use theme's text.primary
              "&.Mui-disabled": {
                color: theme.palette.text.disabled, // Use theme's text.disabled
              },
              "&:hover": {
                color: theme.palette.text.primary, // Keep same on hover
              },
            }}
            onClick={handleClick}
            disabled={selectedCount < 2}
          >
            <CompareArrowsIcon fontSize="medium" />
          </IconButton>
        </span>
      </Tooltip>
    </Badge>
  );
};
