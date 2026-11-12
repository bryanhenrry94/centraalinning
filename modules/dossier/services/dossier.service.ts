import { CollectionService } from "@/modules/collection/services/collection.service";
import { FinancialAgreementService } from "@/modules/financial-agreement/services/financial-agreement.service";
import { BlockadeService } from "@/modules/blockade/services/blockade.service";
import { BlockCheckService } from "@/modules/block-check/services/block-check.service";
import {
  getDebtClaimStatusInfo,
  AOP_STEP_CONFIG,
} from "@/modules/collection/utils/debt-claim-status";
import { getLegalProcessStatusInfo } from "@/modules/legal-process/utils/legal-process-status";
import { getCollectiveCollectionStatusInfo } from "@/modules/collective-follow-up/utils/collective-collection-status";
import { getFinancialAgreementStatusInfo } from "@/modules/financial-agreement/utils/financial-agreement-status";
import { getBlockadeStatusInfo } from "@/modules/blockade/utils/blockade-status";
import { DebtClaimResponse } from "@/modules/collection/services/collection.type";
import { DossierRow } from "@/modules/dossier/types/dossier.types";
import { STATUS_HEX } from "@/shared/constants/status-colors";

function personDisplayName(
  person?: {
    first_name?: string | null;
    last_name?: string | null;
    business_name?: string | null;
  } | null,
): string {
  if (!person) return "-";
  const fullName = `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim();
  return fullName || person.business_name || "-";
}

// Welstand van een DebtClaim-rij binnen de AOP→COP→GOP-keten: de meest
// specifieke fase wint (GOP > COP > AOP-stap > kale DebtClaim-status) — zie
// het ontwerpdocument: dit is één rij per DebtClaim, nooit drie.
function resolveDebtClaimPhase(row: DebtClaimResponse) {
  if (row.legalProcessId) {
    const info = getLegalProcessStatusInfo(row.legalProcessStatus ?? row.status);
    return { serviceType: "GOP" as const, ...info };
  }
  if (row.collectiveCollectionId) {
    const info = getCollectiveCollectionStatusInfo(
      row.collectiveCollectionStatus ?? row.status,
    );
    return { serviceType: "COP" as const, ...info };
  }
  // Vanaf hier is het altijd een AOP-rij — de volgorde hieronder bepaalt
  // welke van de 7 "Mijn dossiers"-statussen wint, van meest naar minst
  // specifiek: volledig betaald (terminaal) > betalingsregeling actief
  // (pauzeert de meldingenketen) > laatst verzonden melding (AANMANING/
  // SOMMATIE/INGEBREKESTELLING/BLOKKADE) > AOP gestart zonder melding nog >
  // kale DebtClaimStatus als er zelfs geen AdministrativeCollection is.
  if (row.status === "SETTLED") {
    return {
      serviceType: "AOP" as const,
      label: "Volledig betaald",
      color: STATUS_HEX.green,
    };
  }
  if (row.agreementStatus === "ACCEPTED") {
    return {
      serviceType: "AOP" as const,
      label: "Betalingsregeling actief",
      color: STATUS_HEX.blue,
    };
  }
  if (row.aopStep) {
    const info = AOP_STEP_CONFIG[row.aopStep];
    return { serviceType: "AOP" as const, ...info };
  }
  if (row.administrativeCollectionId) {
    return {
      serviceType: "AOP" as const,
      label: "AOP gestart",
      color: STATUS_HEX.blue,
    };
  }
  const info = getDebtClaimStatusInfo(row.status);
  return { serviceType: "AOP" as const, ...info };
}

export class DossierService {
  static getForTenant = async (tenantId: string): Promise<DossierRow[]> => {
    const [debtClaims, financialAgreements, blockades, blockChecks] =
      await Promise.all([
        CollectionService.getAll({ tenantId }),
        FinancialAgreementService.getAllForTenant(tenantId),
        BlockadeService.getStandaloneForTenant(tenantId),
        BlockCheckService.getAllForTenant(tenantId),
      ]);

    const debtClaimRows: DossierRow[] = debtClaims.map((claim) => {
      const phase = resolveDebtClaimPhase(claim);
      const claimed = Number(claim.principalAmount);
      const outstanding = claim.receivableBalance ?? claimed;
      return {
        id: claim.id,
        serviceType: phase.serviceType,
        date: claim.createdAt,
        reference: claim.reference || claim.id,
        debtorName: claim.debtor.fullname || "Onbekend",
        claimed,
        paid: Math.max(claimed - outstanding, 0),
        outstanding,
        statusLabel: phase.label,
        statusColor: phase.color,
        detailHref: `/collections/${claim.id}`,
        debtClaim: claim,
      };
    });

    const farRows: DossierRow[] = financialAgreements.map((far) => {
      const statusInfo = getFinancialAgreementStatusInfo(far.status);
      return {
        id: far.id,
        serviceType: "FAR",
        date: far.createdAt,
        reference: far.farNumber || far.reference || far.id,
        debtorName: personDisplayName(far.debtor?.person),
        claimed: far.amount,
        statusLabel: statusInfo.label,
        statusColor: statusInfo.color,
        detailHref: `/financial-agreements/${far.id}`,
        financialAgreementId: far.id,
        farEligibleForFollowUp:
          far.status === "REGISTERED" && !far.escalatedToDebtClaimId,
      };
    });

    const blkRows: DossierRow[] = blockades.map((blockade) => {
      const statusInfo = getBlockadeStatusInfo(blockade.status);
      return {
        id: blockade.id,
        serviceType: "BLK",
        date: blockade.registeredAt,
        reference: blockade.id,
        debtorName: personDisplayName(blockade.debtor?.person),
        statusLabel: statusInfo.label,
        statusColor: statusInfo.color,
        detailHref: `/blocks/${blockade.id}`,
      };
    });

    const blcRows: DossierRow[] = blockChecks.map((check) => {
      const price = Number(check.price);
      return {
        id: check.id,
        serviceType: "BLC",
        date: check.checkedAt,
        reference: check.id,
        debtorName: personDisplayName(check.person ?? check.debtor?.person),
        claimed: price,
        paid: price,
        outstanding: 0,
        statusLabel: check.blockadeFound ? "Blokkade gevonden" : "Geen blokkade",
        statusColor: check.blockadeFound ? "error" : "success",
        detailHref: "",
        blockCheckId: check.id,
        blockadeFound: check.blockadeFound,
        financialDeclarationInvited: !!check.financialDeclarationInvitedAt,
      };
    });

    return [...debtClaimRows, ...farRows, ...blkRows, ...blcRows].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  };
}
