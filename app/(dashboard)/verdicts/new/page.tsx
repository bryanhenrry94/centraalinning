"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, Container } from "@mui/material";
import LoadingUI from "@/shared/ui/loading-ui";
import { VerdictRegistrationForm } from "@/modules/legal-process/components/verdict-registration-form";
import { getCaseTransferById } from "@/modules/legal-process/actions/case-transfer.actions";
import { getLegalProcessById, getGopFeeRatePercent } from "@/modules/legal-process/actions/legal-process.actions";

const formatDebtorName = (person?: { first_name?: string | null; last_name?: string | null } | null) =>
  person ? `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() : "";

// Un vonnis solo puede registrarse en el contexto de una transferencia
// (primer vonnis, activa el GOP) o de un GOP ya activo (vonnis adicional) —
// ver LegalProcessService.registerVerdict. No existe la creación "suelta".
const VerdictNewPage: React.FC = () => {
  const searchParams = useSearchParams();
  const caseTransferId = searchParams.get("caseTransferId");
  const legalProcessId = searchParams.get("legalProcessId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debtorName, setDebtorName] = useState("");
  const [defaultBailiffId, setDefaultBailiffId] = useState<string | null>(null);
  const [gopFeeRatePercent, setGopFeeRatePercent] = useState(5);

  useEffect(() => {
    const load = async () => {
      if (!caseTransferId && !legalProcessId) {
        setError("Geen dossier opgegeven. Start het registreren van een vonnis vanuit een overdracht of GOP-dossier.");
        setLoading(false);
        return;
      }

      try {
        if (caseTransferId) {
          const caseTransfer = await getCaseTransferById(caseTransferId);
          if (!caseTransfer) throw new Error("Overdracht niet gevonden");
          setDebtorName(formatDebtorName(caseTransfer.debtClaim?.debtor?.person));
          setDefaultBailiffId(caseTransfer.bailiffId ?? null);
        } else if (legalProcessId) {
          const legalProcess = await getLegalProcessById(legalProcessId);
          if (!legalProcess) throw new Error("GOP-dossier niet gevonden");
          setDebtorName(formatDebtorName(legalProcess.debtClaim?.debtor?.person));
          setDefaultBailiffId(legalProcess.bailiffId ?? null);
        }
        setGopFeeRatePercent(await getGopFeeRatePercent({ caseTransferId, legalProcessId }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kon dossier niet laden");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [caseTransferId, legalProcessId]);

  if (loading) return <LoadingUI />;

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <VerdictRegistrationForm
      caseTransferId={caseTransferId}
      legalProcessId={legalProcessId}
      debtorName={debtorName}
      defaultBailiffId={defaultBailiffId}
      gopFeeRatePercent={gopFeeRatePercent}
    />
  );
};

export default VerdictNewPage;
