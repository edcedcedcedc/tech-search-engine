import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function Services() {
  const { t } = useTranslation();

  return (
    <Box>
      {/* Main title — match Home's h5 weight */}
      <Typography variant="h5" fontWeight={600} gutterBottom>
        {t("Services_Title", "Our Services")}
      </Typography>

      {/* Intro text — match Home's body1 */}
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {t(
          "Services_Intro",
          "We offer actionable insights and data for smarter buying decisions, delivered as a service tailored to your needs.",
        )}
      </Typography>

      {/* Analytics as a Service */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {t("Services_Analytics_Title", "Analytics as a Service")}
        </Typography>

        <Typography variant="body1" sx={{ mb: 1 }}>
          {t(
            "Services_Analytics_Intro",
            "Leverage our proprietary price history and trends to make better purchasing decisions.",
          )}
        </Typography>

        <Box component="ul" sx={{ pl: 3 }}>
          <Typography component="li" variant="body1">
            {t(
              "Services_Analytics_PriceTrend",
              "Price trend analysis per subscription or one-time payment",
            )}
          </Typography>
          <Typography component="li" variant="body1">
            {t(
              "Services_Analytics_Comparison",
              "Comparison of products based on price history, trends, and specifications",
            )}
          </Typography>
        </Box>
      </Box>

      {/* Data as a Service */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {t("Services_Data_Title", "Data as a Service")}
        </Typography>

        <Typography variant="body1" sx={{ mb: 1 }}>
          {t(
            "Services_Data_Intro",
            "Access our full historical price and stock datasets for your own analysis.",
          )}
        </Typography>

        <Box component="ul" sx={{ pl: 3 }}>
          <Typography component="li" variant="body1">
            {t(
              "Services_Data_PriceHistory",
              "Price history datasets per subscription or one-time payment",
            )}
          </Typography>
        </Box>
      </Box>

      {/* Notifications & Distribution */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {t("Services_Notifications_Title", "Notifications & Distribution")}
        </Typography>

        <Typography variant="body1" sx={{ mb: 1 }}>
          {t(
            "Services_Notifications_Intro",
            "Stay informed in real time with intelligent alerts and targeted updates.",
          )}
        </Typography>

        <Box component="ul" sx={{ pl: 3 }}>
          <Typography component="li" variant="body1">
            {t(
              "Services_Notifications_PriceDrop",
              "Push notifications for price drops on tracked products",
            )}
          </Typography>

          <Typography component="li" variant="body1">
            {t(
              "Services_Notifications_BackInStock",
              "Alerts when products are back in stock",
            )}
          </Typography>

          <Typography component="li" variant="body1">
            {t(
              "Services_Notifications_Volatility",
              "Notifications when unusual price volatility is detected",
            )}
          </Typography>

          <Typography component="li" variant="body1">
            {t(
              "Services_Notifications_MarketShift",
              "Market movement alerts for selected categories",
            )}
          </Typography>

          <Typography component="li" variant="body1">
            {t(
              "Services_Notifications_EmailTelegramSMS",
              "Premium email, Telegram, or SMS alerts",
            )}
          </Typography>

          <Typography component="li" variant="body1">
            {t(
              "Services_Notifications_Sponsored",
              "Sponsored offers within newsletters and notification channels",
            )}
          </Typography>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
        {t(
          "Services_Disclaimer",
          "All services depend on active subscriptions and available datasets. Some features are subject to change.",
        )}
      </Typography>
    </Box>
  );
}
