"use client";

import React from "react";
import { useParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  approveTransferPayment,
  getTransferVerificationByToken,
  rejectTransferPayment,
} from "@/modules/payment/actions/payment-transfer.actions";
import { formatCurrency } from "@/shared/utils/formatters";
import { notifyError, notifyInfo } from "@/shared/ui/notifications";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import { UserRole } from "@/shared/constants/user-role";

type ViewState =
  | "loading"
  | "not_found"
  | "expired"
  | "already_decided"
  | "not_authorized"
  | "pending"
  | "done";

export const TransferVerificationReview = () => {
  const { token } = useParams();
  const { user, isLoading: isSessionLoading } = useAuthSession();
  const [state, setState] = React.useState<ViewState>("loading");
  const [details, setDetails] = React.useState<Awaited<
    ReturnType<typeof getTransferVerificationByToken>
  > | null>(null);
  const [showRejectForm, setShowRejectForm] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [resultMessage, setResultMessage] = React.useState("");

  const load = React.useCallback(async () => {
    if (!token || isSessionLoading) return;
    setState("loading");
    const response = await getTransferVerificationByToken(token as string);
    setDetails(response);

    if (!response.success) {
      setState(response.error === "expired" ? "expired" : "not_found");
      return;
    }

    const isTenantAdmin = !!user?.roles?.includes(UserRole.TENANT_ADMIN);

    const isSameTenant = user?.tenant_id === response.data.tenantId;
    if (!isTenantAdmin || !isSameTenant) {
      setState("not_authorized");
      return;
    }

    if (response.data.decision !== "PENDING") {
      setState("already_decided");
      return;
    }

    setState("pending");
  }, [token, isSessionLoading, user]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const response = await approveTransferPayment(token as string);
      if (!response.success) {
        notifyError(response.error || "Kon de betaling niet goedkeuren.");
        return;
      }
      setResultMessage("De betaling is goedgekeurd en toegepast op de schuld.");
      setState("done");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      const response = await rejectTransferPayment(
        token as string,
        rejectReason || undefined,
      );
      if (!response.success) {
        notifyError(response.error || "Kon de betaling niet afwijzen.");
        return;
      }
      notifyInfo("De betaling is afgewezen.");
      setResultMessage("De betaling is afgewezen.");
      setState("done");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Betalingsverificatie
          </Typography>

          {state === "loading" && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {state === "not_found" && (
            <Alert severity="error">
              Dit verificatieverzoek is niet gevonden.
            </Alert>
          )}

          {state === "expired" && (
            <Alert severity="warning">
              Dit verificatieverzoek is verlopen.
            </Alert>
          )}

          {state === "not_authorized" && (
            <Alert severity="error">
              U bent niet gemachtigd om deze betaling te bekijken. Alleen een
              tenantbeheerder van de betreffende klant kan deze
              betalingsverificatie behandelen.
            </Alert>
          )}

          {state === "already_decided" && details?.success && (
            <Alert severity="info">
              Dit verzoek is al{" "}
              {details.data.decision === "APPROVED"
                ? "goedgekeurd"
                : "afgewezen"}
              .
            </Alert>
          )}

          {state === "done" && (
            <Alert severity="success">{resultMessage}</Alert>
          )}

          {state === "pending" && details?.success && (
            <Stack spacing={2} mt={1}>
              <Typography variant="body2">
                <strong>Vordering:</strong> {details.data.debtClaim.reference}
              </Typography>
              <Typography variant="body2">
                <strong>Bedrag:</strong>{" "}
                {formatCurrency(details.data.payment.totalAmount)}
              </Typography>
              <Typography variant="body2">
                <strong>Comprobante-nummer:</strong>{" "}
                {details.data.payment.referenceNumber}
              </Typography>

              <Button
                href={details.data.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
              >
                Betalingsbewijs bekijken
              </Button>

              {!showRejectForm ? (
                <Stack
                  direction="row"
                  spacing={2}
                  justifyContent="flex-end"
                  mt={2}
                >
                  <Button
                    color="error"
                    onClick={() => setShowRejectForm(true)}
                    disabled={submitting}
                  >
                    Afwijzen
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleApprove}
                    disabled={submitting}
                  >
                    Bevestigen
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={2} mt={2}>
                  <TextField
                    label="Reden (optioneel)"
                    multiline
                    minRows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <Stack direction="row" spacing={2} justifyContent="flex-end">
                    <Button
                      onClick={() => setShowRejectForm(false)}
                      disabled={submitting}
                    >
                      Annuleren
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={handleReject}
                      disabled={submitting}
                    >
                      Betaling afwijzen
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};
