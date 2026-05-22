import { ReactNode } from "react";
import Header from "./header";
import Navigation from "./navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
import LoadingUI from "@/components/ui/loading-ui";
import { Box, Typography } from "@mui/material";

export const AdminLayout = ({ children }: { children?: ReactNode }) => {
  const { user } = useAuthSession();

  if (!user) {
    return <LoadingUI />;
  }

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header />
        {user.role === "DEBTOR" ? <Box></Box> : <Navigation role={user.role} />}

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
            Klantnummer: CIARU001
          </Typography>
        </Box>
      </Box>
    </>
  );
};
