"use client";

import { Box, Card, CardActionArea, Grid, Typography } from "@mui/material";
import { LocationOn } from "@mui/icons-material";
import { CountryList } from "@/shared/constants/country";
import { STEP_HEADER_GAP, STEP_SECTION_GAP } from "./layout.constants";

const PRIMARY = "#0A3D91";
const ACCENT = "#F7931E";

interface IslandStepProps {
  value: string;
  onSelect: (code: string) => void;
}

export const IslandStep = ({ value, onSelect }: IslandStepProps) => {
  return (
    <Box sx={{ width: "100%" }}>
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, color: PRIMARY, mb: STEP_HEADER_GAP }}
      >
        Kies uw eiland
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: STEP_SECTION_GAP }}
      >
        Selecteer het eiland waar uw organisatie is gevestigd.
      </Typography>

      <Grid container spacing={2} sx={{ maxWidth: 560 }}>
        {CountryList.map((island) => {
          const selected = island.value === value;

          return (
            <Grid size={{ xs: 12, sm: 4 }} key={island.value}>
              <Card
                elevation={0}
                sx={{
                  border: selected
                    ? `2px solid ${ACCENT}`
                    : "1px solid #e5e7eb",
                  // borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 2px 10px rgba(10, 61, 145, 0.06)",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    boxShadow: "0 8px 24px rgba(10, 61, 145, 0.14)",
                  },
                }}
              >
                <CardActionArea
                  onClick={() => onSelect(island.value)}
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    py: 1.5,
                  }}
                >
                  <LocationOn
                    sx={{
                      fontSize: 20,
                      color: selected ? ACCENT : PRIMARY,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: selected ? ACCENT : PRIMARY,
                    }}
                  >
                    {island.label}
                  </Typography>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};
