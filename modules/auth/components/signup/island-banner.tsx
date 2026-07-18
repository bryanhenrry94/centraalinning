"use client";

import { Box, Typography } from "@mui/material";
import Image from "next/image";
import { ISLAND_VISUALS } from "@/modules/auth/constants/island-visuals";

interface IslandBannerProps {
  code: string;
  size?: "compact" | "large";
}

export const IslandBanner = ({ code, size = "compact" }: IslandBannerProps) => {
  const visual = ISLAND_VISUALS[code];
  const height = size === "large" ? "100%" : 120;

  if (!visual) {
    return null;
  }

  if (visual.photoUrl && size === "large") {
    return (
      <Box sx={{ position: "relative", width: "100%", height, overflow: "hidden" }}>
        <Image
          src={visual.photoUrl}
          alt={visual.label}
          fill
          priority
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            p: 2,
            background: "linear-gradient(transparent, rgba(0,0,0,0.55))",
          }}
        >
          <Typography variant="h6" sx={{ color: "white", fontWeight: 700 }}>
            {visual.label}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        height,
        borderRadius: size === "compact" ? 2 : 0,
        background: visual.gradient,
        display: "flex",
        alignItems: "flex-end",
        p: 2,
      }}
    >
      <Typography
        variant={size === "large" ? "h5" : "subtitle1"}
        sx={{ color: "white", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
      >
        {visual.label}
      </Typography>
    </Box>
  );
};
