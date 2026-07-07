import React from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import Image from "next/image";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  backgroundImageUrl: string;
  leftWidthPercentage?: string;
  rightWidthPercentage?: string;
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  backgroundImageUrl,
  leftWidthPercentage = "60%",
  rightWidthPercentage = "40%",
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Box display="flex" height="100vh" sx={{ overflow: "hidden" }}>
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        width={isSmallScreen ? "100%" : leftWidthPercentage}
        p={4}
      >
        {children}
      </Box>

      {!isSmallScreen && (
        <Box width={rightWidthPercentage} position="relative">
          <Image
            src={backgroundImageUrl}
            layout="fill"
            alt="Background Image"
          />
        </Box>
      )}
    </Box>
  );
};

export default OnboardingLayout;
