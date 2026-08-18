import { CollectiveCollectionService } from "@/modules/collective-follow-up/services/collective-collection.service";

// Recurrente: cierra sin match los broadcasts de red de COP
// (COLNetworkQuery) cuyo plazo de respuesta venció sin que ningún tenant
// haya confirmado ser el empleador. El match en sí ya no es un chequeo
// periódico — ocurre en tiempo real cuando un tenant responde "Sí" (ver
// CollectiveCollectionService.submitNetworkResponse); este job solo
// resuelve el caso "nadie respondió a tiempo". Mismo patrón que
// check_blockade_reactivation.ts.
export async function checkCopEmployerMatches() {
  const result = await CollectiveCollectionService.closeExpiredNetworkQueries();
  return { message: "COP-netwerkvraag deadlines verwerkt", ...result };
}
