"use client";
import React from "react";
import { useRouter } from "next/navigation";
import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { formatDate } from "@/shared/utils/formatters";
import {
  getSupportMessageStatusInfo,
  getSupportMessageTypeLabel,
} from "@/modules/support/utils/support-status";

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
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">Geen berichten gevonden.</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Onderwerp</TableCell>
            <TableCell>Type</TableCell>
            {showTenant && <TableCell>Organisatie</TableCell>}
            <TableCell>Status</TableCell>
            <TableCell>Datum</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const statusInfo = getSupportMessageStatusInfo(row.status);
            return (
              <TableRow
                key={row.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => router.push(`${basePath}/${row.id}`)}
              >
                <TableCell>{row.subject}</TableCell>
                <TableCell>{getSupportMessageTypeLabel(row.type)}</TableCell>
                {showTenant && <TableCell>{row.tenantName ?? "-"}</TableCell>}
                <TableCell>
                  <Chip size="small" label={statusInfo.label} color={statusInfo.color} />
                </TableCell>
                <TableCell>{formatDate(new Date(row.createdAt).toISOString())}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SupportMessageList;
