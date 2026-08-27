"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Button,
  Container,
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogContent,
  Paper,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloseIcon from "@mui/icons-material/Close";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { StatusContractChip } from "./StatusContractChip";

import VisibilityIcon from "@mui/icons-material/Visibility";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import PaymentIcon from "@mui/icons-material/Payment";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { AlertService } from "@/shared/ui/alerts";
import { deleteContract } from "@/modules/contract/actions/contract.actions";
import { PaymentType } from "@/modules/payment/services/payment.validators";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";

const CONTRACT_ACTIVATION_AMOUNT = 35;

export default function ContractsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [contracts, setContracts] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "ALL",
    page: 1,
  });

  const id = React.useId();
  const buttonId = `${id}-button`;
  const menuId = `${id}-menu`;

  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const [aopPaymentDialog, setAopPaymentDialog] = useState<{
    open: boolean;
    referenceNumber: string;
    obligationId: string | null;
    amount: number;
  }>({ open: false, referenceNumber: "", obligationId: null, amount: 0 });

  const open = Boolean(anchorEl);

  const handleClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    contract: any,
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedContract(contract);
  };

  const debouncedSearch = useDebounce(filters.search, 1000);

  useEffect(() => {
    fetchContracts({
      ...filters,
      search: debouncedSearch,
    });
  }, [debouncedSearch, filters.status, filters.page]);

  const fetchContracts = async (params: any) => {
    try {
      const query = new URLSearchParams({
        status: params.status,
        search: params.search,
        page: String(params.page),
      });

      const response = await fetch(`/api/contracts?${query.toString()}`);
      const data = await response.json();
      setContracts(data);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      search: e.target.value,
      page: 1, // Reset to first page on new search
    }));
  };

  const handleClicShowDetails = (contractId: string) => {
    router.push(`/contracts/${contractId}`);
  };

  // Geen aparte bevestigingsdialoog meer: het betaaldialoog hieronder toont
  // al duidelijk dat de betaling het vervolgingsproces automatisch start, en
  // heeft zelf een "Annuleren"-knop — dat is de enige bevestiging die nodig
  // is (voorheen moest de gebruiker twee keer achter elkaar bevestigen).
  const handleClicStartFollowUp = (contract: any) => {
    handleClose();
    beginFollowUpProcess(contract);
  };

  /**
   * Maakt de DebtClaim + betaalverplichting aan (status OPEN, nog niet
   * geactiveerd) en toont vervolgens het betalingsdialoog (PaymentIntent).
   * De AOP wordt pas geactiveerd wanneer de webhook de betaling bevestigt.
   */
  const beginFollowUpProcess = async (contract: any) => {
    try {
      const response = await fetch(
        `/api/contracts/${contract.id}/start-follow-up`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        AlertService.showError(
          error.message ||
            "Het vervolgingsproces kon niet worden gestart. Probeer het alstublieft opnieuw.",
        );
        return;
      }

      const data = await response.json();

      setAopPaymentDialog({
        open: true,
        referenceNumber: contract.reference_number,
        obligationId: data.obligationId,
        amount: data.amount,
      });
    } catch (error) {
      console.error("Error starting follow-up process:", error);
      AlertService.showError(
        "Er is een fout opgetreden bij het starten van het vervolgingsproces. Probeer het alstublieft opnieuw.",
      );
    }
  };

  const handleCreateAopTransaction = async (): Promise<{
    success: boolean;
    error?: string;
    paymentId?: string;
    paymentUrl?: string;
  }> => {
    if (!aopPaymentDialog.obligationId) {
      return { success: false, error: "Geen betaalverplichting gevonden" };
    }

    const res = await fetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: aopPaymentDialog.amount,
        currency: "USD",
        description: "Financiële Afspraken Registreren (FAR)",
        payment_type: PaymentType.COLLECTION,
        obligationId: aopPaymentDialog.obligationId,
      }),
    });

    if (!res.ok) {
      return { success: false, error: "Fout bij het aanmaken van de betaling" };
    }

    const data = await res.json();

    return {
      success: true,
      paymentId: data.paymentId,
      paymentUrl: data.paymentUrl,
    };
  };

  const closeAopPaymentDialog = () => {
    setAopPaymentDialog({
      open: false,
      referenceNumber: "",
      obligationId: null,
      amount: 0,
    });
  };

  const handleAopPaymentConfirmed = async () => {
    closeAopPaymentDialog();
    AlertService.showSuccess("Vervolgingsproces gestart");
    fetchContracts(filters);
  };

  const handleAopPaymentFailed = async () => {
    closeAopPaymentDialog();
    AlertService.showError(
      "De betaling is mislukt. U kunt het opnieuw proberen via 'Administratieve opvolging starten'.",
    );
    fetchContracts(filters);
  };

  const handleClicDelete = (contractId: string) => {
    handleClose();

    AlertService.showConfirm(
      "Weet je het zeker?",
      "Deze actie verwijdert de conceptovereenkomst definitief. Wil je doorgaan?",
      "Ja, verwijderen",
      "Annuleren",
    ).then(async (confirmed) => {
      if (confirmed) {
        deleteContractRecord(contractId);
      }
    });
  };

  const deleteContractRecord = async (contractId: string) => {
    if (!session?.user.tenant_id) return;

    const result = await deleteContract(contractId, session.user.tenant_id);

    if (result.success) {
      AlertService.showSuccess("Overeenkomst verwijderd");
      fetchContracts(filters);
    } else {
      AlertService.showError(
        result.error || "De overeenkomst kon niet worden verwijderd.",
      );
    }
  };

  const handleClicOpenPaymentLink = () => {
    const paymentUrl = selectedContract?.activation_payment?.payment_url;

    handleClose();

    if (paymentUrl) {
      window.open(paymentUrl, "_blank");
    }
  };

  const handleClicAttemptPayment = (contract: any) => {
    handleClose();
    attemptPayment(contract);
  };

  const attemptPayment = async (contract: any) => {
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: CONTRACT_ACTIVATION_AMOUNT,
          currency: "USD",
          description: "Financiële Afspraken Registreren (FAR)",
          payment_type: PaymentType.CONTRACT_ACTIVATION,
          contractId: contract.id,
        }),
      });

      if (!res.ok) {
        AlertService.showError("De betaling kon niet worden aangemaakt.");
        return;
      }

      const data = await res.json();

      if (data.paymentUrl) {
        window.open(data.paymentUrl, "_blank");
      }

      fetchContracts(filters);
    } catch (error) {
      console.error("Error creating payment:", error);
      AlertService.showError(
        "Er is een fout opgetreden bij het aanmaken van de betaling.",
      );
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedContract(null);
  };

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
          mb: { xs: 2, sm: 4 },
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Financiële afspraak registreren
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Vul de gegevens van de betrokken partijen in en registreer uw
            financiële afspraak.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<DescriptionOutlinedIcon />}
          size="large"
          sx={{ textTransform: "none" }}
          onClick={() => router.push("/contracts/new")}
        >
          Nieuwe financiële afspraak
        </Button>
      </Box>

      <Card sx={{ p: { xs: 1.5, sm: 3 } }}>
        <Stack
          direction={{
            xs: "column",
            md: "row",
          }}
          spacing={2}
          mb={3}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Zoeken op partij of registratienummer..."
            value={filters.search}
            onChange={handleSearchChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Select
            size="small"
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status: e.target.value,
                page: 1,
              }))
            }
            sx={{ minWidth: { xs: "100%", md: 180 } }}
          >
            <MenuItem value="ALL">Status: Alle</MenuItem>

            <MenuItem value="DRAFT">Concept</MenuItem>

            <MenuItem value="REGISTERED">Geregistreerd</MenuItem>
          </Select>
        </Stack>

        <TableContainer>
          <Table size="small" stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    minWidth: 50,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Registratienummer
                </TableCell>

                <TableCell
                  sx={{
                    minWidth: 300,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Partij
                </TableCell>

                <TableCell
                  sx={{
                    minWidth: 50,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Registratiedatum
                </TableCell>

                <TableCell
                  sx={{
                    minWidth: 50,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Bedrag
                </TableCell>

                <TableCell
                  sx={{
                    minWidth: 50,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Status
                </TableCell>

                <TableCell
                  sx={{
                    minWidth: 50,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Acties
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>{contract.reference_number}</TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {contract.parties
                        .map((party: any) => party.fullname)
                        .join(" / ")}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ textAlign: "center" }}>
                    {formatDate(contract.contract_date)}
                  </TableCell>

                  <TableCell sx={{ textAlign: "center" }}>
                    {formatCurrency(contract.amount)}
                  </TableCell>

                  <TableCell sx={{ textAlign: "center" }}>
                    <StatusContractChip status={contract.status} width={175} />
                  </TableCell>

                  <TableCell align="center">
                    <IconButton
                      id={buttonId}
                      aria-controls={open ? menuId : undefined}
                      aria-haspopup="true"
                      aria-expanded={open}
                      onClick={(event) => handleClick(event, contract)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Menu
          id={menuId}
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          slotProps={{
            list: {
              "aria-labelledby": buttonId,
            },
          }}
        >
          <MenuItem
            onClick={() => {
              if (!selectedContract) return;

              handleClicShowDetails(selectedContract.id);
              handleClose();
            }}
          >
            <ListItemIcon>
              <VisibilityIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Bekijken</ListItemText>
          </MenuItem>

          {selectedContract?.status === "DRAFT" &&
          selectedContract?.activation_payment?.payment_url ? (
            <MenuItem onClick={handleClicOpenPaymentLink}>
              <ListItemIcon>
                <OpenInNewIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Betalingslink openen</ListItemText>
            </MenuItem>
          ) : (
            <MenuItem
              onClick={() => {
                if (!selectedContract) return;

                handleClicAttemptPayment(selectedContract);
              }}
              disabled={selectedContract?.status !== "DRAFT"}
            >
              <ListItemIcon>
                <PaymentIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Betaling proberen</ListItemText>
            </MenuItem>
          )}

          <MenuItem
            onClick={() => {
              if (!selectedContract) return;

              handleClicStartFollowUp(selectedContract);
            }}
            disabled={
              selectedContract?.status !== "REGISTERED" ||
              (selectedContract?.debtClaim &&
                selectedContract.debtClaim.status !== "OPEN")
            }
          >
            <ListItemIcon>
              <RestartAltIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Administratieve opvolging starten</ListItemText>
          </MenuItem>

          <MenuItem
            onClick={() => {
              if (!selectedContract) return;

              handleClicDelete(selectedContract.id);
            }}
            disabled={selectedContract?.status !== "DRAFT"}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Verwijderen</ListItemText>
          </MenuItem>
        </Menu>

        <Box
          mt={3}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="body2" color="text.secondary">
            Totaal {contracts.length} financiële afspraak
          </Typography>
        </Box>
      </Card>

      {/* Betaaldialoog voor de AOP-dienst */}
      <Dialog
        open={aopPaymentDialog.open}
        onClose={closeAopPaymentDialog}
        maxWidth="xs"
        fullWidth
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
          <Box flexGrow={1} textAlign="center">
            <Typography variant="h5" fontWeight={700} color="white">
              Administratieve opvolging starten
            </Typography>
          </Box>
          <IconButton onClick={closeAopPaymentDialog} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Stack spacing={3} alignItems="center">
            <Stack spacing={1} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Zodra de betaling is bevestigd, wordt de administratieve
                opvolging (AOP) voor deze overeenkomst automatisch gestart.
                Klik op "Annuleren" als u dit nu nog niet wilt doen.
              </Typography>
            </Stack>

            <Paper
              variant="outlined"
              sx={{
                width: "100%",
                p: 2,
                borderRadius: 2,
                textAlign: "center",
                bgcolor: "background.default",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Servicewaarde
              </Typography>

              <Typography variant="h4" fontWeight={700} color="primary.main">
                {formatCurrency(aopPaymentDialog.amount)}
              </Typography>
            </Paper>

            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
            >
              Als u doorgaat, wordt u doorgestuurd naar het beveiligde
              betalingsproces.
            </Typography>

            <Stack direction="row" spacing={2} width="100%">
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                startIcon={<CloseIcon />}
                onClick={closeAopPaymentDialog}
                sx={{ textTransform: "none" }}
              >
                Annuleren
              </Button>

              <PaymentIntent
                onCreateTransaction={handleCreateAopTransaction}
                onPaymentConfirmed={handleAopPaymentConfirmed}
                onPaymentFailed={handleAopPaymentFailed}
              />
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
