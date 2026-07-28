"use client";

import { ReactNode, useEffect, useState } from "react";
import Header from "./header";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import LoadingUI from "@/shared/ui/loading-ui";
import { Box, Typography } from "@mui/material";
import { UserRole } from "@/shared/constants/user-role";
import { getDebtorPersonalNumber } from "@/modules/collection/actions/debtor.actions";

const STAFF_ROLES = [
  UserRole.PLATFORM_OWNER,
  UserRole.TENANT_ADMIN,
  UserRole.AGENT,
  UserRole.EMPLOYEE,
  UserRole.BAILIFF,
  UserRole.LAWYER,
  UserRole.BANK,
];

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

  const userRoles = (user?.roles as UserRole[]) ?? [];
  const isPureDebtor =
    userRoles.includes(UserRole.DEBTOR) &&
    !userRoles.some((role) => STAFF_ROLES.includes(role));

  const [footerCode, setFooterCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    if (!isPureDebtor) {
      setFooterCode(user.code ?? null);
      return;
    }

    getDebtorPersonalNumber(user.id, user.tenant_id)
      .then((personalNumber) =>
        setFooterCode(personalNumber ?? user.code ?? null),
      )
      .catch(() => setFooterCode(user.code ?? null));
  }, [user, isPureDebtor]);

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
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
        }}
      >
        <Typography variant="body2" color="white">
          {isPureDebtor && `Uw persoonlijk CFSB-nummer`}
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{footerCode ?? user.code}
        </Typography>
      </Box>
    </Box>
  );
};
