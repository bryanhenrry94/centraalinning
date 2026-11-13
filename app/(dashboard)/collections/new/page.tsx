"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Alert, Box, Button, Container, Typography } from "@mui/material";
import CollectionForm from "@/modules/collection/components/collection-form";
import { getAllBankAccountsByTenantId } from "@/modules/tenant/actions/bank-account.actions";
import LoadingUI from "@/shared/ui/loading-ui";

const NewCollectionPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [checkingBankAccount, setCheckingBankAccount] = useState(true);
  const [hasBankAccount, setHasBankAccount] = useState(true);

  useEffect(() => {
    const tenantId = session?.user?.tenant_id;
    if (!tenantId) return;

    const check = async () => {
      try {
        const response = await getAllBankAccountsByTenantId(tenantId);
        setHasBankAccount(!!response.success && !!response.data?.length);
      } finally {
        setCheckingBankAccount(false);
      }
    };

    check();
  }, [session?.user?.tenant_id]);

  const handleDone = () => router.push("/dossiers");

  return (
    <Container
      maxWidth="sm"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "flex-start" },
          justifyContent: "space-between",
          gap: 2,
          mb: { xs: 1, sm: 1.5 },
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Nieuwe vordering registreren
          </Typography>
          <Typography color="text.secondary">
            Registreer een nieuwe administratieve opvolging (AOP).
          </Typography>
        </Box>
      </Box>

      {checkingBankAccount ? (
        <LoadingUI />
      ) : !hasBankAccount ? (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() =>
                router.push("/settings?tab=5&returnTo=/collections/new")
              }
              sx={{ textTransform: "none" }}
            >
              Bankrekening registreren
            </Button>
          }
        >
          Registreer eerst een bankrekening voordat u een nieuwe AOP-vordering
          kunt aanmaken.
        </Alert>
      ) : (
        <CollectionForm onSave={handleDone} onClose={handleDone} />
      )}
    </Container>
  );
};

export default NewCollectionPage;
