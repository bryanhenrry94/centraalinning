"use client";

import { Box, Card, CardActionArea, Grid, Typography } from "@mui/material";
import { CountryList } from "@/shared/constants/country";
import { IslandBanner } from "./island-banner";

interface IslandStepProps {
  value: string;
  onSelect: (code: string) => void;
}

export const IslandStep = ({ value, onSelect }: IslandStepProps) => {
  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a365d", mb: 0.5 }}>
        Kies uw eiland
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Selecteer het eiland waar uw organisatie is gevestigd.
      </Typography>

      <Grid container spacing={2}>
        {CountryList.map((island) => {
          const selected = island.value === value;

          return (
            <Grid size={{ xs: 12, sm: 4 }} key={island.value}>
              <Card
                elevation={0}
                sx={{
                  border: selected ? "2px solid #E67E22" : "1px solid #e0e0e0",
                  borderRadius: 2,
                  overflow: "hidden",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": { boxShadow: 4 },
                }}
              >
                <CardActionArea onClick={() => onSelect(island.value)}>
                  <IslandBanner code={island.value} size="compact" />
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};
