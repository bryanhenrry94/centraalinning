"use client";
import React from "react";
import { Chip } from "@mui/material";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { getCollectiveCollectionStatusInfo } from "@/modules/collective-follow-up/utils/collective-collection-status";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";

type CollectiveCollectionRow = {
  id: string;
  status: string;
  startedAt: Date;
  debtClaim: {
    reference: string | null;
    principalAmount: number;
    debtor: {
      person?: { first_name: string | null; last_name: string | null; business_name: string | null } | null;
    };
  };
};

interface CollectiveCollectionsTableProps {
  collections: CollectiveCollectionRow[];
}

const debtorName = (row: CollectiveCollectionRow) => {
  const person = row.debtClaim.debtor.person;
  if (!person) return "-";
  return (
    `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() || person.business_name || "-"
  );
};

export const CollectiveCollectionsTable: React.FC<CollectiveCollectionsTableProps> = ({
  collections,
}) => {
  const columns: ListColumn<CollectiveCollectionRow>[] = [
    { key: "reference", label: "Referentie", render: (c) => c.debtClaim.reference || "-" },
    { key: "debtor", label: "Debiteur", render: (c) => debtorName(c) },
    { key: "amount", label: "Bedrag", align: "right", render: (c) => formatCurrency(c.debtClaim.principalAmount) },
    {
      key: "status",
      label: "Status",
      render: (c) => {
        const statusInfo = getCollectiveCollectionStatusInfo(c.status);
        return <Chip size="small" label={statusInfo.label} color={statusInfo.color} />;
      },
    },
    { key: "startedAt", label: "Gestart op", render: (c) => formatDate(c.startedAt.toString()), hideOnMobile: true },
  ];

  return (
    <ResponsiveListTable
      columns={columns}
      rows={collections}
      getRowKey={(c) => c.id}
      getRowHref={(c) => `/collective-follow-up/${c.id}`}
      emptyMessage="Geen dossiers gevonden."
    />
  );
};
