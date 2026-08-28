"use client";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";

import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";

interface AgreementTableProps {
  agreements: AgreementResponse[];
}

const AgreementTable = ({ agreements }: AgreementTableProps) => {
  const columns: ListColumn<AgreementResponse>[] = [
    { key: "date", label: "Datum", render: (a) => formatDate(a.start_date.toString()) },
    { key: "total", label: "Open", align: "right", render: (a) => formatCurrency(a.total_amount) },
    { key: "installments_count", label: "Termijn", render: (a) => a.installments_count || "N/A", hideOnMobile: true },
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
  ];

  return (
    <ResponsiveListTable
      columns={columns}
      rows={agreements ?? []}
      getRowKey={(a) => a.id}
      emptyMessage="Geen betalingsregelingen gevonden."
    />
  );
};
export default AgreementTable;
