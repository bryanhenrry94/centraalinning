"use client";

import React, { useState } from "react";
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  InputAdornment,
  Alert,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import {
  createBlokCheckRequest,
  getBlokCheckRequest,
  listBlokCheckRequests,
  updateBlokCheckRequest,
} from "@/actions/blok-check-request";
import { useSession } from "next-auth/react";
import { notifyError, notifyInfo } from "@/lib/notifications";
import { BlokCheckRequest } from "@/lib/validations/blok-check-request";
import RefreshIcon from "@mui/icons-material/Refresh";
import { formatDateTime } from "@/utils/formatters";
import { PaymentCreate } from "@/lib/validations/payment";
import { createSentooPayment } from "@/actions/sentoo.actions";
import { registerPayment } from "@/actions/payment";
import { IdentificationType } from "@/constants/identification-type";

const BlokCheckPage = () => {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { data: session } = useSession();
  const [blokCheckRequests, setBlokCheckRequests] = useState<
    BlokCheckRequest[]
  >([]);
  const serviceAmount = 30;

  const handleSearch = async () => {
    const tenantId = session?.user?.tenant_id;

    if (!tenantId) {
      setError("No tenant ID found in session");
      return;
    }

    if (!search.trim()) {
      setError("Ingrese un valor para buscar");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const newBlokCheckRequest = {
        document_type: IdentificationType.CEDULA,
        document_number: search,
        amount: serviceAmount, // Costo fijo por bloque-check
      };

      // 1. Crear solicitud de blok-check
      await createBlokCheckRequest(tenantId, newBlokCheckRequest);
      // 2. Recargar lista de solicitudes
      await loadBlokCheckRequests();

      notifyInfo(
        "Blok-Check aanvraag is ingediend. Resultaat volgt binnen enkele minuten.",
      );
      setSearch("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadBlokCheckRequests();
  };

  const loadBlokCheckRequests = async () => {
    const tenantId = session?.user?.tenant_id;
    if (!tenantId) {
      setError("No tenant ID found in session");
      return;
    }

    try {
      const requests = await listBlokCheckRequests(tenantId);
      console.log("Fetched Blok-Check Requests:", requests);
      setBlokCheckRequests(requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handlePayment = async (requestId: string) => {
    const tenantId = session?.user?.tenant_id;
    if (!tenantId) {
      setError("No tenant ID found in session");
      return;
    }

    const blokCheckRequest = await getBlokCheckRequest(requestId);
    if (!blokCheckRequest) {
      setError("Blok-Check aanvraag niet gevonden");
      return;
    }

    // 2. Crear pago en Sentoo
    const res = await createSentooPayment({
      amount: blokCheckRequest.amount,
      description: `Blok-Check voor document ${blokCheckRequest.document_number}`,
      reference: `blok-check-${blokCheckRequest.document_number}-${Date.now()}`,
    });

    if (!res.success || !res.payment?.url) {
      throw new Error("Error al crear el pago en Sentoo");
    }

    const payment: PaymentCreate = {
      debt_id: blokCheckRequest.debtor_id,
      method: "TRANSFER",
      total_amount: blokCheckRequest.amount,
      paid_at: null,
      status: "pending",
      provider: "sentoo",
      provider_ref: res.payment.id,
      provider_payload: JSON.stringify(res.raw),
      reference_number: "",
      agreement_id: null,
    };

    const paymentRes = await registerPayment(tenantId, payment);

    const blokCheckRequestUpdateData: Partial<BlokCheckRequest> = {
      payment_id: paymentRes.id,
      payment_status: "pending",
    };

    await updateBlokCheckRequest(
      blokCheckRequest.id,
      blokCheckRequestUpdateData,
    );

    const newTab = window.open("", "_blank");

    if (!paymentRes.id) {
      notifyError("Error al registrar el pago");
      newTab?.close();
      return;
    }

    notifyInfo("Redirigiendo a la pasarela de pago...");

    if (newTab) {
      newTab.location.href = res.payment.url;
    } else {
      window.location.href = res.payment.url;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      {/* HEADER & INFO CARD */}
      <Card
        sx={{
          mb: 4,
          borderRadius: 4,
          backgroundColor: "#f5f7fb",
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ display: "flex", gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} mb={1}>
              Blok-Check
            </Typography>
            <Typography color="text.secondary" mb={2}>
              Controleer of een debiteur een actieve blokkade heeft.
            </Typography>

            <Typography color="text.secondary">
              De Blok-Check is een controlemiddel waarmee u kunt nagaan of een
              debiteur een actieve economische blokkade of registraties heeft
              binnen de CFSB-samenwerking.{" "}
              <strong>Kosten: ${serviceAmount} per controle</strong>
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* SEARCH CARD */}
      <Card
        sx={{
          borderRadius: 4,
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={3}>
            Debiteur zoeken
          </Typography>

          <Box display="flex" gap={2}>
            <TextField
              fullWidth
              placeholder="Voer cedula-, KVK-, paspoort- of rijbewijsnummer in"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setError("");
              }}
              size="medium"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={loading}
              sx={{
                px: 4,
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              {loading ? <CircularProgress size={20} /> : "Controleren"}
            </Button>
          </Box>

          {/* ERROR */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Card Uw Blok-Check aanvragen */}
      <Card
        sx={{
          borderRadius: 4,
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
          mt: 4,
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" fontWeight={600} mb={3}>
              Uw Blok-Check aanvragen
            </Typography>
            <Button
              startIcon={<RefreshIcon />}
              sx={{ textTransform: "none" }}
              onClick={handleRefresh}
              disabled={loading}
              loading={loading}
            >
              {loading ? <CircularProgress size={20} /> : "Vernieuwen"}
            </Button>
          </Box>

          <TableContainer sx={{ mt: 2 }}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell>Referentie</TableCell>
                  <TableCell>Identificatie</TableCell>
                  <TableCell>Datum</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Kosten</TableCell>
                  <TableCell align="right">Actie</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {blokCheckRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.id.slice(0, 8)}</TableCell>
                    <TableCell>{request.document_number}</TableCell>
                    <TableCell>
                      {formatDateTime(request.created_at.toString())}
                    </TableCell>
                    <TableCell>
                      {request.has_blockade === true ? (
                        <Chip
                          label="Blokkade"
                          color="error"
                          sx={{ minWidth: 125 }}
                        />
                      ) : request.has_blockade === false ? (
                        <Chip
                          label="Geen blokkade"
                          color="success"
                          sx={{ minWidth: 125 }}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell align="right">${serviceAmount}</TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        sx={{ textTransform: "none" }}
                        onClick={() => handlePayment(request.id)}
                        disabled={request.payment_status === "paid"}
                      >
                        Betalen
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Container>
  );
};

export default BlokCheckPage;
