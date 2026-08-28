"use client";
import React from "react";
// mui
import { IconButton } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";

// components
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";
import { AgreementRequestDialog } from "./agreement-request-dialog";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";

interface AgreementTableApproveProps {
  agreements: AgreementResponse[];
  onApprove: () => void;
  onReject: () => void;
  onUpdate: () => void;
}

export const AgreementTableApprove = ({
  agreements,
  onApprove,
  onReject,
  onUpdate,
}: AgreementTableApproveProps) => {
  const [openModal, setOpenModal] = React.useState(false);
  const [agreementSelectedId, setAgreementSelectedId] = React.useState<string | null>(null);

  const handleOpenModal = (id: string) => {
    setAgreementSelectedId(id);
    setOpenModal(true);
  };
  const handleCloseModal = () => setOpenModal(false);

  // Todas las acciones (aceptar/rechazar/tegenvoorstel) se resuelven dentro
  // del diálogo; en ambos consumidores actuales los tres callbacks del padre
  // apuntan al mismo refresco de la lista, así que basta con onUpdate.
  const handleResolved = () => {
    onUpdate();
  };

  const columns: ListColumn<AgreementResponse>[] = [
    {
      key: "actions",
      label: "Acties",
      render: (agreement) => (
        <IconButton
          color="primary"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenModal(agreement.id);
          }}
        >
          <VisibilityIcon />
        </IconButton>
      ),
    },
    { key: "type", label: "Zaaktype", render: () => "Buitengerechtelijk", hideOnMobile: true },
    {
      key: "date",
      label: "Datum",
      render: (a) => new Date(a.created_at || "").toLocaleDateString(),
      hideOnMobile: true,
    },
    { key: "debtor", label: "Debiteur", render: (a) => (a.debtor ? a.debtor.fullname : "Sin deudor asignado") },
    { key: "total", label: "Totaal", align: "right", render: (a) => formatCurrency(a.total_amount) },
    { key: "boet", label: "Boet", align: "right", render: () => formatCurrency(0), hideOnMobile: true },
    { key: "betaling", label: "Betaling", align: "right", render: () => formatCurrency(0), hideOnMobile: true },
    { key: "installments_count", label: "Termijn", render: (a) => a.installments_count, hideOnMobile: true },
    {
      key: "installment_amount",
      label: "Aflosbedrag",
      align: "right",
      render: (a) => formatCurrency(a.installment_amount),
    },
    {
      key: "start_date",
      label: "Startdatum",
      render: (a) => formatDate(a.start_date.toString()),
      hideOnMobile: true,
    },
    { key: "end_date", label: "Einddatum", render: (a) => formatDate(a.end_date.toString()), hideOnMobile: true },
    { key: "open", label: "Open", align: "right", render: (a) => formatCurrency(a.total_amount), hideOnMobile: true },
  ];

  return (
    <>
      <ResponsiveListTable
        columns={columns}
        rows={agreements}
        getRowKey={(a) => a.id}
        onRowClick={(a) => handleOpenModal(a.id)}
        emptyMessage="Geen betalingsregelingen in behandeling."
      />

      <AgreementRequestDialog
        open={openModal}
        agreementId={agreementSelectedId}
        onClose={handleCloseModal}
        onResolved={handleResolved}
      />
    </>
  );
};
