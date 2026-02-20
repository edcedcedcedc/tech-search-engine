// src/components/ComparisonResult.tsx
/* import React from "react"; */
import {
  /*  Box, */
  Typography,
  Paper,
  Stack,
  Tooltip,
  /*   Divider, */
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
/* import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"; */
import ListAltIcon from "@mui/icons-material/ListAlt";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
/* import OpenInNewIcon from "@mui/icons-material/OpenInNew"; */
import type {
  ComparisonResponse /* , ExpertInsights */,
} from "../api/searchApi";

interface Props {
  result: ComparisonResponse | null;
}

export default function ComparisonResult({ result }: Props) {
  if (!result) {
    return (
      <Typography variant="body2" color="text.secondary">
        No comparison result available.
      </Typography>
    );
  }

  const { analysis } = result;

  return (
    <Stack spacing={3}>
      {/* Metadata */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2">Metadata</Typography>
        <Stack spacing={0.5}>
          <Typography variant="body2">
            Tier: {analysis.analysis_tier}
          </Typography>
          <Typography variant="body2">Language: {analysis.language}</Typography>
          <Typography variant="body2">
            User text used: {analysis.user_text_used ? "Yes" : "No"}
          </Typography>
          <Typography variant="body2">
            Analyzed at: {new Date(analysis.analyzed_at).toLocaleString()}
          </Typography>
          <Typography variant="body2">
            Best choice: {analysis.best_choice}
          </Typography>
          <Typography variant="body2">
            Cached: {result.cached ? "Yes" : "No"}
          </Typography>
        </Stack>
      </Paper>

      {/* Summary */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1">Summary</Typography>
        <Typography variant="body2">{analysis.summary}</Typography>
      </Paper>

      {/* Recommendation */}
      <Paper sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        {analysis.recommendation ? (
          <CheckCircleOutlineIcon color="success" />
        ) : (
          <ErrorOutlineIcon color="error" />
        )}
        <Typography variant="body2">{analysis.recommendation}</Typography>
      </Paper>

      {/* Trend Analysis */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1">Trend Analysis</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {Object.entries(analysis.trend_analysis).map(([offerId, trend]) => (
            <Paper
              key={offerId}
              sx={{ p: 1, display: "flex", alignItems: "center", gap: 1 }}
            >
              <Typography variant="body2" sx={{ flex: 1 }}>
                {offerId}
              </Typography>

              <Tooltip
                title={`Change: ${trend.change} (${trend.change_percent}%) | Volatility: ${trend.volatility} | Momentum: ${trend.momentum} | Best time: ${trend.best_time} | In stock: ${
                  trend.in_stock ? "Yes" : "No"
                } | Risk: ${trend.risk} | Recommendation: ${trend.recommendation}`}
              >
                {trend.trend === "up" ? (
                  <TrendingUpIcon color="success" />
                ) : trend.trend === "down" ? (
                  <TrendingDownIcon color="error" />
                ) : (
                  <Typography variant="body2">—</Typography>
                )}
              </Tooltip>

              {trend.expert_rating && (
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Rating: {trend.expert_rating}
                </Typography>
              )}
              {trend.review_summary && (
                <Typography variant="body2" sx={{ ml: 1, fontStyle: "italic" }}>
                  {trend.review_summary}
                </Typography>
              )}
            </Paper>
          ))}
        </Stack>
      </Paper>

      {/* Specification Comparison */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1">Specification Comparison</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {analysis.spec_comparison.map((spec, idx) => (
            <Paper
              key={idx}
              sx={{ p: 1, display: "flex", flexDirection: "column", gap: 0.5 }}
            >
              <Typography variant="body2">
                <strong>{spec.spec}</strong>
              </Typography>
              {Object.entries(spec).map(([key, val]) => {
                if (key === "spec") return null;
                return (
                  <Typography
                    variant="body2"
                    key={key}
                    sx={{ fontSize: "0.875rem" }}
                  >
                    {key}: {val as string}
                  </Typography>
                );
              })}
              {spec.advantage && (
                <Typography variant="body2" color="success.main">
                  Advantage: {spec.advantage}
                </Typography>
              )}
            </Paper>
          ))}
        </Stack>
      </Paper>

      {/* Expert Insights */}
      {analysis.expert_insights && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1">Expert Insights</Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {Object.entries(analysis.expert_insights).map(
              ([offerId, insight]) => (
                <Paper
                  key={offerId}
                  sx={{
                    p: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                  }}
                >
                  <Typography variant="body2">
                    <strong>{offerId}</strong>
                  </Typography>
                  {insight.pros && (
                    <Typography variant="body2" color="success.main">
                      Pros: {insight.pros.join(", ")}
                    </Typography>
                  )}
                  {insight.cons && (
                    <Typography variant="body2" color="error.main">
                      Cons: {insight.cons.join(", ")}
                    </Typography>
                  )}
                  {insight.average_rating && (
                    <Typography variant="body2">
                      Average rating: {insight.average_rating}
                    </Typography>
                  )}
                  {insight.review_count !== undefined && (
                    <Typography variant="body2">
                      Reviews: {insight.review_count}
                    </Typography>
                  )}
                </Paper>
              ),
            )}
          </Stack>
        </Paper>
      )}

      {/* Expert Consensus */}
      {analysis.expert_consensus && (
        <Paper sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <ListAltIcon fontSize="small" />
          <Typography variant="body2">{analysis.expert_consensus}</Typography>
        </Paper>
      )}

      {/* Known Issues */}
      {analysis.known_issues && analysis.known_issues.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1">Known Issues</Typography>
          <List dense>
            {analysis.known_issues.map((issue, idx) => (
              <ListItem key={idx}>
                <ListItemIcon>
                  <WarningAmberIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={issue} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Alternatives */}
      {analysis.alternatives_suggested &&
        analysis.alternatives_suggested.length > 0 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Alternatives Suggested</Typography>
            <List dense>
              {analysis.alternatives_suggested.map((alt, idx) => (
                <ListItem key={idx}>
                  <ListItemIcon>
                    <LightbulbOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={alt} />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
    </Stack>
  );
}
