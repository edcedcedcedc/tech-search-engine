// src/views/Services.tsx
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function Services() {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t("Services_Title", "Our Services")}
      </Typography>

      <Typography variant="body2" sx={{ mb: 3 }}>
        {t(
          "Services_Intro",
          "We offer actionable insights and data for smarter buying decisions, delivered as a service tailored to your needs.",
        )}
      </Typography>

      {/* Analytics as a Service */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t("Services_Analytics_Title", "Analytics as a Service")}
        </Typography>

        <Typography variant="body2" sx={{ mb: 1 }}>
          {t(
            "Services_Analytics_Intro",
            "Leverage our proprietary price history and trends to make better purchasing decisions.",
          )}
        </Typography>

        <Box component="ul" sx={{ pl: 3 }}>
          <Typography component="li" variant="body2">
            {t(
              "Services_Analytics_PriceTrend",
              "Price trend analysis per subscription or one-time payment",
            )}
          </Typography>
          <Typography component="li" variant="body2">
            {t(
              "Services_Analytics_Comparison",
              "Comparison of products based on price history, trends, and specifications",
            )}
          </Typography>
        </Box>
      </Box>

      {/* Data as a Service */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t("Services_Data_Title", "Data as a Service")}
        </Typography>

        <Typography variant="body2" sx={{ mb: 1 }}>
          {t(
            "Services_Data_Intro",
            "Access our full historical price and stock datasets for your own analysis.",
          )}
        </Typography>

        <Box component="ul" sx={{ pl: 3 }}>
          <Typography component="li" variant="body2">
            {t(
              "Services_Data_PriceHistory",
              "Price history datasets per subscription or one-time payment",
            )}
          </Typography>
        </Box>
      </Box>

      {/* Future Monetization / Affiliate */}
      {/* <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t(
            "Services_Affiliate_Title",
            "Affiliate & Promotions (Coming Soon)",
          )}
        </Typography>

        <Typography variant="body2">
          {t(
            "Services_Affiliate_Intro",
            "Optionally integrate your products or promotions. Receive commissions for posted items or affiliate traffic.",
          )}
        </Typography>
      </Box> */}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
        {t(
          "Services_Disclaimer",
          "All services depend on active subscriptions and available datasets. Some features are subject to change.",
        )}
      </Typography>
    </Box>
  );
}
