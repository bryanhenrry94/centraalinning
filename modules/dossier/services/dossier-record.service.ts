import { Prisma, DossierServiceType } from "@prisma/client";

// Capa mínima, sin dependencias de los 4 services (Collection/
// FinancialAgreement/Blockade/BlockCheck) a propósito — ellos importan
// este archivo para crear su fila padre `Dossier` en la misma transacción
// que su propia fila específica (class table inheritance, clave primaria
// compartida). Si este helper viviera en dossier.service.ts habría import
// circular, porque ese archivo ya importa los 4 services para el overzicht
// "Mijn dossiers".
export class DossierRecordService {
  static create = async (
    tx: Prisma.TransactionClient,
    data: {
      tenantId: string;
      debtorId?: string | null;
      serviceType: DossierServiceType;
      reference?: string | null;
    },
  ) => {
    return tx.dossier.create({ data });
  };
}
