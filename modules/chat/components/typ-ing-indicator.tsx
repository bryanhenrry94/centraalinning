"use client";

import React from "react";
import { Typography, Box } from "@mui/material";

interface TypingIndicatorProps {
  message: string;
}

const TypingIndicator = ({ message }: TypingIndicatorProps) => {
  if (!message) return null;

  return (
    <Box sx={{ px: 2, pb: 1 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontStyle: "italic",
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        {message}
        <span className="typing-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </Typography>

      <style jsx>{`
        .typing-dots span {
          animation: blink 1.4s infinite both;
          font-weight: bold;
        }
        .typing-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes blink {
          0% {
            opacity: 0.2;
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0.2;
          }
        }
      `}</style>
    </Box>
  );
};

export default TypingIndicator;
