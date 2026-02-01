import React from "react";
import { Box, Container, Typography, Stack, Fade, Slide } from "@mui/material";
import { useTranslation } from "react-i18next";

const LandingPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Container
      disableGutters
      sx={{ maxWidth: "900px", mx: "auto", pt: 2, pb: 6 }}
    >
      {/* HERO */}
      <Fade in timeout={600}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Typography variant="h4" fontWeight={600}>
            {t("Welcome_to")}
          </Typography>

          <Typography variant="h6" color="text.secondary">
            {t("Smart_price_com")}
          </Typography>
        </Stack>
      </Fade>

      {/* HOW SEARCH WORKS */}
      <Slide in direction="up" timeout={700}>
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom fontWeight={500}>
            {t("How_search_works")}
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t("Strugure_uses_start")}{" "}
            <strong>{t("Strugure_uses_highlight")}</strong>
            {t("Strugure_uses_end")}
          </Typography>

          <Stack spacing={1.5}>
            <Typography>
              {t("You_can_start_start")}{" "}
              <strong>{t("You_can_start_highlight")}</strong>
            </Typography>

            <Typography>
              {t("Or_be_more_specific_start")}{" "}
              <strong>{t("Or_be_more_specific_highlight")}</strong>
            </Typography>

            <Typography>
              {t("Or_paste_full_name")} <strong>enter.md</strong>,{" "}
              <strong>darwin.md</strong> or <strong>xstore.md</strong>
            </Typography>
          </Stack>
        </Box>
      </Slide>

      {/* SEMANTIC EXPLANATION */}
      <Fade in timeout={900}>
        <Box sx={{ mt: 5 }}>
          <Typography variant="h5" gutterBottom fontWeight={500}>
            {t("Not_just_exact")}
          </Typography>

          <Typography color="text.secondary">
            {t("Exact_identical")}
            <br />
            {t("Strugure_focuses_start")}{" "}
            <strong>{t("Strugure_focuses_highlight")}</strong>
            {t("Strugure_focuses_end")}
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 2 }}>
            {t("This_means")}
          </Typography>

          <Stack sx={{ mt: 1.5 }} spacing={1}>
            <Typography>{t("Same_mode")}</Typography>
            <Typography>{t("Slightly_diff")}</Typography>
            <Typography>{t("Technically_equiv")}</Typography>
          </Stack>
        </Box>
      </Fade>

      {/* CLUSTERS & OFFERS */}
      <Slide in direction="up" timeout={1000}>
        <Box sx={{ mt: 5 }}>
          <Typography variant="h5" gutterBottom fontWeight={500}>
            {t("Prod_clust")}
          </Typography>

          <Typography color="text.secondary">
            {t("Cluster_start")} <strong>{t("Cluster_highlight")}</strong>
            {t("Cluster_end")}
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 2 }}>
            {t("Offers1_start")} <strong>{t("Offers1_highlight")}</strong>
            {t("Offers1_end")}
          </Typography>

          <Stack sx={{ mt: 1.5 }} spacing={1}>
            <Typography>{t("Offers2")}</Typography>

            <Typography>
              {t("Offers3_start")} <strong>{t("Offers3_highlight")}</strong>
            </Typography>

            <Typography>
              {t("Offers4_start")} <strong>{t("Offers4_highlight")}</strong>
            </Typography>
          </Stack>
        </Box>
      </Slide>

      {/* CTA */}
      <Fade in timeout={1200}>
        <Box sx={{ mt: 6, textAlign: "center" }}>
          <Typography variant="h6" fontWeight={500}>
            {t("Thats_it")}
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {t("Be")}
          </Typography>

          <Typography sx={{ mt: 2 }} fontWeight={500}>
            {t("Happy_searching")}
          </Typography>
        </Box>
      </Fade>
    </Container>
  );
};

export default LandingPage;
