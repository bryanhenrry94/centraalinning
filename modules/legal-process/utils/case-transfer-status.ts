import { CaseTransferStatus } from "@/modules/legal-process/constants/case-transfer-status";

type StatusColor = "default" | "info" | "warning" | "success" | "error";

// Labels kort houden (feedback sponsor): "aan advocaat/deurwaarder" is
// overbodig op het scherm van de toegewezen deurwaarder/advocaat zelf — die
// weet al dat het dossier aan hem overgedragen is.
const CASE_TRANSFER_STATUS_CONFIG: Record<
  string,
  { label: string; color: StatusColor }
> = {
  // CCP-kleurenregel: geel/amber = "in afwachting, concept of lopend
  // proces" (incl. "betaling in afwachting"); groen = "actief, geaccepteerd,
  // betaald of succesvol afgerond"; rood = "blokkade, afwijzing, fout of
  // kritieke waarschuwing"; grijs = "secundaire informatie, niet-actieve
  // onderdelen" — dezelfde kleur moet overal dezelfde betekenis houden.
  // "overdrachtsbetaling" (niet simpelweg "betaling") om niet te verwarren
  // met GOP_DRAFT ("Conceptregistratie – betaling in afwachting" in
  // legal-process-status.ts) — twee verschillende entiteiten, moeten geen
  // identiek label delen (CCP-beslissing).
  PENDING_PAYMENT: { label: "Wacht op overdrachtsbetaling", color: "warning" },
  PENDING_ACCEPTANCE: {
    label: "In afwachting",
    color: "warning",
  },
  ACCEPTED: { label: "In behandeling", color: "warning" },
  REJECTED: { label: "Afgewezen", color: "error" },
  // Geel, geen groen: dit is geen eindstatus van het hele CFSB-dossier,
  // enkel de behandelfase van deze advocaat/deurwaarder is klaar — er volgt
  // nog een volgende fase (bv. vonnisregistratie door de deurwaarder).
  WORK_COMPLETED: { label: "Behandeling afgerond", color: "warning" },
  // Geannuleerd is geen afwijzing/fout — de deelnemer heeft de overdracht
  // zelf ingetrokken, een niet-actieve eindstatus (CCP: grijs).
  CANCELLED: { label: "Geannuleerd", color: "default" },
};

export function getCaseTransferStatusInfo(status: string) {
  return (
    CASE_TRANSFER_STATUS_CONFIG[status] ?? {
      label: status,
      color: "default" as StatusColor,
    }
  );
}

interface CaseTransferForWorkStatus {
  status: string;
  lawyerId?: string | null;
  lawyerFeeInvoices?: { status: string }[];
}

// Werkstatus del abogado — distinto del status de la overdracht en sí
// (ACCEPTED se muestra siempre como "Overgedragen" en los listados). Solo
// aplica al camino abogado; para alguacil o cualquier otro status, delega en
// getCaseTransferStatusInfo.
export function getCaseTransferDisplayStatusInfo(
  caseTransfer: CaseTransferForWorkStatus,
) {
  if (caseTransfer.status === "ACCEPTED" && caseTransfer.lawyerId) {
    const pendingInvoice = caseTransfer.lawyerFeeInvoices?.find(
      (invoice) => invoice.status === "PENDING_PAYMENT",
    );
    if (pendingInvoice) {
      return {
        label: "In afwachting van betaling CFSB",
        color: "warning" as StatusColor,
      };
    }
    return {
      label: "In behandeling door advocaat",
      color: "success" as StatusColor,
    };
  }
  return getCaseTransferStatusInfo(caseTransfer.status);
}

export { CaseTransferStatus };
