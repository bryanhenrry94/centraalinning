import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

const LoadingUI: React.FC = (props) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
    >
      <CircularProgress />
      <Typography variant="h6" mt={2}>
        Loading...
      </Typography>
    </Box>
  );
};

export default LoadingUI;
