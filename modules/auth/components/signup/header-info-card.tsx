import React from "react";
import { Box, Typography } from "@mui/material";
import LogoComponent from "@/shared/ui/logo-app";

interface HeaderInfoCardProps {
  title: string;
  subtitle: string;
  logoSrc: string;
}

const HeaderInfoCard: React.FC<HeaderInfoCardProps> = ({ title, subtitle }) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <Box>
        <Typography
          variant="h4"
          color="primary"
          sx={{
            textAlign: "left",
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body1"
          color="secondary"
          sx={{
            textAlign: "left",
          }}
        >
          {subtitle}
        </Typography>
      </Box>
      <LogoComponent />
    </Box>
  );
};

export default HeaderInfoCard;
