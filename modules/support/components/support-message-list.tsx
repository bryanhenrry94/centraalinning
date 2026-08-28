"use client";
import React from "react";
import { Chip } from "@mui/material";
import { formatDate } from "@/shared/utils/formatters";
import {
  getSupportMessageStatusInfo,
  getSupportMessageTypeLabel,
} from "@/modules/support/utils/support-status";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";

export interface SupportMessageRow {
  id: string;
  subject: string;
  type: string;
  status: string;
  createdAt: string | Date;
  tenantName?: string;
  senderName?: string;
}

interface SupportMessageListProps {
  rows: SupportMessageRow[];
  showTenant?: boolean;
  basePath: string;
}

export const SupportMessageList: React.FC<SupportMessageListProps> = ({
  rows,
  showTenant,
  basePath,
}) => {
  const columns: ListColumn<SupportMessageRow>[] = [
    { key: "subject", label: "Onderwerp", render: (row) => row.subject },
    { key: "type", label: "Type", render: (row) => getSupportMessageTypeLabel(row.type), hideOnMobile: true },
    ...(showTenant
      ? [{ key: "tenant", label: "Organisatie", render: (row: SupportMessageRow) => row.tenantName ?? "-" }]
      : []),
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const statusInfo = getSupportMessageStatusInfo(row.status);
        return <Chip size="small" label={statusInfo.label} color={statusInfo.color} />;
      },
    },
    { key: "date", label: "Datum", render: (row) => formatDate(new Date(row.createdAt).toISOString()) },
  ];

  return (
    <ResponsiveListTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      getRowHref={(row) => `${basePath}/${row.id}`}
      emptyMessage="Geen berichten gevonden."
    />
  );
};

export default SupportMessageList;
