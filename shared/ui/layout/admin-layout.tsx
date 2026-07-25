"use client";

import { ReactNode, useEffect, useState } from "react";
import Header from "./header";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import LoadingUI from "@/shared/ui/loading-ui";
import { Box, Typography } from "@mui/material";
import { UserRole } from "@/shared/constants/user-role";
import { getDebtorPersonalNumber } from "@/modules/collection/actions/debtor.actions";

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
  const [personalNumber, setPersonalNumber] = useState<string | null>(null);

  const isDebtor = !!user?.roles?.includes(UserRole.DEBTOR);

  useEffect(() => {
    if (isDebtor && user?.id && user?.tenant_id) {
      getDebtorPersonalNumber(user.id, user.tenant_id).then(setPersonalNumber);
    }
  }, [isDebtor, user?.id, user?.tenant_id]);

  if (isLoading) {
    return <LoadingUI />;
  }

  if (!user) {
    return <UnauthorizedPage />;
  }

  const footerLabel = isDebtor
    ? personalNumber
      ? `Persoonlijk nummer: ${personalNumber}`
      : ""
    : user.code;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          padding: { xs: 1, sm: 3 },
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
          {footerLabel}
        </Typography>
      </Box>
    </Box>
  );
};
