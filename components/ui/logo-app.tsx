"use client";

import React from "react";
import { useTheme } from "@mui/material/styles";
import Image from "next/image";
import { Box } from "@mui/material";

const LogoComponent: React.FC = () => {
  const theme = useTheme();

  const LogoCIO =
    theme.palette.mode === "dark"
      ? "/static/LogoCIO.svg"
      : "/static/logo-cfsb.png";

  return (
    <Box>
      <Image src={LogoCIO} alt="Logo" height={60} width={60} />
    </Box>
  );
};

export default LogoComponent;
