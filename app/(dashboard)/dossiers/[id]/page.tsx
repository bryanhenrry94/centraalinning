import { notFound } from "next/navigation";

import { CollectionDetailView } from "@/modules/collection/components/collection-detail-view";
import { FinancialAgreementDetailView } from "@/modules/financial-agreement/components/financial-agreement-detail-view";
import { BlockadeDetailView } from "@/modules/blockade/components/blockade-detail-view";
import { DossierServiceType } from "@/modules/dossier/types/dossier.types";

// Shell unificado de "Mijn dossiers": una sola URL para el detalle de
// cualquiera de los 6 servicios CFSB, sin fusionar sus modelos de datos (zie
// docs/plan-alineacion-cfsb.md, punto 2.7 — "servicio de agregación virtual,
// sin modelo físico nuevo"). El ?type= viene del detailHref que arma
// DossierService.getForTenant, así que siempre está presente cuando se
// navega acá desde la tabla; BLC no tiene detalle propio (se resuelve con un
// diálogo en la propia tabla) y nunca llega a esta ruta.
export default async function DossierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const { type } = await searchParams;

  switch (type as DossierServiceType | undefined) {
    case "FAR":
      return <FinancialAgreementDetailView />;
    case "BLK":
      return <BlockadeDetailView id={id} />;
    case "AOP":
    case "COP":
    case "GOP":
      return <CollectionDetailView />;
    default:
      notFound();
  }
}
