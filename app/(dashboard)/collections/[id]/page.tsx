"use client";

import { CollectionDetailView } from "@/modules/collection/components/collection-detail-view";

// Contenido movido a modules/collection/components/collection-detail-view.tsx
// para poder reutilizarlo también bajo /dossiers/[id] (overzicht "Mijn
// dossiers" unificado) sin duplicar la lógica. Esta ruta se mantiene porque
// ya existen enlaces directos (p.ej. desde el detalle de FAR) que apuntan
// acá.
export default function CollectionDetailPage() {
  return <CollectionDetailView />;
}
