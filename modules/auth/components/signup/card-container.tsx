import React from "react";
import { Box } from "@mui/material";

interface CardContainerProps {
  children: React.ReactNode;
}

const CardContainer: React.FC<CardContainerProps> = ({ children }) => {
  return (
    <Box
      sx={{
        p: 2,
        maxWidth: 500,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "auto",
      }}
    >
      {children}
    </Box>
  );
};

export default CardContainer;
