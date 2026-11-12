"use client";

import { FinancialAgreementDetailView } from "@/modules/financial-agreement/components/financial-agreement-detail-view";

// Contenido movido a
// modules/financial-agreement/components/financial-agreement-detail-view.tsx
// para poder reutilizarlo también bajo /dossiers/[id] (overzicht "Mijn
// dossiers" unificado) sin duplicar la lógica. Esta ruta se mantiene porque
// ya existen enlaces directos que apuntan acá.
export default function FinancialAgreementDetailPage() {
  return <FinancialAgreementDetailView />;
}
