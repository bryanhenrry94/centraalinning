"use client";

import { Box } from "@mui/material";
import Image from "next/image";
import { IslandBanner } from "./island-banner";

interface SignupSidePanelProps {
  islandCode?: string;
}

export const SignupSidePanel = ({ islandCode }: SignupSidePanelProps) => {
  return (
    <Box
      sx={{
        flex: 1,
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        display: { xs: "none", lg: "block" },
      }}
    >
      {islandCode ? (
        <IslandBanner code={islandCode} size="large" />
      ) : (
        <Image
          src="/static/registro-image3.svg"
          alt="Registro Image"
          fill
          priority
          style={{
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      )}
    </Box>
  );
};
