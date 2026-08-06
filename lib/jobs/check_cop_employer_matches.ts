import { CollectiveCollectionService } from "@/modules/collective-follow-up/services/collective-collection.service";

// Recurrente (no event-driven): Employee no tiene FK a Person, así que un
// nuevo Employee o un cambio de identification no puede disparar un chequeo
// puntual — este job barre periódicamente todos los COP sin empleador
// encontrado todavía (Paso 3 del proceso COP). Mismo patrón que
// check_blockade_reactivation.ts.
export async function checkCopEmployerMatches() {
  const result = await CollectiveCollectionService.recheckAllPendingEmployerMatches();
  return { message: "COP-werkgeverscontrole verwerkt", ...result };
}
