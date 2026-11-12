import { BlockadeDetailView } from "@/modules/blockade/components/blockade-detail-view";

// Contenido movido a modules/blockade/components/blockade-detail-view.tsx
// para poder reutilizarlo también bajo /dossiers/[id] (overzicht "Mijn
// dossiers" unificado) sin duplicar la lógica. Esta ruta se mantiene porque
// ya existen enlaces directos que apuntan acá.
export default async function BlockadeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BlockadeDetailView id={id} />;
}
