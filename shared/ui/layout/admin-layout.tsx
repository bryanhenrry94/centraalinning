"use client";

import { ReactNode } from "react";
import Header from "./header";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import LoadingUI from "@/shared/ui/loading-ui";
import { Box, Typography } from "@mui/material";

export const UnauthorizedPage = () => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
    >
      <Typography variant="h4" color="error">
        Unauthorized Access
      </Typography>
      <Typography variant="body1" mt={2}>
        You do not have permission to view this page. Please log in with the
        appropriate credentials.
      </Typography>
    </Box>
  );
};

export const AdminLayout = ({ children }: { children?: ReactNode }) => {
  const { user, isLoading } = useAuthSession();

  if (isLoading) {
    return <LoadingUI />;
  }

  if (!user) {
    return <UnauthorizedPage />;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          padding: 3,
          backgroundColor: "grey.50",
          overflowY: "auto",
          height: "100%",
        }}
      >
        {children}
      </Box>

      <Box
        component="footer"
        sx={{
          padding: 2,
          textAlign: "center",
          backgroundColor: "secondary.main",
        }}
      >
        <Typography variant="body2" color="white">
          {user.code}
        </Typography>
      </Box>
    </Box>
  );
};
