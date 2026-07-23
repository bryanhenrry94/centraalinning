"use client";

import { Box, Button, Card, CardActionArea, Typography } from "@mui/material";
import { InfoOutlined, LocationOn, Lock } from "@mui/icons-material";
import { CountryList } from "@/shared/constants/country";
import { STEP_HEADER_GAP, STEP_SECTION_GAP } from "./layout.constants";

const PRIMARY = "#0A3D91";
const ACCENT = "#F7931E";

interface IslandStepProps {
  value: string;
  onSelect: (code: string) => void;
  onNext: () => void;
}

export const IslandStep = ({ value, onSelect, onNext }: IslandStepProps) => {
  return (
    <Box sx={{ width: "100%", maxWidth: 560, mx: "auto" }}>
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

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          bgcolor: "#eef2fb",
          border: "1px solid #dbe4f7",
          borderRadius: 2,
          p: 2,
          mb: 3,
        }}
      >
        <InfoOutlined sx={{ color: PRIMARY, fontSize: 20, mt: 0.2 }} />
        <Typography variant="body2" sx={{ color: PRIMARY }}>
          Uw keuze bepaalt onder welk eiland uw organisatie wordt
          geregistreerd.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
        {CountryList.map((island) => {
          const selected = island.value === value;

          return (
            <Card
              key={island.value}
              elevation={0}
              sx={{
                border: selected ? `2px solid ${ACCENT}` : "1px solid #e5e7eb",
                borderRadius: "12px",
                bgcolor: selected ? "rgba(247, 147, 30, 0.06)" : "white",
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
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2.5,
                  py: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <LocationOn
                    sx={{ fontSize: 22, color: selected ? ACCENT : PRIMARY }}
                  />
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: selected ? ACCENT : PRIMARY,
                    }}
                  >
                    {island.label}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: selected ? ACCENT : "transparent",
                    border: selected ? "none" : "1px solid #d1d5db",
                    color: "white",
                    fontSize: 16,
                  }}
                >
                  {selected ? "✓" : ""}
                </Box>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      <Button
        fullWidth
        variant="contained"
        disabled={!value}
        onClick={onNext}
        sx={{
          py: 1.5,
          bgcolor: ACCENT,
          fontWeight: 600,
          textTransform: "none",
          "&:hover": { bgcolor: "#e0821a" },
        }}
      >
        Volgende →
      </Button>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.75,
          mt: 2,
        }}
      >
        <Lock sx={{ fontSize: 14, color: "text.secondary" }} />
        <Typography variant="caption" color="text.secondary">
          Uw gegevens zijn veilig bij CFSB
        </Typography>
      </Box>
    </Box>
  );
};
