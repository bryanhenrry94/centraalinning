import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Modal,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import CollectionForm from "@/modules/collection/components/collection-form";
import AddIcon from "@mui/icons-material/Add";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getAllBankAccountsByTenantId } from "@/modules/tenant/actions/bank-account.actions";

interface CollectionHeaderProps {
  onRefresh?: () => void;
}

export const CollectionHeader = ({ onRefresh }: CollectionHeaderProps) => {
  const { data: session } = useSession();
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [bankAccountDialogOpen, setBankAccountDialogOpen] =
    React.useState(false);
  const [checkingBankAccount, setCheckingBankAccount] = React.useState(false);

  const handleOpenModal = async () => {
    const tenantId = session?.user?.tenant_id;
    if (!tenantId) return;

    setCheckingBankAccount(true);
    try {
      const response = await getAllBankAccountsByTenantId(tenantId);
      const hasBankAccount = !!response.success && !!response.data?.length;

      if (!hasBankAccount) {
        setBankAccountDialogOpen(true);
        return;
      }

      setOpen(true);
    } finally {
      setCheckingBankAccount(false);
    }
  };
  const handleCloseModal = () => setOpen(false);
  const handleCloseBankAccountDialog = () => setBankAccountDialogOpen(false);
  const handleGoToBankAccountSettings = () => {
    setBankAccountDialogOpen(false);
    router.push("/settings?tab=5");
  };

  const handleSave = () => {};

  return (
    <>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Overzicht Administratieve opvolging
      </Typography>

      <Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, sm: "auto" }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Zoek naar..."
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: { xs: "100%", sm: 300 } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: "auto" }}>
          <Stack spacing={2} direction="row">
            <IconButton onClick={onRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
            <Button
              onClick={handleOpenModal}
              variant="contained"
              color="primary"
              sx={{ textTransform: "none", whiteSpace: "nowrap" }}
              startIcon={<AddIcon />}
              disabled={checkingBankAccount}
            >
              Nieuwe
            </Button>
          </Stack>
        </Grid>
      </Grid>

      <Modal
        open={open || false}
        onClose={handleCloseModal}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Paper
          component="section"
          sx={{
            mt: 2,
            elevation: 1,
            borderRadius: 1,
            overflow: "hidden",
            mb: 2,
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "calc(100vw - 32px)", sm: 400 },
            maxWidth: 400,
          }}
        >
          <Box
            sx={{
              bgcolor: "secondary.main",
              color: "white",
              px: 2,
              py: 1.5,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              borderBottom: "1px solid #e0e0e0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
              NIEUWE VORDERING
            </Typography>
            <IconButton onClick={handleCloseModal} sx={{ color: "white" }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <CollectionForm onSave={handleSave} onClose={handleCloseModal} />
        </Paper>
      </Modal>

      <Dialog
        open={bankAccountDialogOpen}
        onClose={handleCloseBankAccountDialog}
      >
        <DialogTitle>Geen bankrekening geregistreerd</DialogTitle>
        <DialogContent>
          <DialogContentText>
            U moet eerst een bankrekening registreren voordat u een nieuwe
            AOP-vordering kunt aanmaken.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBankAccountDialog}>Annuleren</Button>
          <Button
            onClick={handleGoToBankAccountSettings}
            variant="contained"
            color="primary"
          >
            Ga naar configuratie
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
